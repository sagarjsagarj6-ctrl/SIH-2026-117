import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { state } from '../config/db.js';
import User from '../models/User.js';
import { authenticateToken, createAuditEntry } from '../middleware/auth.js';

const router = express.Router();
const secret = process.env.JWT_SECRET || 'sovereign_enterprise_airgap_secret_key_2026_x992';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;

    if (!name || !email || !password || !department) {
      return res.status(400).json({ error: 'Name, email, password, and department are required.' });
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

    const assignedRole = role || 'Employee';
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
      secret,
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
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
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
      secret,
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
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during authentication.' });
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
