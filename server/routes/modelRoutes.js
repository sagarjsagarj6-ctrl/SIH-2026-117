import express from 'express';
import multer from 'multer';
import { state } from '../config/db.js';
import Model from '../models/Model.js';
import FineTuneJob from '../models/FineTuneJob.js';
import { ModelHealthChecker } from '../services/models/ModelHealthChecker.js';
import { FineTuneOrchestrator } from '../services/finetune/FineTuneOrchestrator.js';
import { TrainingRuntime } from '../services/finetune/TrainingRuntime.js';
import { MAX_UPLOAD_BYTES, uploadFileFilter } from '../services/ingestion/uploadPolicy.js';
import { authenticateToken, requireRole, createAuditEntry } from '../middleware/auth.js';

const router = express.Router();
const trainingDatasetUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: uploadFileFilter,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 }
});

const isOwnedByUser = (job, user) => {
  const ownerId = job.ownerId || job.createdBy || '';
  return user.role === 'Admin' || String(ownerId) === String(user._id || user.id) || job.createdBy === user.name;
};

const getUserNetworkKeys = (user) => {
  if (!state.memoryDb || !Array.isArray(state.memoryDb.networks)) return [];
  return state.memoryDb.networks
    .filter(network => {
      const userId = String(user._id || user.id || '');
      const memberIds = (network.members || []).map(member => String(member.userId || member.id || ''));
      const hasMember = memberIds.includes(userId) || (network.createdBy && String(network.createdBy) === userId) || (network.members || []).some(member => member.email === user.email);
      return hasMember;
    })
    .map(network => network.networkKey)
    .filter(Boolean);
};

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

