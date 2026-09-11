import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB, state } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import hardwareRoutes from './routes/hardwareRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import modelRoutes from './routes/modelRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import ingestRoutes from './routes/ingestRoutes.js';
import knowledgeRoutes from './routes/knowledgeRoutes.js';
import qualityRoutes from './routes/qualityRoutes.js';
import inferenceRoutes from './routes/inferenceRoutes.js';
import networkRoutes from './routes/networkRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import workflowRoutes from './routes/workflowRoutes.js';
import { seedInitialData } from './seed.js';
import { VectorIndexManager } from './services/knowledge/VectorIndexManager.js';
import { ensureRAGFixtures } from './services/knowledge/ensureRAGFixtures.js';
import { HardwareProfiler } from './services/hardware/HardwareProfiler.js';
import { ModelHealthChecker } from './services/models/ModelHealthChecker.js';
import { ModelRegistry } from './services/models/ModelRegistry.js';
import { EnvChecker } from './services/config/EnvChecker.js';
import { RuntimeStateStore } from './services/runtime/RuntimeStateStore.js';
import { authenticateToken, requireRole } from './middleware/auth.js';
import { createRateLimiter, isAllowedOrigin, parseAllowedOrigins, requestContext, securityHeaders } from './middleware/security.js';

const app = express();
const PORT = Number(process.env.PORT || 5001);
const allowedOrigins = parseAllowedOrigins(process.env.CLIENT_ORIGIN);
const startupState = {
  startedAt: new Date().toISOString(),
  ready: false,
  vectorIndex: 'PENDING',
  hardware: 'PENDING',
  models: 'PENDING',
  runtimeState: 'PENDING'
};

const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`=======================================================`);
    console.log(` SOVEREIGN AI ENTERPRISE WORKBENCH BACKEND SERVER `);
    console.log(` Listening on: http://localhost:${port}`);
    console.log(` Deployment: Isolated Enterprise LAN / Air-Gapped`);
    console.log(`=======================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Server] Port ${port} is already in use. Stop the existing backend or set PORT explicitly; the client is configured for this port.`);
      process.exit(1);
      return;
    }

    console.error('[Server] Failed to start backend:', err);
    process.exit(1);
  });
};

// Security & Middleware
app.disable('x-powered-by');
app.use(requestContext);
app.use(securityHeaders);
app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin, allowedOrigins)) return callback(null, true);
    return callback(new Error('CORS origin is not allowed by the server policy.'));
  },
  credentials: true
}));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.FORM_BODY_LIMIT || '1mb' }));

const loginRateLimiter = createRateLimiter({ name: 'login', windowMs: 15 * 60 * 1000, max: 10 });
const registrationRateLimiter = createRateLimiter({ name: 'registration', windowMs: 60 * 60 * 1000, max: 10 });
app.use('/api/auth/login', loginRateLimiter);
app.use('/api/auth/register', registrationRateLimiter);

// Connect Database, Auto-Seed & Initialize Vector Index
await connectDB();
await seedInitialData();
try {
  await ensureRAGFixtures();
} catch (e) {
  console.warn('[RAGFixtures] Bootstrap warning:', e.message);
}
try {
  await RuntimeStateStore.load();
  startupState.runtimeState = 'READY';
} catch (e) {
  startupState.runtimeState = 'FALLBACK';
  console.warn('[RuntimeState] Bootstrap warning:', e.message);
}
try {
  await VectorIndexManager.rebuildAllIndices();
  startupState.vectorIndex = 'READY';
  console.log('[VectorStore] Initial vector index bootstrap completed.');
} catch (e) {
  startupState.vectorIndex = 'DEGRADED';
  console.warn('[VectorStore] Bootstrap warning:', e.message);
}

// Bootstrap Hardware Profiler
try {
  const hwProfile = await HardwareProfiler.detectHardware();
  startupState.hardware = 'READY';
  console.log(`[HardwareProfiler] Detected: ${hwProfile.cpuCores}-core CPU, ${hwProfile.ramTotalGB}GB RAM, GPU: ${hwProfile.gpu.name}`);
} catch (e) {
  startupState.hardware = 'DEGRADED';
  console.warn('[HardwareProfiler] Bootstrap warning:', e.message);
}

// Bootstrap Model Health Checker
try {
  await ModelHealthChecker.checkAllModels();
  startupState.models = 'READY';
  console.log('[ModelHealthChecker] Initial health sweep completed.');
} catch (e) {
  startupState.models = 'DEGRADED';
  console.warn('[ModelHealthChecker] Bootstrap warning:', e.message);
}

startupState.ready = true;

// Health Check & Real-Time Environment Diagnostic
app.get('/api/health', (req, res) => {
  res.status(startupState.ready ? 200 : 503).json({
    status: startupState.ready ? 'READY' : 'STARTING',
    system: 'Sovereign AI Enterprise Workbench Backend',
    deploymentMode: 'Air-Gapped Private LAN',
    databaseMode: state.isMongooseConnected ? 'Live MongoDB Daemon' : 'Local High-Speed In-Memory DB',
    startup: startupState,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health/live', (_req, res) => {
  res.json({ status: 'ALIVE', timestamp: new Date().toISOString() });
});

app.get('/api/health/ready', (req, res) => {
  res.status(startupState.ready ? 200 : 503).json({
    status: startupState.ready ? 'READY' : 'STARTING',
    databaseMode: state.isMongooseConnected ? 'Live MongoDB Daemon' : 'Local High-Speed In-Memory DB',
    startup: startupState,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health/env-check', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const report = await EnvChecker.getDiagnosticReport();
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'Environment diagnostic failed', details: err.message });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/hardware', hardwareRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/ingest', ingestRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/quality', qualityRoutes);
app.use('/api/inference', inferenceRoutes);
app.use('/api/networks', networkRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/workflows', workflowRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  const requestId = req.requestId || 'unknown';
  const status = err.type === 'entity.too.large' || err.code === 'LIMIT_FILE_SIZE'
    ? 413
    : err.code === 'UNSUPPORTED_FILE_TYPE' || err.code === 'LIMIT_UNEXPECTED_FILE'
      ? 400
      : err.message === 'CORS origin is not allowed by the server policy.'
        ? 403
        : Number.isInteger(err.status) ? err.status : 500;
  console.error('[Server Error]', { requestId, message: err.message, stack: err.stack });
  res.status(status).json({
    error: status === 500 ? 'An unexpected internal server error occurred.' : err.message,
    requestId
  });
});

startServer(PORT);
