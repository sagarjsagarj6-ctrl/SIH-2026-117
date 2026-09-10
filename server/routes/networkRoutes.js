import express from 'express';
import { state } from '../config/db.js';
import { authenticateToken, requireRole, createAuditEntry } from '../middleware/auth.js';

const router = express.Router();

const generateNetworkKey = () => `LAN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const normalizeUser = (user) => ({
  userId: String(user._id || user.id || ''),
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department,
  joinedAt: new Date().toISOString()
});

const userHasAccessToNetwork = (user, network) => {
  const userId = String(user._id || user.id || '');
  const userEmail = user.email || '';
  const createdById = String(network.createdById || network.createdBy || '');
  const members = Array.isArray(network.members) ? network.members : [];
  return createdById === userId || members.some(member => String(member.userId || member.id || '') === userId || member.email === userEmail);
};

router.get('/', authenticateToken, async (req, res) => {
  try {
    const networks = Array.isArray(state.memoryDb.networks) ? [...state.memoryDb.networks] : [];
    const visible = req.user.role === 'Admin'
      ? networks
      : networks.filter(network => userHasAccessToNetwork(req.user, network));

    res.json({ networks: visible, total: visible.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch LAN networks.' });
  }
});

router.post('/', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const { name, description, setupRequirements, networkId } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'A LAN network name is required.' });
    }

    const generatedKey = generateNetworkKey();
    const network = {
      _id: 'net_' + Date.now(),
      name: name.trim(),
      description: description || 'Private department LAN for confidential agent sharing',
      setupRequirements: Array.isArray(setupRequirements) && setupRequirements.length
        ? setupRequirements
        : [
            'Confirm IPv4 subnet is private and isolated',
            'Enable local routing between host and joined endpoints',
            'Share the generated LAN key securely with approved users'
          ],
      networkId: networkId || `lan-${Date.now().toString(36)}`,
      networkKey: generatedKey,
      createdBy: req.user.name,
      createdById: String(req.user._id || req.user.id || ''),
      createdAt: new Date().toISOString(),
      status: 'Active',
      members: [normalizeUser(req.user)]
    };

    state.memoryDb.networks.unshift(network);

    createAuditEntry({
      userId: req.user._id || req.user.id,
      userName: req.user.name,
      role: req.user.role,
      department: req.user.department,
      action: 'LAN_NETWORK_CREATED',
      resource: '/api/networks',
      details: `Admin created private LAN network ${network.name} with key ${generatedKey}`
    });

    res.status(201).json({ message: 'LAN network created and hosted successfully.', network });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create LAN network.' });
  }
});

router.post('/join', authenticateToken, async (req, res) => {
  try {
    const { networkKey, networkId } = req.body || {};
    if (!networkKey && !networkId) {
      return res.status(400).json({ error: 'A valid network key or network ID is required to join.' });
    }

    const networks = Array.isArray(state.memoryDb.networks) ? state.memoryDb.networks : [];
    const network = networks.find(item => {
      if (networkKey && item.networkKey === networkKey) return true;
      if (networkId && item.networkId === networkId) return true;
      return false;
    });

    if (!network) {
      return res.status(404).json({ error: 'No LAN network was found for the supplied key or ID.' });
    }

    const userEntry = normalizeUser(req.user);
    const alreadyJoined = (network.members || []).some(member => {
      const memberId = String(member.userId || '');
      return memberId === userEntry.userId || member.email === userEntry.email;
    });

    if (!alreadyJoined) {
      network.members = [...(network.members || []), userEntry];
    }

    createAuditEntry({
      userId: req.user._id || req.user.id,
      userName: req.user.name,
      role: req.user.role,
      department: req.user.department,
      action: 'LAN_NETWORK_JOINED',
      resource: '/api/networks/join',
      details: `User joined LAN network ${network.name}`
    });

    res.json({ message: 'You have joined the LAN network successfully.', network });
  } catch (err) {
    res.status(500).json({ error: 'Failed to join LAN network.' });
  }
});

export default router;
