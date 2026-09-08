import { randomUUID } from 'node:crypto';
import { state } from '../../config/db.js';
import AuditLog from '../../models/AuditLog.js';

export class AuditService {
  static async record({ user = {}, action, resource = 'system', status = 'SUCCESS', details = '', request, metadata = {}, riskScore = status === 'DENIED' ? 0.7 : 0 }) {
    const entry = {
      eventId: randomUUID(),
      timestamp: new Date(),
      sessionId: request?.headers?.['x-session-id'] || undefined,
      userId: String(user._id || user.id || 'system'),
      userName: user.name || 'System',
      role: user.role || 'System',
      department: user.department || 'All',
      action,
      resource,
      status,
      ipAddress: request?.ip || '127.0.0.1 (LAN)',
      deviceFingerprint: request?.headers?.['x-device-fingerprint'],
      riskScore,
      details,
      metadata
    };

    if (state.isMongooseConnected) return AuditLog.create(entry);
    entry._id = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    state.memoryDb.auditLogs.unshift(entry);
    state.memoryDb.auditLogs = state.memoryDb.auditLogs.slice(0, 500);
    return entry;
  }
}