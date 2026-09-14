import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { state } from '../../config/db.js';
import { userIsConnectedToLan, pushNotifications, getNotificationRecipients } from '../notificationService.js';
import { RuntimeStateStore } from '../runtime/RuntimeStateStore.js';
import { ComputerVisionService } from '../vision/ComputerVisionService.js';
import { FileIngestor } from '../ingestion/FileIngestor.js';
import { AgentRegistry } from '../../agents/AgentRegistry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_ROOT = path.resolve(__dirname, '../../data/image-models');

const METAL_TERMS = ['steel', 'stainless', 'aluminum', 'aluminium', 'copper', 'brass', 'bronze', 'titanium', 'iron', 'alloy', 'zinc', 'nickel', 'carbon'];
const CATEGORY_TERMS = ['bearing', 'motor', 'pump', 'valve', 'gear', 'fastener', 'bolt', 'sensor', 'cable', 'housing', 'blade', 'filter', 'board', 'connector', 'panel'];

const asId = (value) => String(value?._id || value?.id || value || '');

const tokenize = (value = '') => String(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .split(/\s+/)
  .filter((term) => term.length > 2);

const scoreText = (query, text) => {
  const queryTerms = [...new Set(tokenize(query))];
  if (!queryTerms.length) return 0;
  const haystack = new Set(tokenize(text));
  const hits = queryTerms.filter((term) => haystack.has(term)).length;
  return hits / queryTerms.length;
};

const lanError = (message = 'Connect to the private LAN to use the image model.') => {
  const error = new Error(message);
  error.status = 403;
  error.code = 'LAN_REQUIRED';
  error.requiresLanMembership = true;
  return error;
};

const roleError = (message) => {
  const error = new Error(message);
  error.status = 403;
  return error;
};

const getActiveNetwork = ({ networkId = '', networkKey = '' } = {}) => {
  const networks = Array.isArray(state.memoryDb.networks) ? state.memoryDb.networks : [];
  if (!networkId && !networkKey) {
    return networks.find((network) => network.status === 'Active') || null;
  }
  return networks.find((network) => (
    network.status === 'Active'
    && ((!networkId || network._id === networkId || network.networkId === networkId)
      && (!networkKey || network.networkKey === networkKey || network.accessToken === networkKey))
  )) || null;
};

const extractLifespan = (text = '') => {
  const match = String(text).match(/(\d+(?:\.\d+)?)\s*(years?|yrs?|months?|hours?|hrs?)/i);
  return match ? `${match[1]} ${match[2].toLowerCase()}` : '';
};

const extractMetal = (text = '') => {
  const lower = String(text).toLowerCase();
  return METAL_TERMS.find((term) => lower.includes(term)) || '';
};

const extractCategory = (text = '') => {
  const lower = String(text).toLowerCase();
  return CATEGORY_TERMS.find((term) => lower.includes(term)) || '';
};

export class ImageModelService {
  static ensureCollections() {
    state.memoryDb.imageModelJobs = state.memoryDb.imageModelJobs || [];
    state.memoryDb.imageModelUploads = state.memoryDb.imageModelUploads || [];
  }

  static userId(user) {
    return asId(user);
  }

  static isLanConnected(user) {
    return userIsConnectedToLan(this.userId(user));
  }

  static assertCanTrain(user) {
    if (user?.role !== 'Admin') throw roleError('Only Admin can train or deploy the image model.');
  }

  static assertLanForUse(user) {
    if (!this.isLanConnected(user)) throw lanError();
  }

  static listJobs(user) {
    this.ensureCollections();
    const jobs = state.memoryDb.imageModelJobs;
    if (user?.role === 'Admin') return jobs;
    return jobs.filter((job) => (
      job.isDeployed
      && job.status === 'Completed'
      && (job.department === user.department || job.department === 'All')
    )).map((job) => this.publicJob(job));
  }

  static publicJob(job) {
    if (!job) return null;
    return {
      _id: job._id,
      jobName: job.jobName,
      department: job.department,
      status: job.status,
      isDeployed: Boolean(job.isDeployed),
      networkName: job.networkName || '',
      sampleCount: (job.samples || []).length,
      catalogSize: (job.catalog || []).length,
      trainingMode: job.trainingMode || 'catalog-index',
      stages: job.stages || [],
      deployedAt: job.deployedAt || null,
      createdAt: job.createdAt
    };
  }

  static getJob(jobId) {
    this.ensureCollections();
    return state.memoryDb.imageModelJobs.find((job) => job._id === String(jobId)) || null;
  }

  static getUsableJob(user) {
    this.ensureCollections();
    const jobs = state.memoryDb.imageModelJobs;
    if (user?.role === 'Admin') {
      return jobs.find((job) => job.status === 'Completed' && (job.department === user.department || job.department === 'All'))
        || jobs.find((job) => job.status === 'Completed')
        || null;
    }
    return jobs.find((job) => (
      job.isDeployed
      && job.status === 'Completed'
      && (job.department === user.department || job.department === 'All')
    )) || null;
  }

  static async saveUpload({ user, buffer, originalname, mimetype, kind = 'query' }) {
    this.ensureCollections();
    if (!Buffer.isBuffer(buffer) || !buffer.length) {
      const error = new Error('An image file is required.');
      error.status = 400;
      throw error;
    }
    if (buffer.length > 20 * 1024 * 1024) {
      const error = new Error('The image exceeds the 20 MB image-model limit.');
      error.status = 413;
      throw error;
    }
    await fs.mkdir(UPLOAD_ROOT, { recursive: true });
    const safeName = ComputerVisionService.safeFilename(originalname || 'capture.jpg');
    const id = `imgup_${crypto.randomUUID()}`;
    const extension = path.extname(safeName) || '.bin';
    const storedName = `${id}${extension}`;
    const filePath = path.join(UPLOAD_ROOT, storedName);
    await fs.writeFile(filePath, buffer);
    const record = {
      _id: id,
      ownerId: this.userId(user),
      department: user.department,
      kind,
      originalName: safeName,
      mimeType: mimetype || '',
      filePath,
      byteLength: buffer.length,
      createdAt: new Date().toISOString()
    };
    state.memoryDb.imageModelUploads.unshift(record);
    RuntimeStateStore.persist('imageModelUploads', record);
    return record;
  }

  static getUpload(uploadId) {
    this.ensureCollections();
    return state.memoryDb.imageModelUploads.find((item) => item._id === String(uploadId)) || null;
  }

  static async train({ user, jobName, department, manuals = [], samples = [], manualText = '' }) {
    this.assertCanTrain(user);
    this.ensureCollections();
    const name = String(jobName || '').trim() || `Image model ${new Date().toISOString().slice(0, 10)}`;
    const dept = String(department || user.department || 'All');
    const catalog = [];
    const storedSamples = [];

    if (manualText && String(manualText).trim()) {
      catalog.push({
        id: `cat_${crypto.randomUUID()}`,
        kind: 'manual',
        title: 'Pasted hardware manual',
        text: String(manualText).trim().slice(0, 40_000)
      });
    }

    for (const file of manuals) {
      const tempPath = path.join(os.tmpdir(), `img-manual-${crypto.randomUUID()}-${ComputerVisionService.safeFilename(file.originalname)}`);
      try {
        await fs.writeFile(tempPath, file.buffer);
        const parsed = await FileIngestor.parseFileByExtension(tempPath, file.originalname);
        const text = String(parsed?.text || parsed?.extractedText || '').trim();
        catalog.push({
          id: `cat_${crypto.randomUUID()}`,
          kind: 'manual',
          title: file.originalname,
          text: text || `Hardware manual file ingested: ${file.originalname}`
        });
      } finally {
        await fs.unlink(tempPath).catch(() => {});
      }
    }

    for (const sample of samples) {
      const label = {
        name: String(sample.name || sample.partName || '').trim(),
        category: String(sample.category || '').trim(),
        metalType: String(sample.metalType || sample.material || '').trim(),
        lifespan: String(sample.lifespan || sample.serviceLife || '').trim(),
        partType: String(sample.partType || '').trim(),
        notes: String(sample.notes || '').trim()
      };
      const upload = sample.uploadId ? this.getUpload(sample.uploadId) : null;
      const text = [
        label.name,
        label.category,
        label.partType,
        label.metalType,
        label.lifespan,
        label.notes
      ].filter(Boolean).join('. ');
      storedSamples.push({
        uploadId: upload?._id || '',
        fileName: upload?.originalName || '',
        ...label
      });
      catalog.push({
        id: `cat_${crypto.randomUUID()}`,
        kind: 'labeled-image',
        title: label.name || upload?.originalName || 'Labeled hardware image',
        text: text || 'Labeled hardware sample',
        label
      });
    }

    if (!catalog.length) {
      const error = new Error('Add at least one hardware manual or labeled training image before training.');
      error.status = 400;
      throw error;
    }

    const job = {
      _id: `imgjob_${crypto.randomUUID()}`,
      jobName: name,
      department: dept,
      status: 'Completed',
      progressPercent: 100,
      trainingMode: 'catalog-index',
      stages: [
        { id: 'prepare', status: 'completed' },
        { id: 'index', status: 'completed' },
        { id: 'validate', status: 'completed' },
        { id: 'complete', status: 'completed' }
      ],
      catalog,
      samples: storedSamples,
      isDeployed: false,
      networkId: '',
      networkName: '',
      networkKey: '',
      accessRoles: ['Manager', 'Employee'],
      createdBy: this.userId(user),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    state.memoryDb.imageModelJobs.unshift(job);
    RuntimeStateStore.persist('imageModelJobs', job);
    return job;
  }

  static async deploy({ user, jobId, networkId = '', networkKey = '' }) {
    this.assertCanTrain(user);
    const job = this.getJob(jobId);
    if (!job) {
      const error = new Error('Image model job not found.');
      error.status = 404;
      throw error;
    }
    if (job.status !== 'Completed') {
      const error = new Error('Only a completed image model can be deployed.');
      error.status = 409;
      throw error;
    }
    const network = getActiveNetwork({ networkId, networkKey });
    if (!network || !network.networkKey) {
      const error = new Error('Select an active private LAN with a valid access token before deploying the image model.');
      error.status = 409;
      throw error;
    }

    Object.assign(job, {
      isDeployed: true,
      networkId: network.networkId || network._id,
      networkName: network.name,
      networkKey: network.networkKey,
      deployedAt: new Date().toISOString(),
      deployedBy: this.userId(user),
      updatedAt: new Date().toISOString()
    });
    RuntimeStateStore.persist('imageModelJobs', job);

    const recipients = await getNotificationRecipients({ department: job.department, roles: ['Manager', 'Employee'] });

    const notifications = pushNotifications({
      recipientUserIds: recipients.map((candidate) => asId(candidate)),
      type: 'IMAGE_MODEL_DEPLOYED',
      title: 'New image model — explore',
      message: `${job.jobName} is live on ${network.name}. Open Creation Playground → Image Model, then add a photo.`,
      summary: `${job.jobName} · ${job.department} · add image to explore`,
      networkId: job.networkId,
      networkName: network.name,
      networkKey: network.networkKey,
      metadata: {
        jobId: job._id,
        jobName: job.jobName,
        openTab: 'creation-playground',
        focusNode: 'image-model',
        requiresLanMembership: true
      }
    });

    return { job, notificationCount: notifications.length, network };
  }

  static searchCatalog(job, query) {
    const catalog = job?.catalog || [];
    return catalog
      .map((entry) => ({
        ...entry,
        similarityScore: Number(scoreText(query, `${entry.title} ${entry.text}`).toFixed(3))
      }))
      .filter((entry) => entry.similarityScore > 0)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 6);
  }

  static buildFeatureCard({ analysis, catalogHits, query }) {
    const observedText = [
      analysis?.ocr?.text || '',
      (analysis?.inferences || []).map((item) => item.value).join(' '),
      query || ''
    ].join(' ');
    const topLabel = catalogHits.find((hit) => hit.kind === 'labeled-image')?.label || {};
    const name = topLabel.name || extractCategory(observedText) || (analysis?.ocr?.text ? String(analysis.ocr.text).split(/[\n,.]/)[0].slice(0, 80) : '');
    return {
      category: topLabel.category || extractCategory(observedText) || '',
      name,
      partType: topLabel.partType || extractCategory(observedText) || '',
      metalType: topLabel.metalType || extractMetal(observedText) || '',
      lifespan: topLabel.lifespan || extractLifespan(observedText) || '',
      manufacturer: '',
      modelNumber: '',
      condition: analysis?.ocr?.text ? 'Observed from image evidence' : 'Image metadata only',
      markings: (analysis?.entities || []).slice(0, 8),
      dimensions: analysis?.image?.width && analysis?.image?.height
        ? `${analysis.image.width} × ${analysis.image.height}`
        : '',
      color: '',
      confidence: catalogHits[0]?.similarityScore || (analysis?.ocr?.text ? 0.45 : 0.2),
      warnings: analysis?.warnings || []
    };
  }

  static async inspectImage({ user, uploadId = '', imageBuffer = null, fileName = 'capture.jpg', query = '' }) {
    this.assertLanForUse(user);
    const job = this.getUsableJob(user);
    if (!job) {
      const error = new Error(user?.role === 'Admin'
        ? 'Train an image model first, then run analysis.'
        : 'No image model is deployed on this LAN yet. Wait for Admin to train and deploy.');
      error.status = 409;
      throw error;
    }
    if (user?.role !== 'Admin' && !job.isDeployed) {
      throw roleError('The image model is not deployed for your role yet.');
    }

    let filePath = '';
    let cleanup = false;
    const upload = uploadId ? this.getUpload(uploadId) : null;
    if (upload?.filePath) {
      filePath = upload.filePath;
      fileName = upload.originalName || fileName;
    } else if (Buffer.isBuffer(imageBuffer) && imageBuffer.length) {
      filePath = path.join(os.tmpdir(), `img-analyze-${crypto.randomUUID()}${path.extname(fileName) || '.jpg'}`);
      await fs.writeFile(filePath, imageBuffer);
      cleanup = true;
    } else {
      const error = new Error('Add an image from camera or gallery before running the image model.');
      error.status = 400;
      throw error;
    }

    const analysis = await ComputerVisionService.analyzeFile(filePath, fileName, { query });
    return { analysis, job, filePath, cleanup, fileName };
  }

  static async analyze({ user, query = '', uploadId = '', imageBuffer = null, fileName = 'capture.jpg' }) {
    const inspected = await this.inspectImage({ user, uploadId, imageBuffer, fileName, query });
    const { analysis, job, filePath, cleanup } = inspected;
    fileName = inspected.fileName;
    try {
      const observed = analysis?.ocr?.text || '';
      const searchQuery = [query, observed, fileName].filter(Boolean).join(' ');
      const catalogHits = this.searchCatalog(job, searchQuery);

      const hardwareMessage = await AgentRegistry.getAgent('HARDWARE_MANUAL').run({
        query: searchQuery,
        user,
        catalogHits,
        job
      });
      const visionMessage = await AgentRegistry.getAgent('IMAGE_ANALYSIS').run({
        query,
        user,
        analysis,
        catalogHits,
        fileName
      });
      const compareMessage = await AgentRegistry.getAgent('IMAGE_COMPARE').run({
        query,
        user,
        catalogHits,
        hardware: hardwareMessage.payload?.result,
        analysisCard: visionMessage.payload?.result,
        job
      });

      return {
        job: this.publicJob(job),
        agents: {
          hardwareManual: hardwareMessage.payload?.result,
          imageAnalysis: visionMessage.payload?.result,
          comparison: compareMessage.payload?.result
        },
        lanRequired: true,
        lanConnected: this.isLanConnected(user)
      };
    } finally {
      if (cleanup) await fs.unlink(filePath).catch(() => {});
    }
  }
}

export { extractMetal, extractCategory, extractLifespan, UPLOAD_ROOT };
