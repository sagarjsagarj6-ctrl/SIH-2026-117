import express from 'express';
import crypto from 'crypto';
import { state } from '../config/db.js';
import User from '../models/User.js';
import { authenticateToken, requireRole, createAuditEntry } from '../middleware/auth.js';

const router = express.Router();

const generateNetworkKey = () => `LAN-${crypto.randomBytes(5).toString('hex').toUpperCase().match(/.{1,5}/g).join('-')}`;

const defaultSetupRequirements = [
  'Confirm the private IPv4 subnet is reserved and isolated from internet-facing interfaces',
  'Set the gateway and DNS resolver on the local router or LAN host',
  'Enable encrypted device-to-device traffic and local firewall rules',
  'Share the generated access token only with approved managers and employees'
];

const isPrivateIpv4 = (value) => {
  const octets = String(value || '').split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return false;
  return octets[0] === 10
    || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
    || (octets[0] === 192 && octets[1] === 168);
};

const getNetworkByIdentifier = (identifier) => {
  const networks = Array.isArray(state.memoryDb.networks) ? state.memoryDb.networks : [];
  return networks.find(network => network._id === identifier || network.networkId === identifier);
};

const networkMetrics = (network) => ({
  connectedDevices: Array.isArray(network.members) ? network.members.length : 0,
  deviceCapacity: Number(network.maxDevices || 50),
  availableSlots: Math.max(0, Number(network.maxDevices || 50) - (Array.isArray(network.members) ? network.members.length : 0)),
  inviteCount: Number(network.inviteCount || 0)
});

const serializeNetwork = (network, requester) => {
  const isAdmin = requester?.role === 'Admin';
  const metrics = networkMetrics(network);
  const { networkKey, accessToken, members, ...networkDetails } = network;
  return {
    ...networkDetails,
    ...(isAdmin ? { networkKey, accessToken, members } : {}),
    ...metrics
  };
};

const normalizeUser = (user) => ({
  userId: String(user._id || user.id || ''),
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department,
  joinedAt: user.joinedAt || new Date().toISOString()
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

    res.json({ networks: visible.map(network => serializeNetwork(network, req.user)), total: visible.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch LAN networks.' });
  }
});

router.post('/', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const {
      name,
      description,
      setupRequirements,
      networkId,
      subnet,
      gateway,
      dnsServer,
      maxDevices,
      encryption,
      authentication,
      leaseDuration,
      isolationMode
    } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'A LAN network name is required.' });
    }

    if (!isPrivateIpv4(String(subnet || '').split('/')[0])) {
      return res.status(400).json({ error: 'Use a private IPv4 subnet such as 10.24.0.0/24.' });
    }
    if (!isPrivateIpv4(gateway) || !isPrivateIpv4(dnsServer)) {
      return res.status(400).json({ error: 'Gateway and DNS must use private IPv4 addresses.' });
    }

    const capacity = Number(maxDevices || 50);
    if (!Number.isInteger(capacity) || capacity < 2 || capacity > 5000) {
      return res.status(400).json({ error: 'Maximum devices must be a whole number between 2 and 5000.' });
    }

    const generatedKey = generateNetworkKey();
    const network = {
      _id: 'net_' + Date.now(),
      name: name.trim(),
      description: description || 'Private department LAN for confidential agent sharing',
      setupRequirements: Array.isArray(setupRequirements) && setupRequirements.length
        ? setupRequirements
        : defaultSetupRequirements,
      networkId: networkId || `lan-${Date.now().toString(36)}`,
      networkKey: generatedKey,
      accessToken: generatedKey,
      subnet: String(subnet).trim(),
      gateway: String(gateway).trim(),
      dnsServer: String(dnsServer).trim(),
      maxDevices: capacity,
      encryption: encryption || 'AES-256-GCM',
      authentication: authentication || 'Token + device approval',
      leaseDuration: leaseDuration || '24 hours',
      isolationMode: isolationMode || 'Air-gapped / local only',
      createdBy: req.user.name,
      createdById: String(req.user._id || req.user.id || ''),
      createdAt: new Date().toISOString(),
      status: 'Active',
      members: [normalizeUser(req.user)],
      inviteCount: 0,
      lastInviteAt: null
    };

    state.memoryDb.networks.unshift(network);

    let recipients = [];
    if (state.isMongooseConnected) {
      recipients = await User.find({ role: { $in: ['Manager', 'Employee'] }, status: { $ne: 'Inactive' } })
        .select('_id name email role department')
        .lean();
    } else {
      recipients = state.memoryDb.users.filter(user => ['Manager', 'Employee'].includes(user.role) && user.status !== 'Inactive');
    }

    const now = new Date().toISOString();
    const notifications = recipients.map((recipient, index) => ({
      _id: `notification_${Date.now()}_${index}`,
      userId: String(recipient._id || recipient.id || ''),
      type: 'LAN_INVITATION',
      title: `Private LAN invitation: ${network.name}`,
      message: `${req.user.name} created a secure private LAN. Use access token ${generatedKey} to connect from the Connect to LAN panel.`,
      networkId: network.networkId,
      networkName: network.name,
      networkKey: generatedKey,
      createdAt: now,
      read: false
    }));
    state.memoryDb.notifications.unshift(...notifications);
    network.inviteCount = notifications.length;
    network.lastInviteAt = now;

    createAuditEntry({
      userId: req.user._id || req.user.id,
      userName: req.user.name,
      role: req.user.role,
      department: req.user.department,
      action: 'LAN_NETWORK_CREATED',
      resource: '/api/networks',
      details: `Admin created private LAN network ${network.name} with key ${generatedKey}; invited ${notifications.length} managers and employees`
    });

    res.status(201).json({
      message: 'LAN network created and invitations dispatched to existing managers and employees.',
      network: { ...serializeNetwork(network, req.user), accessToken: generatedKey, networkKey: generatedKey },
      notificationSummary: { delivered: notifications.length, audience: 'Managers and Employees' }
    });
  } catch (err) {
    console.error('[LAN create error]', err.message);
    res.status(500).json({ error: 'Failed to create LAN network.' });
  }
});

