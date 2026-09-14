import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Gauge } from 'lucide-react';

export const ModelManagementCenter = () => {
  const { token, API_URL } = useAuth();
  const [loading, setLoading] = useState(true);

  const [benchmarkResult, setBenchmarkResult] = useState(null);
  const [benchmarking, setBenchmarking] = useState(false);

  useEffect(() => {
    fetchModelCenterData();
  }, []);

  async function fetchModelCenterData() {
    try {
      setLoading(true);
      await fetch(`${API_URL}/models`, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) {
      console.error('Model center fetch error', err);
    } finally {
      setLoading(false);
    }
  }

  const handleRunBenchmark = async (modelName) => {
    try {
      setBenchmarking(true);
      const res = await fetch(`${API_URL}/models/benchmark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ modelName })
      });
      if (res.ok) {
        const data = await res.json();
        setBenchmarkResult(data);
      }
    } catch (err) {
      console.error('Benchmark error', err);
    } finally {
      setBenchmarking(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-main)' }}>
        <h2>Loading Local Model Orchestration & Fine-Tuning Studio...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: '14px 18px 18px', color: 'var(--text-main)', maxWidth: '1400px', width: '100%', minHeight: '100%', boxSizing: 'border-box', margin: '0 auto', overflow: 'visible' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>Model Management Center</h1>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="btn-secondary" onClick={() => handleRunBenchmark()} disabled={benchmarking} style={{ padding: '6px 10px', fontSize: '0.72rem' }}>
            <Gauge size={14} /> {benchmarking ? 'Benchmarking CUDA...' : 'Benchmark All Models'}
          </button>
        </div>
      </div>

      {/* Benchmark Banner Results if triggered */}
      {benchmarkResult && (
        <div className="glass-panel" style={{ padding: '10px 12px', marginBottom: '14px', borderLeft: '3px solid var(--accent-cyan)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '7px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.76rem', color: 'var(--accent-cyan)' }}>
              <Gauge size={15} /> {benchmarkResult.message}
            </div>
            <button 
              onClick={() => setBenchmarkResult(null)} 
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem' }}
            >
              Dismiss
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px', fontSize: '0.72rem' }}>
            <div>Tokens Per Sec: <strong style={{ color: 'var(--text-main)' }}>{benchmarkResult.results.tokensPerSecond}</strong></div>
            <div>First Token Latency: <strong style={{ color: 'var(--text-main)' }}>{benchmarkResult.results.firstTokenLatencyMs}</strong></div>
            <div>Peak VRAM Pressure: <strong style={{ color: 'var(--text-main)' }}>{benchmarkResult.results.vramPeakGB}</strong></div>
            <div>CUDA Efficiency: <strong style={{ color: 'var(--accent-green)' }}>{benchmarkResult.results.cudaMemoryEfficiency}</strong></div>
          </div>
        </div>
      )}

    </div>
  );
};