// POST /api/models/benchmark — timed InferenceRouter probe (Admin; Managers may read-compare via /inference/generate)
router.post('/benchmark', authenticateToken, requireRole(['Admin', 'Manager']), async (req, res) => {
  try {
    const { modelName, prompt } = req.body;
    const { InferenceRouter } = await import('../services/inference/InferenceRouter.js');
    const benchPrompt = prompt || 'Benchmark probe: summarize air-gapped sovereign AI readiness in one sentence.';

    const result = await InferenceRouter.infer({
      model: modelName || 'Mistral-7B-v0.3-Enterprise',
      role: 'GENERAL',
      query: benchPrompt
    });

    createAuditEntry({
      userId: req.user._id || req.user.id,
      userName: req.user.name,
      role: req.user.role,
      department: req.user.department,
      action: 'MODEL_BENCHMARK_EXECUTED',
      resource: '/api/models/benchmark',
      details: `Ran inference benchmark on ${modelName || 'default'} via ${result.backendUsed}`
    });

    res.json({
      message: `Benchmark completed for ${modelName || 'Local Models'}`,
      usedFallback: result.usedFallback,
      backendUsed: result.backendUsed,
      sampleResponse: result.response,
      results: {
        tokensPerSecond: `${result.metrics.tokensPerSecond} t/s`,
        firstTokenLatencyMs: `${result.metrics.latencyMs} ms`,
        tokensGenerated: result.metrics.tokensGenerated,
        inputTokens: result.metrics.inputTokens,
        usedFallback: result.usedFallback
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Benchmarking failed.' });
  }
});
// GET /api/models/training/capabilities — truthfully report whether live local LoRA is available
router.get('/training/capabilities', authenticateToken, async (req, res) => {
  try {
    res.json(await TrainingRuntime.getCapabilities());
  } catch (err) {
    res.status(500).json({ error: 'Failed to inspect local training capabilities.' });
  }
});

// GET /api/models/fine-tune
router.get('/fine-tune', authenticateToken, async (req, res) => {
  try {
    let jobs = [];
    if (state.isMongooseConnected) {
      jobs = await FineTuneJob.find().sort({ createdAt: -1 });
    } else {
      jobs = [...state.memoryDb.fineTuneJobs];
    }

    const user = req.user;
    const userNetworkKeys = getUserNetworkKeys(user);
    const visibleJobs = user.role === 'Admin'
      ? jobs
      : jobs.filter(job => {
          const deptMatch = job.department === user.department || job.department === 'All';
          const globalMatch = job.isGlobal === true || job.isDeployed === true;
          const ownerMatch = isOwnedByUser(job, user);
          const networkMatch = Boolean(job.networkKey && userNetworkKeys.includes(job.networkKey));
          return deptMatch && (globalMatch || ownerMatch || networkMatch);
        });

    res.json(visibleJobs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch fine-tuning jobs.' });
  }
});

// POST /api/models/fine-tune
router.post('/fine-tune/dataset', authenticateToken, trainingDatasetUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Upload a JSON or JSONL training dataset.' });
    const saved = await TrainingRuntime.saveUploadedDataset({
      buffer: req.file.buffer,
      originalName: req.file.originalname
    });
    res.status(201).json({ message: 'Training dataset staged locally.', ...saved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/fine-tune', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const {
      jobName,
      baseModel,
      department,
      method,
      epochs,
      learningRate,
      trainingConfig,
      requestedExecutionMode,
      trainDataFile,
      testDataFile,
      trainDataFilePath,
      isDeployed,
      accessRoles,
      networkId,
      networkName,
      networkKey
    } = req.body;

    if (!jobName || !baseModel || !(department || user.department)) {
      return res.status(400).json({ error: 'Job name, base model, and target department are required.' });
    }

    if (user.role !== 'Admin' && Boolean(isDeployed)) {
      return res.status(403).json({ error: 'Only the system admin can deploy agents network-wide.' });
    }

    const targetDepartment = department || user.department;
    const deploy = user.role === 'Admin' && Boolean(isDeployed);
    const deploymentKey = deploy ? `LAN-${Math.random().toString(36).slice(2, 8).toUpperCase()}` : (networkKey || '');
    const result = await FineTuneOrchestrator.startJob({
      jobName,
      baseModel,
      department: targetDepartment,
      method: method || 'QLoRA',
      epochs,
      learningRate: learningRate || '2e-4',
      trainingConfig: trainingConfig || {},
      requestedExecutionMode: requestedExecutionMode || 'AUTO',
      createdBy: user.name,
      ownerRole: user.role,
      ownerId: user._id || user.id,
      trainDataFile: trainDataFile || '',
      testDataFile: testDataFile || '',
      trainDataFilePath: trainDataFilePath || '',
      extra: {
        networkId: networkId || '',
        networkName: networkName || '',
        networkKey: networkKey || '',
        isDeployed: deploy,
        isGlobal: deploy,
        accessRoles: Array.isArray(accessRoles) && accessRoles.length ? accessRoles : (deploy ? ['Employee', 'Manager', 'Admin'] : [user.role]),
        deploymentKey
      }
    });
    const newJob = result.job;
    void FineTuneOrchestrator.runJob(newJob._id || newJob.id);

    createAuditEntry({
      userId: req.user._id || req.user.id,
      userName: req.user.name,
      role: req.user.role,
      department: req.user.department,
      action: 'FINE_TUNE_JOB_STARTED',
      resource: '/api/models/fine-tune',
      details: `${user.role} initiated ${newJob.method} fine-tuning job "${jobName}" on ${baseModel}${deploy ? ' and deployed network-wide' : ''}`
    });

    res.status(201).json({
      message: `Fine-tuning job launched in ${newJob.executionMode} mode.`,
      job: newJob,
      datasetSummary: result.datasetSummary,
      trainingCapabilities: result.capabilities
    });
  } catch (err) {
    const status = Number.isInteger(err.status) ? err.status : 500;
    res.status(status).json({ error: status === 500 ? 'Failed to launch fine-tuning job.' : err.message });
  }
});

router.get('/fine-tune/:id', authenticateToken, async (req, res) => {
  try {
    const job = await FineTuneOrchestrator.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'Fine-tune job not found.' });
    if (!isOwnedByUser(job, req.user) && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'You are not allowed to view this training job.' });
    }
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch fine-tune job.' });
  }
});

