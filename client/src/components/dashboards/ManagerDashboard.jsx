import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  BarChart3, ShieldCheck, Users, Clock, AlertTriangle, 
  Activity, CheckCircle2, Lock, ArrowUpRight 
} from 'lucide-react';

export const ManagerDashboard = () => {
  const { user, token, API_URL } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchManagerAnalytics();
  }, []);

  const fetchManagerAnalytics = async () => {
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
  };

  if (loading || !metrics) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-main)' }}>
        <h2>Loading Department Analytics & Compliance Metrics...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', color: 'var(--text-main)', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <div className="badge badge-indigo" style={{ marginBottom: '8px' }}>DEPARTMENT AUDIT & ANALYTICS</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>{metrics.departmentName} Management Portal</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Real-time team activity, local model latency benchmarks, and compliance scores</p>
        </div>
        <button className="btn-secondary" onClick={fetchManagerAnalytics} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
          <Activity size={16} /> Refresh Analytics
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>ACTIVE TEAM MEMBERS</span>
            <Users size={20} color="var(--accent-indigo)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{metrics.activeTeamMembers}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', marginTop: '4px' }}>✓ 100% Authorized RBAC Users</div>
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>QUERIES PROCESSED</span>
            <BarChart3 size={20} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{metrics.totalQueriesProcessed}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', marginTop: '4px' }}>Zero Cloud Dependencies</div>
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>AVG INFERENCE LATENCY</span>
            <Clock size={20} color="var(--accent-purple)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{metrics.avgLatencyMs} <span style={{ fontSize: '1rem' }}>ms</span></div>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', marginTop: '4px' }}>Optimized on CUDA Engine</div>
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>COMPLIANCE SCORE</span>
            <ShieldCheck size={20} color="var(--accent-green)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-green)' }}>{metrics.complianceScorePct}%</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{metrics.securityViolationsPrevented} Cross-Dept Blocks</div>
        </div>
      </div>

      {/* Main Content Grid: Agent Distribution & Audit Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '28px' }}>
        {/* Agent Usage Distribution */}
        <div className="glass-card" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px' }}>Multi-Agent Tool Distribution</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {metrics.agentUsageBreakdown.map((item, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span>{item.name}</span>
                  <strong>{item.count} queries ({item.pct}%)</strong>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
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
        <div className="glass-panel" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={18} color="var(--accent-cyan)" /> Team Security & Audit Trail
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {metrics.recentTeamActivity.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No recent audit activity logged yet.</p>
            ) : (
              metrics.recentTeamActivity.map((log, i) => (
                <div key={i} className="glass-card" style={{ padding: '14px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ color: 'var(--text-main)' }}>{log.userName}</strong>
                    <span className={`badge ${log.status === 'SUCCESS' ? 'badge-green' : 'badge-rose'}`}>
                      {log.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Action: <span className="mono" style={{ color: 'var(--accent-cyan)' }}>{log.action}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
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
