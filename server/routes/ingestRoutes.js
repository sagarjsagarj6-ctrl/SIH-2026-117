/**
 * Ingest Routes — Handles multi-file uploads (multipart/form-data via multer),
 * batch parsing, job polling, and LAN database sync.
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

import { FileIngestor } from '../services/ingestion/FileIngestor.js';
import { DatabaseConnector } from '../services/ingestion/DatabaseConnector.js';
import { authenticateToken } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempUploadDir = path.resolve(__dirname, '../data/temp');

// Ensure temp directory exists
await fs.mkdir(tempUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
    files: 10 // Up to 10 files simultaneously
  }
});

const router = express.Router();

// POST /api/ingest/upload — Batch file upload & pipeline execution
router.post('/upload', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    const files = req.files;
    const user = req.user;
    const { department, sensitivity, category, autoRedactPII } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided for ingestion.' });
    }

    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const job = await FileIngestor.processFile({
          filePath: file.path,
          originalFilename: file.originalname,
          fileSize: file.size,
          user,
          explicitDepartment: department || null,
          explicitSensitivity: sensitivity || null,
          explicitCategory: category || null,
          autoRedactPII: autoRedactPII !== 'false'
        });
        results.push(job);
      } catch (fileErr) {
        errors.push({
          fileName: file.originalname,
          error: fileErr.message
        });
      }
    }

    res.status(200).json({
      message: `Ingestion batch processed: ${results.length} succeeded, ${errors.length} failed`,
      totalUploaded: files.length,
      successfulJobs: results,
      errors
    });
  } catch (err) {
    res.status(500).json({ error: `Ingestion upload failure: ${err.message}` });
  }
});

// GET /api/ingest/jobs — List recent ingestion pipeline jobs
router.get('/jobs', authenticateToken, (req, res) => {
  try {
    const jobs = FileIngestor.listRecentJobs(20);
    res.json({ jobs, total: jobs.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve ingestion jobs' });
  }
});

// GET /api/ingest/status/:id — Get status of a specific job
router.get('/status/:id', authenticateToken, (req, res) => {
  const job = FileIngestor.getJobStatus(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Ingestion job not found' });
  }
  res.json({ job });
});

// GET /api/ingest/datasources — List registered on-premise LAN data sources
router.get('/datasources', authenticateToken, (req, res) => {
  try {
    const user = req.user;
    const sources = DatabaseConnector.listDataSources(user.role === 'Admin' ? null : user.department);
    res.json({ dataSources: sources });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list data sources' });
  }
});

// POST /api/ingest/database/test — Test connectivity to LAN database
router.post('/database/test', authenticateToken, async (req, res) => {
  try {
    const { type, host, port, database } = req.body;
    const result = await DatabaseConnector.testConnection({ type, host, port, database });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/ingest/database/introspect — Introspect database schema
router.post('/database/introspect', authenticateToken, async (req, res) => {
  try {
    const { dataSourceId } = req.body;
    const schema = await DatabaseConnector.introspectSchema(dataSourceId);
    res.json(schema);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/ingest/database/sync — Ingest table snapshot into knowledge base
router.post('/database/sync', authenticateToken, async (req, res) => {
  try {
    const { dataSourceId, tableName } = req.body;
    const snapshot = await DatabaseConnector.syncTableToKnowledge({
      dataSourceId,
      tableName,
      user: req.user
    });

    // Ingest snapshot via FileIngestor memory mechanism
    const tempFile = path.join(tempUploadDir, `db_snapshot_${Date.now()}.txt`);
    await fs.writeFile(tempFile, snapshot.textContent, 'utf-8');

    const job = await FileIngestor.processFile({
      filePath: tempFile,
      originalFilename: `${snapshot.title}.txt`,
      fileSize: Buffer.byteLength(snapshot.textContent),
      user: req.user,
      explicitDepartment: snapshot.department,
      explicitSensitivity: snapshot.sensitivity,
      explicitCategory: snapshot.category,
      autoRedactPII: true
    });

    res.json({
      message: `Successfully synchronized table "${tableName}" into knowledge base`,
      job
    });
  } catch (err) {
    res.status(500).json({ error: `Database sync failed: ${err.message}` });
  }
});

export default router;