router.post('/fine-tune/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const job = await FineTuneOrchestrator.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'Fine-tune job not found.' });
    if (!isOwnedByUser(job, req.user) && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Only the job owner or an administrator can cancel training.' });
    }
    const updated = await FineTuneOrchestrator.cancelJob(req.params.id);
    res.json({ message: 'Cancellation requested.', job: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel fine-tune job.' });
  }
});

router.post('/fine-tune/:id/validate', authenticateToken, async (req, res) => {
  try {
    const job = await FineTuneOrchestrator.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'Fine-tune job not found.' });
    if (!isOwnedByUser(job, req.user) && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Only the job owner or an administrator can validate training.' });
    }
    const result = await FineTuneOrchestrator.validateJob(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to validate fine-tune job.' });
  }
});

router.delete('/fine-tune/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    let jobs = [];
    if (state.isMongooseConnected) {
      jobs = await FineTuneJob.find().sort({ createdAt: -1 });
    } else {
      jobs = [...state.memoryDb.fineTuneJobs];
    }

    const job = jobs.find(j => String(j._id) === String(id));
    if (!job) return res.status(404).json({ error: 'Fine-tune job not found.' });
    if (user.role !== 'Admin' && !isOwnedByUser(job, user)) {
      return res.status(403).json({ error: 'You can only remove your own training jobs.' });
    }
    if (user.role !== 'Admin' && job.isDeployed) {
      return res.status(403).json({ error: 'Only the admin can remove a deployed network agent.' });
    }

    if (state.isMongooseConnected) {
      await FineTuneJob.deleteOne({ _id: job._id });
    } else {
      state.memoryDb.fineTuneJobs = state.memoryDb.fineTuneJobs.filter(j => String(j._id) !== String(id));
    }

    res.json({ message: 'Fine-tuning job removed successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove fine-tune job.' });
  }
});

router.post('/fine-tune/:id/deploy', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { networkKey, networkName, networkId } = req.body || {};
    let job;
    const generatedKey = networkKey || `LAN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    if (state.isMongooseConnected) {
      job = await FineTuneJob.findById(id);
      if (!job) return res.status(404).json({ error: 'Fine-tune job not found.' });
      job.isDeployed = true;
      job.isGlobal = true;
      job.accessRoles = ['Employee', 'Manager', 'Admin'];
      job.networkKey = generatedKey;
      job.networkName = networkName || job.networkName || 'Primary Enterprise LAN';
      job.networkId = networkId || job.networkId || 'lan-primary';
      job.deploymentKey = job.deploymentKey || generatedKey;
      await job.save();
    } else {
      job = state.memoryDb.fineTuneJobs.find(j => String(j._id) === String(id));
      if (!job) return res.status(404).json({ error: 'Fine-tune job not found.' });
      job.isDeployed = true;
      job.isGlobal = true;
      job.accessRoles = ['Employee', 'Manager', 'Admin'];
      job.networkKey = generatedKey;
      job.networkName = networkName || job.networkName || 'Primary Enterprise LAN';
      job.networkId = networkId || job.networkId || 'lan-primary';
      job.deploymentKey = job.deploymentKey || generatedKey;
    }

    res.json({ message: 'Agent deployed across the LAN network.', job });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deploy fine-tune job.' });
  }
});

// GET /api/models/health — Real-time ping & health check on all registered models
router.get('/health', authenticateToken, async (req, res) => {
  try {
    const health = await ModelHealthChecker.checkAllModels();
    res.json(health);
  } catch (err) {
    res.status(500).json({ error: 'Failed to execute model health checks' });
  }
});

export default router;
