import jwt from 'jsonwebtoken';
import { state } from '../config/db.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No authorization token provided.' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'sovereign_enterprise_airgap_secret_key_2026_x992';
    const decoded = jwt.verify(token, secret);
    
    let user;
    if (state.isMongooseConnected) {
      user = await User.findById(decoded.id).select('-password');
    } else {
      user = state.memoryDb.users.find(u => u._id.toString() === decoded.id);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid token: User account not found.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token validation failed or expired session.' });
  }
};

export const requireRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    if (typeof roles === 'string') roles = [roles];

    if (roles.length && !roles.includes(req.user.role)) {
      // Log denied attempt
      createAuditEntry({
        userId: req.user._id || req.user.id,
        userName: req.user.name,
        role: req.user.role,
        department: req.user.department,
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        resource: req.originalUrl,
        status: 'DENIED',
        details: `Role ${req.user.role} attempted forbidden operation requiring ${roles.join(', ')}`
      });

      return res.status(403).json({ error: `Forbidden. Requires one of the following roles: ${roles.join(', ')}` });
    }
    next();
  };
};

export const requireDepartment = (allowedDepartments = []) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });

    // Admin bypasses department restriction
    if (req.user.role === 'Admin') return next();

    if (allowedDepartments.length && !allowedDepartments.includes(req.user.department)) {
      createAuditEntry({
        userId: req.user._id || req.user.id,
        userName: req.user.name,
        role: req.user.role,
        department: req.user.department,
        action: 'CROSS_DEPARTMENT_ACCESS_BLOCKED',
        resource: req.originalUrl,
        status: 'DENIED',
        details: `User from ${req.user.department} denied access to ${allowedDepartments.join(', ')} resource`
      });

      return res.status(403).json({ error: `Access Denied: Your department (${req.user.department}) is not authorized for this resource.` });
    }
    next();
  };
};

export const createAuditEntry = async (data) => {
  try {
    const entry = {
      timestamp: new Date(),
      userId: data.userId || 'system',
      userName: data.userName || 'System',
      role: data.role || 'System',
      department: data.department || 'All',
      action: data.action,
      resource: data.resource,
      status: data.status || 'SUCCESS',
      ipAddress: '127.0.0.1 (LAN)',
      details: data.details || ''
    };

    if (state.isMongooseConnected) {
      await AuditLog.create(entry);
    } else {
      entry._id = 'audit_' + Date.now() + Math.random().toString(36).substr(2, 4);
      state.memoryDb.auditLogs.unshift(entry);
      if (state.memoryDb.auditLogs.length > 500) state.memoryDb.auditLogs.pop();
    }
  } catch (err) {
    console.error('Audit Log writing failed:', err.message);
  }
};
