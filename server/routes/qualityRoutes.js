/**
 * Quality Routes — Data Quality Reports, PII verification, compliance scans, and audit logs.
 */

import express from 'express';
import crypto from 'crypto';
import { state } from '../config/db.js';
import DataQualityReport from '../models/DataQualityReport.js';
import ComplianceReport from '../models/ComplianceReport.js';
import { DataCleaner } from '../services/validation/DataCleaner.js';
import { QualityScorer } from '../services/validation/QualityScorer.js';
import { authenticateToken, createAuditEntry } from '../middleware/auth.js';

const router = express.Router();

const persistQualityReport = async (report) => {
  if (state.isMongooseConnected) {
    return DataQualityReport.create(report);
  }
  const stored = { ...report, _id: 'qr_' + Date.now(), createdAt: new Date() };
  state.memoryDb.dataQualityReports = state.memoryDb.dataQualityReports || [];
  state.memoryDb.dataQualityReports.unshift(stored);
  return stored;
};

const persistComplianceReport = async (report) => {
  if (state.isMongooseConnected) {
    return ComplianceReport.create(report);
  }
  const stored = { ...report, _id: 'cr_' + Date.now(), createdAt: new Date() };
  state.memoryDb.complianceReports = state.memoryDb.complianceReports || [];
  state.memoryDb.complianceReports.unshift(stored);
  return stored;
};

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

router.post('/scan-text', authenticateToken, async (req, res) => {
  try {
    const { text, format = 'auto', framework = 'FULL', persistAudit = false, fileName } = req.body || {};
    const result = DataCleaner.scanAndRedact(text, { format, framework });

    if (!result.ok) {
      return res.status(400).json({
        error: result.error,
        piiDetected: false,
        matches: [],
        counts: result.counts,
        redactedPreview: '',
        format: result.format,
        framework: result.framework
      });
    }

    if (persistAudit) {
      await createAuditEntry({
        userId: req.user._id || req.user.id,
        userName: req.user.name,
        role: req.user.role,
        department: req.user.department,
        action: 'PII_SANDBOX_SCAN',
        resource: '/api/quality/scan-text',
        status: 'SUCCESS',
        details: `${fileName || 'sandbox'} scanned under ${result.framework}: ${result.detectedCount} PII tokens across ${result.matches.length} categories`
      });
    }

    res.json({
      piiDetected: result.piiDetected,
      matches: result.matches,
      counts: result.counts,
      detectedCount: result.detectedCount,
      redactedPreview: result.redactedPreview,
      format: result.format,
      framework: result.framework,
      parseWarning: result.parseWarning,
      placeholders: result.placeholders
    });
  } catch (err) {
    res.status(500).json({ error: 'PII scanning failed' });
  }
});

router.post('/audit-document', authenticateToken, async (req, res) => {
  try {
    const { text, fileName, department, fileType = 'TXT' } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Document text is required for quality audit.' });
    }
    if (!fileName || typeof fileName !== 'string') {
      return res.status(400).json({ error: 'fileName is required.' });
    }

    const piiScan = DataCleaner.scanPII(text, { framework: 'FULL' });
    if (piiScan.error) {
      return res.status(400).json({ error: piiScan.error });
    }

    const redacted = DataCleaner.cleanAndRedact(text, true, { framework: 'FULL' });
    const checksum = crypto.createHash('sha256').update(text).digest('hex');
    const quality = QualityScorer.evaluateQuality({
      text,
      fileValidation: { warnings: [] },
      piiScan,
      fileType
    });

    const report = await persistQualityReport({
      docId: 'audit_' + Date.now(),
      fileName,
      fileType: String(fileType).replace('.', '').toUpperCase(),
      fileSize: Buffer.byteLength(text, 'utf8'),
      checksum,
      department: department || req.user.department || 'All',
      overallScore: quality.overallScore,
      metrics: quality.metrics,
      piiDetected: piiScan.piiDetected,
      piiDetails: piiScan.matches.map((m) => ({ type: m.type, count: m.count, redacted: true })),
      malwareStatus: 'CLEAN',
      status: quality.status,
      flags: quality.flags,
      uploadedBy: req.user.name || 'User'
    });

    await createAuditEntry({
      userId: req.user._id || req.user.id,
      userName: req.user.name,
      role: req.user.role,
      department: req.user.department,
      action: 'DOCUMENT_QUALITY_AUDIT',
      resource: `/api/quality/audit-document/${fileName}`,
      status: quality.status === 'FAILED' ? 'DENIED' : 'SUCCESS',
      details: `${fileName} scored ${quality.overallScore}/100 (${quality.status})`
    });

    res.status(201).json({
      report,
      pii: {
        detected: piiScan.piiDetected,
        counts: piiScan.counts,
        matches: piiScan.matches
      },
      redactedPreview: redacted
    });
  } catch (err) {
    res.status(500).json({ error: 'Quality audit failed' });
  }
});

router.post('/compliance-scan', authenticateToken, async (req, res) => {
  try {
    const { text, framework = 'GDPR', format = 'auto', fileName, persist = true } = req.body || {};
    const result = DataCleaner.scanAndRedact(text, { format, framework });
    if (!result.ok) {
      return res.status(400).json({ error: result.error, framework: DataCleaner.normalizeFramework(framework) });
    }

    const leftover = (result.matches || []).flatMap((group) =>
      (group.samples || []).filter((sample) => result.redactedPreview.includes(sample))
    );

    const notes = [
      `${result.framework} controls applied to ${result.format} payload`,
      result.detectedCount ? `Redacted ${result.detectedCount} in-scope token(s)` : 'No in-scope PII found',
      leftover.length ? `Residual identifiers still present: ${leftover.slice(0, 3).join(', ')}` : 'Sanitized preview contains no residual in-scope identifiers'
    ];
    if (result.parseWarning) notes.push(result.parseWarning);

    const payload = {
      framework: result.framework,
      format: result.format,
      fileName: fileName || `${result.framework.toLowerCase()}-scan`,
      department: req.user.department || 'All',
      piiDetected: result.piiDetected,
      detectedCount: result.detectedCount,
      counts: result.counts,
      matches: result.matches,
      redactedPreview: result.redactedPreview,
      compliant: leftover.length === 0,
      notes,
      parseWarning: result.parseWarning,
      createdBy: req.user.name || 'User'
    };

    const report = persist ? await persistComplianceReport(payload) : payload;

    await createAuditEntry({
      userId: req.user._id || req.user.id,
      userName: req.user.name,
      role: req.user.role,
      department: req.user.department,
      action: `COMPLIANCE_SCAN_${result.framework.replace('-', '_')}`,
      resource: '/api/quality/compliance-scan',
      status: payload.compliant ? 'SUCCESS' : 'WARNING',
      details: `${payload.fileName}: ${result.framework} ${payload.compliant ? 'COMPLIANT' : 'RESIDUAL_RISK'} (${result.detectedCount} detections)`
    });

    res.status(persist ? 201 : 200).json({ report, scan: result });
  } catch (err) {
    res.status(500).json({ error: 'Compliance scan failed' });
  }
});

router.get('/compliance-reports', authenticateToken, async (req, res) => {
  try {
    let reports = [];
    if (state.isMongooseConnected) {
      reports = await ComplianceReport.find().sort({ createdAt: -1 }).limit(50);
    } else {
      reports = [...(state.memoryDb.complianceReports || [])].slice(0, 50);
    }
    if (req.user.role !== 'Admin') {
      reports = reports.filter((r) => r.department === req.user.department || r.department === 'All');
    }
    res.json({ reports, total: reports.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch compliance reports' });
  }
});

export default router;
