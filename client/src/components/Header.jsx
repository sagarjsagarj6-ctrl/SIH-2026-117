import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useHardware } from '../context/HardwareContext';
import { ShieldCheck, User, Building2, Cpu, LogOut, RefreshCw, ShieldAlert } from 'lucide-react';

export const Header = ({ onChangeHardware }) => {
  const { user, logout } = useAuth();
  const { activeProfile } = useHardware();

  if (!user) return null;

  const roleColorClass = user.role === 'Admin' ? 'badge-rose' : user.role === 'Manager' ? 'badge-indigo' : 'badge-cyan';
  const departmentAgent = user.department === 'Finance & Accounting' ? 'alex-finance' : user.department === 'Legal & Compliance' ? 'alex-legal' : user.department === 'R&D / Engineering' ? 'alex-engineering' : 'alex-strategy';

  return (
    <header style={{
      height: '56px',
      background: 'var(--bg-card)',
      borderBottom: '1px solid var(--border-color)',
      padding: '0 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      overflow: 'hidden',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Brand & Air-Gap Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flexShrink: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <div style={{
            width: '30px',
            height: '30px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', letterSpacing: '-0.02em' }}>
              SOVEREIGN<span style={{ color: 'var(--accent-cyan)' }}>.AI</span>
            </div>
            <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              ENTERPRISE WORKBENCH
            </div>
          </div>
        </div>

        <div style={{ height: '20px', width: '1px', background: 'var(--border-color)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', color: 'var(--accent-green)' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block' }} className="pulse-live" />
          AIR-GAPPED LAN PERIMETER SECURE
        </div>
      </div>

      {/* User Session & System Profile Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexShrink: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {/* Active AI Profile Button */}
        <button 
          onClick={onChangeHardware}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '5px 9px',
            color: 'var(--text-main)',
            fontSize: '0.68rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}
          title="Re-configure hardware AI environment"
        >
          <Cpu size={15} color="var(--accent-cyan)" />
          <span>Profile: <strong>{activeProfile} Mode</strong></span>
          <RefreshCw size={12} color="var(--text-muted)" />
        </button>

        {/* Department Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(99,102,241,0.1)',
          border: '1px solid rgba(99,102,241,0.25)',
          padding: '5px 9px',
          borderRadius: '8px',
          fontSize: '0.68rem',
          color: '#818cf8',
          fontWeight: 600
        }}>
          <Building2 size={15} />
          <span>{user.department}</span>
        </div>

        {/* Role Badge */}
        <span className={`badge ${roleColorClass}`}>
          {user.role}
        </span>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 10px',
          borderRadius: '999px',
          border: '1px solid rgba(99,102,241,0.25)',
          background: 'rgba(99,102,241,0.08)',
          color: '#a5b4fc',
          fontSize: '0.64rem',
          fontWeight: 700,
          letterSpacing: '0.03em',
          textTransform: 'lowercase'
        }}>
          {departmentAgent}
        </div>

        {/* User Avatar & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '4px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 700 }}>{user.name}</div>
            <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>{user.email}</div>
          </div>

          <button 
            onClick={logout}
            style={{
              background: 'rgba(244,63,94,0.1)',
              border: '1px solid rgba(244,63,94,0.25)',
              color: '#fb7185',
              padding: '6px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Sign out of Sovereign Workbench"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};
