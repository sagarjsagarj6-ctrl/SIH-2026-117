import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  Check,
  Clipboard,
  Copy,
  Network,
  PowerOff,
  RefreshCw,
  Send,
  Server,
  ShieldCheck,
  Trash2,
  Users,
  Wifi
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const initialForm = {
  name: '',
  description: 'Private air-gapped workspace for approved enterprise users.',
  subnet: '10.24.0.0/24',
  gateway: '10.24.0.1',
  dnsServer: '10.24.0.1',
  maxDevices: '50',
  encryption: 'AES-256-GCM',
  authentication: 'Token + device approval',
  leaseDuration: '24 hours',
  isolationMode: 'Air-gapped / local only'
};

const setupRequirements = [
  'Private IPv4 subnet reserved for this LAN',
  'Gateway and local DNS configured',
  'Encrypted device-to-device traffic enabled',
  'Access token shared only with approved users'
];

const Field = ({ label, helper, children }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <span style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.02em' }}>{label}</span>
    {children}
    {helper && <span style={{ fontSize: '0.66rem', color: 'var(--text-dim)', lineHeight: 1.35 }}>{helper}</span>}
  </label>
);

const MetricCard = ({ label, value, detail, icon, color = 'var(--accent-cyan)' }) => (
  <div className="glass-card" style={{ padding: '16px', minHeight: '92px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>{label}</div>
      <span style={{ color }}>{icon}</span>
    </div>
    <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '9px' }}>{value}</div>
    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '3px' }}>{detail}</div>
  </div>
);

