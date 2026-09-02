import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import hardwareRoutes from './routes/hardwareRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import modelRoutes from './routes/modelRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import { seedInitialData } from './seed.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Connect Database & Auto-Seed
await connectDB();
await seedInitialData();

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'Sovereign AI Enterprise Workbench Backend',
    deploymentMode: 'Air-Gapped Private LAN',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/hardware', hardwareRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/audit', auditRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack);
  res.status(500).json({ error: 'An unexpected internal server error occurred.' });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` SOVEREIGN AI ENTERPRISE WORKBENCH BACKEND SERVER `);
  console.log(` Listening on: http://localhost:${PORT}`);
  console.log(` Deployment: Isolated Enterprise LAN / Air-Gapped`);
  console.log(`=======================================================`);
});
