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
import { pushNotifications, getNotificationRecipients } from '../services/notificationService.js';

const router = express.Router();
const trainingDatasetUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: uploadFileFilter,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 }
});

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

const loadFineTuneJobs = async () => {
  if (state.isMongooseConnected) return FineTuneJob.find().sort({ createdAt: -1 });
  return [...(state.memoryDb.fineTuneJobs || [])].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
};

const canViewDeployedJob = (job, user) => {
  if (user?.role === 'Admin') return true;
  if (!job?.isDeployed || job.status !== 'Completed') return false;
  const accessRoles = Array.isArray(job.accessRoles) && job.accessRoles.length
    ? job.accessRoles
    : ['Manager', 'Employee'];
  if (!accessRoles.includes(user?.role)) return false;
  const departmentMatches = job.department === user.department || job.department === 'All';
  const networkKeys = getUserNetworkKeys(user);
  return departmentMatches && Boolean(job.networkKey && networkKeys.includes(job.networkKey));
};

const getActiveNetwork = ({ networkId = '', networkKey = '' } = {}) => {
  const networks = Array.isArray(state.memoryDb.networks) ? state.memoryDb.networks : [];
  if (!networkId && !networkKey) return null;
  return networks.find(network => (
    network.status === 'Active'
    && ((!networkId || network._id === networkId || network.networkId === networkId)
      && (!networkKey || network.networkKey === networkKey || network.accessToken === networkKey))
  )) || null;
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
    const jobs = await loadFineTuneJobs();
    const user = req.user;
    const visibleJobs = user.role === 'Admin'
      ? jobs
      : jobs.filter(job => canViewDeployedJob(job, user));

    res.json(visibleJobs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch fine-tuning jobs.' });
  }
});

// Only Admins may stage confidential data for training.
router.post('/fine-tune/dataset', authenticateToken, requireRole('Admin'), trainingDatasetUpload.single('file'), async (req, res) => {
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

router.post('/fine-tune', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const user = req.user;
    const {
      jobName,
      baseModel,
      department,
      trainingFamily,
      method,
      epochs,
      learningRate,
      trainingConfig,
      requestedExecutionMode,
      trainDataFile,
      testDataFile,
      trainDataFilePath,
    } = req.body;

    if (!jobName || !baseModel || !(department || user.department)) {
      return res.status(400).json({ error: 'Job name, base model, and target department are required.' });
    }

    const targetDepartment = department || user.department;
    const result = await FineTuneOrchestrator.startJob({
      jobName,
      baseModel,
      department: targetDepartment,
      trainingFamily: trainingFamily || 'LLM_FINE_TUNING',
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
        isDeployed: false,
        isGlobal: false,
        accessRoles: ['Employee', 'Manager'],
        deploymentStatus: 'NOT_DEPLOYED'
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
      details: `Admin initiated ${newJob.method} fine-tuning job "${jobName}" on ${baseModel} for ${targetDepartment}`
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

// Deployed model catalog for Manager/Employee agent surfaces.
router.get('/fine-tune/deployed', authenticateToken, async (req, res) => {
  try {
    const jobs = await loadFineTuneJobs();
    const visibleJobs = req.user.role === 'Admin'
      ? jobs.filter(job => job.isDeployed && job.status === 'Completed')
      : jobs.filter(job => canViewDeployedJob(job, req.user));
    res.json(visibleJobs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch deployed models.' });
  }
});

router.get('/fine-tune/:id', authenticateToken, async (req, res) => {
  try {
    const job = await FineTuneOrchestrator.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'Fine-tune job not found.' });
    if (!canViewDeployedJob(job, req.user)) {
      return res.status(403).json({ error: 'You are not allowed to view this training job.' });
    }
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch fine-tune job.' });
  }
});

router.post('/fine-tune/:id/cancel', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const job = await FineTuneOrchestrator.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'Fine-tune job not found.' });
    const updated = await FineTuneOrchestrator.cancelJob(req.params.id);
    res.json({ message: 'Cancellation requested.', job: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel fine-tune job.' });
  }
});

router.post('/fine-tune/:id/validate', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const job = await FineTuneOrchestrator.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'Fine-tune job not found.' });
    const result = await FineTuneOrchestrator.validateJob(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to validate fine-tune job.' });
  }
});

