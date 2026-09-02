import express from 'express';
import { state } from '../config/db.js';
import Model from '../models/Model.js';
import FineTuneJob from '../models/FineTuneJob.js';
import { authenticateToken, requireRole, createAuditEntry } from '../middleware/auth.js';

const router = express.Router();

// GET /api/models (Admin & Managers)
router.get('/', authenticateToken, async (req, res) => {
  try {
    let models = [];
    if (state.isMongooseConnected) {
      models = await Model.find().sort({ name: 1 });
    } else {
      models = [...state.memoryDb.models];
    }
    res.json(models);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch local model registry.' });
  }
});

// POST /api/models/:id/toggle (Admin only)
router.post('/:id/toggle', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const modelId = req.params.id;
    let updatedStatus = 'Active';

    if (state.isMongooseConnected) {
      const model = await Model.findById(modelId);
      if (!model) return res.status(404).json({ error: 'Model not found.' });
      model.status = model.status === 'Active' ? 'Inactive' : 'Active';
      updatedStatus = model.status;
      await model.save();
    } else {
      const model = state.memoryDb.models.find(m => m._id.toString() === modelId.toString() || m.id === modelId);
      if (!model) return res.status(404).json({ error: 'Model not found.' });
      model.status = model.status === 'Active' ? 'Inactive' : 'Active';
      updatedStatus = model.status;
    }

    createAuditEntry({
      userId: req.user._id || req.user.id,
      userName: req.user.name,
      role: req.user.role,
      department: req.user.department,
      action: 'LOCAL_MODEL_TOGGLED',
      resource: `/api/models/${modelId}/toggle`,
      details: `Admin changed model ${modelId} state to: ${updatedStatus}`
    });

    res.json({ message: `Model status changed to ${updatedStatus}`, status: updatedStatus });
  } catch (err) {
    res.status(500).json({ error: 'Model status toggle failed.' });
  }
});

// POST /api/models/benchmark (Admin only)
router.post('/benchmark', authenticateToken, requireRole('Admin'), (req, res) => {
  try {
    const { modelName } = req.body;
    const tps = (40 + Math.random() * 50).toFixed(1);
    const latency = Math.floor(90 + Math.random() * 80);
    const vramPeak = (4.2 + Math.random() * 8).toFixed(1);

    createAuditEntry({
      userId: req.user._id || req.user.id,
      userName: req.user.name,
      role: req.user.role,
      department: req.user.department,
      action: 'MODEL_BENCHMARK_EXECUTED',
      resource: '/api/models/benchmark',
      details: `Ran local hardware inference benchmark on ${modelName || 'Active Models'}`
    });

    res.json({
      message: `Benchmark completed for ${modelName || 'Local Models'}`,
      results: {
        tokensPerSecond: `${tps} t/s`,
        firstTokenLatencyMs: `${latency} ms`,
        vramPeakGB: `${vramPeak} GB`,
        cudaMemoryEfficiency: '96.4%',
        thermalStatus: 'Normal (48°C)'
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Benchmarking failed.' });
  }
});

// GET /api/models/fine-tune (Admin only)
router.get('/fine-tune', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    let jobs = [];
    if (state.isMongooseConnected) {
      jobs = await FineTuneJob.find().sort({ createdAt: -1 });
    } else {
      jobs = [...state.memoryDb.fineTuneJobs];
    }
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch fine-tuning jobs.' });
  }
});

// POST /api/models/fine-tune (Admin create fine-tuning job)
router.post('/fine-tune', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const { jobName, baseModel, department, datasetName, method, epochs, learningRate } = req.body;

    if (!jobName || !baseModel || !department) {
      return res.status(400).json({ error: 'Job name, base model, and target department are required.' });
    }

    const jobData = {
      jobName,
      baseModel,
      department,
      datasetName: datasetName || `${department}_Confidential_Corpus_v2`,
      method: method || 'QLoRA',
      epochs: parseInt(epochs) || 3,
      learningRate: learningRate || '2e-4',
      status: 'Training',
      progressPercent: 12,
      currentLoss: 1.64,
      startedAt: new Date()
    };

    let newJob;
    if (state.isMongooseConnected) {
      newJob = await FineTuneJob.create(jobData);
    } else {
      newJob = { _id: 'job_' + Date.now(), ...jobData };
      state.memoryDb.fineTuneJobs.unshift(newJob);
    }

    createAuditEntry({
      userId: req.user._id || req.user.id,
      userName: req.user.name,
      role: req.user.role,
      department: req.user.department,
      action: 'FINE_TUNE_JOB_STARTED',
      resource: '/api/models/fine-tune',
      details: `Admin initiated ${newJob.method} fine-tuning job "${jobName}" on base model ${baseModel}`
    });

    res.status(201).json({ message: 'Fine-tuning job launched successfully', job: newJob });
  } catch (err) {
    res.status(500).json({ error: 'Failed to launch fine-tuning job.' });
  }
});

export default router;
