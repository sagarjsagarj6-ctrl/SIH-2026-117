import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, Check, CheckCheck, Clipboard, Copy, RefreshCw, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const notificationTone = (type = '') => {
  if (type.includes('REJECTED')) return '#fb7185';
  if (type.includes('ACCEPTED')) return '#86efac';
  if (type.includes('LAN')) return '#22d3ee';
  if (type.includes('AI_HANDOFF')) return '#c084fc';
  return '#a5b4fc';
};

const fallbackCopyMessage = (notification) => notification.networkKey
  ? `SOVEREIGN AI PRIVATE LAN CONNECTION\nNetwork: ${notification.networkName || 'Private LAN'}\nToken: ${notification.networkKey}\nOpen Connect to LAN and paste this token to join the air-gapped workspace.`
  : notification.copyMessage;

export const NotificationBell = () => {
  const { token, API_URL } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState('');

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/notifications`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) return;
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Notification sync failed', err);
    } finally {
      setLoading(false);
    }
  }, [API_URL, token]);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => fetchNotifications(), 0);
    const pollTimer = window.setInterval(() => fetchNotifications(), 8000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(pollTimer);
    };
  }, [fetchNotifications]);

  const unreadCount = useMemo(() => notifications.filter(notification => !notification.read).length, [notifications]);

  const markRead = async (notification) => {
    if (notification.read) return;
    setNotifications(current => current.map(item => item._id === notification._id ? { ...item, read: true } : item));
    fetch(`${API_URL}/notifications/${notification._id}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => {});
  };

  const copyNotification = async (notification) => {
    const copyMessage = fallbackCopyMessage(notification);
    if (!copyMessage) return;
    try {
      await navigator.clipboard.writeText(copyMessage);
      setCopiedId(notification._id);
      setTimeout(() => setCopiedId(''), 1800);
      markRead(notification);
    } catch (err) {
      console.error('Notification copy failed', err);
    }
  };

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => { setIsOpen(current => !current); fetchNotifications(); }}
        title="Open notifications"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          borderRadius: '9px',
          border: `1px solid ${unreadCount ? 'rgba(6,182,212,0.55)' : 'var(--border-color)'}`,
          background: unreadCount ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.04)',
          color: unreadCount ? 'var(--accent-cyan)' : 'var(--text-muted)',
          cursor: 'pointer'
        }}
      >
        <Bell size={16} />
        {unreadCount > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', minWidth: '16px', height: '16px', padding: '0 3px', borderRadius: '999px', display: 'grid', placeItems: 'center', background: 'var(--accent-rose)', color: '#fff', border: '2px solid var(--bg-card)', fontSize: '0.57rem', fontWeight: 800 }}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {isOpen && <div style={{ position: 'absolute', top: '40px', right: 0, width: 'min(390px, calc(100vw - 24px))', background: 'var(--bg-card)', border: '1px solid var(--border-highlight)', borderRadius: '12px', boxShadow: 'var(--shadow-glow)', zIndex: 1000, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '12px 13px', borderBottom: '1px solid var(--border-color)' }}>
          <div><div style={{ fontSize: '0.82rem', fontWeight: 800 }}>Notification Center</div><div style={{ color: 'var(--text-muted)', fontSize: '0.63rem', marginTop: '2px' }}>{unreadCount} unread · role-synced over private LAN</div></div>
          <div style={{ display: 'flex', gap: '4px' }}><button type="button" onClick={fetchNotifications} title="Refresh notifications" style={{ display: 'grid', placeItems: 'center', padding: '5px', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}><RefreshCw size={14} className={loading ? 'spin-animation' : ''} /></button><button type="button" onClick={() => setIsOpen(false)} title="Close notifications" style={{ display: 'grid', placeItems: 'center', padding: '5px', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={14} /></button></div>
        </div>
        <div style={{ maxHeight: '365px', overflowY: 'auto', padding: '7px' }}>
          {notifications.length === 0 ? <div style={{ padding: '26px 14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.7rem' }}><CheckCheck size={21} color="var(--accent-green)" style={{ marginBottom: '6px' }} /><div>No notifications yet.</div></div> : notifications.slice(0, 12).map(notification => {
            const copyMessage = fallbackCopyMessage(notification);
            const tone = notificationTone(notification.type);
            return <div key={notification._id} onClick={() => markRead(notification)} style={{ padding: '10px', marginBottom: '6px', borderRadius: '9px', border: `1px solid ${notification.read ? 'var(--border-color)' : `${tone}66`}`, background: notification.read ? 'rgba(255,255,255,0.018)' : `${tone}0d`, cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: tone, flexShrink: 0 }} /><strong style={{ fontSize: '0.72rem', lineHeight: 1.25 }}>{notification.title}</strong></div>{!notification.read && <span style={{ color: tone, fontSize: '0.54rem', fontWeight: 800 }}>NEW</span>}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.67rem', lineHeight: 1.4, margin: '6px 0 7px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{notification.summary || notification.message}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}><span style={{ color: 'var(--text-dim)', fontSize: '0.58rem' }}>{notification.type?.replaceAll('_', ' ')} · {new Date(notification.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>{copyMessage && <button type="button" onClick={(event) => { event.stopPropagation(); copyNotification(notification); }} title="Copy notification message" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 6px', border: `1px solid ${tone}55`, borderRadius: '6px', background: 'transparent', color: tone, cursor: 'pointer', fontSize: '0.59rem', fontWeight: 700 }}>{copiedId === notification._id ? <Check size={11} /> : notification.type === 'LAN_INVITATION' ? <Copy size={11} /> : <Clipboard size={11} />} {copiedId === notification._id ? 'Copied' : 'Copy'}</button>}</div>
            </div>;
          })}
        </div>
      </div>}
    </div>
  );
};