router.post('/join', authenticateToken, async (req, res) => {
  try {
    const { networkKey, accessToken, networkId } = req.body || {};
    const suppliedKey = String(networkKey || accessToken || '').trim().toUpperCase();
    if (!suppliedKey && !networkId) {
      return res.status(400).json({ error: 'A valid network key or network ID is required to join.' });
    }

    const networks = Array.isArray(state.memoryDb.networks) ? state.memoryDb.networks : [];
    const network = networks.find(item => {
      if (suppliedKey && [item.networkKey, item.accessToken].includes(suppliedKey)) return true;
      if (networkId && item.networkId === networkId) return true;
      return false;
    });

    if (!network) {
      return res.status(404).json({ error: 'No LAN network was found for the supplied key or ID.' });
    }
    if (network.status !== 'Active') {
      return res.status(409).json({ error: 'This LAN is not accepting new connections.' });
    }

    const userEntry = normalizeUser(req.user);
    const alreadyJoined = (network.members || []).some(member => {
      const memberId = String(member.userId || '');
      return memberId === userEntry.userId || member.email === userEntry.email;
    });

    if (!alreadyJoined && (network.members || []).length >= Number(network.maxDevices || 50)) {
      return res.status(409).json({ error: 'This LAN has reached its maximum device capacity.' });
    }

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

    res.json({ message: alreadyJoined ? 'You are already connected to this LAN.' : 'You have joined the LAN network successfully.', network: serializeNetwork(network, req.user) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to join LAN network.' });
  }
});

router.post('/:networkId/notify', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const network = getNetworkByIdentifier(req.params.networkId);
    if (!network) return res.status(404).json({ error: 'LAN network not found.' });

    let recipients = [];
    if (state.isMongooseConnected) {
      recipients = await User.find({ role: { $in: ['Manager', 'Employee'] }, status: { $ne: 'Inactive' } })
        .select('_id name email role department')
        .lean();
    } else {
      recipients = state.memoryDb.users.filter(user => ['Manager', 'Employee'].includes(user.role) && user.status !== 'Inactive');
    }

    const now = new Date().toISOString();
    const notifications = recipients.map((recipient, index) => ({
      _id: `notification_${Date.now()}_${index}`,
      userId: String(recipient._id || recipient.id || ''),
      type: 'LAN_INVITATION',
      title: `Private LAN invitation: ${network.name}`,
      message: `${req.user.name} resent the secure LAN invitation. Use access token ${network.accessToken || network.networkKey} to connect.`,
      networkId: network.networkId,
      networkName: network.name,
      networkKey: network.accessToken || network.networkKey,
      createdAt: now,
      read: false
    }));
    state.memoryDb.notifications.unshift(...notifications);
    network.inviteCount = notifications.length;
    network.lastInviteAt = now;

    res.json({ message: 'LAN invitations resent.', delivered: notifications.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend LAN invitations.' });
  }
});

export default router;
