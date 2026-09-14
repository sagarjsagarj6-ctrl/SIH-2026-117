import { useEffect, useState } from 'react';
import {
  Brain, Scale, Bot, Activity, Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { InferenceMonitor } from '../models/InferenceMonitor';
import { FineTuneManager } from '../models/FineTuneManager';
import { ModelComparisonView } from '../models/ModelComparisonView';

const TABS = [
  {
    id: 'agent-training',
    label: 'Agent Training Panel',
    icon: <Brain size={16} />,
    badge: 'ADMIN',
    color: '#818cf8',
    description: 'Create, evaluate, and deploy confidential-data models. Managers and Employees only use models released to their private LAN.',
  },
  {
    id: 'inference-monitor',
    label: 'Inference Monitor',
    icon: <Activity size={16} />,
    badge: 'B2',
    color: '#06b6d4',
    description: 'Real-time token throughput, latency gauges, VRAM utilization & backend health.',
  },
  {
    id: 'model-compare',
    label: 'Model Benchmarks',
    icon: <Scale size={16} />,
    badge: 'Compare',
    color: '#22c55e',
    description: 'Side-by-side live InferenceRouter benchmarks across catalog models.',
  },
];

export const IntelligenceDashboard = () => {
  const { token, API_URL } = useAuth();
  const [activeTab, setActiveTab] = useState('agent-training');
  const [liveStats, setLiveStats] = useState({
    agentCount: 4
  });

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      if (!token) return;
      try {
        const regRes = await fetch(`${API_URL}/agents/registry`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const reg = regRes.ok ? await regRes.json() : {};
        if (cancelled) return;

        setLiveStats({
          agentCount: Array.isArray(reg.agents) ? reg.agents.length : 4
        });
      } catch {
        // Keep the last known registry count when the local API is temporarily unavailable.
      }
    };

    refresh();
    const id = setInterval(refresh, 12000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token, API_URL]);

  const currentTab = TABS.find((t) => t.id === activeTab);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <div style={{ padding: '5px', background: 'linear-gradient(135deg, rgba(129,140,248,0.25), rgba(6,182,212,0.25))', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(129,140,248,0.3)' }}>
              <Brain size={18} color="#818cf8" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, background: 'linear-gradient(135deg, #818cf8, #06b6d4, #22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Intelligence Layer
              </h1>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 1 }}>
                Admin training · held-out evaluation · private-LAN model delivery
              </div>
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8,
          background: 'rgba(129,140,248,0.1)',
          border: '1px solid rgba(129,140,248,0.32)'
        }}>
          <Bot size={14} color="#818cf8" />
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#818cf8' }}>
            AGENT REGISTRY
          </span>
          <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            {liveStats.agentCount} REGISTERED
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-color)', paddingBottom: 0, flexWrap: 'wrap', flexShrink: 0 }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? `2px solid ${tab.color}` : '2px solid transparent',
                color: isActive ? tab.color : 'var(--text-muted)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.72rem',
                cursor: 'pointer',
                marginBottom: -1,
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ color: isActive ? tab.color : 'var(--text-dim)' }}>{tab.icon}</span>
              {tab.label}
              <span style={{
                fontSize: '0.56rem', padding: '1px 5px', borderRadius: 7,
                background: isActive ? `${tab.color}22` : 'rgba(255,255,255,0.05)',
                color: isActive ? tab.color : 'var(--text-dim)',
                fontWeight: 700,
              }}>
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {currentTab && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', background: `${currentTab.color}0d`, border: `1px solid ${currentTab.color}28`, borderRadius: 8, fontSize: '0.68rem', color: currentTab.color, flexShrink: 0 }}>
          <Sparkles size={12} />
          {currentTab.description}
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {activeTab === 'agent-training' && <FineTuneManager />}
        {activeTab === 'inference-monitor' && <InferenceMonitor />}
        {activeTab === 'model-compare' && <ModelComparisonView />}
      </div>


    </div>
  );
};
