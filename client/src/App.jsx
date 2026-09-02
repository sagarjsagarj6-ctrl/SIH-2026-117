import React, { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  if (!user) {
    return <LandingPage onLaunchClick={() => {}} />;
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)] text-[var(--text-main)]">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6">
          <h2 className="text-xl font-bold mb-4 capitalize">{activeTab} Dashboard</h2>
        </main>
      </div>
    </div>
  );
}
