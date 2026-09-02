import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Shield, Users, Cpu, HardDrive, Server, Activity, 
  Lock, Edit, CheckCircle2, AlertOctagon, RefreshCw, Key 
} from 'lucide-react';

export const AdminDashboard = () => {
  const { token, API_URL } = useAuth();
  const [telemetry, setTelemetry] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [telRes, usrRes] = await Promise.all([
        fetch(`${API_URL}/analytics/admin`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/analytics/users`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (telRes.ok) {
        const telData = await telRes.json();
        setTelemetry(telData);
      }
      if (usrRes.ok) {
        const usrData = await usrRes.json();
        setUsers(usrData);
      }
    } catch (err) {
      console.error('Admin fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId, updatedFields) => {
    try {
      const res = await fetch(`${API_URL}/analytics/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updatedFields)
      });
      if (res.ok) {
        setEditingUser(null);
        fetchAdminData();
      }
    } catch (err) {
      console.error('User update error', err);
    }
  };

  if (loading || !telemetry) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-main)' }}>
        <h2>Fetching Enterprise Telemetry & User Governance Matrix...</h2>
      </div>
    );
  }

  const { hardwareUtilization, departmentDistribution, recentSystemAudit } = telemetry;

  return (
    <div style={{ padding: '32px', color: 'var(--text-main)', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Admin Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <div className="badge badge-rose" style={{ marginBottom: '8px' }}>SYSTEM GOVERNANCE & TELEMETRY</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Admin Platform Control Center</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Air-gapped server telemetry, user governance matrix, and security audit trail</p>
        </div>
        <button className="btn-secondary" onClick={fetchAdminData} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
          <RefreshCw size={16} /> Sync Telemetry
        </button>
      </div>

      {/* Overview Metric Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>AIR-GAP NETWORK</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-green)' }}>{telemetry.lanStatus}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>Score: {telemetry.airGapSecurityScore}</div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>REGISTERED USERS</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{telemetry.registeredUsers}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', marginTop: '4px' }}>{telemetry.activeSessions} Active Sessions</div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>LOCAL MODELS DEPLOYED</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{telemetry.activeModelsCount} / {telemetry.totalModelsDeployed}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--accent-purple)', marginTop: '4px' }}>vLLM & Ollama Acceleration</div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>TOTAL AUDIT ENTRIES</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{telemetry.totalAuditLogsRecorded}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--accent-green)', marginTop: '4px' }}>100% Tamper-Proof Audit</div>
        </div>
      </div>

      {/* Hardware Utilization Matrix */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px', border: '1px solid var(--border-highlight)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cpu size={18} color="var(--accent-cyan)" /> Real-Time Local Server Hardware Pressure
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
              <span>CPU Utilization</span>
              <strong>{hardwareUtilization.cpuPct}%</strong>
            </div>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
              <div style={{ height: '100%', width: `${hardwareUtilization.cpuPct}%`, background: 'var(--accent-cyan)', borderRadius: '4px' }} />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
              <span>System RAM ({hardwareUtilization.ramUsedGB} / {hardwareUtilization.ramTotalGB} GB)</span>
              <strong>{Math.round((hardwareUtilization.ramUsedGB / hardwareUtilization.ramTotalGB)*100)}%</strong>
            </div>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
              <div style={{ height: '100%', width: `${(hardwareUtilization.ramUsedGB / hardwareUtilization.ramTotalGB)*100}%`, background: 'var(--accent-indigo)', borderRadius: '4px' }} />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
              <span>GPU VRAM ({hardwareUtilization.vramUsedGB} / {hardwareUtilization.vramTotalGB} GB)</span>
              <strong>{Math.round((hardwareUtilization.vramUsedGB / hardwareUtilization.vramTotalGB)*100)}%</strong>
            </div>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
              <div style={{ height: '100%', width: `${(hardwareUtilization.vramUsedGB / hardwareUtilization.vramTotalGB)*100}%`, background: 'var(--accent-purple)', borderRadius: '4px' }} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Thermal Load Status</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-green)', marginTop: '4px' }}>
              {hardwareUtilization.tempCelsius}°C (Optimal Cooling)
            </div>
          </div>
        </div>
      </div>

      {/* User Governance Table */}
      <div className="glass-card" style={{ padding: '28px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Enterprise User Access Governance Matrix</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Manage user roles, department access boundaries, and account status</p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>Name & Email</th>
                <th style={{ padding: '12px' }}>Role</th>
                <th style={{ padding: '12px' }}>Department</th>
                <th style={{ padding: '12px' }}>AI Profile</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const uId = u._id || u.id;
                const isEditing = editingUser?.id === uId;
                return (
                  <tr key={uId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '14px 12px' }}>
                      <div style={{ fontWeight: 700 }}>{u.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email}</div>
                    </td>

                    <td style={{ padding: '12px' }}>
                      {isEditing ? (
                        <select 
                          value={editingUser.role} 
                          onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                          className="form-select"
                          style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                        >
                          <option value="Employee">Employee</option>
                          <option value="Manager">Manager</option>
                          <option value="Admin">Admin</option>
                        </select>
                      ) : (
                        <span className={`badge ${u.role === 'Admin' ? 'badge-rose' : u.role === 'Manager' ? 'badge-indigo' : 'badge-cyan'}`}>
                          {u.role}
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '12px' }}>
                      {isEditing ? (
                        <select 
                          value={editingUser.department} 
                          onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                          className="form-select"
                          style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                        >
                          <option value="Finance & Accounting">Finance & Accounting</option>
                          <option value="Legal & Compliance">Legal & Compliance</option>
                          <option value="R&D / Engineering">R&D / Engineering</option>
                          <option value="Human Resources">Human Resources</option>
                          <option value="Executive & Strategy">Executive & Strategy</option>
                        </select>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>{u.department}</span>
                      )}
                    </td>

                    <td style={{ padding: '12px' }}>
                      <span className="mono" style={{ color: 'var(--accent-indigo)', fontSize: '0.8rem' }}>
                        {u.assignedAIProfile || 'Balanced'}
                      </span>
                    </td>

                    <td style={{ padding: '12px' }}>
                      <span className="badge badge-green">Active</span>
                    </td>

                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button 
                            className="btn-accent" 
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                            onClick={() => handleUpdateUser(uId, { role: editingUser.role, department: editingUser.department })}
                          >
                            Save
                          </button>
                          <button 
                            className="btn-secondary" 
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                            onClick={() => setEditingUser(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          onClick={() => setEditingUser({ id: uId, role: u.role, department: u.department })}
                        >
                          <Edit size={13} /> Edit RBAC
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
