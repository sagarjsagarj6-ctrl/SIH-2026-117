import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
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
import { HardwareProfiler } from './services/hardware/HardwareProfiler.js';
import { ModelHealthChecker } from './services/models/ModelHealthChecker.js';
import { ModelRegistry } from './services/models/ModelRegistry.js';
import { EnvChecker } from './services/config/EnvChecker.js';

const app = express();
const PORT = Number(process.env.PORT || 5000);

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
      const nextPort = port + 1;
      console.warn(`[Server] Port ${port} is busy. Retrying on ${nextPort}...`);
      startServer(nextPort);
      return;
    }

    console.error('[Server] Failed to start backend:', err);
    process.exit(1);
  });
};

// Security & Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Connect Database, Auto-Seed & Initialize Vector Index
await connectDB();
await seedInitialData();
try {
  await VectorIndexManager.rebuildAllIndices();
  console.log('[VectorStore] Initial vector index bootstrap completed.');
} catch (e) {
  console.warn('[VectorStore] Bootstrap warning:', e.message);
}

// Bootstrap Hardware Profiler
try {
  const hwProfile = await HardwareProfiler.detectHardware();
  console.log(`[HardwareProfiler] Detected: ${hwProfile.cpuCores}-core CPU, ${hwProfile.ramTotalGB}GB RAM, GPU: ${hwProfile.gpu.name}`);
} catch (e) {
  console.warn('[HardwareProfiler] Bootstrap warning:', e.message);
}

// Bootstrap Model Health Checker
try {
  await ModelHealthChecker.checkAllModels();
  console.log('[ModelHealthChecker] Initial health sweep completed.');
} catch (e) {
  console.warn('[ModelHealthChecker] Bootstrap warning:', e.message);
}

// Health Check & Real-Time Environment Diagnostic
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'Sovereign AI Enterprise Workbench Backend',
    deploymentMode: 'Air-Gapped Private LAN',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health/env-check', async (req, res) => {
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
  console.error('[Server Error]', err.stack);
  res.status(500).json({ error: 'An unexpected internal server error occurred.' });
});

startServer(PORT);
