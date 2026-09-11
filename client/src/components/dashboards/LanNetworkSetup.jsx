import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  Check,
  CheckCircle2,
  Clipboard,
  Copy,
  KeyRound,
  Network,
  RefreshCw,
  Send,
  Server,
  ShieldCheck,
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

export const LanNetworkSetup = () => {
  const { token, API_URL } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [networks, setNetworks] = useState([]);
  const [createdNetwork, setCreatedNetwork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
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
      setNetworks(data.networks || []);
      setCreatedNetwork((current) => {
        if (!current) return current;
        return (data.networks || []).find((network) => network.networkId === current.networkId) || current;
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

  return (
    <div style={{ maxWidth: '1420px', margin: '0 auto', padding: '22px 14px 40px', color: 'var(--text-main)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <div>
          <div className="badge badge-cyan" style={{ marginBottom: '10px' }}><Network size={13} /> ADMIN / LAN CONTROL</div>
          <h1 style={{ fontSize: 'clamp(1.55rem, 3vw, 2.25rem)', margin: '0 0 7px', fontWeight: 800 }}>Private LAN Setup</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, maxWidth: '720px', lineHeight: 1.5, fontSize: '0.86rem' }}>
            Establish an isolated enterprise network, configure its perimeter, and securely invite existing managers and employees with one generated access token.
          </p>
        </div>
        <div className="glass-card" style={{ padding: '12px 15px', minWidth: '220px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--accent-green)', fontSize: '0.71rem', fontWeight: 700 }}>
            <span className="pulse-live" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)' }} />
            AIR-GAPPED PERIMETER SECURE
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', marginTop: '6px' }}>Admin-only provisioning surface</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <MetricCard label="ACTIVE PRIVATE LANS" value={networks.length} detail="Admin-managed network segments" icon={<Network size={17} />} />
        <MetricCard label="CONNECTED DEVICES" value={totalDevices} detail="Across all active LANs" icon={<Users size={17} />} color="var(--accent-green)" />
        <MetricCard label="INVITATIONS DISPATCHED" value={totalInvites} detail="Manager and employee delivery queue" icon={<BellRing size={17} />} color="var(--accent-amber)" />
        <MetricCard label="ISOLATION POSTURE" value="100%" detail="Private IPv4 / local-only routing" icon={<ShieldCheck size={17} />} color="var(--accent-purple)" />
      </div>

      {(error || notice) && (
        <div style={{ padding: '11px 13px', borderRadius: '10px', marginBottom: '16px', background: error ? 'rgba(244,63,94,0.12)' : 'rgba(16,185,129,0.12)', border: `1px solid ${error ? 'rgba(244,63,94,0.35)' : 'rgba(16,185,129,0.35)'}`, color: error ? '#fb7185' : '#6ee7b7', fontSize: '0.76rem' }}>
          {error || notice}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(320px, 0.9fr)', gap: '18px', alignItems: 'start' }}>
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

        <div style={{ display: 'grid', gap: '18px' }}>
          <div className="glass-panel" style={{ padding: '20px', border: accessToken ? '1px solid rgba(57,255,20,0.42)' : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '15px' }}>
              <KeyRound size={18} color={accessToken ? 'var(--accent-green)' : 'var(--accent-cyan)'} />
              <div>
                <h2 style={{ fontSize: '1.05rem', margin: 0 }}>Secure access token</h2>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '3px' }}>Generated after LAN creation and dispatched in-app.</div>
              </div>
            </div>
            {accessToken ? (
              <>
                <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(57,255,20,0.28)', borderRadius: '10px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <code className="mono" style={{ color: 'var(--accent-green)', fontSize: '1.08rem', letterSpacing: '0.08em', overflowWrap: 'anywhere' }}>{accessToken}</code>
                  <button className="btn-secondary" type="button" onClick={copyToken} title="Copy LAN access token" style={{ padding: '7px 9px', flexShrink: 0 }}>
                    {copied ? <Check size={15} color="var(--accent-green)" /> : <Copy size={15} />}
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', marginTop: '13px' }}>
                  <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(6,182,212,0.07)' }}><div style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>CONNECTED</div><strong>{createdNetwork.connectedDevices || createdNetwork.members?.length || 0} / {createdNetwork.deviceCapacity || createdNetwork.maxDevices}</strong></div>
                  <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(245,158,11,0.07)' }}><div style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>INVITATIONS</div><strong>{createdNetwork.inviteCount || 0} delivered</strong></div>
                </div>
                <button className="btn-secondary" type="button" onClick={resendInvitations} disabled={resending} style={{ width: '100%', marginTop: '12px', fontSize: '0.75rem' }}>
                  <Send size={14} /> {resending ? 'Resending invitations...' : 'Resend to managers & employees'}
                </button>
              </>
            ) : (
              <div style={{ border: '1px dashed var(--border-color)', borderRadius: '10px', padding: '24px 15px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: 1.5 }}>
                <Clipboard size={22} color="var(--accent-cyan)" style={{ marginBottom: '7px' }} />
                <div>Your one-time setup token will appear here after the LAN is created.</div>
              </div>
            )}
          </div>

          <div className="glass-card" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}><CheckCircle2 size={17} color="var(--accent-green)" /><h3 style={{ margin: 0, fontSize: '0.95rem' }}>Setup requirements</h3></div>
            <div style={{ display: 'grid', gap: '9px' }}>
              {setupRequirements.map((requirement) => <div key={requirement} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: 'var(--text-muted)', fontSize: '0.72rem', lineHeight: 1.35 }}><Check size={14} color="var(--accent-green)" style={{ marginTop: '1px', flexShrink: 0 }} />{requirement}</div>)}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '20px', marginTop: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '13px', flexWrap: 'wrap' }}>
          <div><h2 style={{ margin: 0, fontSize: '1.05rem' }}>LAN device dashboard</h2><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>Connected endpoints and invite delivery across managed private networks.</div></div>
          <button className="btn-secondary" type="button" onClick={fetchNetworks} disabled={loading} style={{ padding: '7px 11px', fontSize: '0.72rem' }}><RefreshCw size={14} className={loading ? 'spin-animation' : ''} /> Refresh dashboard</button>
        </div>
        {networks.length === 0 ? (
          <div style={{ padding: '22px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '10px', fontSize: '0.75rem' }}>No private LANs have been created yet.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '11px' }}>
            {networks.map((network) => {
              const isSelected = createdNetwork?.networkId === network.networkId;
              return <button key={network.networkId} type="button" onClick={() => setCreatedNetwork(network)} style={{ textAlign: 'left', cursor: 'pointer', color: 'var(--text-main)', background: isSelected ? 'rgba(6,182,212,0.09)' : 'rgba(255,255,255,0.025)', border: `1px solid ${isSelected ? 'rgba(6,182,212,0.4)' : 'var(--border-color)'}`, borderRadius: '10px', padding: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}><strong style={{ fontSize: '0.82rem' }}>{network.name}</strong><span className="badge badge-green" style={{ fontSize: '0.58rem' }}>{network.status}</span></div>
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
