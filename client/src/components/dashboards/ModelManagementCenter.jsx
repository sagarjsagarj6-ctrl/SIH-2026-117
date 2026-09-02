import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Cpu, Power, Gauge, Layers, Play, CheckCircle2, 
  AlertCircle, Sparkles, Terminal, Database, Sliders 
} from 'lucide-react';

export const ModelManagementCenter = () => {
  const { token, API_URL } = useAuth();
  const [models, setModels] = useState([]);
  const [fineTuneJobs, setFineTuneJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [benchmarkResult, setBenchmarkResult] = useState(null);
  const [benchmarking, setBenchmarking] = useState(false);

  // New Fine Tune Job State
  const [showJobModal, setShowJobModal] = useState(false);
  const [newJob, setNewJob] = useState({
    jobName: '',
    baseModel: 'Mistral-7B-v0.3-Enterprise',
    department: 'Finance & Accounting',
    datasetName: 'Financial_Ledger_Corpus.jsonl',
    method: 'QLoRA',
    epochs: 3,
    learningRate: '2e-4'
  });

  useEffect(() => {
    fetchModelCenterData();
  }, []);

  const fetchModelCenterData = async () => {
    try {
      setLoading(true);
      const [modRes, jobRes] = await Promise.all([
        fetch(`${API_URL}/models`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/models/fine-tune`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (modRes.ok) {
        const modData = await modRes.json();
        setModels(modData);
      }
      if (jobRes.ok) {
        const jobData = await jobRes.json();
        setFineTuneJobs(jobData);
      }
    } catch (err) {
      console.error('Model center fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleModel = async (modelId) => {
    try {
      const res = await fetch(`${API_URL}/models/${modelId}/toggle`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchModelCenterData();
      }
    } catch (err) {
      console.error('Toggle model error', err);
    }
  };

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

  const handleCreateFineTuneJob = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/models/fine-tune`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newJob)
      });
      if (res.ok) {
        setShowJobModal(false);
        setNewJob({
          jobName: '',
          baseModel: 'Mistral-7B-v0.3-Enterprise',
          department: 'Finance & Accounting',
          datasetName: 'Financial_Ledger_Corpus.jsonl',
          method: 'QLoRA',
          epochs: 3,
          learningRate: '2e-4'
        });
        fetchModelCenterData();
      }
    } catch (err) {
      console.error('Create fine-tune job failed', err);
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
    <div style={{ padding: '32px', color: 'var(--text-main)', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <div className="badge badge-purple" style={{ marginBottom: '8px' }}>ADMIN ORCHESTRATION LAYER</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Model Management & Training Center</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Manage installed local LLMs, VRAM allocation, inference benchmarks, and LoRA/QLoRA fine-tuning workflows
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" onClick={() => handleRunBenchmark()} disabled={benchmarking} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            <Gauge size={16} /> {benchmarking ? 'Benchmarking CUDA...' : 'Benchmark All Models'}
          </button>
          <button className="btn-primary" onClick={() => setShowJobModal(true)} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            <Play size={16} /> Launch Fine-Tuning Job
          </button>
        </div>
      </div>

      {/* Benchmark Banner Results if triggered */}
      {benchmarkResult && (
        <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: '28px', borderLeft: '4px solid var(--accent-cyan)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
              <Gauge size={18} /> {benchmarkResult.message}
            </div>
            <button 
              onClick={() => setBenchmarkResult(null)} 
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem' }}
            >
              Dismiss
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', fontSize: '0.85rem' }}>
            <div>Tokens Per Sec: <strong style={{ color: 'var(--text-main)' }}>{benchmarkResult.results.tokensPerSecond}</strong></div>
            <div>First Token Latency: <strong style={{ color: 'var(--text-main)' }}>{benchmarkResult.results.firstTokenLatencyMs}</strong></div>
            <div>Peak VRAM Pressure: <strong style={{ color: 'var(--text-main)' }}>{benchmarkResult.results.vramPeakGB}</strong></div>
            <div>CUDA Efficiency: <strong style={{ color: 'var(--accent-green)' }}>{benchmarkResult.results.cudaMemoryEfficiency}</strong></div>
          </div>
        </div>
      )}

      {/* Section 1: Installed Model Registry */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '16px' }}>Installed Local Models & Endpoints</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {models.map(m => {
            const mId = m._id || m.id;
            const isActive = m.status === 'Active';
            return (
              <div key={mId} className="glass-card" style={{ padding: '24px', border: isActive ? '1px solid var(--border-highlight)' : '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <span className={`badge ${m.type === 'LLM' ? 'badge-cyan' : m.type === 'Vision' ? 'badge-purple' : 'badge-indigo'}`} style={{ marginBottom: '6px' }}>
                      {m.type} ({m.parameters})
                    </span>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{m.name}</h3>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Version: {m.version} | Quant: {m.quantization}</div>
                  </div>
                  
                  <button 
                    onClick={() => handleToggleModel(mId)}
                    style={{
                      background: isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      border: isActive ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
                      color: isActive ? '#34d399' : 'var(--text-muted)',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Power size={14} /> {isActive ? 'Active' : 'Disabled'}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', fontSize: '0.8rem', marginTop: '14px' }}>
                  <div>VRAM Req: <strong style={{ color: 'var(--text-main)' }}>{m.vramRequiredGB} GB</strong></div>
                  <div>Context Window: <strong style={{ color: 'var(--text-main)' }}>{m.contextWindow}</strong></div>
                  <div>Speed Bench: <strong style={{ color: 'var(--accent-cyan)' }}>{m.tpsBench} t/s</strong></div>
                  <div>Avg Latency: <strong style={{ color: 'var(--text-main)' }}>{m.latencyMs} ms</strong></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Fine-Tuning Studio Workflow */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>LoRA / QLoRA Fine-Tuning Workflow Studio</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Train local foundational models on confidential departmental datasets for enhanced domain reasoning
            </p>
          </div>
          <button className="btn-accent" onClick={() => setShowJobModal(true)} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            + Create New Training Job
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {fineTuneJobs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No active fine-tuning jobs running.</p>
          ) : (
            fineTuneJobs.map((job, idx) => (
              <div key={idx} className="glass-card" style={{ padding: '18px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{job.jobName}</strong>
                      <span className={`badge ${job.status === 'Completed' ? 'badge-green' : 'badge-amber'}`}>
                        {job.status} ({job.progressPercent}%)
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Base Model: <span style={{ color: 'var(--accent-cyan)' }}>{job.baseModel}</span> | Dept: <strong>{job.department}</strong> | Method: <strong style={{ color: '#818cf8' }}>{job.method}</strong>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
                    <div>Current Training Loss: <strong style={{ color: 'var(--accent-green)' }}>{job.currentLoss}</strong></div>
                    <div style={{ color: 'var(--text-muted)' }}>Epochs: {job.epochs} | LR: {job.learningRate}</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${job.progressPercent}%`,
                    background: 'linear-gradient(90deg, var(--accent-indigo), var(--accent-cyan))',
                    borderRadius: '3px'
                  }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal for Creating Fine-Tune Job */}
      {showJobModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(7,9,14,0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '36px' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>Launch Local Fine-Tuning Job</h2>
            <form onSubmit={handleCreateFineTuneJob} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Job Name</label>
                <input 
                  type="text" 
                  value={newJob.jobName} 
                  onChange={(e) => setNewJob({ ...newJob, jobName: e.target.value })} 
                  className="form-input" 
                  placeholder="e.g. Legal_NDA_QLoRA_v3"
                  required 
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Base Model</label>
                <select 
                  value={newJob.baseModel} 
                  onChange={(e) => setNewJob({ ...newJob, baseModel: e.target.value })} 
                  className="form-select"
                >
                  {models.map(m => (
                    <option key={m._id || m.id} value={m.name}>{m.name} ({m.parameters})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Target Department Dataset</label>
                <select 
                  value={newJob.department} 
                  onChange={(e) => setNewJob({ ...newJob, department: e.target.value })} 
                  className="form-select"
                >
                  <option value="Finance & Accounting">Finance & Accounting</option>
                  <option value="Legal & Compliance">Legal & Compliance</option>
                  <option value="R&D / Engineering">R&D / Engineering</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Executive & Strategy">Executive & Strategy</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Method</label>
                  <select 
                    value={newJob.method} 
                    onChange={(e) => setNewJob({ ...newJob, method: e.target.value })} 
                    className="form-select"
                  >
                    <option value="QLoRA">QLoRA (4-bit Quantized)</option>
                    <option value="LoRA">LoRA (Low-Rank Adapt)</option>
                    <option value="Full Parameter">Full Parameter</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Epochs</label>
                  <input 
                    type="number" 
                    value={newJob.epochs} 
                    onChange={(e) => setNewJob({ ...newJob, epochs: e.target.value })} 
                    className="form-input" 
                    min={1} 
                    max={10} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowJobModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Start Fine-Tuning</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
