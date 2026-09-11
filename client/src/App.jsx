import { useState, useEffect } from 'react';
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
import { IntelligenceDashboard } from './components/dashboards/IntelligenceDashboard';
import { AuditorDashboard } from './components/dashboards/AuditorDashboard';
import { AgentCommunicationWorkflow } from './components/agents/AgentCommunicationWorkflow';
import { LanNetworkSetup } from './components/dashboards/LanNetworkSetup';
import { LanConnectionPanel } from './components/dashboards/LanConnectionPanel';
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
        if (activeTab !== 'workspace' && activeTab !== 'data-foundation' && activeTab !== 'connect-lan') {
          setActiveTab('workspace');
        }
      } else if (user.role === 'Manager' && (activeTab === 'admin-governance' || activeTab === 'lan-setup')) {
        setActiveTab('workspace');
      } else if (user.role !== 'Admin' && activeTab === 'lan-setup') {
        setActiveTab('workspace');
      } else if (user.role === 'Auditor' && activeTab !== 'auditor-dashboard') {
        setActiveTab('auditor-dashboard');
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
      case 'intelligence-layer':
        return <IntelligenceDashboard />;
      case 'agent-communication':
        return <AgentCommunicationWorkflow />;
      case 'manager-analytics':
        return (user.role === 'Manager' || user.role === 'Admin') ? <ManagerDashboard /> : <EmployeeWorkspace />;
      case 'admin-governance':
        return user.role === 'Admin' ? <AdminDashboard /> : <EmployeeWorkspace />;
      case 'lan-setup':
        return user.role === 'Admin' ? <LanNetworkSetup /> : <EmployeeWorkspace />;
      case 'connect-lan':
        return (user.role === 'Manager' || user.role === 'Employee') ? <LanConnectionPanel /> : <EmployeeWorkspace />;
      case 'model-center':
        return <ModelManagementCenter />;
      case 'auditor-dashboard':
        return user.role === 'Auditor' ? <AuditorDashboard /> : <EmployeeWorkspace />;
      default:
        return <EmployeeWorkspace />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-main)', display: 'flex', flexDirection: 'column' }}>
      <Header onChangeHardware={() => setIsHardwareConfirmed(false)} />
      <div style={{ display: 'flex', flex: 1, height: 'calc(100vh - 56px)', minHeight: 0, overflow: 'hidden' }}>
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main style={{ flex: 1, minWidth: 0, minHeight: 0, boxSizing: 'border-box', padding: '12px 16px', overflowY: 'auto', overflowX: 'hidden', background: 'var(--bg-primary)' }}>
          {renderDashboard()}
        </main>
      </div>
      <FloatingThemeSelector />
    </div>
  );
}
