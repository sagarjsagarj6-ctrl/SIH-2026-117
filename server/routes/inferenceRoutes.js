/**
 * Inference Routes — Direct model execution, backend health, hardware allocation & real-time telemetry.
 */

import express from 'express';
import { InferenceRouter } from '../services/inference/InferenceRouter.js';
import { HardwareProfiler } from '../services/hardware/HardwareProfiler.js';
import { ModelAllocator } from '../services/hardware/ModelAllocator.js';
import { ResourceMonitor } from '../services/hardware/ResourceMonitor.js';
import { TokenCounter } from '../services/inference/TokenCounter.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/inference/backends — Check statuses of Ollama, vLLM, llama.cpp
router.get('/backends', authenticateToken, async (req, res) => {
  try {
    const statuses = await InferenceRouter.checkBackendStatuses();
    res.json({ backends: statuses });
  } catch (err) {
    res.status(500).json({ error: 'Failed to inspect inference backends' });
  }
});

// POST /api/inference/generate — Direct inference request
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { model, role, query, context, preferredBackend } = req.body;
    if (!query) return res.status(400).json({ error: 'Query prompt is required' });

    const result = await InferenceRouter.infer({
      model,
      role,
      query,
      context,
      preferredBackend
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: `Inference failed: ${err.message}` });
  }
});

// GET /api/inference/allocation — Hardware-aware model allocation recommendation
router.get('/allocation', authenticateToken, async (req, res) => {
  try {
    const allocation = await ModelAllocator.determineOptimalModel();
    res.json(allocation);
  } catch (err) {
    res.status(500).json({ error: 'Failed to determine hardware allocation' });
  }
});

// GET /api/inference/telemetry — Real-time GPU / CPU / RAM metrics
router.get('/telemetry', authenticateToken, (req, res) => {
  try {
    const metrics = ResourceMonitor.getMetrics();
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch resource telemetry' });
  }
});

// POST /api/inference/tokens — Count tokens for a given string
router.post('/tokens', authenticateToken, (req, res) => {
  try {
    const { text, model } = req.body;
    const tokens = TokenCounter.countTokens(text);
    const limit = TokenCounter.getModelLimit(model || 'DEFAULT');
    res.json({ tokens, contextLimit: limit, percentUtilized: Number(((tokens / limit) * 100).toFixed(1)) });
  } catch (err) {
    res.status(500).json({ error: 'Token counting failed' });
  }
});

export default router;
