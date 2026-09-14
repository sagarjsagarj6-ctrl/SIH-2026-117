import { useCallback, useEffect, useState } from 'react';
import { Bell, Check, KeyRound, Network, RefreshCw, ShieldCheck, Users, Wifi } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LanConnectionPanel = () => {
  const { user, token, API_URL } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [tokenInput, setTokenInput] = useState('');
  const [networkIdInput, setNetworkIdInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const fetchConnectionData = useCallback(async () => {
    try {
      setLoading(true);
      const [notificationResponse, networkResponse] = await Promise.all([
        fetch(`${API_URL}/notifications`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/networks`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const notificationData = await notificationResponse.json();
      const networkData = await networkResponse.json();
      if (!notificationResponse.ok) throw new Error(notificationData.error || 'Could not load LAN invitations.');
      if (!networkResponse.ok) throw new Error(networkData.error || 'Could not load connected LANs.');
      setNotifications(notificationData.notifications || []);
      setNetworks(networkData.networks || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [API_URL, token]);

  useEffect(() => {
    const timer = window.setTimeout(() => fetchConnectionData(), 0);
    return () => window.clearTimeout(timer);
  }, [fetchConnectionData]);

  const handleJoin = async (event, invitationToken = '') => {
    event?.preventDefault();
    setError('');
    setNotice('');
    const suppliedToken = invitationToken || tokenInput.trim();
    const suppliedNetworkId = networkIdInput.trim();
    if (!suppliedToken && !suppliedNetworkId) return setError('Paste the LAN access token from your invitation to connect.');

    try {
      setJoining(true);
      const response = await fetch(`${API_URL}/networks/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ networkKey: suppliedToken || undefined, networkId: suppliedNetworkId || undefined })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not connect to the LAN.');
      setNotice(`${data.message}${data.aiHandoffsDelivered ? ` ${data.aiHandoffsDelivered} queued AI handoff(s) delivered.` : ''}`);
      setTokenInput('');
      setNetworkIdInput('');
      await fetchConnectionData();
    } catch (err) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  };

  const handleInvitation = async (invitation) => {
    setTokenInput(invitation.networkKey || '');
    await handleJoin(null, invitation.networkKey || '');
    if (!invitation.read) {
      fetch(`${API_URL}/notifications/${invitation._id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
  };

  return (
    <div style={{ maxWidth: '1220px', width: '100%', height: '100%', boxSizing: 'border-box', margin: '0 auto', padding: '14px 14px 18px', color: 'var(--text-main)', overflow: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'start', gap: '12px', marginBottom: '14px' }}>
        <div>
          <div className="badge badge-cyan" style={{ marginBottom: '5px', fontSize: '0.6rem', padding: '4px 7px' }}><Network size={12} /> SECURE NETWORK ACCESS</div>
          <h1 style={{ fontSize: '1.35rem', margin: 0, fontWeight: 800 }}>Connect to LAN</h1>
        </div>
        <div className="glass-card" style={{ padding: '9px 12px', minWidth: '180px' }}>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>SIGNED-IN IDENTITY</div>
          <div style={{ fontWeight: 800, marginTop: '3px', fontSize: '0.76rem' }}>{user?.name}</div>
          <div style={{ color: 'var(--accent-cyan)', fontSize: '0.62rem', marginTop: '2px' }}>{user?.role} · {user?.department}</div>
        </div>
      </div>

      {(error || notice) && <div style={{ padding: '8px 10px', borderRadius: '8px', marginBottom: '9px', background: error ? 'rgba(244,63,94,0.12)' : 'rgba(16,185,129,0.12)', border: `1px solid ${error ? 'rgba(244,63,94,0.35)' : 'rgba(16,185,129,0.35)'}`, color: error ? '#fb7185' : '#6ee7b7', fontSize: '0.68rem' }}>{error || notice}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', alignItems: 'stretch' }}>
        <form onSubmit={handleJoin} className="glass-panel" style={{ padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'grid', placeItems: 'center', background: 'rgba(99,102,241,0.14)', color: 'var(--accent-indigo)' }}><KeyRound size={15} /></div>
            <div><h2 style={{ fontSize: '0.92rem', margin: 0 }}>Enter invitation token</h2></div>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-muted)' }}>LAN ACCESS TOKEN</span>
            <input className="form-input mono" value={tokenInput} onChange={(event) => setTokenInput(event.target.value.toUpperCase())} placeholder="LAN-XXXXX-XXXXX" autoComplete="off" />
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '9px 0', color: 'var(--text-dim)', fontSize: '0.62rem' }}><span style={{ height: '1px', background: 'var(--border-color)', flex: 1 }} />OR NETWORK ID<span style={{ height: '1px', background: 'var(--border-color)', flex: 1 }} /></div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-muted)' }}>NETWORK ID <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}>(optional)</span></span>
            <input className="form-input mono" value={networkIdInput} onChange={(event) => setNetworkIdInput(event.target.value)} placeholder="lan-xxxxxx" autoComplete="off" />
          </label>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', padding: '8px', background: 'rgba(6,182,212,0.06)', borderRadius: '7px', marginTop: '11px', color: 'var(--text-muted)', fontSize: '0.64rem', lineHeight: 1.3 }}><ShieldCheck size={14} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />Only use tokens delivered through the Sovereign AI notification channel. Do not forward tokens outside approved enterprise users.</div>
          <button className="btn-primary" type="submit" disabled={joining} style={{ width: '100%', marginTop: '11px', padding: '7px 10px', fontSize: '0.72rem' }}><Wifi size={14} /> {joining ? 'Verifying connection...' : 'Connect to private LAN'}</button>
        </form>

        <div style={{ display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr)', gap: '10px', height: '100%' }}>
          <div className="glass-panel" style={{ padding: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '9px' }}>
            <div><h2 style={{ margin: 0, fontSize: '0.92rem' }}>Invitations & notices</h2></div>
            <button className="btn-secondary" type="button" onClick={fetchConnectionData} disabled={loading} title="Refresh invitations" style={{ padding: '5px 7px' }}><RefreshCw size={13} className={loading ? 'spin-animation' : ''} /></button>
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: '16px 10px', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.68rem' }}><Bell size={19} color="var(--accent-cyan)" style={{ marginBottom: '5px' }} /><div>No pending LAN invitations.</div></div>
          ) : (
            <div style={{ display: 'grid', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
              {notifications.map((notification) => <div key={notification._id} style={{ padding: '9px', borderRadius: '8px', border: `1px solid ${notification.read ? 'var(--border-color)' : 'rgba(6,182,212,0.38)'}`, background: notification.read ? 'rgba(255,255,255,0.02)' : 'rgba(6,182,212,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '7px', alignItems: 'flex-start' }}><strong style={{ fontSize: '0.68rem' }}>{notification.title}</strong>{!notification.read && <span className="badge badge-cyan" style={{ fontSize: '0.52rem' }}>NEW</span>}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.62rem', lineHeight: 1.3, margin: '5px 0 7px' }}>{notification.message}</div>
                <button className="btn-secondary" type="button" onClick={() => handleInvitation(notification)} style={{ padding: '5px 7px', fontSize: '0.6rem' }}><KeyRound size={12} /> Use token & connect</button>
              </div>)}
            </div>
          )}
          </div>

          <div className="glass-panel" style={{ padding: '12px' }}>
            <div style={{ marginBottom: '8px' }}><h2 style={{ margin: 0, fontSize: '0.92rem' }}>Connected private LANs</h2></div>
            {networks.length === 0 ? <div style={{ padding: '14px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '8px', fontSize: '0.68rem' }}>No active LAN connection yet.</div> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '7px' }}>{networks.map((network) => <div key={network.networkId} className="glass-card" style={{ padding: '10px' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: '7px', alignItems: 'center' }}><strong style={{ fontSize: '0.74rem' }}>{network.name}</strong><span className="badge badge-green" style={{ fontSize: '0.52rem' }}><Check size={10} /> CONNECTED</span></div><div style={{ color: 'var(--text-muted)', fontSize: '0.62rem', marginTop: '7px', display: 'grid', gap: '4px' }}><span><Users size={12} style={{ verticalAlign: 'middle' }} /> {network.connectedDevices || network.members?.length || 0} devices connected</span><span><Network size={12} style={{ verticalAlign: 'middle' }} /> {network.subnet} · {network.isolationMode}</span><span><ShieldCheck size={12} style={{ verticalAlign: 'middle' }} /> {network.encryption} · {network.leaseDuration}</span></div></div>)}</div>}
          </div>
        </div>
      </div>

    </div>
  );
};
