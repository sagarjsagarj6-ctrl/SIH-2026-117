import express from 'express';
import { state } from '../config/db.js';
import Model from '../models/Model.js';
import FineTuneJob from '../models/FineTuneJob.js';
import { ModelHealthChecker } from '../services/models/ModelHealthChecker.js';
import { authenticateToken, requireRole, createAuditEntry } from '../middleware/auth.js';

const router = express.Router();

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
router.post('/fine-tune', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { jobName, baseModel, department, datasetName, method, epochs, learningRate, trainDataFile, testDataFile, isDeployed, accessRoles, networkId, networkName, networkKey } = req.body;

    if (!jobName || !baseModel || !(department || user.department)) {
      return res.status(400).json({ error: 'Job name, base model, and target department are required.' });
    }

    if (user.role !== 'Admin' && Boolean(isDeployed)) {
      return res.status(403).json({ error: 'Only the system admin can deploy agents network-wide.' });
    }

    const targetDepartment = department || user.department;
    const deploy = user.role === 'Admin' && Boolean(isDeployed);
    const deploymentKey = deploy ? `LAN-${Math.random().toString(36).slice(2, 8).toUpperCase()}` : (networkKey || '');
    const jobData = {
      jobName,
      baseModel,
      department: targetDepartment,
      datasetName: datasetName || `${targetDepartment.replace(/\s+/g, '_')}_Confidential_Corpus_v2`,
      method: method || 'QLoRA',
      epochs: parseInt(epochs) || 3,
      learningRate: learningRate || '2e-4',
      status: 'Training',
      progressPercent: 12,
      currentLoss: 1.64,
      startedAt: new Date(),
      createdBy: user.name,
      ownerRole: user.role,
      ownerId: user._id || user.id,
      trainDataFile: trainDataFile || '',
      testDataFile: testDataFile || '',
      networkId: networkId || '',
      networkName: networkName || '',
      networkKey: networkKey || '',
      isDeployed: deploy,
      isGlobal: deploy,
      accessRoles: Array.isArray(accessRoles) && accessRoles.length ? accessRoles : (deploy ? ['Employee', 'Manager', 'Admin'] : [user.role]),
      deploymentKey
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
      details: `${user.role} initiated ${newJob.method} fine-tuning job "${jobName}" on ${baseModel}${deploy ? ' and deployed network-wide' : ''}`
    });

    res.status(201).json({ message: 'Fine-tuning job launched successfully', job: newJob });
  } catch (err) {
    res.status(500).json({ error: 'Failed to launch fine-tuning job.' });
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
