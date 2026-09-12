import express from 'express';
import { AgentOrchestrator } from '../agents/AgentOrchestrator.js';
import { AgentRegistry } from '../agents/AgentRegistry.js';
import { TaskDecomposer } from '../agents/TaskDecomposer.js';
import { InferenceRouter } from '../services/inference/InferenceRouter.js';
import { authenticateToken, createAuditEntry } from '../middleware/auth.js';
import { ToolPermissionService } from '../services/security/ToolPermissionService.js';

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

const requireToolPermission = ({ toolId, payload, req, res }) => {
  const input = ToolPermissionService.validateInput(toolId, payload);
  if (!input.valid) {
    res.status(400).json({ error: 'Invalid tool input.', reasons: input.errors });
    return null;
  }

  const decision = ToolPermissionService.authorize({
    toolId,
    user: req.user,
    resource: { department: req.user.department },
    context: { ipAddress: req.ip, approval: req.body?.approval }
  });
  if (!decision.allowed) {
    createAuditEntry({
      userId: req.user._id || req.user.id,
      userName: req.user.name,
      role: req.user.role,
      department: req.user.department,
      action: 'TOOL_PERMISSION_DENIED',
      resource: toolId,
      status: 'DENIED',
      details: (decision.reasons || []).join(' ')
    });
    res.status(decision.approval?.required ? 409 : 403).json({
      error: decision.approval?.required ? 'Human approval is required before this tool can run.' : 'Forbidden by tool policy.',
      toolId,
      riskLevel: decision.riskLevel,
      approval: decision.approval,
      reasons: decision.reasons || []
    });
    return null;
  }
  return decision;
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

    const toolId = ToolPermissionService.toolIdForAgent(sanitizedAgentType);
    if (!requireToolPermission({
      toolId,
      payload: { prompt: sanitizedPrompt, parameters: sanitizedParams, imageText, imageBase64, dataset },
      req,
      res
    })) return;

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
      modelUsed: result.inference?.modelUsed || message.payload?.metadata?.modelUsed,
      liveModelResponse: Boolean(result.inference?.live),
      runtimeError: result.inference?.error || null,
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
          charts: result.charts,
          modelNarrative: result.modelNarrative || '',
          inference: result.inference || null
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
            simulation: result.ocrSimulation,
            sourceType: result.ocrResult?.sourceType,
            analysisStatus: result.ocrResult?.analysisStatus,
            observations: result.ocrResult?.observations || [],
            inferences: result.ocrResult?.inferences || [],
            verification: result.ocrResult?.verification || {},
            capabilities: result.ocrResult?.capabilities || {},
            warnings: result.ocrResult?.warnings || []
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
          generatedAt: result.generatedAt || new Date().toISOString(),
          modelNarrative: result.modelNarrative || '',
          inference: result.inference || null
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

    if (!requireToolPermission({
      toolId: 'agent.orchestrate.execute',
      payload: { query: sanitizedQuery, mode: sanitizedMode, specificAgent: sanitizedAgent },
      req,
      res
    })) return;

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

// GET /api/agents/tools — expose server-enforced tool contracts and the
// current caller's eligibility without trusting UI-only role restrictions.
router.get('/tools', authenticateToken, (req, res) => {
  const tools = ToolPermissionService.listTools().map((tool) => {
    const decision = ToolPermissionService.authorize({
      toolId: tool.id,
      user: req.user,
      resource: { department: req.user.department },
      context: { ipAddress: req.ip }
    });
    return {
      ...tool,
      allowed: decision.allowed,
      reasons: decision.reasons,
      approval: decision.approval
    };
  });
  res.json({ tools });
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

// GET /api/agents/status — Check inference backend status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const statuses = await InferenceRouter.checkBackendStatuses();
    res.json({
      status: 'OK',
      backends: statuses,
      privacyMode: 'SOVEREIGN_LOCAL_ONLY',
      message: 'All inference stays on-premise. No external API calls.'
    });
  } catch (err) {
    res.status(500).json({ error: 'Status check failed' });
  }
});

// POST /api/agents/chat — Real-time streaming chat with agents
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { query, model, stream = true } = req.body;
    const user = req.user;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Decompose query to determine agent routing
    const decomposition = TaskDecomposer.decompose(query, user.department);
    const primaryAgent = decomposition.tasks[0]?.agentKey || 'RAG';
    
    // Determine role based on agent
    const roleMap = {
      'RAG': 'RAG',
      'DATA_SCIENCE': 'DATA_SCIENCE',
      'VISION': 'VISION',
      'REPORTING': 'REPORTING'
    };
    const role = roleMap[primaryAgent] || 'GENERAL';

    if (stream) {
      // Streaming response via SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      // Send initial metadata
      res.write(`data: ${JSON.stringify({ 
        type: 'start', 
        agent: primaryAgent,
        role,
        query: query.slice(0, 100)
      })}\n\n`);

      // Stream inference results
      for await (const chunk of InferenceRouter.inferStream({
        model: model || 'Mistral-7B-v0.3-Enterprise',
        role,
        query,
        context: '',
        preferredBackend: 'AUTO'
      })) {
        if (chunk.token) {
          res.write(`data: ${JSON.stringify({ 
            type: 'token', 
            content: chunk.token,
            backend: chunk.backend
          })}\n\n`);
        }
        if (chunk.done) {
          res.write(`data: ${JSON.stringify({ 
            type: 'done', 
            metrics: chunk.metrics,
            backend: chunk.backend,
            live: chunk.live === true,
            error: chunk.error || null
          })}\n\n`);
          break;
        }
      }

      res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
      res.end();
    } else {
      // Non-streaming response
      const result = await InferenceRouter.infer({
        model: model || 'Mistral-7B-v0.3-Enterprise',
        role,
        query,
        context: ''
      });

      res.json({
        agent: primaryAgent,
        role,
        query,
        response: result.response,
        backendUsed: result.backendUsed,
        usedFallback: result.usedFallback,
        live: result.live,
        modelUsed: result.modelUsed,
        error: result.error || null,
        metrics: result.metrics,
        privacy: result.privacy,
        decomposition
      });
    }
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Chat processing failed' });
  }
});

// GET /api/agents/backends — List available local backends
router.get('/backends', authenticateToken, async (req, res) => {
  try {
    const statuses = await InferenceRouter.checkBackendStatuses();
    
    const available = [];
    const unavailable = [];
    
    if (statuses.ollama === 'ONLINE') available.push({ name: 'Ollama', status: 'ONLINE' });
    else unavailable.push({ name: 'Ollama', status: 'STOPPED', hint: 'Run: ollama serve' });
    
    if (statuses.vllm === 'ONLINE') available.push({ name: 'VLLM', status: 'ONLINE' });
    else unavailable.push({ name: 'VLLM', status: 'STOPPED', hint: 'Start vLLM server' });
    
    if (statuses.llamacpp === 'ONLINE') available.push({ name: 'LlamaCpp', status: 'ONLINE' });
    else unavailable.push({ name: 'LlamaCpp', status: 'STOPPED', hint: 'Load GGUF model' });

    res.json({
      privacyMode: 'SOVEREIGN_LOCAL_ONLY',
      externalAPICalls: 0,
      backends: {
        available,
        unavailable,
        primary: statuses.primaryBackend,
        intelligentFallback: 'Always available (no external calls)'
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check backends' });
  }
});

export default router;
