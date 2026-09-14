import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  BarChart3, Users, Clock, Activity, Lock
} from 'lucide-react';

export const ManagerDashboard = () => {
  const { token, API_URL } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchManagerAnalytics();
  }, []);

  async function fetchManagerAnalytics() {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/analytics/manager`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error('Manager analytics error', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !metrics) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-main)' }}>
        <h2>Loading Department Analytics & Compliance Metrics...</h2>
      </div>
    );
  }

  return (
    <div style={{
      padding: '14px 18px 16px',
      color: 'var(--text-main)',
      maxWidth: '1400px',
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
        <div>
          
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>{metrics.departmentName} Management Portal</h1>
       
        </div>
        <button className="btn-secondary" onClick={fetchManagerAnalytics} style={{ padding: '6px 10px', fontSize: '0.72rem', flexShrink: 0 }}>
          <Activity size={14} /> Refresh
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px', marginBottom: '14px', flexShrink: 0 }}>
        <div className="glass-card" style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>ACTIVE TEAM MEMBERS</span>
            <Users size={17} color="var(--accent-indigo)" />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, lineHeight: 1.1 }}>{metrics.activeTeamMembers}</div>
          <div style={{ fontSize: '0.66rem', color: 'var(--accent-green)', marginTop: '3px' }}>✓ 100% Authorized RBAC Users</div>
        </div>

        <div className="glass-card" style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>QUERIES PROCESSED</span>
            <BarChart3 size={17} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, lineHeight: 1.1 }}>{metrics.totalQueriesProcessed}</div>
          <div style={{ fontSize: '0.66rem', color: 'var(--accent-cyan)', marginTop: '3px' }}>Zero Cloud Dependencies</div>
        </div>

        <div className="glass-card" style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>AVG INFERENCE LATENCY</span>
            <Clock size={17} color="var(--accent-purple)" />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, lineHeight: 1.1 }}>{metrics.avgLatencyMs} <span style={{ fontSize: '0.8rem' }}>ms</span></div>
          <div style={{ fontSize: '0.66rem', color: 'var(--accent-green)', marginTop: '3px' }}>Optimized on CUDA Engine</div>
        </div>

      </div>

      {/* Main Content Grid: Agent Distribution & Audit Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(230px, 0.9fr) minmax(420px, 1.8fr)', gap: '14px', alignItems: 'stretch' }}>
        {/* Agent Usage Distribution */}
        <div className="glass-card" style={{ padding: '16px', minWidth: 0, overflow: 'hidden' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 12px' }}>Multi-Agent Tool Distribution</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
            {metrics.agentUsageBreakdown.map((item, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '0.74rem', marginBottom: '4px' }}>
                  <span>{item.name}</span>
                  <strong>{item.count} queries ({item.pct}%)</strong>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${item.pct}%`,
                    background: i === 0 ? 'var(--accent-cyan)' : i === 1 ? 'var(--accent-indigo)' : i === 2 ? 'var(--accent-green)' : 'var(--accent-purple)',
                    borderRadius: '4px'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team Audit Feed */}
        <div className="glass-panel" style={{ padding: '16px', minWidth: 0, overflow: 'hidden' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Lock size={16} color="var(--accent-cyan)" /> Team Security & Audit Trail
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {metrics.recentTeamActivity.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No recent audit activity logged yet.</p>
            ) : (
              metrics.recentTeamActivity.slice(0, 3).map((log, i) => (
                <div key={i} className="glass-card" style={{ padding: '9px 11px', fontSize: '0.76rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <strong style={{ color: 'var(--text-main)' }}>{log.userName}</strong>
                    <span className={`badge ${log.status === 'SUCCESS' ? 'badge-green' : 'badge-rose'}`}>
                      {log.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                    Action: <span className="mono" style={{ color: 'var(--accent-cyan)' }}>{log.action}</span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {log.details || log.resource} | {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
