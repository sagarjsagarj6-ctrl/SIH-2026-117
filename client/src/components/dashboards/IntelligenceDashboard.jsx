import React, { useState } from 'react';
import {
  Brain, Cpu, Zap, BarChart2, Scale, GitBranch, Bot,
  ChevronRight, Activity, Database, Layers, TrendingUp, Sparkles
} from 'lucide-react';
import { AgentWorkspace } from '../agents/AgentWorkspace';
import { AgentTraceViewer } from '../agents/AgentTraceViewer';
import { InferenceMonitor } from '../models/InferenceMonitor';
import { FineTuneManager } from '../models/FineTuneManager';
import { ModelComparisonView } from '../models/ModelComparisonView';
import { AgentCommunicationWorkflow } from '../agents/AgentCommunicationWorkflow';

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
    description: 'Train LoRA / QLoRA adapters on enterprise knowledge bases with live loss curves.',
  },
  {
    id: 'model-compare',
    label: 'Model Benchmarks',
    icon: <Scale size={16} />,
    badge: 'Compare',
    color: '#22c55e',
    description: 'Side-by-side model benchmarking across throughput, latency & response quality.',
  },
];

const STAT_CARDS = [
  { label: 'Active Agents', value: '4', sub: 'RAG · DS · Vision · Report', icon: <Bot size={20} />, color: '#818cf8' },
  { label: 'Inference Engine', value: 'Ollama', sub: 'Local · Air-Gapped', icon: <Cpu size={20} />, color: '#06b6d4' },
  { label: 'Loaded Model', value: 'LLaMA 3.2', sub: '3B · Q4_K_M quant', icon: <Layers size={20} />, color: '#f59e0b' },
  { label: 'Orchestration', value: 'Auto', sub: 'Supervisor Loop', icon: <GitBranch size={20} />, color: '#22c55e' },
];

export const IntelligenceDashboard = () => {
  const [activeTab, setActiveTab] = useState('agent-studio');

  const currentTab = TABS.find(t => t.id === activeTab);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', minHeight: 0, overflow: 'hidden' }}>

      {/* Page Header */}
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

        {/* Live Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#22c55e' }}>INFERENCE ENGINE ONLINE</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {STAT_CARDS.map(({ label, value, sub, icon, color }) => (
          <div
            key={label}
            className="glass-card"
            style={{ padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: 14, borderLeft: `3px solid ${color}` }}
          >
            <div style={{ padding: 10, background: `${color}18`, borderRadius: 10, color, flexShrink: 0 }}>
              {icon}
            </div>
            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color, marginTop: 4 }}>{label}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: 2 }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 0, flexWrap: 'wrap' }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
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
                transition: 'all 0.2s',
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

      {/* Tab Description Strip */}
      {currentTab && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: `${currentTab.color}0d`, border: `1px solid ${currentTab.color}28`, borderRadius: 10, fontSize: '0.8rem', color: currentTab.color }}>
          <Sparkles size={14} />
          {currentTab.description}
        </div>
      )}

      {/* Tab Content */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {activeTab === 'agent-studio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <AgentWorkspace />
          </div>
        )}
        {activeTab === 'agent-communication' && <AgentCommunicationWorkflow />}
        {activeTab === 'inference-monitor' && <InferenceMonitor />}
        {activeTab === 'finetune' && <FineTuneManager />}
        {activeTab === 'model-compare' && <ModelComparisonView />}
      </div>

      {/* Architecture Footer */}
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
        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', padding: '4px 12px', background: 'rgba(99,102,241,0.1)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8', fontWeight: 600 }}>
          SOVEREIGN ON-PREMISE · AIR-GAPPED
        </div>
      </div>
    </div>
  );
};
