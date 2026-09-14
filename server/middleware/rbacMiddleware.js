import { PolicyEngine } from '../services/security/PolicyEngine.js';
import { AuditService } from '../services/audit/AuditService.js';
import { userIsConnectedToLan } from '../services/notificationService.js';

export const authorize = (resourceType, action, getResource = () => ({}), options = {}) => async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });

  const resource = { type: resourceType, ...(await getResource(req) || {}) };
  const requireLan = Boolean(options.requireLan || resource.requireLan);
  const decision = PolicyEngine.evaluate({
    user: req.user,
    resource,
    action,
    context: { ipAddress: req.ip, requireLan }
  });

  if (decision.allowed && requireLan && !userIsConnectedToLan(String(req.user?._id || req.user?.id || ''))) {
    decision.allowed = false;
    decision.reasons = ['Connect to the private LAN to use this capability.'];
  }

  if (!decision.allowed) {
    await AuditService.record({
      user: req.user,
      action: 'POLICY_DENIED',
      resource: req.originalUrl,
      status: 'DENIED',
      details: decision.reasons.join(' '),
      request: req
    });
    return res.status(403).json({ error: 'Forbidden.', reasons: decision.reasons, ...(requireLan ? { requiresLanMembership: true } : {}) });
  }
  next();
};
