import express from 'express';
import { state } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  const userId = String(req.user._id || req.user.id || '');
  const notifications = (state.memoryDb.notifications || [])
    .filter(notification => notification.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    notifications,
    unreadCount: notifications.filter(notification => !notification.read).length
  });
});

router.post('/:notificationId/read', authenticateToken, (req, res) => {
  const userId = String(req.user._id || req.user.id || '');
  const notification = (state.memoryDb.notifications || []).find(item => item._id === req.params.notificationId && item.userId === userId);
  if (!notification) return res.status(404).json({ error: 'Notification not found.' });

  notification.read = true;
  res.json({ message: 'Notification marked as read.', notification });
});

export default router;
