import express from 'express';
import multer from 'multer';
import { authenticateToken, requireRole, createAuditEntry } from '../middleware/auth.js';
import { MAX_UPLOAD_BYTES, uploadFileFilter } from '../services/ingestion/uploadPolicy.js';
import { ImageModelService } from '../services/imageModel/ImageModelService.js';
import { state } from '../config/db.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: uploadFileFilter,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 12 }
});
const imageUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, callback) => {
    if (!String(file.mimetype || '').toLowerCase().startsWith('image/')) {
      const error = new Error('Image model uploads must be PNG, JPEG, TIFF, BMP, or WebP images.');
      error.code = 'IMAGE_REQUIRED';
      return callback(error);
    }
    callback(null, true);
  },
  limits: { fileSize: 20 * 1024 * 1024, files: 1 }
});

const parseSamples = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

router.get(['/', '/jobs'], authenticateToken, (req, res) => {
  if (!['Admin', 'Manager', 'Employee'].includes(req.user.role)) return res.status(403).json({ error: 'This role cannot access the image model.' });
  res.json({
    jobs: ImageModelService.listJobs(req.user),
    lanConnected: ImageModelService.isLanConnected(req.user),
    canTrain: req.user.role === 'Admin'
  });
});

router.get('/active', authenticateToken, (req, res) => {
  try {
    if (!['Admin', 'Manager', 'Employee'].includes(req.user.role)) return res.status(403).json({ error: 'This role cannot access the image model.' });
    ImageModelService.assertLanForUse(req.user);
    const job = ImageModelService.getUsableJob(req.user);
    if (!job || (req.user.role !== 'Admin' && !job.isDeployed)) {
      return res.status(404).json({ error: 'No deployed image model is available on this LAN.' });
    }
    res.json({ job: ImageModelService.publicJob(job), lanConnected: true });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message, requiresLanMembership: error.requiresLanMembership || false });
  }
});

router.get('/networks', authenticateToken, requireRole('Admin'), (_req, res) => {
  const networks = (state.memoryDb.networks || []).filter((network) => network.status === 'Active');
  res.json({
    networks: networks.map((network) => ({
      _id: network._id,
      networkId: network.networkId || network._id,
      name: network.name,
      networkKey: network.networkKey
    }))
  });
});

router.post('/uploads', authenticateToken, requireRole(['Admin', 'Manager', 'Employee']), imageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Choose an image from camera or gallery.' });
    const record = await ImageModelService.saveUpload({
      user: req.user,
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      kind: req.body?.kind || 'query'
    });
    res.status(201).json({ upload: { _id: record._id, originalName: record.originalName, byteLength: record.byteLength } });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.post('/train', authenticateToken, requireRole('Admin'), upload.array('manuals', 8), async (req, res) => {
  try {
    const samples = parseSamples(req.body?.samples);
    if (req.body?.imageUploadId) {
      samples.push({
        uploadId: req.body.imageUploadId,
        name: req.body.sampleName,
        category: req.body.sampleCategory,
        metalType: req.body.sampleMetal,
        lifespan: req.body.sampleLifespan,
        notes: req.body.sampleNotes
      });
    }
    const job = await ImageModelService.train({
      user: req.user,
      jobName: req.body?.jobName,
      department: req.body?.department || req.user.department,
      manuals: req.files || [],
      samples,
      manualText: req.body?.manualText || ''
    });
    createAuditEntry({
      userId: req.user._id || req.user.id,
      userName: req.user.name,
      role: req.user.role,
      department: req.user.department,
      action: 'IMAGE_MODEL_TRAINED',
      resource: '/api/image-models/train',
      details: `Admin trained image model ${job.jobName} with ${job.catalog.length} catalog entries`
    });
    res.status(201).json({ job, message: 'Image model catalog trained from manuals and labeled images.' });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.post('/:jobId/deploy', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const result = await ImageModelService.deploy({
      user: req.user,
      jobId: req.params.jobId,
      networkId: req.body?.networkId || '',
      networkKey: req.body?.networkKey || ''
    });
    createAuditEntry({
      userId: req.user._id || req.user.id,
      userName: req.user.name,
      role: req.user.role,
      department: req.user.department,
      action: 'IMAGE_MODEL_DEPLOYED',
      resource: `/api/image-models/${req.params.jobId}/deploy`,
      details: `Admin deployed ${result.job.jobName} to LAN ${result.network.name}; notified ${result.notificationCount} manager/employee recipient(s)`
    });
    res.json({
      message: 'Image model deployed to the active private LAN.',
      job: result.job,
      notificationCount: result.notificationCount
    });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.post('/analyze', authenticateToken, requireRole(['Admin', 'Manager', 'Employee']), imageUpload.single('image'), async (req, res) => {
  try {
    const uploadId = req.body?.uploadId || '';
    let buffer = req.file?.buffer || null;
    const fileName = req.file?.originalname || req.body?.fileName || 'capture.jpg';
    const result = await ImageModelService.analyze({
      user: req.user,
      query: req.body?.query || '',
      uploadId,
      imageBuffer: buffer,
      fileName
    });
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message,
      requiresLanMembership: error.requiresLanMembership || false
    });
  }
});

export default router;
