import { useCallback, useEffect, useState } from 'react';
import { Bell, Check, CheckCircle2, KeyRound, Network, RefreshCw, ShieldCheck, Users, Wifi } from 'lucide-react';
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
    <div style={{ maxWidth: '1220px', margin: '0 auto', padding: '22px 14px 40px', color: 'var(--text-main)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <div>
          <div className="badge badge-cyan" style={{ marginBottom: '10px' }}><Network size={13} /> SECURE NETWORK ACCESS</div>
          <h1 style={{ fontSize: 'clamp(1.55rem, 3vw, 2.25rem)', margin: '0 0 7px', fontWeight: 800 }}>Connect to LAN</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, maxWidth: '690px', lineHeight: 1.5, fontSize: '0.86rem' }}>
            Use the token sent by your administrator to join an approved private LAN. Your device will appear in the admin connectivity dashboard after verification.
          </p>
        </div>
        <div className="glass-card" style={{ padding: '12px 15px', minWidth: '205px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>SIGNED-IN IDENTITY</div>
          <div style={{ fontWeight: 800, marginTop: '4px', fontSize: '0.82rem' }}>{user?.name}</div>
          <div style={{ color: 'var(--accent-cyan)', fontSize: '0.66rem', marginTop: '3px' }}>{user?.role} · {user?.department}</div>
        </div>
      </div>

      {(error || notice) && <div style={{ padding: '11px 13px', borderRadius: '10px', marginBottom: '16px', background: error ? 'rgba(244,63,94,0.12)' : 'rgba(16,185,129,0.12)', border: `1px solid ${error ? 'rgba(244,63,94,0.35)' : 'rgba(16,185,129,0.35)'}`, color: error ? '#fb7185' : '#6ee7b7', fontSize: '0.76rem' }}>{error || notice}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.85fr) minmax(340px, 1.15fr)', gap: '18px', alignItems: 'start' }}>
        <form onSubmit={handleJoin} className="glass-panel" style={{ padding: '21px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '17px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '9px', display: 'grid', placeItems: 'center', background: 'rgba(99,102,241,0.14)', color: 'var(--accent-indigo)' }}><KeyRound size={17} /></div>
            <div><h2 style={{ fontSize: '1.05rem', margin: 0 }}>Enter invitation token</h2><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '3px' }}>Tokens are case-insensitive and validated locally.</div></div>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            <span style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-muted)' }}>LAN ACCESS TOKEN</span>
            <input className="form-input mono" value={tokenInput} onChange={(event) => setTokenInput(event.target.value.toUpperCase())} placeholder="LAN-XXXXX-XXXXX" autoComplete="off" />
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', margin: '13px 0', color: 'var(--text-dim)', fontSize: '0.67rem' }}><span style={{ height: '1px', background: 'var(--border-color)', flex: 1 }} />OR NETWORK ID<span style={{ height: '1px', background: 'var(--border-color)', flex: 1 }} /></div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            <span style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-muted)' }}>NETWORK ID <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}>(optional)</span></span>
            <input className="form-input mono" value={networkIdInput} onChange={(event) => setNetworkIdInput(event.target.value)} placeholder="lan-xxxxxx" autoComplete="off" />
          </label>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '12px', background: 'rgba(6,182,212,0.06)', borderRadius: '9px', marginTop: '17px', color: 'var(--text-muted)', fontSize: '0.69rem', lineHeight: 1.4 }}><ShieldCheck size={15} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />Only use tokens delivered through the Sovereign AI notification channel. Do not forward tokens outside approved enterprise users.</div>
          <button className="btn-primary" type="submit" disabled={joining} style={{ width: '100%', marginTop: '17px' }}><Wifi size={16} /> {joining ? 'Verifying connection...' : 'Connect to private LAN'}</button>
        </form>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div><h2 style={{ margin: 0, fontSize: '1.05rem' }}>Invitations & notices</h2><div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', marginTop: '4px' }}>LAN tokens sent to your role appear here.</div></div>
            <button className="btn-secondary" type="button" onClick={fetchConnectionData} disabled={loading} title="Refresh invitations" style={{ padding: '7px 9px' }}><RefreshCw size={14} className={loading ? 'spin-animation' : ''} /></button>
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: '26px 14px', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '10px', color: 'var(--text-muted)', fontSize: '0.74rem', lineHeight: 1.5 }}><Bell size={23} color="var(--accent-cyan)" style={{ marginBottom: '7px' }} /><div>No pending LAN invitations.</div><div>Ask an admin to create or resend access for your team.</div></div>
          ) : (
            <div style={{ display: 'grid', gap: '10px', maxHeight: '330px', overflowY: 'auto' }}>
              {notifications.map((notification) => <div key={notification._id} style={{ padding: '12px', borderRadius: '10px', border: `1px solid ${notification.read ? 'var(--border-color)' : 'rgba(6,182,212,0.38)'}`, background: notification.read ? 'rgba(255,255,255,0.02)' : 'rgba(6,182,212,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '9px', alignItems: 'flex-start' }}><strong style={{ fontSize: '0.76rem' }}>{notification.title}</strong>{!notification.read && <span className="badge badge-cyan" style={{ fontSize: '0.56rem' }}>NEW</span>}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', lineHeight: 1.4, margin: '7px 0 10px' }}>{notification.message}</div>
                <button className="btn-secondary" type="button" onClick={() => handleInvitation(notification)} style={{ padding: '6px 9px', fontSize: '0.66rem' }}><KeyRound size={13} /> Use token & connect</button>
              </div>)}
            </div>
          )}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '20px', marginTop: '18px' }}>
        <div style={{ marginBottom: '13px' }}><h2 style={{ margin: 0, fontSize: '1.05rem' }}>Connected private LANs</h2><div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', marginTop: '4px' }}>Your current device memberships and available capacity.</div></div>
        {networks.length === 0 ? <div style={{ padding: '22px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '10px', fontSize: '0.74rem' }}>No active LAN connection yet.</div> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(255px, 1fr))', gap: '11px' }}>{networks.map((network) => <div key={network.networkId} className="glass-card" style={{ padding: '14px' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: '9px', alignItems: 'center' }}><strong style={{ fontSize: '0.82rem' }}>{network.name}</strong><span className="badge badge-green" style={{ fontSize: '0.56rem' }}><Check size={11} /> CONNECTED</span></div><div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', marginTop: '10px', display: 'grid', gap: '6px' }}><span><Users size={13} style={{ verticalAlign: 'middle' }} /> {network.connectedDevices || network.members?.length || 0} devices connected</span><span><Network size={13} style={{ verticalAlign: 'middle' }} /> {network.subnet} · {network.isolationMode}</span><span><ShieldCheck size={13} style={{ verticalAlign: 'middle' }} /> {network.encryption} · {network.leaseDuration}</span></div></div>)}</div>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', color: 'var(--text-dim)', fontSize: '0.66rem', marginTop: '18px' }}><CheckCircle2 size={14} color="var(--accent-green)" /> Connection events are recorded in the enterprise audit trail.</div>
    </div>
  );
};
