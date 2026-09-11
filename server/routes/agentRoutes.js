import express from 'express';
import { AgentOrchestrator } from '../agents/AgentOrchestrator.js';
import { AgentRegistry } from '../agents/AgentRegistry.js';
import { TaskDecomposer } from '../agents/TaskDecomposer.js';
import { authenticateToken, createAuditEntry } from '../middleware/auth.js';

const router = express.Router();

// Input sanitization helper
const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, 10000); // Limit to 10000 chars
};

const sanitizeObject = (obj) => {
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

// POST /api/agents/query — routes through AgentRegistry (same specialists as orchestrator)
router.post('/query', authenticateToken, async (req, res) => {
  try {
    const { agentType, prompt, parameters, imageText, imageBase64, fileName, dataset } = req.body;
    const user = req.user;

    if (!agentType || typeof agentType !== 'string') {
      return res.status(400).json({ error: 'Valid agent type is required.' });
    }
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Query prompt is required and must be a string.' });
    }

    const sanitizedAgentType = sanitizeString(agentType);
    const sanitizedPrompt = sanitizeString(prompt);
    const sanitizedParams = parameters ? sanitizeObject(parameters) : undefined;

    const allowedAgentTypes = ['RAG', 'DATA_SCIENCE', 'VISION', 'REPORTING'];
    if (!allowedAgentTypes.includes(sanitizedAgentType)) {
      return res.status(400).json({ error: `Invalid agent type. Allowed: ${allowedAgentTypes.join(', ')}` });
    }

    const agent = AgentRegistry.getAgent(sanitizedAgentType);
    if (!agent) {
      return res.status(404).json({ error: `Agent [${sanitizedAgentType}] not registered.` });
    }

    const aiProfile = user.assignedAIProfile || 'Balanced';
    const startTime = Date.now();

    const message = await agent.run({
      query: sanitizedPrompt,
      user,
      inputContext: [],
      parameters: sanitizedParams,
      imageText: typeof imageText === 'string' ? imageText.slice(0, 50000) : undefined,
      imageBase64: typeof imageBase64 === 'string' ? imageBase64.slice(0, 2_000_000) : undefined,
      fileName: typeof fileName === 'string' ? sanitizeString(fileName) : undefined,
      dataset: Array.isArray(dataset) ? dataset : undefined
    });

    const result = message.payload?.result || {};
    const confidence = message.payload?.confidence;
    const executionTimeMs = Date.now() - startTime;

    let responseData = {
      agent: message.fromAgent || sanitizedAgentType,
      profileUsed: aiProfile,
      departmentScope: user.department,
      query: sanitizedPrompt,
      confidence,
      modelUsed: message.payload?.metadata?.modelUsed,
      executionTimeMs,
      registryPath: true
    };

    switch (sanitizedAgentType) {
      case 'RAG':
        responseData = {
          ...responseData,
          answer: result.answer,
          citations: (result.citations || message.payload?.citations || []).map((c) => ({
            title: c.documentTitle || c.title,
            category: c.sectionTitle || c.category,
            department: c.department,
            sensitivity: c.sensitivity,
            similarityScore: c.score || c.similarityScore || c.hybridScore,
            excerpt: c.excerpt || c.text
          })),
          inference: result.inference || null
        };
        break;

      case 'DATA_SCIENCE':
        responseData = {
          ...responseData,
          summary: result.summary,
          metrics: result.metrics,
          chartData: result.chartData,
          insights: result.insights,
          statistics: result.statistics,
          anomalies: result.anomalies,
          regression: result.regression,
          dataSource: result.dataSource,
          series: result.series,
          charts: result.charts
        };
        break;

      case 'VISION':
        responseData = {
          ...responseData,
          ocrResult: {
            documentType: result.ocrResult?.documentType,
            confidence: result.ocrResult?.confidence || `${Math.round((result.ocrResult?.confidenceScore || 0) * 1000) / 10}%`,
            textExtracted: result.ocrResult?.textExtracted || result.ocrResult?.extractedText,
            detectedEntities: result.ocrResult?.detectedEntities || [],
            tableData: result.ocrResult?.tableData || [],
            referenceId: result.ocrResult?.referenceId,
            ocrEngine: result.ocrEngine,
            simulation: result.ocrSimulation
          }
        };
        break;

      case 'REPORTING':
        responseData = {
          ...responseData,
          reportTitle: result.reportTitle,
          sections: result.sections,
          markdown: result.markdown,
          watermark: result.watermark,
          generatedAt: result.generatedAt || new Date().toISOString()
        };
        break;

      default:
        break;
    }

    createAuditEntry({
      userId: user._id || user.id,
      userName: user.name,
      role: user.role,
      department: user.department,
      action: `AGENT_EXECUTION_${sanitizedAgentType}`,
      resource: '/api/agents/query',
      status: 'SUCCESS',
      details: `Executed registry agent ${sanitizedAgentType} under profile ${aiProfile} for query: "${sanitizedPrompt.substring(0, 40)}..."`
    });

    res.json(responseData);
  } catch (err) {
    console.error('Agent execution error:', err);
    res.status(500).json({ error: 'Agent execution failed.' });
  }
});
// POST /api/agents/orchestrate — Advanced Multi-Agent Orchestrator
router.post('/orchestrate', authenticateToken, async (req, res) => {
  try {
    const { query, mode, specificAgent, sessionId } = req.body;
    const user = req.user;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'User query is required for orchestration.' });
    }

    // Sanitize inputs
    const sanitizedQuery = sanitizeString(query);
    const sanitizedMode = mode ? sanitizeString(mode) : 'AUTO';
    const sanitizedAgent = specificAgent ? sanitizeString(specificAgent) : null;

    // Validate mode
    const allowedModes = ['AUTO', 'SINGLE', 'SEQUENTIAL', 'PARALLEL', 'SUPERVISOR'];
    if (!allowedModes.includes(sanitizedMode)) {
      return res.status(400).json({ error: `Invalid mode. Allowed: ${allowedModes.join(', ')}` });
    }

    const userId = user._id || user.id;
    const result = await AgentOrchestrator.orchestrate({
      query: sanitizedQuery,
      user,
      requestedMode: sanitizedMode,
      specificAgent: sanitizedAgent,
      sessionId: sessionId || `session_${userId}`
    });

    res.json(result);
  } catch (err) {
    console.error('Orchestration failure:', err);
    res.status(500).json({ error: `Multi-agent orchestration error: ${err.message}` });
  }
});

// GET /api/agents/registry — List all specialist agents & capabilities
router.get('/registry', authenticateToken, (req, res) => {
  try {
    const list = AgentRegistry.listAgents();
    res.json({ agents: list });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve agent registry' });
  }
});

// POST /api/agents/decompose — Preview query task decomposition
router.post('/decompose', authenticateToken, (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });
    const decomposition = TaskDecomposer.decompose(query, req.user.department);
    res.json(decomposition);
  } catch (err) {
    res.status(500).json({ error: 'Decomposition failed' });
  }
});

export default router;
