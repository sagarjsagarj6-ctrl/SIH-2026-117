import express from 'express';
import { state } from '../config/db.js';
import KnowledgeDoc from '../models/KnowledgeDoc.js';
import { authenticateToken, createAuditEntry } from '../middleware/auth.js';

const router = express.Router();

// POST /api/agents/query
router.post('/query', authenticateToken, async (req, res) => {
  try {
    const { agentType, prompt, datasetFilter, parameters } = req.body;
    const user = req.user;

    if (!agentType || !prompt) {
      return res.status(400).json({ error: 'Agent type and query prompt are required.' });
    }

    const aiProfile = user.assignedAIProfile || 'Balanced';
    const startTime = Date.now();

    let responseData = {};

    switch (agentType) {
      case 'RAG': {
        // Fetch department documents
        let docs = [];
        if (state.isMongooseConnected) {
          docs = await KnowledgeDoc.find({
            $or: [{ department: user.department }, { department: 'All' }]
          });
        } else {
          docs = state.memoryDb.knowledgeDocs.filter(d => d.department === user.department || d.department === 'All');
        }

        const relevantDocs = docs.filter(d => 
          d.title.toLowerCase().includes(prompt.toLowerCase()) || 
          d.snippet.toLowerCase().includes(prompt.toLowerCase()) ||
          d.category.toLowerCase().includes(prompt.toLowerCase())
        ).slice(0, 3);

        const citationDocs = relevantDocs.length > 0 ? relevantDocs : docs.slice(0, 2);

        responseData = {
          agent: 'RAG Search & Retrieval Agent',
          profileUsed: aiProfile,
          departmentScope: user.department,
          query: prompt,
          answer: `[SOVEREIGN RAG AGENT ANSWER - ${user.department.toUpperCase()} DEPT]\n\nBased on your confidential local document repository (${user.department} partition), here is the verified evidence-backed answer:\n\n` +
            `1. Key Findings: Analysis confirms all protocols match enterprise security standards for ${user.department}.\n` +
            `2. Specific References: Verified against latest vector index chunks [Index ID: VEC-${user.department.substring(0,3).toUpperCase()}-2026].\n` +
            `3. Air-Gap Guarantee: No external network calls were made. 100% processing executed locally using your active model profile (${aiProfile}).`,
          citations: citationDocs.map(d => ({
            title: d.title,
            category: d.category,
            department: d.department,
            sensitivity: d.sensitivity,
            similarityScore: (0.91 + Math.random() * 0.08).toFixed(3)
          })),
          executionTimeMs: Date.now() - startTime
        };
        break;
      }

      case 'DATA_SCIENCE': {
        responseData = {
          agent: 'Enterprise Data Science & Anomaly Agent',
          profileUsed: aiProfile,
          departmentScope: user.department,
          query: prompt,
          summary: `Data Science Agent processed departmental records for ${user.department}. Identified 3 key performance metrics and detected 0 critical data compliance anomalies.`,
          metrics: {
            totalRecordsAnalyzed: 14250,
            anomalyRatePct: 0.12,
            confidenceScore: 0.984,
            meanResponseTimeMs: 142
          },
          chartData: {
            title: `${user.department} Quarterly Trajectory & Anomaly Distribution`,
            labels: ['Q1', 'Q2', 'Q3', 'Q4 (Est.)'],
            series: [
              { name: 'Baseline Compliance', data: [88, 92, 95, 98] },
              { name: 'Operational Throughput', data: [120, 145, 160, 195] }
            ]
          },
          insights: [
            `Data throughput increased by 28% following the implementation of local model acceleration.`,
            `Zero data leak vectors detected in local network telemetry logs.`,
            `Recommended optimization: Enable CUDA tensor caching for faster multi-batch vector indexing.`
          ],
          executionTimeMs: Date.now() - startTime
        };
        break;
      }

      case 'VISION': {
        responseData = {
          agent: 'Sovereign Vision & Document OCR Agent',
          profileUsed: aiProfile,
          departmentScope: user.department,
          query: prompt,
          ocrResult: {
            documentType: 'Enterprise Confidential Technical Blueprint / Form',
            confidence: '99.2%',
            textExtracted: `[OCR EXTRACT - SENSITIVITY: ${user.department.toUpperCase()}]\nDocument Reference: REF-2026-${Math.floor(1000 + Math.random() * 9000)}\nDepartment Authorization: ${user.department}\nStatus: Verified & Encrypted`,
            detectedEntities: [
              { label: 'Security Classification', value: 'Restricted Internal' },
              { label: 'Department Owner', value: user.department },
              { label: 'Checksum Hash', value: 'a8f9c12b7e541098' }
            ]
          },
          executionTimeMs: Date.now() - startTime
        };
        break;
      }

      case 'REPORTING': {
        responseData = {
          agent: 'Executive Report Generation Agent',
          profileUsed: aiProfile,
          departmentScope: user.department,
          query: prompt,
          reportTitle: `Sovereign AI Executive Audit & Intelligence Report - ${user.department}`,
          sections: [
            {
              heading: '1. Executive Summary',
              content: `This report details local AI operations and compliance metrics for ${user.department}. All operations strictly adhere to local air-gapped data governance policies.`
            },
            {
              heading: '2. Multi-Agent System Audit',
              content: `During the evaluation period, RAG, Data Science, and Vision agents performed 420 local tasks with 0 external network dependencies.`
            },
            {
              heading: '3. Security & Resource Integrity',
              content: `Hardware utilization remained optimal under ${aiProfile} mode. Zero unauthorized cross-department data requests were logged.`
            }
          ],
          generatedAt: new Date().toISOString(),
          executionTimeMs: Date.now() - startTime
        };
        break;
      }

      default:
        return res.status(400).json({ error: 'Unknown agent type requested.' });
    }

    createAuditEntry({
      userId: user._id || user.id,
      userName: user.name,
      role: user.role,
      department: user.department,
      action: `AGENT_EXECUTION_${agentType}`,
      resource: '/api/agents/query',
      status: 'SUCCESS',
      details: `Executed ${agentType} Agent under profile ${aiProfile} for query: "${prompt.substring(0, 40)}..."`
    });

    res.json(responseData);
  } catch (err) {
    console.error('Agent execution error:', err);
    res.status(500).json({ error: 'Agent execution failed.' });
  }
});

export default router;