router.delete('/fine-tune/:id', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    let jobs = [];
    if (state.isMongooseConnected) {
      jobs = await FineTuneJob.find().sort({ createdAt: -1 });
    } else {
      jobs = [...state.memoryDb.fineTuneJobs];
    }

    const job = jobs.find(j => String(j._id) === String(id));
    if (!job) return res.status(404).json({ error: 'Fine-tune job not found.' });
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
    const { networkId, networkKey } = req.body || {};
    let job;
    if (state.isMongooseConnected) {
      job = await FineTuneJob.findById(id);
      if (!job) return res.status(404).json({ error: 'Fine-tune job not found.' });
    } else {
      job = state.memoryDb.fineTuneJobs.find(j => String(j._id) === String(id));
      if (!job) return res.status(404).json({ error: 'Fine-tune job not found.' });
    }

    if (job.status !== 'Completed') {
      return res.status(409).json({ error: `Model cannot be deployed while the job status is ${job.status}.` });
    }
    if (job.validation?.status !== 'PASSED' || job.evaluationStatus !== 'PASSED') {
      return res.status(409).json({
        error: 'Model deployment is blocked until a held-out evaluation is completed and marked PASSED.',
        evaluationStatus: job.evaluationStatus || 'REVIEW_REQUIRED',
        validation: job.validation || null
      });
    }

    const network = getActiveNetwork({ networkId: networkId || job.networkId, networkKey: networkKey || job.networkKey });
    if (!network || !network.networkKey) {
      return res.status(409).json({ error: 'Select an active private LAN with a valid access token before deploying the model.' });
    }

    const deployedAt = new Date();
    const deploymentPatch = {
      isDeployed: true,
      isGlobal: true,
      accessRoles: ['Employee', 'Manager'],
      networkKey: network.networkKey,
      networkName: network.name,
      networkId: network.networkId || network._id,
      deploymentKey: job.deploymentKey || network.networkKey,
      deploymentStatus: 'DEPLOYED',
      deployedAt,
      deployedBy: String(req.user._id || req.user.id || req.user.name || '')
    };

    if (state.isMongooseConnected) {
      job = await FineTuneJob.findByIdAndUpdate(id, { $set: deploymentPatch }, { new: true, runValidators: true });
    } else {
      Object.assign(job, deploymentPatch, { updatedAt: deployedAt });
    }

    const recipients = await getNotificationRecipients({ department: job.department, roles: ['Manager', 'Employee'] });
    const notifications = pushNotifications({
      recipientUserIds: recipients.map(recipient => String(recipient._id || recipient.id || '')),
      type: 'MODEL_DEPLOYED',
      title: `Model deployed to ${network.name}`,
      message: `${job.jobName} is available for your ${job.department} agent workflow after joining the private LAN.`,
      summary: `${job.baseModel} · ${job.method} · ${job.department}`,
      networkId: network.networkId || network._id,
      networkName: network.name,
      networkKey: network.networkKey,
      metadata: {
        jobId: String(job._id || job.id),
        jobName: job.jobName,
        baseModel: job.baseModel,
        trainingFamily: job.trainingFamily || 'LLM_FINE_TUNING',
        method: job.method,
        requiresLanMembership: true,
        deployedAt: deployedAt.toISOString()
      }
    });

    createAuditEntry({
      userId: req.user._id || req.user.id,
      userName: req.user.name,
      role: req.user.role,
      department: req.user.department,
      action: 'FINE_TUNE_JOB_DEPLOYED',
      resource: `/api/models/fine-tune/${id}/deploy`,
      status: 'SUCCESS',
      details: `Admin deployed ${job.jobName} to active private LAN ${network.name}; notified ${notifications.length} manager/employee recipient(s)`
    });

    res.json({ message: 'Model deployed to the active private LAN.', job, notificationCount: notifications.length });
  } catch (err) {
    const status = Number.isInteger(err.status) ? err.status : 500;
    res.status(status).json({ error: status === 500 ? 'Failed to deploy fine-tune job.' : err.message });
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
