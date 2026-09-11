import { useState } from 'react';
import {
  Cpu, Zap, Clock, BarChart2, RefreshCw,
  ChevronRight, Star, TrendingUp, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const PRESET_PROMPTS = [
  'Summarize the key financial risks identified in Q3 operational reports.',
  'What is the status of the current audit trail for vendor payments?',
  'Explain the compliance requirements for data retention under department policy.',
  'Analyze the variance between projected and actual resource utilization this quarter.',
  'Draft a concise executive summary of the operational efficiency improvements.',
];

const COMPARE_MODELS = [
  { id: 'llama3.2:3b', label: 'LLaMA 3.2 · 3B', badge: 'Fast', color: '#6366f1', backend: 'Ollama', catalog: 'Llama-3-8B-Instruct' },
  { id: 'qwen2.5:7b', label: 'Qwen 2.5 · 7B', badge: 'Balanced', color: '#06b6d4', backend: 'Ollama', catalog: 'Qwen2-VL-7B-Instruct' },
  { id: 'mistral:7b', label: 'Mistral · 7B', badge: 'Precise', color: '#f59e0b', backend: 'vLLM', catalog: 'Mistral-7B-v0.3-Enterprise' },
];

const MetricBar = ({ label, value, max, color, suffix = '' }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', marginBottom: 4 }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color, fontWeight: 700 }}>{value}{suffix}</span>
    </div>
    <div style={{ height: 5, background: 'var(--bg-primary)', borderRadius: 99 }}>
      <div style={{ height: '100%', width: `${Math.min((Number(value) / max) * 100, 100)}%`, background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
    </div>
  </div>
);

export const ModelComparisonView = () => {
  const { token, API_URL } = useAuth();
  const [selectedModels, setSelectedModels] = useState(['llama3.2:3b', 'qwen2.5:7b']);
  const [prompt, setPrompt] = useState('');
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [winnerKey, setWinnerKey] = useState(null);
  const [benchmarkRuns, setBenchmarkRuns] = useState([]);
  const [activePreset, setActivePreset] = useState(null);
  const [error, setError] = useState('');

  const toggleModel = (id) => {
    setSelectedModels((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id].slice(0, 3)
    );
  };

  const runComparison = async () => {
    if (!prompt.trim() || selectedModels.length < 2) return;
    setLoading(true);
    setResults({});
    setWinnerKey(null);
    setError('');

    try {
      const newResults = {};
      await Promise.all(selectedModels.map(async (modelId) => {
        const meta = COMPARE_MODELS.find((m) => m.id === modelId);
        const res = await fetch(`${API_URL}/inference/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            prompt,
            query: prompt,
            model: meta?.catalog || modelId,
            role: 'GENERAL'
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Inference failed for ${modelId}`);
        newResults[modelId] = {
          text: data.response || '',
          latency: data.metrics?.latencyMs || 0,
          tokens: data.metrics?.tokensGenerated || 0,
          tps: data.metrics?.tokensPerSecond || 0,
          usedFallback: data.usedFallback,
          backend: data.backendUsed
        };
      }));

      setResults(newResults);
      const best = Object.entries(newResults).sort((a, b) => {
        if (a[1].usedFallback !== b[1].usedFallback) return a[1].usedFallback ? 1 : -1;
        return b[1].tps - a[1].tps;
      })[0][0];
      setWinnerKey(best);
      setBenchmarkRuns((prev) => [
        { prompt: prompt.slice(0, 60), results: newResults, winner: best, ts: new Date().toLocaleTimeString() },
        ...prev.slice(0, 4)
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const hasResults = Object.keys(results).length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #06b6d4, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Model Comparison Studio
        </h2>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 4 }}>
          Live InferenceRouter benchmarks — latency · tokens · backend health (FALLBACK when Ollama/vLLM offline)
        </div>
      </div>

      {error && (
        <div className="glass-card" style={{ padding: 12, color: '#ef4444', fontSize: '0.85rem' }}>
          <AlertCircle size={14} style={{ display: 'inline', marginRight: 6 }} />{error}
        </div>
      )}

      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 14 }}>SELECT MODELS (2–3)</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {COMPARE_MODELS.map((m) => {
            const isSelected = selectedModels.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleModel(m.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 18px', borderRadius: 10,
                  border: `1.5px solid ${isSelected ? m.color : 'var(--border-color)'}`,
                  background: isSelected ? `${m.color}18` : 'var(--bg-primary)',
                  color: isSelected ? m.color : 'var(--text-muted)',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer'
                }}
              >
                <Cpu size={14} /> {m.label}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
          {PRESET_PROMPTS.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setPrompt(p); setActivePreset(i); }}
              style={{
                fontSize: '0.72rem', padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                border: activePreset === i ? '1px solid #818cf8' : '1px solid var(--border-color)',
                background: activePreset === i ? 'rgba(129,140,248,0.15)' : 'transparent',
                color: 'var(--text-muted)'
              }}
            >
              {p.slice(0, 42)}…
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12 }}>BENCHMARK PROMPT</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter a prompt to compare across selected models…"
            rows={3}
            style={{ flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 10, color: 'var(--text-main)', padding: '12px 16px', fontSize: '0.88rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
          />
          <button
            type="button"
            onClick={runComparison}
            disabled={loading || !prompt.trim() || selectedModels.length < 2}
            style={{ padding: '0 24px', background: 'linear-gradient(135deg, #6366f1, #06b6d4)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer', opacity: loading || !prompt.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem' }}
          >
            {loading ? <RefreshCw size={16} className="spin" /> : <Zap size={16} />}
            {loading ? 'Running…' : 'Compare'}
          </button>
        </div>
      </div>

      {hasResults && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${selectedModels.length}, 1fr)`, gap: 16 }}>
          {selectedModels.filter((m) => results[m]).map((modelId) => {
            const model = COMPARE_MODELS.find((m) => m.id === modelId);
            const r = results[modelId];
            const isWinner = modelId === winnerKey;
            return (
              <div key={modelId} className="glass-card" style={{ padding: 20, border: isWinner ? `1.5px solid ${model.color}` : '1px solid var(--border-color)', position: 'relative' }}>
                {isWinner && (
                  <div style={{ position: 'absolute', top: -10, right: 12, background: model.color, color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '3px 10px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Star size={10} /> WINNER
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  <Cpu size={16} color={model.color} />
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: model.color }}>{model.label}</span>
                  <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: 8, background: `${model.color}22`, color: model.color }}>{r.backend || model.backend}</span>
                  {r.usedFallback && (
                    <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: 8, background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>FALLBACK</span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                  <MetricBar label="Throughput (t/s)" value={r.tps} max={50} color={model.color} suffix=" t/s" />
                  <MetricBar label="Latency" value={r.latency} max={2000} color="#f59e0b" suffix=" ms" />
                  <MetricBar label="Output Tokens" value={r.tokens} max={300} color="#22c55e" />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, background: `${model.color}18`, color: model.color, fontSize: '0.72rem', fontWeight: 600 }}>
                    <Zap size={11} /> {r.tps} t/s
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: '0.72rem', fontWeight: 600 }}>
                    <Clock size={11} /> {r.latency}ms
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontSize: '0.72rem', fontWeight: 600 }}>
                    <BarChart2 size={11} /> {r.tokens} tokens
                  </div>
                </div>
                <div style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: 12, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6, maxHeight: 140, overflowY: 'auto' }}>
                  {r.text}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {benchmarkRuns.length > 0 && (
        <div className="glass-card" style={{ padding: 16 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={14} /> Recent runs
          </div>
          {benchmarkRuns.map((run, i) => (
            <div key={i} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>
              <ChevronRight size={10} style={{ display: 'inline' }} /> [{run.ts}] {run.prompt} → {run.winner}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
