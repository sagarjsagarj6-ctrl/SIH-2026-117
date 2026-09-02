import express from 'express';
import { state } from '../config/db.js';
import AuditLog from '../models/AuditLog.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/audit (Admin & Manager)
router.get('/', authenticateToken, requireRole(['Admin', 'Manager']), async (req, res) => {
  try {
    const user = req.user;
    let logs = [];

    if (state.isMongooseConnected) {
      if (user.role === 'Admin') {
        logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
      } else {
        logs = await AuditLog.find({ department: user.department }).sort({ createdAt: -1 }).limit(100);
      }
    } else {
      if (user.role === 'Admin') {
        logs = state.memoryDb.auditLogs.slice(0, 100);
      } else {
        logs = state.memoryDb.auditLogs.filter(a => a.department === user.department).slice(0, 100);
      }
    }

    res.json({ auditLogs: logs, total: logs.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve audit trail logs.' });
  }
});

export default router;