const RequirementsMetricCard = () => (
  <div className="glass-card" style={{ padding: '12px 14px', minHeight: '92px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>SETUP REQUIREMENTS</div>
      <Check size={17} color="var(--accent-green)" />
    </div>
    <div style={{ display: 'grid', gap: '3px' }}>
      {setupRequirements.map((requirement) => (
        <div key={requirement} style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', color: 'var(--text-muted)', fontSize: '0.61rem', lineHeight: 1.2 }}>
          <Check size={11} color="var(--accent-green)" style={{ marginTop: '1px', flexShrink: 0 }} />
          <span>{requirement}</span>
        </div>
      ))}
    </div>
  </div>
);

export const LanNetworkSetup = () => {
  const { token, API_URL } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [networks, setNetworks] = useState([]);
  const [createdNetwork, setCreatedNetwork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [resending, setResending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const fetchNetworks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/networks`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load LAN networks.');
      const loadedNetworks = data.networks || [];
      setNetworks(loadedNetworks);
      setCreatedNetwork((current) => {
        if (current) return loadedNetworks.find((network) => network.networkId === current.networkId) || current;
        return loadedNetworks.find((network) => network.status === 'Active') || loadedNetworks[0] || null;
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [API_URL, token]);

  useEffect(() => {
    const timer = window.setTimeout(() => fetchNetworks(), 0);
    return () => window.clearTimeout(timer);
  }, [fetchNetworks]);

  const totalDevices = useMemo(
    () => networks.reduce((sum, network) => sum + Number(network.connectedDevices || network.members?.length || 0), 0),
    [networks]
  );
  const activeNetworks = useMemo(
    () => networks.filter((network) => network.status === 'Active'),
    [networks]
  );
  const recentNetworks = useMemo(
    () => [...networks]
      .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
      .slice(0, 3),
    [networks]
  );
  const totalInvites = useMemo(
    () => networks.reduce((sum, network) => sum + Number(network.inviteCount || 0), 0),
    [networks]
  );
  const accessToken = createdNetwork?.accessToken || createdNetwork?.networkKey || '';

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const copyToken = async () => {
    if (!accessToken) return;
    try {
      await navigator.clipboard.writeText(accessToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setNotice('Token is ready to copy manually from the secure token panel.');
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!form.name.trim()) return setError('Give the private LAN a recognizable name.');
    if (!form.subnet.trim() || !form.gateway.trim() || !form.dnsServer.trim()) {
      return setError('Subnet, gateway, and DNS are required to establish the LAN.');
    }

    try {
      setCreating(true);
      const response = await fetch(`${API_URL}/networks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          maxDevices: Number(form.maxDevices),
          setupRequirements
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'LAN creation failed.');

      setCreatedNetwork(data.network);
      setNetworks((current) => [data.network, ...current.filter((network) => network.networkId !== data.network.networkId)]);
      setNotice(`${data.message} ${data.notificationSummary?.delivered || 0} invitation(s) queued.`);
      setForm((current) => ({ ...initialForm, name: current.name, description: current.description }));
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const resendInvitations = async () => {
    if (!createdNetwork) return;
    try {
      setResending(true);
      const identifier = createdNetwork._id || createdNetwork.networkId;
      const response = await fetch(`${API_URL}/networks/${identifier}/notify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not resend invitations.');
      setNotice(`${data.message} ${data.delivered} invitation(s) delivered.`);
      fetchNetworks();
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  const resetNetwork = async () => {
    if (!createdNetwork || createdNetwork.status !== 'Active') return;
    const connectedCount = Number(createdNetwork.connectedDevices || createdNetwork.members?.length || 0);
    const confirmed = window.confirm(
      `Reset ${createdNetwork.name}? This will stop the LAN, disconnect ${connectedCount} device(s), revoke the current access token, and prevent new connections.`
    );
    if (!confirmed) return;

    try {
      setResetting(true);
      setError('');
      setNotice('');
      const identifier = createdNetwork._id || createdNetwork.networkId;
      const response = await fetch(`${API_URL}/networks/${identifier}/reset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not reset the LAN.');

      setCreatedNetwork(data.network);
      setNetworks((current) => current.map((network) => (
        network.networkId === data.network.networkId ? data.network : network
      )));
      setCopied(false);
      setNotice(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setResetting(false);
    }
  };

  const removeNetwork = async () => {
    if (!createdNetwork) return;
    const connectedCount = Number(createdNetwork.connectedDevices || createdNetwork.members?.length || 0);
    const confirmed = window.confirm(
      `Remove ${createdNetwork.name} permanently? This will disconnect ${connectedCount} device(s), revoke its token, and delete the LAN record.`
    );
    if (!confirmed) return;

    try {
      setRemoving(true);
      setError('');
      setNotice('');
      const identifier = createdNetwork._id || createdNetwork.networkId;
      const response = await fetch(`${API_URL}/networks/${identifier}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not remove the LAN.');

      setNetworks((current) => current.filter((network) => network.networkId !== data.removedNetworkId));
      setCreatedNetwork(null);
      setCopied(false);
      setNotice(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div style={{ maxWidth: '1420px', margin: '0 auto', padding: '22px 14px 40px', color: 'var(--text-main)' }}>
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: 'clamp(1.55rem, 3vw, 2.0rem)', margin: '0 0 7px', fontWeight: 500 }}>Private LAN Setup</h1>
        {createdNetwork?.status === 'Stopped' && (
          <div style={{ border: '1px solid rgba(244,63,94,0.3)', borderRadius: '8px', padding: '12px 10px', color: '#fb7185', fontSize: '0.68rem', lineHeight: 1.35 }}>
            This LAN is stopped. All devices were disconnected and its previous access token was revoked.
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <MetricCard label="ACTIVE PRIVATE LANS" value={activeNetworks.length} detail="Admin-managed network segments" icon={<Network size={17} />} />
        <MetricCard label="CONNECTED DEVICES" value={totalDevices} detail="Across all active LANs" icon={<Users size={17} />} color="var(--accent-green)" />
        <MetricCard label="INVITATIONS DISPATCHED" value={totalInvites} detail="Manager and employee delivery queue" icon={<BellRing size={17} />} color="var(--accent-amber)" />
        <RequirementsMetricCard />
      </div>

      {(error || notice) && (
        <div style={{ padding: '11px 13px', borderRadius: '10px', marginBottom: '16px', background: error ? 'rgba(244,63,94,0.12)' : 'rgba(16,185,129,0.12)', border: `1px solid ${error ? 'rgba(244,63,94,0.35)' : 'rgba(16,185,129,0.35)'}`, color: error ? '#fb7185' : '#6ee7b7', fontSize: '0.76rem' }}>
          {error || notice}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '18px', alignItems: 'start' }}>
        <form onSubmit={handleCreate} className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '18px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '9px', display: 'grid', placeItems: 'center', background: 'rgba(6,182,212,0.13)', color: 'var(--accent-cyan)' }}><Server size={17} /></div>
            <div>
              <h2 style={{ fontSize: '1.05rem', margin: 0 }}>Establish a new private LAN</h2>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '3px' }}>All perimeter details are recorded with the network configuration.</div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '15px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px' }}>
              <Field label="NETWORK NAME *" helper="A recognizable name for invited users.">
                <input className="form-input" value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="e.g. Sovereign Core LAN" />
              </Field>
              <Field label="MAX DEVICES *" helper="Includes the admin host device.">
                <input className="form-input" type="number" min="2" max="5000" value={form.maxDevices} onChange={(event) => updateField('maxDevices', event.target.value)} />
              </Field>
            </div>

            <Field label="NETWORK PURPOSE / DESCRIPTION">
              <textarea className="form-input" rows="2" value={form.description} onChange={(event) => updateField('description', event.target.value)} style={{ resize: 'vertical' }} />
            </Field>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
              <div style={{ fontSize: '0.73rem', fontWeight: 800, color: 'var(--accent-cyan)', marginBottom: '11px', letterSpacing: '0.04em' }}>PRIVATE ADDRESSING & ROUTING</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
                <Field label="PRIVATE SUBNET *" helper="CIDR notation">
                  <input className="form-input mono" value={form.subnet} onChange={(event) => updateField('subnet', event.target.value)} placeholder="10.24.0.0/24" />
                </Field>
                <Field label="GATEWAY *">
                  <input className="form-input mono" value={form.gateway} onChange={(event) => updateField('gateway', event.target.value)} placeholder="10.24.0.1" />
                </Field>
                <Field label="LOCAL DNS *">
                  <input className="form-input mono" value={form.dnsServer} onChange={(event) => updateField('dnsServer', event.target.value)} placeholder="10.24.0.1" />
                </Field>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
              <div style={{ fontSize: '0.73rem', fontWeight: 800, color: 'var(--accent-cyan)', marginBottom: '11px', letterSpacing: '0.04em' }}>SECURITY & LEASE POLICY</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                <Field label="ENCRYPTION">
                  <select className="form-select" value={form.encryption} onChange={(event) => updateField('encryption', event.target.value)}>
                    <option>AES-256-GCM</option><option>ChaCha20-Poly1305</option>
                  </select>
                </Field>
                <Field label="AUTHENTICATION">
                  <select className="form-select" value={form.authentication} onChange={(event) => updateField('authentication', event.target.value)}>
                    <option>Token + device approval</option><option>Token only</option><option>Token + manager approval</option>
                  </select>
                </Field>
                <Field label="DEVICE LEASE">
                  <select className="form-select" value={form.leaseDuration} onChange={(event) => updateField('leaseDuration', event.target.value)}>
                    <option>8 hours</option><option>24 hours</option><option>7 days</option><option>30 days</option>
                  </select>
                </Field>
                <Field label="ISOLATION MODE">
                  <select className="form-select" value={form.isolationMode} onChange={(event) => updateField('isolationMode', event.target.value)}>
                    <option>Air-gapped / local only</option><option>Private LAN / no internet egress</option>
                  </select>
                </Field>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', paddingTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--text-muted)', fontSize: '0.69rem' }}><LockIcon /> Token invitations are audited.</div>
              <button className="btn-primary" type="submit" disabled={creating} style={{ minWidth: '190px' }}>
                <Network size={16} /> {creating ? 'Creating private LAN...' : 'Create private LAN'}
              </button>
            </div>
          </div>
        </form>

      </div>

      <div className="glass-panel" style={{ padding: '20px', marginTop: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '13px', flexWrap: 'wrap' }}>
          <div><h2 style={{ margin: 0, fontSize: '1.05rem' }}>Recent LAN devices</h2><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>Showing the three most recently created private LANs.</div></div>
          <div style={{ display: 'flex', gap: '7px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn-secondary" type="button" onClick={removeNetwork} disabled={!createdNetwork || removing || loading} style={{ padding: '7px 11px', fontSize: '0.72rem', color: 'var(--accent-rose)' }} title="Remove the selected LAN permanently">
              <Trash2 size={14} /> {removing ? 'Removing...' : 'Remove selected LAN'}
            </button>
            <button className="btn-secondary" type="button" onClick={fetchNetworks} disabled={loading || removing} style={{ padding: '7px 11px', fontSize: '0.72rem' }}><RefreshCw size={14} className={loading ? 'spin-animation' : ''} /> Refresh dashboard</button>
          </div>
        </div>
        {recentNetworks.length === 0 ? (
          <div style={{ padding: '22px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '10px', fontSize: '0.75rem' }}>No private LANs have been created yet.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '11px' }}>
            {recentNetworks.map((network) => {
              const isSelected = createdNetwork?.networkId === network.networkId;
              return <button key={network.networkId} type="button" onClick={() => setCreatedNetwork(network)} style={{ textAlign: 'left', cursor: 'pointer', color: 'var(--text-main)', background: isSelected ? 'rgba(6,182,212,0.09)' : 'rgba(255,255,255,0.025)', border: `1px solid ${isSelected ? 'rgba(6,182,212,0.4)' : 'var(--border-color)'}`, borderRadius: '10px', padding: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}><strong style={{ fontSize: '0.82rem' }}>{network.name}</strong><span className={`badge ${network.status === 'Active' ? 'badge-green' : 'badge-rose'}`} style={{ fontSize: '0.58rem' }}>{network.status}</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '11px', fontSize: '0.68rem', color: 'var(--text-muted)' }}><span><Wifi size={12} style={{ verticalAlign: 'middle' }} /> {network.connectedDevices || network.members?.length || 0} connected</span><span><Users size={12} style={{ verticalAlign: 'middle' }} /> {network.deviceCapacity || network.maxDevices} capacity</span></div>
                <div className="mono" style={{ fontSize: '0.63rem', color: 'var(--text-dim)', marginTop: '9px' }}>{network.subnet} · {network.encryption}</div>
              </button>;
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const LockIcon = () => <ShieldCheck size={14} color="var(--accent-green)" />;
