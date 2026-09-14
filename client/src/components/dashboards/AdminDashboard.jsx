import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Cpu, Edit, AlertOctagon, RefreshCw
} from 'lucide-react';

export const AdminDashboard = () => {
  const { token, API_URL } = useAuth();
  const [telemetry, setTelemetry] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cleaningDemoData, setCleaningDemoData] = useState(false);

  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  async function fetchAdminData() {
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
  }

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

  const handleRemoveDemoData = async () => {
    if (!window.confirm('Remove seeded demo users, documents, models, jobs, departments, audit entries, and vectors? Your current admin account will be retained.')) return;

    try {
      setCleaningDemoData(true);
      const res = await fetch(`${API_URL}/analytics/demo-data`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Demo data cleanup failed.');
      window.alert(data.message);
      fetchAdminData();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setCleaningDemoData(false);
    }
  };

  if (loading || !telemetry) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-main)' }}>
        <h2>Fetching Enterprise Telemetry & User Governance Matrix...</h2>
      </div>
    );
  }

  const { hardwareUtilization } = telemetry;

  return (
    <div style={{ padding: '14px 18px 18px', color: 'var(--text-main)', maxWidth: '1400px', width: '100%', height: '100%', boxSizing: 'border-box', margin: '0 auto', overflow: 'auto' }}>
      {/* Admin Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
        <div>
         
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>Admin Control</h1>
          
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="btn-secondary" onClick={fetchAdminData} style={{ padding: '6px 10px', fontSize: '0.72rem' }}>
            <RefreshCw size={14} /> Sync Telemetry
          </button>
          <button className="btn-secondary" onClick={handleRemoveDemoData} disabled={cleaningDemoData} style={{ padding: '6px 10px', fontSize: '0.72rem', color: 'var(--accent-rose)' }}>
            <AlertOctagon size={14} /> {cleaningDemoData ? 'Removing Demo Data...' : 'Remove Demo Data'}
          </button>
        </div>
      </div>

      {/* Overview Metric Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px', marginBottom: '14px' }}>
        

        <div className="glass-card" style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '5px' }}>REGISTERED USERS</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, lineHeight: 1.1 }}>{telemetry.registeredUsers}</div>
          <div style={{ fontSize: '0.66rem', color: 'var(--accent-cyan)', marginTop: '3px' }}>{telemetry.activeSessions} Active Sessions</div>
        </div>

        <div className="glass-card" style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '5px' }}>LOCAL MODELS DEPLOYED</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, lineHeight: 1.1 }}>{telemetry.activeModelsCount} / {telemetry.totalModelsDeployed}</div>
          <div style={{ fontSize: '0.66rem', color: 'var(--accent-purple)', marginTop: '3px' }}>vLLM & Ollama Acceleration</div>
        </div>

        <div className="glass-card" style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '5px' }}>TOTAL AUDIT ENTRIES</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, lineHeight: 1.1 }}>{telemetry.totalAuditLogsRecorded}</div>
          <div style={{ fontSize: '0.66rem', color: 'var(--accent-green)', marginTop: '3px' }}>100% Tamper-Proof Audit</div>
        </div>
      </div>

      {/* Hardware Utilization Matrix */}
      <div className="glass-panel" style={{ padding: '14px', marginBottom: '14px', border: '1px solid var(--border-highlight)' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Cpu size={16} color="var(--accent-cyan)" /> Real-Time Local Server Hardware Pressure
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '4px' }}>
              <span>CPU Utilization</span>
              <strong>{hardwareUtilization.cpuPct}%</strong>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
              <div style={{ height: '100%', width: `${hardwareUtilization.cpuPct}%`, background: 'var(--accent-cyan)', borderRadius: '4px' }} />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '4px' }}>
              <span>System RAM ({hardwareUtilization.ramUsedGB} / {hardwareUtilization.ramTotalGB} GB)</span>
              <strong>{Math.round((hardwareUtilization.ramUsedGB / hardwareUtilization.ramTotalGB)*100)}%</strong>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
              <div style={{ height: '100%', width: `${(hardwareUtilization.ramUsedGB / hardwareUtilization.ramTotalGB)*100}%`, background: 'var(--accent-indigo)', borderRadius: '4px' }} />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '4px' }}>
              <span>GPU VRAM ({hardwareUtilization.vramUsedGB} / {hardwareUtilization.vramTotalGB} GB)</span>
              <strong>{Math.round((hardwareUtilization.vramUsedGB / hardwareUtilization.vramTotalGB)*100)}%</strong>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
              <div style={{ height: '100%', width: `${(hardwareUtilization.vramUsedGB / hardwareUtilization.vramTotalGB)*100}%`, background: 'var(--accent-purple)', borderRadius: '4px' }} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Thermal Load Status</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-green)', marginTop: '3px' }}>
              {hardwareUtilization.tempCelsius}°C (Optimal Cooling)
            </div>
          </div>
        </div>
      </div>

      {/* User Governance Table */}
      <div className="glass-card" style={{ padding: '14px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Enterprise User Access Governance Matrix</h3>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '3px 0 0' }}>Manage user roles, department access boundaries, and account status</p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '7px 8px' }}>Name & Email</th>
                <th style={{ padding: '7px 8px' }}>Role</th>
                <th style={{ padding: '7px 8px' }}>Department</th>
                <th style={{ padding: '7px 8px' }}>AI Profile</th>
                <th style={{ padding: '7px 8px' }}>Status</th>
                <th style={{ padding: '7px 8px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const uId = u._id || u.id;
                const isEditing = editingUser?.id === uId;
                return (
                  <tr key={uId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '8px' }}>
                      <div style={{ fontWeight: 700 }}>{u.name}</div>
                      <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>{u.email}</div>
                    </td>

                    <td style={{ padding: '8px' }}>
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

                    <td style={{ padding: '8px' }}>
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
                          <option value="Executive & Strategy">Executive & Strategy</option>
                        </select>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>{u.department}</span>
                      )}
                    </td>

                    <td style={{ padding: '8px' }}>
                      <span className="mono" style={{ color: 'var(--accent-indigo)', fontSize: '0.7rem' }}>
                        {u.assignedAIProfile || 'Balanced'}
                      </span>
                    </td>

                    <td style={{ padding: '8px' }}>
                      <span className="badge badge-green">Active</span>
                    </td>

                    <td style={{ padding: '8px', textAlign: 'right' }}>
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
