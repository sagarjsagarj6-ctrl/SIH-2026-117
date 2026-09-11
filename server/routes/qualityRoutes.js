/**
 * Quality Routes — Data Quality Reports, PII verification, and audit logs.
 */

import express from 'express';
import { state } from '../config/db.js';
import DataQualityReport from '../models/DataQualityReport.js';
import { DataCleaner } from '../services/validation/DataCleaner.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/quality/reports — List all data quality audit reports
router.get('/reports', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    let reports = [];

    if (state.isMongooseConnected) {
      if (user.role === 'Admin') {
        reports = await DataQualityReport.find().sort({ createdAt: -1 });
      } else {
        reports = await DataQualityReport.find({
          $or: [{ department: user.department }, { department: 'All' }]
        }).sort({ createdAt: -1 });
      }
    } else {
      const allReports = state.memoryDb.dataQualityReports || [];
      if (user.role === 'Admin') {
        reports = [...allReports];
      } else {
        reports = allReports.filter(r => r.department === user.department || r.department === 'All');
      }
    }

    res.json({ reports, total: reports.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quality reports' });
  }
});

// GET /api/quality/reports/:id — Fetch single report
router.get('/reports/:id', authenticateToken, async (req, res) => {
  try {
    let report = null;
    if (state.isMongooseConnected) {
      report = await DataQualityReport.findById(req.params.id);
    } else {
      const allReports = state.memoryDb.dataQualityReports || [];
      report = allReports.find(r => r._id === req.params.id || r.id === req.params.id);
    }

    if (!report) {
      return res.status(404).json({ error: 'Quality report not found' });
    }

    if (req.user.role !== 'Admin' && report.department !== 'All' && report.department !== req.user.department) {
      return res.status(403).json({ error: 'Access denied: this quality report belongs to another department.' });
    }

    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quality report' });
  }
});

// POST /api/quality/scan-text — Real-time on-demand PII scanner
router.post('/scan-text', authenticateToken, (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required for scanning' });

    const scanResult = DataCleaner.scanPII(text);
    const redactedText = DataCleaner.cleanAndRedact(text, true);

    res.json({
      piiDetected: scanResult.piiDetected,
      matches: scanResult.matches,
      redactedPreview: redactedText
    });
  } catch (err) {
    res.status(500).json({ error: 'PII scanning failed' });
  }
});

export default router;
