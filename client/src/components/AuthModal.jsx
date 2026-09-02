import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, Mail, User, Building, X, KeyRound, AlertCircle, Sparkles } from 'lucide-react';

export const AuthModal = ({ isOpen, onClose, onLoginSuccess }) => {
  const { login, register, authError, setAuthError } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Employee',
    department: 'R&D / Engineering'
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    let success = false;
    if (isRegister) {
      success = await register(formData);
    } else {
      success = await login(formData.email, formData.password);
    }
    setLoading(false);
    if (success && onLoginSuccess) {
      onLoginSuccess();
    }
  };

  const quickLogin = async (email, password) => {
    setLoading(true);
    const success = await login(email, password);
    setLoading(false);
    if (success && onLoginSuccess) {
      onLoginSuccess();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(7, 9, 14, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '520px',
        padding: '36px',
        position: 'relative',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        border: '1px solid var(--border-highlight)'
      }}>
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <ShieldCheck size={28} color="#fff" />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>
            {isRegister ? 'Register Enterprise Account' : 'Sovereign AI Access Portal'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Air-Gapped Private LAN Authentication System
          </p>
        </div>

        {authError && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '0.85rem',
            color: '#fb7185',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px'
          }}>
            <AlertCircle size={18} />
            <span>{authError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isRegister && (
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-dim)' }} />
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  className="form-input" 
                  style={{ paddingLeft: '40px' }} 
                  placeholder="e.g. Dr. Alex Mercer"
                  required 
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Enterprise Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-dim)' }} />
              <input 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange} 
                className="form-input" 
                style={{ paddingLeft: '40px' }} 
                placeholder="user@sovereign.local"
                required 
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-dim)' }} />
              <input 
                type="password" 
                name="password" 
                value={formData.password} 
                onChange={handleChange} 
                className="form-input" 
                style={{ paddingLeft: '40px' }} 
                placeholder="••••••••••••"
                required 
              />
            </div>
          </div>

          {isRegister && (
            <>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Role</label>
                <select name="role" value={formData.role} onChange={handleChange} className="form-select">
                  <option value="Employee">Employee (Department Workspace)</option>
                  <option value="Manager">Manager (Department Audit & Analytics)</option>
                  <option value="Admin">Admin (Full System Governance)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Department</label>
                <select name="department" value={formData.department} onChange={handleChange} className="form-select">
                  <option value="Finance & Accounting">Finance & Accounting</option>
                  <option value="Legal & Compliance">Legal & Compliance</option>
                  <option value="R&D / Engineering">R&D / Engineering</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Executive & Strategy">Executive & Strategy</option>
                </select>
              </div>
            </>
          )}

          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: '8px', padding: '12px' }}>
            {loading ? 'Authenticating...' : (isRegister ? 'Create Sovereign Account' : 'Authenticate via Local LAN')}
          </button>
        </form>

        {!isRegister && (
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} color="var(--accent-amber)" /> QUICK DEMO ACCOUNT LOGINS (ONE-CLICK):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button 
                type="button" 
                onClick={() => quickLogin('admin@sovereign.local', 'Admin@123')}
                style={{
                  background: 'rgba(244, 63, 94, 0.1)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  color: '#fb7185',
                  padding: '8px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Admin (Full Access)
              </button>

              <button 
                type="button" 
                onClick={() => quickLogin('manager.finance@sovereign.local', 'Manager@123')}
                style={{
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  color: '#818cf8',
                  padding: '8px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Finance Manager
              </button>

              <button 
                type="button" 
                onClick={() => quickLogin('employee.rd@sovereign.local', 'Emp@123')}
                style={{
                  background: 'rgba(6, 182, 212, 0.1)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  color: '#22d3ee',
                  padding: '8px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                R&D Engineer (Emp)
              </button>

              <button 
                type="button" 
                onClick={() => quickLogin('employee.hr@sovereign.local', 'Emp@123')}
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34d399',
                  padding: '8px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                HR Specialist (Emp)
              </button>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button 
            type="button" 
            onClick={() => { setIsRegister(!isRegister); setAuthError(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--accent-indigo)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}
          >
            {isRegister ? 'Already have an account? Sign In' : 'New enterprise employee? Register Account'}
          </button>
        </div>
      </div>
    </div>
  );
};
