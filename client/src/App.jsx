import React, { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { HardwareSelector } from './components/HardwareSelector';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { FloatingThemeSelector } from './components/FloatingThemeSelector';
import { EmployeeWorkspace } from './components/dashboards/EmployeeWorkspace';
import { ManagerDashboard } from './components/dashboards/ManagerDashboard';
import { AdminDashboard } from './components/dashboards/AdminDashboard';
import { ModelManagementCenter } from './components/dashboards/ModelManagementCenter';
import { DataFoundationDashboard } from './components/dashboards/DataFoundationDashboard';
import { useAuth } from './context/AuthContext';
import { useHardware } from './context/HardwareContext';

export default function App() {
  const { user, loading } = useAuth();
  const { isHardwareConfirmed, setIsHardwareConfirmed } = useHardware();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('workspace');

  useEffect(() => {
    if (user) {
      if (user.role === 'Employee') {
        if (activeTab !== 'workspace' && activeTab !== 'data-foundation') {
          setActiveTab('workspace');
        }
      } else if (user.role === 'Manager' && (activeTab === 'admin-governance' || activeTab === 'model-center')) {
        setActiveTab('workspace');
      }
    } else {
      setIsHardwareConfirmed(false);
    }
  }, [user]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-main)',
        gap: '16px'
      }}>
        <div className="pulse-live" style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '0.05em' }}>
          INITIALIZING SOVEREIGN AI AIR-GAPPED PERIMETER...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LandingPage 
          onLaunchClick={() => setIsAuthOpen(true)} 
          onLoginClick={() => setIsAuthOpen(true)} 
        />
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onLoginSuccess={() => setIsAuthOpen(false)}
        />
        <FloatingThemeSelector />
      </>
    );
  }

  if (!isHardwareConfirmed) {
    return (
      <>
        <HardwareSelector onComplete={() => setIsHardwareConfirmed(true)} />
        <FloatingThemeSelector />
      </>
    );
  }

  const renderDashboard = () => {
    switch (activeTab) {
      case 'workspace':
        return <EmployeeWorkspace />;
      case 'data-foundation':
        return <DataFoundationDashboard />;
      case 'manager-analytics':
        return (user.role === 'Manager' || user.role === 'Admin') ? <ManagerDashboard /> : <EmployeeWorkspace />;
      case 'admin-governance':
        return user.role === 'Admin' ? <AdminDashboard /> : <EmployeeWorkspace />;
      case 'model-center':
        return user.role === 'Admin' ? <ModelManagementCenter /> : <EmployeeWorkspace />;
      default:
        return <EmployeeWorkspace />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-main)', display: 'flex', flexDirection: 'column' }}>
      <Header onChangeHardware={() => setIsHardwareConfirmed(false)} />
      <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 68px)' }}>
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main style={{ flex: 1, padding: '24px 32px', overflowY: 'auto', maxHeight: 'calc(100vh - 68px)', background: 'var(--bg-primary)' }}>
          {renderDashboard()}
        </main>
      </div>
      <FloatingThemeSelector />
    </div>
  );
}
