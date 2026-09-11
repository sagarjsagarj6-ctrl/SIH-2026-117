import { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, Download, RefreshCw, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AuditorDashboard = () => {
  const { token, API_URL } = useAuth();
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/audit`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) setLogs((await response.json()).auditLogs || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const visibleLogs = useMemo(
    () => status === 'ALL' ? logs : logs.filter(log => log.status === status),
    [logs, status]
  );

  const exportLogs = async () => {
    const response = await fetch(`${API_URL}/audit/export`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return;
    const blob = new Blob([JSON.stringify(await response.json(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sovereign-audit-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '32px', color: 'var(--text-main)', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
        <div>
          <div className="badge badge-cyan" style={{ marginBottom: '8px' }}>READ-ONLY EVIDENCE CENTER</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Audit & Compliance Trail</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Department-scoped evidence with structured risk and policy outcomes.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" onClick={fetchLogs}><RefreshCw size={16} /> Refresh</button>
          <button className="btn-primary" onClick={exportLogs}><Download size={16} /> Export JSON</button>
        </div>
      </div>
      <div className="glass-card" style={{ padding: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <ClipboardCheck size={22} color="var(--accent-cyan)" />
        <div><strong>{logs.length}</strong> recorded events</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['ALL', 'SUCCESS', 'DENIED', 'WARNING', 'FAILED'].map(option => (
            <button key={option} className={status === option ? 'btn-primary' : 'btn-secondary'} onClick={() => setStatus(option)} style={{ padding: '6px 10px', fontSize: '0.72rem' }}>{option}</button>
          ))}
        </div>
      </div>
      <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
        {loading ? <p style={{ color: 'var(--text-muted)' }}>Loading evidence...</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
            <thead><tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '12px' }}>Time</th><th style={{ padding: '12px' }}>Actor</th><th style={{ padding: '12px' }}>Action</th><th style={{ padding: '12px' }}>Resource</th><th style={{ padding: '12px' }}>Status</th><th style={{ padding: '12px' }}>Risk</th>
            </tr></thead>
            <tbody>{visibleLogs.map((log, index) => (
              <tr key={log.eventId || log._id || index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>{new Date(log.timestamp).toLocaleString()}</td>
                <td style={{ padding: '12px' }}>{log.userName}<div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{log.department}</div></td>
                <td style={{ padding: '12px' }} className="mono">{log.action}</td><td style={{ padding: '12px' }}>{log.resource}</td>
                <td style={{ padding: '12px' }}><span className={`badge ${log.status === 'SUCCESS' ? 'badge-green' : 'badge-rose'}`}>{log.status}</span></td>
                <td style={{ padding: '12px', color: log.riskScore > 0.5 ? 'var(--accent-rose)' : 'var(--accent-green)' }}>{Math.round((log.riskScore || 0) * 100)}%</td>
              </tr>
            ))}</tbody>
          </table>
        )}
        {!loading && visibleLogs.length === 0 && <div style={{ padding: '28px', color: 'var(--text-muted)', textAlign: 'center' }}><ShieldAlert size={20} /> No events match this filter.</div>}
      </div>
    </div>
  );
};
