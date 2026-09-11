import { useEffect, useState } from 'react';
import {
  Brain, Cpu, Zap, Scale, GitBranch, Bot,
  ChevronRight, Activity, Database, Layers, TrendingUp, Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AgentWorkspace } from '../agents/AgentWorkspace';
import { InferenceMonitor } from '../models/InferenceMonitor';
import { FineTuneManager } from '../models/FineTuneManager';
import { ModelComparisonView } from '../models/ModelComparisonView';

const TABS = [
  {
    id: 'agent-studio',
    label: 'Multi-Agent Studio',
    icon: <Brain size={16} />,
    badge: 'B1',
    color: '#818cf8',
    description: 'Orchestrate specialist AI agents across RAG, Data Science, Vision & Reporting modes.',
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
    id: 'finetune',
    label: 'Fine-Tuning Studio',
    icon: <Zap size={16} />,
    badge: 'QLoRA',
    color: '#f59e0b',
    description: 'Launch LoRA / QLoRA jobs against the server fine-tune registry.',
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
  const [activeTab, setActiveTab] = useState('agent-studio');
  const [liveStats, setLiveStats] = useState({
    agentCount: 4,
    inferenceLabel: 'Checking…',
    inferenceOnline: false,
    loadedModel: '—',
    orchestration: 'Auto'
  });

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      if (!token) return;
      try {
        const [regRes, backRes, allocRes] = await Promise.all([
          fetch(`${API_URL}/agents/registry`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/inference/backends`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/inference/allocation`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        const reg = regRes.ok ? await regRes.json() : {};
        const backends = backRes.ok ? await backRes.json() : {};
        const alloc = allocRes.ok ? await allocRes.json() : {};
        if (cancelled) return;

        const statusMap = backends.backends || backends;
        const ollamaOnline = statusMap.ollama === 'ONLINE';
        const vllmOnline = statusMap.vllm === 'ONLINE';
        const llamaOnline = statusMap.llamacpp === 'ONLINE';
        const anyOnline = ollamaOnline || vllmOnline || llamaOnline;
        const engine = ollamaOnline ? 'Ollama' : vllmOnline ? 'vLLM' : llamaOnline ? 'llama.cpp' : 'Fallback';

        setLiveStats({
          agentCount: Array.isArray(reg.agents) ? reg.agents.length : 4,
          inferenceLabel: engine,
          inferenceOnline: anyOnline,
          loadedModel: alloc.recommendedModel || alloc.model || alloc.selectedModel || (anyOnline ? 'Local daemon' : 'Air-gap fallback'),
          orchestration: 'Auto'
        });
      } catch {
        if (!cancelled) {
          setLiveStats((prev) => ({ ...prev, inferenceOnline: false, inferenceLabel: 'Unreachable' }));
        }
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
  const statCards = [
    { label: 'Active Agents', value: String(liveStats.agentCount), sub: 'From agent registry', icon: <Bot size={20} />, color: '#818cf8' },
    { label: 'Inference Engine', value: liveStats.inferenceLabel, sub: liveStats.inferenceOnline ? 'Daemon ONLINE' : 'AIR_GAP / Offline', icon: <Cpu size={20} />, color: '#06b6d4' },
    { label: 'Loaded Model', value: String(liveStats.loadedModel).slice(0, 22), sub: 'Allocation probe', icon: <Layers size={20} />, color: '#f59e0b' },
    { label: 'Orchestration', value: liveStats.orchestration, sub: 'Task decomposer', icon: <GitBranch size={20} />, color: '#22c55e' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ padding: '8px', background: 'linear-gradient(135deg, rgba(129,140,248,0.25), rgba(6,182,212,0.25))', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(129,140,248,0.3)' }}>
              <Brain size={22} color="#818cf8" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, background: 'linear-gradient(135deg, #818cf8, #06b6d4, #22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Intelligence Layer
              </h1>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Category B · Multi-Agent Orchestration · On-Premise LLM Inference
              </div>
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10,
          background: liveStats.inferenceOnline ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
          border: liveStats.inferenceOnline ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(245,158,11,0.35)'
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
            background: liveStats.inferenceOnline ? '#22c55e' : '#f59e0b',
            boxShadow: liveStats.inferenceOnline ? '0 0 8px #22c55e' : '0 0 8px #f59e0b'
          }} />
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: liveStats.inferenceOnline ? '#22c55e' : '#f59e0b' }}>
            {liveStats.inferenceOnline ? 'INFERENCE ENGINE ONLINE' : 'INFERENCE FALLBACK / OFFLINE'}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {statCards.map(({ label, value, sub, icon, color }) => (
          <div key={label} className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: 14, borderLeft: `3px solid ${color}` }}>
            <div style={{ padding: 10, background: `${color}18`, borderRadius: 10, color, flexShrink: 0 }}>{icon}</div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1.2 }}>{value}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color, marginTop: 4 }}>{label}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: 2 }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 0, flexWrap: 'wrap' }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 18px',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? `2px solid ${tab.color}` : '2px solid transparent',
                color: isActive ? tab.color : 'var(--text-muted)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                marginBottom: -1,
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ color: isActive ? tab.color : 'var(--text-dim)' }}>{tab.icon}</span>
              {tab.label}
              <span style={{
                fontSize: '0.63rem', padding: '2px 7px', borderRadius: 8,
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: `${currentTab.color}0d`, border: `1px solid ${currentTab.color}28`, borderRadius: 10, fontSize: '0.8rem', color: currentTab.color }}>
          <Sparkles size={14} />
          {currentTab.description}
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {activeTab === 'agent-studio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <AgentWorkspace />
          </div>
        )}
        {activeTab === 'inference-monitor' && <InferenceMonitor />}
        {activeTab === 'finetune' && <FineTuneManager />}
        {activeTab === 'model-compare' && <ModelComparisonView />}
      </div>

      <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, flexShrink: 0, maxWidth: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Database size={12} color="#6366f1" /> Vector-RAG Hybrid</span>
          <ChevronRight size={10} color="var(--text-dim)" />
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><GitBranch size={12} color="#06b6d4" /> 4-Mode Orchestration</span>
          <ChevronRight size={10} color="var(--text-dim)" />
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Cpu size={12} color="#f59e0b" /> Ollama · vLLM · llama.cpp</span>
          <ChevronRight size={10} color="var(--text-dim)" />
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><TrendingUp size={12} color="#22c55e" /> QLoRA Fine-Tuning</span>
        </div>
        <div style={{ fontSize: '0.7rem', padding: '4px 12px', background: 'rgba(99,102,241,0.1)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8', fontWeight: 600 }}>
          SOVEREIGN ON-PREMISE · AIR-GAPPED
        </div>
      </div>
    </div>
  );
};
