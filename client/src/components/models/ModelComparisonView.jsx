import React, { useState, useRef } from 'react';
import {
  Send, Cpu, Zap, Clock, BarChart2, Scale, RefreshCw,
  ChevronRight, Star, TrendingUp, AlertCircle
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const PRESET_PROMPTS = [
  'Summarize the key financial risks identified in Q3 operational reports.',
  'What is the status of the current audit trail for vendor payments?',
  'Explain the compliance requirements for data retention under department policy.',
  'Analyze the variance between projected and actual resource utilization this quarter.',
  'Draft a concise executive summary of the operational efficiency improvements.',
];

const MOCK_MODELS = [
  { id: 'llama3.2:3b', label: 'LLaMA 3.2 · 3B', badge: 'Fast', color: '#6366f1', backend: 'Ollama' },
  { id: 'qwen2.5:7b', label: 'Qwen 2.5 · 7B', badge: 'Balanced', color: '#06b6d4', backend: 'Ollama' },
  { id: 'mistral:7b', label: 'Mistral · 7B', badge: 'Precise', color: '#f59e0b', backend: 'vLLM' },
];

function fakeResponse(modelId, prompt) {
  const r = Math.random();
  const latency = 400 + Math.floor(r * 1200);
  const tokens = 80 + Math.floor(r * 200);
  const tps = +(tokens / (latency / 1000)).toFixed(1);

  const answers = {
    'llama3.2:3b': `[LLaMA 3.2 — 3B] Based on the enterprise knowledge corpus, the key analysis reveals: ${prompt.slice(0, 60)}... The critical factors identified include operational variance, compliance alignment, and resource allocation efficiency. Confidence: 81%.`,
    'qwen2.5:7b': `[Qwen 2.5 — 7B] A comprehensive review of organizational data surfaces the following insights for: "${prompt.slice(0, 55)}…" Structural deviations, policy adherence gaps, and efficiency optimization opportunities are highlighted. Confidence: 88%.`,
    'mistral:7b': `[Mistral — 7B] Precision analysis of the enterprise knowledge base for the query: "${prompt.slice(0, 50)}…" Key observations include quantitative anomalies in KPIs, regulatory boundary conditions, and risk-adjusted projections. Confidence: 91%.`,
  };
  return { text: answers[modelId] || 'Response generated.', latency, tokens, tps };
}

const MetricBar = ({ label, value, max, color, suffix = '' }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', marginBottom: 4 }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color, fontWeight: 700 }}>{value}{suffix}</span>
    </div>
    <div style={{ height: 5, background: 'var(--bg-primary)', borderRadius: 99 }}>
      <div style={{ height: '100%', width: `${Math.min((value / max) * 100, 100)}%`, background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
    </div>
  </div>
);

export const ModelComparisonView = () => {
  const [selectedModels, setSelectedModels] = useState(['llama3.2:3b', 'qwen2.5:7b']);
  const [prompt, setPrompt] = useState('');
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [winnerKey, setWinnerKey] = useState(null);
  const [benchmarkRuns, setBenchmarkRuns] = useState([]);
  const [activePreset, setActivePreset] = useState(null);

  const toggleModel = (id) => {
    setSelectedModels(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id].slice(0, 3)
    );
  };

  const runComparison = async () => {
    if (!prompt.trim() || selectedModels.length < 2) return;
    setLoading(true);
    setResults({});
    setWinnerKey(null);

    const newResults = {};
    await Promise.all(selectedModels.map(async (modelId) => {
      await new Promise(r => setTimeout(r, 300 + Math.random() * 600));
      newResults[modelId] = fakeResponse(modelId, prompt);
    }));

    setResults(newResults);

    // Determine winner by best TPS * confidence heuristic
    const best = Object.entries(newResults).sort((a, b) => b[1].tps - a[1].tps)[0][0];
    setWinnerKey(best);

    const runEntry = { prompt: prompt.slice(0, 60), results: newResults, winner: best, ts: new Date().toLocaleTimeString() };
    setBenchmarkRuns(prev => [runEntry, ...prev.slice(0, 4)]);
    setLoading(false);
  };

  const hasResults = Object.keys(results).length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #06b6d4, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Model Comparison Studio
        </h2>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 4 }}>
          Side-by-side benchmark across enterprise models — latency · quality · throughput
        </div>
      </div>

      {/* Model Selector */}
      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 14 }}>SELECT MODELS (2–3)</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {MOCK_MODELS.map(m => {
            const isSelected = selectedModels.includes(m.id);
            return (
              <button
                key={m.id}
                onClick={() => toggleModel(m.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 18px', borderRadius: 10,
                  border: `1.5px solid ${isSelected ? m.color : 'var(--border-color)'}`,
                  background: isSelected ? `${m.color}18` : 'var(--bg-primary)',
                  color: isSelected ? m.color : 'var(--text-muted)',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <Cpu size={14} />
                <span style={{ fontSize: '0.85rem' }}>{m.label}</span>
                <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: 8, background: isSelected ? `${m.color}33` : 'rgba(255,255,255,0.05)', color: isSelected ? m.color : 'var(--text-dim)' }}>
                  {m.badge}
                </span>
                {isSelected && <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', color: 'var(--text-dim)' }}>{m.backend}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preset Prompts */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {PRESET_PROMPTS.map((p, i) => (
          <button
            key={i}
            onClick={() => { setPrompt(p); setActivePreset(i); }}
            style={{
              padding: '6px 12px', borderRadius: 8, fontSize: '0.73rem',
              background: activePreset === i ? 'rgba(99,102,241,0.2)' : 'var(--bg-surface)',
              border: `1px solid ${activePreset === i ? '#6366f1' : 'var(--border-color)'}`,
              color: activePreset === i ? '#818cf8' : 'var(--text-muted)',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            {p.slice(0, 42)}…
          </button>
        ))}
      </div>

      {/* Prompt Input */}
      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12 }}>BENCHMARK PROMPT</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Enter a prompt to compare across selected models…"
            rows={3}
            style={{ flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 10, color: 'var(--text-main)', padding: '12px 16px', fontSize: '0.88rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
          />
          <button
            onClick={runComparison}
            disabled={loading || !prompt.trim() || selectedModels.length < 2}
            style={{ padding: '0 24px', background: 'linear-gradient(135deg, #6366f1, #06b6d4)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer', opacity: loading || !prompt.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem' }}
          >
            {loading ? <RefreshCw size={16} className="spin" /> : <Zap size={16} />}
            {loading ? 'Running…' : 'Compare'}
          </button>
        </div>
      </div>

      {/* Results Grid */}
      {hasResults && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${selectedModels.length}, 1fr)`, gap: 16 }}>
          {selectedModels.filter(m => results[m]).map(modelId => {
            const model = MOCK_MODELS.find(m => m.id === modelId);
            const r = results[modelId];
            const isWinner = modelId === winnerKey;
            return (
              <div
                key={modelId}
                className="glass-card"
                style={{ padding: 20, border: isWinner ? `1.5px solid ${model.color}` : '1px solid var(--border-color)', position: 'relative', transition: 'border 0.3s' }}
              >
                {isWinner && (
                  <div style={{ position: 'absolute', top: -10, right: 12, background: model.color, color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '3px 10px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Star size={10} /> WINNER
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Cpu size={16} color={model.color} />
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: model.color }}>{model.label}</span>
                  <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: 8, background: `${model.color}22`, color: model.color }}>{model.backend}</span>
                </div>

                {/* Metrics */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                  <MetricBar label="Throughput (t/s)" value={r.tps} max={50} color={model.color} suffix=" t/s" />
                  <MetricBar label="Latency" value={r.latency} max={2000} color="#f59e0b" suffix=" ms" />
                  <MetricBar label="Output Tokens" value={r.tokens} max={300} color="#22c55e" suffix="" />
                </div>

                {/* Stat Pills */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  {[
                    { icon: <Zap size={11} />, label: `${r.tps} t/s`, color: model.color },
                    { icon: <Clock size={11} />, label: `${r.latency}ms`, color: '#f59e0b' },
                    { icon: <BarChart2 size={11} />, label: `${r.tokens} tokens`, color: '#22c55e' },
                  ].map(({ icon, label, color }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, background: `${color}18`, color, fontSize: '0.72rem', fontWeight: 600 }}>
                      {icon} {label}
                    </div>
                  ))}
                </div>

                {/* Response Preview */}
                <div style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: 12, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6, maxHeight: 120, overflowY: 'auto' }}>
                  {r.text}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Comparison Table */}
      {hasResults && (
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 16 }}>COMPARISON SUMMARY</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Model</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Latency</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Throughput</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Tokens</th>
                <th style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Result</th>
              </tr>
            </thead>
            <tbody>
              {selectedModels.filter(m => results[m]).map(modelId => {
                const model = MOCK_MODELS.find(m => m.id === modelId);
                const r = results[modelId];
                const isWinner = modelId === winnerKey;
                return (
                  <tr key={modelId} style={{ borderBottom: '1px solid var(--border-color)', background: isWinner ? `${model.color}0a` : 'transparent' }}>
                    <td style={{ padding: '10px 12px', color: model.color, fontWeight: 600 }}>{model.label}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-main)' }}>{r.latency}ms</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-main)' }}>{r.tps} t/s</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-main)' }}>{r.tokens}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      {isWinner ? <Star size={14} color={model.color} fill={model.color} /> : <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Benchmark History */}
      {benchmarkRuns.length > 0 && (
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 16 }}>BENCHMARK HISTORY</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {benchmarkRuns.map((run, i) => {
              const winModel = MOCK_MODELS.find(m => m.id === run.winner);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flex: 1 }}>{run.prompt}…</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ padding: '3px 8px', borderRadius: 8, background: `${winModel?.color}22`, color: winModel?.color, fontSize: '0.7rem', fontWeight: 700 }}>
                      Winner: {winModel?.label}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{run.ts}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
