import { PolicyEngine } from '../services/security/PolicyEngine.js';
import { AuditService } from '../services/audit/AuditService.js';

export const authorize = (resourceType, action, getResource = () => ({})) => async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });

  const resource = { type: resourceType, ...(await getResource(req) || {}) };
  const decision = PolicyEngine.evaluate({
    user: req.user,
    resource,
    action,
    context: { ipAddress: req.ip, requireLan: false }
  });

  if (!decision.allowed) {
    await AuditService.record({
      user: req.user,
      action: 'POLICY_DENIED',
      resource: req.originalUrl,
      status: 'DENIED',
      details: decision.reasons.join(' '),
      request: req
    });
    return res.status(403).json({ error: 'Forbidden.', reasons: decision.reasons });
  }
  next();
};