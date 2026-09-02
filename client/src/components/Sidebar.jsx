import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Bot, BarChart3, Shield, Cpu, FileText, 
  Settings, Database, Layers, Sparkles 
} from 'lucide-react';

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();
  if (!user) return null;

  const navItems = [
    {
      id: 'workspace',
      label: `${user.department.split(' ')[0]} Workspace`,
      icon: <Bot size={18} />,
      roles: ['Employee', 'Manager', 'Admin'],
      badge: 'Multi-Agent AI'
    },
    {
      id: 'manager-analytics',
      label: 'Manager Audit & Analytics',
      icon: <BarChart3 size={18} />,
      roles: ['Manager', 'Admin'],
      badge: 'Compliance'
    },
    {
      id: 'admin-governance',
      label: 'Admin System Governance',
      icon: <Shield size={18} />,
      roles: ['Admin'],
      badge: 'Control'
    },
    {
      id: 'model-center',
      label: 'Model & Fine-Tuning Studio',
      icon: <Cpu size={18} />,
      roles: ['Admin'],
      badge: 'LoRA / QLoRA'
    }
  ];

  const allowedNav = navItems.filter(item => item.roles.includes(user.role));

  return (
    <aside style={{
      width: '270px',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-color)',
      padding: '24px 16px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      minHeight: 'calc(100vh - 68px)'
    }}>
      <div>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '16px', paddingLeft: '12px', letterSpacing: '0.05em' }}>
          NAVIGATION MODULES ({user.role.toUpperCase()})
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {allowedNav.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isActive ? 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(6,182,212,0.18))' : 'transparent',
                  color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  borderLeft: isActive ? '3px solid var(--accent-cyan)' : '3px solid transparent'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span style={{
                    fontSize: '0.65rem',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    background: isActive ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.05)',
                    color: isActive ? 'var(--accent-cyan)' : 'var(--text-dim)',
                    fontWeight: 600
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Security Context Footer Box */}
      <div className="glass-card" style={{ padding: '16px', fontSize: '0.78rem' }}>
        <div style={{ fontWeight: 700, marginBottom: '4px', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={14} /> ABAC SECURITY SCOPE
        </div>
        <div style={{ color: 'var(--text-muted)', lineHeight: 1.4 }}>
          Vector Index: <code className="mono" style={{ color: '#818cf8' }}>{user.department.substring(0,3).toUpperCase()}_VEC_STORE</code>
        </div>
        <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
          Boundary: Strict Department Isolation
        </div>
      </div>
    </aside>
  );
};
