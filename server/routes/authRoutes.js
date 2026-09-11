import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { state } from '../config/db.js';
import User from '../models/User.js';
import { authenticateToken, createAuditEntry } from '../middleware/auth.js';
import { isKnownDepartment } from '../config/identity.js';

const router = express.Router();
const getSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured.');
  }
  return process.env.JWT_SECRET;
};

const normalizeText = (value, field, maxLength) => {
  if (typeof value !== 'string') throw new Error(`${field} must be a string.`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) throw new Error(`${field} must be between 1 and ${maxLength} characters.`);
  return normalized;
};

const normalizeEmail = (value) => {
  const email = normalizeText(value, 'Email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('A valid email address is required.');
  return email;
};

const ensureSelfRegistrationEnabled = () => {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SELF_REGISTRATION !== 'true') {
    const error = new Error('Self-registration is disabled for this deployment. Ask an administrator to create an account.');
    error.status = 403;
    throw error;
  }
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    ensureSelfRegistrationEnabled();
    const name = normalizeText(req.body?.name, 'Name', 120);
    const email = normalizeEmail(req.body?.email);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const department = normalizeText(req.body?.department, 'Department', 100);

    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({ error: 'Password must be between 8 and 128 characters.' });
    }
    if (!isKnownDepartment(department)) {
      return res.status(400).json({ error: 'Choose a supported enterprise department.' });
    }

    // Check existing
    let existingUser;
    if (state.isMongooseConnected) {
      existingUser = await User.findOne({ email: email.toLowerCase() });
    } else {
      existingUser = state.memoryDb.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    }

    if (existingUser) {
      return res.status(400).json({ error: 'An enterprise user account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Public registration must never be able to mint Manager/Admin/Auditor accounts.
    // Privileged role assignment belongs to the authenticated admin governance route.
    const assignedRole = 'Employee';
    let newUser;

    if (state.isMongooseConnected) {
      newUser = await User.create({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: assignedRole,
        department,
        assignedAIProfile: 'Balanced',
        status: 'Active'
      });
    } else {
      newUser = {
        _id: 'usr_' + Date.now(),
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: assignedRole,
        department,
        assignedAIProfile: 'Balanced',
        status: 'Active',
        lastLogin: new Date()
      };
      state.memoryDb.users.push(newUser);
    }

    const token = jwt.sign(
      { id: newUser._id.toString(), email: newUser.email, role: newUser.role, department: newUser.department },
      getSecret(),
      { expiresIn: '24h' }
    );

    createAuditEntry({
      userId: newUser._id,
      userName: newUser.name,
      role: newUser.role,
      department: newUser.department,
      action: 'USER_REGISTERED',
      resource: '/api/auth/register',
      details: `New ${newUser.role} user created for department: ${newUser.department}`
    });

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
        assignedAIProfile: newUser.assignedAIProfile
      }
    });
  } catch (err) {
    const status = err.status || (err.message.includes('must be') || err.message.includes('valid') || err.message.includes('supported') ? 400 : 500);
    if (status === 500) console.error('Registration error:', err);
    res.status(status).json({ error: status === 500 ? 'Internal server error during registration.' : err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!password || password.length > 128) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    let user;
    if (state.isMongooseConnected) {
      user = await User.findOne({ email: email.toLowerCase() });
    } else {
      user = state.memoryDb.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    }

    if (!user) {
      createAuditEntry({
        userName: email,
        role: 'Unknown',
        department: 'Unknown',
        action: 'LOGIN_FAILED',
        resource: '/api/auth/login',
        status: 'FAILED',
        details: 'User account not found'
      });
      return res.status(401).json({ error: 'Invalid email or password credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      createAuditEntry({
        userId: user._id,
        userName: user.name,
        role: user.role,
        department: user.department,
        action: 'LOGIN_FAILED',
        resource: '/api/auth/login',
        status: 'FAILED',
        details: 'Incorrect password entered'
      });
      return res.status(401).json({ error: 'Invalid email or password credentials.' });
    }

    user.lastLogin = new Date();
    if (state.isMongooseConnected) {
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role, department: user.department },
      getSecret(),
      { expiresIn: '24h' }
    );

    createAuditEntry({
      userId: user._id,
      userName: user.name,
      role: user.role,
      department: user.department,
      action: 'LOGIN_SUCCESS',
      resource: '/api/auth/login',
      status: 'SUCCESS',
      details: 'Authenticated over encrypted local LAN connection'
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        assignedAIProfile: user.assignedAIProfile || 'Balanced'
      }
    });
  } catch (err) {
    const status = err.message.includes('Email') ? 400 : 500;
    if (status === 500) console.error('Login error:', err);
    res.status(status).json({ error: status === 500 ? 'Internal server error during authentication.' : err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user._id || req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      department: req.user.department,
      assignedAIProfile: req.user.assignedAIProfile || 'Balanced'
    }
  });
});

// POST /api/auth/profile-select
router.post('/profile-select', authenticateToken, async (req, res) => {
  try {
    const { aiProfile } = req.body; // 'Fast', 'Balanced', 'Advanced'
    if (!['Fast', 'Balanced', 'Advanced'].includes(aiProfile)) {
      return res.status(400).json({ error: 'Invalid AI profile selected.' });
    }

    req.user.assignedAIProfile = aiProfile;
    if (state.isMongooseConnected) {
      await User.findByIdAndUpdate(req.user._id, { assignedAIProfile: aiProfile });
    }

    createAuditEntry({
      userId: req.user._id || req.user.id,
      userName: req.user.name,
      role: req.user.role,
      department: req.user.department,
      action: 'AI_PROFILE_UPDATED',
      resource: '/api/auth/profile-select',
      details: `User selected local AI execution profile: ${aiProfile}`
    });

    res.json({ message: `AI profile updated to ${aiProfile}`, assignedAIProfile: aiProfile });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update AI profile.' });
  }
});

export default router;
