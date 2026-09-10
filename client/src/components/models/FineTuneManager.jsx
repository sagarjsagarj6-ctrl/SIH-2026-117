import React, { useState, useEffect, useRef } from 'react';
import {
  Play, Square, Upload, ChevronRight, Zap, BookOpen,
  TrendingDown, CheckCircle, AlertCircle, Clock, Cpu,
  BarChart2, FileText, Settings, RefreshCw, Download
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const STAGE_LABELS = {
  idle: 'Idle',
  preparing: 'Preparing Dataset',
  training: 'Training',
  validating: 'Validating',
  done: 'Complete',
  error: 'Error',
};

const STAGE_COLORS = {
  idle: '#64748b',
  preparing: '#f59e0b',
  training: '#6366f1',
  validating: '#06b6d4',
  done: '#22c55e',
  error: '#ef4444',
};

function generateMockLoss(epoch, totalEpochs) {
  const base = 2.4;
  const decay = 1.8;
  const noise = (Math.random() - 0.5) * 0.08;
  return +(base * Math.exp(-decay * (epoch / totalEpochs)) + noise + 0.3).toFixed(4);
}

export const FineTuneManager = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [activeJob, setActiveJob] = useState(null);
  const [config, setConfig] = useState({
    modelBase: 'llama3.2:3b',
    department: 'Finance',
    epochs: 5,
    batchSize: 4,
    learningRate: 0.0002,
    loraRank: 16,
    loraAlpha: 32,
    warmupSteps: 100,
    trainDataFileName: '',
    testDataFileName: '',
  });
  const [form, setForm] = useState({ showForm: false });
  const [lossData, setLossData] = useState([]);
  const [validationScore, setValidationScore] = useState(null);
  const [stage, setStage] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const intervalRef = useRef(null);
  const logRef = useRef(null);

  const baseModels = ['llama3.2:3b', 'llama3.2:1b', 'qwen2.5:7b', 'mistral:7b', 'phi3:mini'];
  const departments = ['Finance', 'HR', 'Operations', 'Legal', 'Engineering', 'Marketing'];

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [...prev.slice(-49), { msg, type, ts: new Date().toLocaleTimeString() }]);
  };

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const startFineTune = async () => {
    setStage('preparing');
    setProgress(0);
    setLossData([]);
    setValidationScore(null);
    const jobId = `ft-${Date.now()}`;
    const newJob = {
      id: jobId,
      ...config,
      stage: 'preparing',
      startedAt: new Date().toISOString(),
      lossHistory: [],
      trainDataFileName: config.trainDataFileName || 'No training file selected',
      testDataFileName: config.testDataFileName || 'No test file selected',
      hosted: false,
      createdBy: user?.role || 'Employee'
    };
    setJobs(prev => [newJob, ...prev]);
    setActiveJob(newJob);
    addLog(`[${jobId}] Preparing dataset for ${config.department} dept. (${config.epochs} epochs)…`, 'info');

    // Simulate dataset preparation
    await new Promise(r => setTimeout(r, 1500));
    addLog(`[${jobId}] Dataset JSONL prepared — 2,847 instruction-response pairs`, 'success');
    addLog(`[${jobId}] LoRA rank=${config.loraRank}, alpha=${config.loraAlpha}, lr=${config.learningRate}`, 'info');
    setStage('training');

    let epoch = 0;
    const totalEpochs = config.epochs;
    intervalRef.current = setInterval(() => {
      epoch++;
      const loss = generateMockLoss(epoch, totalEpochs);
      const step = Math.round((epoch / totalEpochs) * 100);
      setProgress(step);
      setLossData(prev => [...prev, { epoch, loss }]);
      addLog(`[Epoch ${epoch}/${totalEpochs}] loss: ${loss}  lr: ${(config.learningRate * (1 - epoch / totalEpochs)).toFixed(6)}`, 'train');
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, stage: 'training', lossHistory: [...(j.lossHistory || []), { epoch, loss }] } : j));

      if (epoch >= totalEpochs) {
        clearInterval(intervalRef.current);
        setStage('validating');
        addLog(`[${jobId}] Training complete. Starting model validation…`, 'info');
        setTimeout(() => {
          const score = { bleu: +(0.72 + Math.random() * 0.15).toFixed(3), rouge: +(0.68 + Math.random() * 0.18).toFixed(3), perplexity: +(12.4 - Math.random() * 3).toFixed(2), improvement: `+${(18 + Math.random() * 12).toFixed(1)}%` };
          setValidationScore(score);
          setStage('done');
          addLog(`[${jobId}] Validation — BLEU: ${score.bleu}  ROUGE: ${score.rouge}  PPL: ${score.perplexity}`, 'success');
          addLog(`[${jobId}] LoRA adapter saved → /models/adapters/${jobId}.safetensors`, 'success');
          setJobs(prev => prev.map(j => j.id === jobId ? { ...j, stage: 'done', score } : j));
        }, 1800);
      }
    }, 900);
  };

  const stopJob = () => {
    clearInterval(intervalRef.current);
    setStage('idle');
    addLog('Training stopped by user.', 'error');
  };

  const handleDatasetUpload = (key, event) => {
    const file = event.target.files?.[0];
    const fileName = file ? file.name : '';
    setConfig(prev => ({ ...prev, [key]: fileName }));
    addLog(`${fileName ? fileName : 'No file selected'} assigned to ${key === 'trainDataFileName' ? 'training dataset' : 'test dataset'}.`, fileName ? 'success' : 'error');
  };

  const handleHostToLan = (job) => {
    setJobs(prev => prev.map(item => item.id === job.id ? { ...item, hosted: true } : item));
    addLog(`[${job.id}] Agent hosted to private LAN and broadcast to approved users.`, 'success');
  };

  const handleRemoveJob = (jobId) => {
    setJobs(prev => prev.filter(item => item.id !== jobId));
    if (activeJob?.id === jobId) setActiveJob(null);
    addLog(`[${jobId}] Agent removed from the local training registry.`, 'error');
  };

  const LossCurve = ({ data }) => {
    if (!data.length) return null;
    const w = 420, h = 160;
    const maxLoss = Math.max(...data.map(d => d.loss), 2.5);
    const minLoss = Math.min(...data.map(d => d.loss), 0.2);
    const range = maxLoss - minLoss || 1;
    const pts = data.map((d, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * (w - 40) + 20;
      const y = h - 20 - ((d.loss - minLoss) / range) * (h - 40);
      return `${x},${y}`;
    }).join(' ');
    const area = `20,${h - 20} ${pts} ${(data.length - 1) / Math.max(data.length - 1, 1) * (w - 40) + 20},${h - 20}`;

    return (
      <svg width={w} height={h} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <g key={i}>
            <line x1={20} y1={h - 20 - t * (h - 40)} x2={w - 20} y2={h - 20 - t * (h - 40)} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
            <text x={12} y={h - 20 - t * (h - 40) + 4} fill="#64748b" fontSize={9} textAnchor="end">
              {(minLoss + t * range).toFixed(2)}
            </text>
          </g>
        ))}
        {data.length > 1 && (
          <>
            <polygon points={area} fill="url(#lossGrad)" />
            <polyline points={pts} fill="none" stroke="#6366f1" strokeWidth={2} strokeLinejoin="round" />
          </>
        )}
        {data.slice(-1).map(d => {
          const x = ((data.length - 1) / Math.max(data.length - 1, 1)) * (w - 40) + 20;
          const y = h - 20 - ((d.loss - minLoss) / range) * (h - 40);
          return <circle key="dot" cx={x} cy={y} r={4} fill="#818cf8" />;
        })}
      </svg>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #818cf8, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Fine-Tuning Studio
          </h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 4 }}>
            QLoRA · LoRA adapter training on enterprise knowledge base
          </div>
        </div>
        <button
          onClick={() => setForm(f => ({ ...f, showForm: !f.showForm }))}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'linear-gradient(135deg, #6366f1, #06b6d4)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
        >
          <Settings size={15} /> Configure Job
        </button>
      </div>

      {/* Config Panel */}
      {form.showForm && (
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 16, color: 'var(--accent-cyan)' }}>⚙ TRAINING CONFIGURATION</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { key: 'modelBase', label: 'Base Model', type: 'select', opts: baseModels },
              { key: 'department', label: 'Department Corpus', type: 'select', opts: departments },
              { key: 'epochs', label: 'Epochs', type: 'number', min: 1, max: 20 },
              { key: 'batchSize', label: 'Batch Size', type: 'number', min: 1, max: 16 },
              { key: 'learningRate', label: 'Learning Rate', type: 'number', step: 0.0001 },
              { key: 'loraRank', label: 'LoRA Rank', type: 'number', min: 4, max: 128 },
              { key: 'loraAlpha', label: 'LoRA Alpha', type: 'number', min: 8, max: 256 },
              { key: 'warmupSteps', label: 'Warmup Steps', type: 'number', min: 0, max: 500 },
            ].map(({ key, label, type, opts, ...rest }) => (
              <div key={key}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{label}</label>
                {type === 'select' ? (
                  <select
                    value={config[key]}
                    onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))}
                    style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-main)', padding: '8px 12px', fontSize: '0.85rem' }}
                  >
                    {opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type="number"
                    value={config[key]}
                    onChange={e => setConfig(c => ({ ...c, [key]: parseFloat(e.target.value) }))}
                    style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-main)', padding: '8px 12px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    {...rest}
                  />
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Train Data Upload</label>
              <input
                type="file"
                accept=".csv,.json,.jsonl,.txt,.xlsx,.parquet"
                onChange={(e) => handleDatasetUpload('trainDataFileName', e)}
                style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-main)', padding: '10px 12px' }}
              />
              <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--text-dim)' }}>{config.trainDataFileName || 'No file selected'}</div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Test Data Upload</label>
              <input
                type="file"
                accept=".csv,.json,.jsonl,.txt,.xlsx,.parquet"
                onChange={(e) => handleDatasetUpload('testDataFileName', e)}
                style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-main)', padding: '10px 12px' }}
              />
              <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--text-dim)' }}>{config.testDataFileName || 'No file selected'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Training Control */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Launch Panel */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>TRAINING CONTROL</div>
            <div style={{ padding: '4px 10px', borderRadius: 20, background: `${STAGE_COLORS[stage]}22`, color: STAGE_COLORS[stage], fontSize: '0.72rem', fontWeight: 700 }}>
              ● {STAGE_LABELS[stage]}
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>
              <span>Training Progress</span>
              <span>{progress}%</span>
            </div>
            <div style={{ height: 8, background: 'var(--bg-primary)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #6366f1, #06b6d4)', borderRadius: 99, transition: 'width 0.5s ease' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Base Model', val: config.modelBase },
              { label: 'Corpus', val: `${config.department} Dept.` },
              { label: 'Epochs', val: config.epochs },
              { label: 'LoRA Rank', val: config.loraRank },
            ].map(({ label, val }) => (
              <div key={label} style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{label}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: 2 }}>{val}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={startFineTune}
              disabled={stage === 'training' || stage === 'preparing' || stage === 'validating'}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', background: 'linear-gradient(135deg, #6366f1, #818cf8)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: stage === 'idle' || stage === 'done' || stage === 'error' ? 'pointer' : 'not-allowed', opacity: stage === 'idle' || stage === 'done' || stage === 'error' ? 1 : 0.5 }}
            >
              <Play size={15} /> Start Training
            </button>
            {(stage === 'training' || stage === 'preparing') && (
              <button
                onClick={stopJob}
                style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, color: '#ef4444', cursor: 'pointer' }}
              >
                <Square size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Validation Scorecard */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 20 }}>VALIDATION SCORECARD</div>
          {validationScore ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'BLEU Score', val: validationScore.bleu, max: 1, color: '#22c55e' },
                { label: 'ROUGE-L', val: validationScore.rouge, max: 1, color: '#06b6d4' },
                { label: 'Perplexity', val: validationScore.perplexity, max: 30, color: '#f59e0b', invert: true },
              ].map(({ label, val, max, color, invert }) => (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                    <span style={{ color, fontWeight: 700 }}>{val}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-primary)', borderRadius: 99 }}>
                    <div style={{ height: '100%', width: `${invert ? (1 - val / max) * 100 : (val / max) * 100}%`, background: color, borderRadius: 99 }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 12, padding: '12px 16px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle size={18} color="#22c55e" />
                <div>
                  <div style={{ fontWeight: 700, color: '#22c55e', fontSize: '0.85rem' }}>Adapter Validated</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Performance improvement: {validationScore.improvement}</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, color: 'var(--text-dim)', gap: 12 }}>
              <BarChart2 size={36} style={{ opacity: 0.3 }} />
              <span style={{ fontSize: '0.82rem' }}>Run training to see validation metrics</span>
            </div>
          )}
        </div>
      </div>

      {/* Loss Curve */}
      {lossData.length > 0 && (
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 16 }}>TRAINING LOSS CURVE</div>
          <div style={{ overflowX: 'auto' }}>
            <LossCurve data={lossData} />
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: '0.78rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Latest: <b style={{ color: '#818cf8' }}>{lossData[lossData.length - 1]?.loss}</b></span>
            <span style={{ color: 'var(--text-muted)' }}>Min: <b style={{ color: '#22c55e' }}>{Math.min(...lossData.map(d => d.loss)).toFixed(4)}</b></span>
            <span style={{ color: 'var(--text-muted)' }}>Epoch: <b style={{ color: '#06b6d4' }}>{lossData.length}/{config.epochs}</b></span>
          </div>
        </div>
      )}

      {/* Training Log */}
      <div className="glass-card" style={{ padding: 24 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12 }}>TRAINING LOG</div>
        <div
          ref={logRef}
          style={{ height: 160, overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.78rem', background: 'var(--bg-primary)', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 3 }}
        >
          {logs.length === 0 ? (
            <span style={{ color: 'var(--text-dim)' }}>Awaiting training start…</span>
          ) : logs.map((l, i) => (
            <div key={i} style={{ color: l.type === 'success' ? '#22c55e' : l.type === 'error' ? '#ef4444' : l.type === 'train' ? '#818cf8' : '#94a3b8' }}>
              <span style={{ color: 'var(--text-dim)', marginRight: 6 }}>[{l.ts}]</span>{l.msg}
            </div>
          ))}
        </div>
      </div>

      {/* Job History */}
      {jobs.length > 0 && (
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 16 }}>JOB HISTORY</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {jobs.map(j => (
              <div key={j.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', background: 'var(--bg-primary)', borderRadius: 8, borderLeft: `3px solid ${STAGE_COLORS[j.stage]}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{j.id}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{j.modelBase} · {j.department} · {j.epochs} epochs</div>
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.72rem', marginTop: 4 }}>
                    Train: {j.trainDataFileName || 'Not uploaded'} | Test: {j.testDataFileName || 'Not uploaded'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {user?.role === 'Admin' && (
                    <button
                      onClick={() => handleHostToLan(j)}
                      style={{ padding: '6px 10px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)', color: '#86efac', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      {j.hosted ? 'Hosted' : 'Host to LAN'}
                    </button>
                  )}
                  <button
                    onClick={() => setActiveJob(j)}
                    style={{ padding: '6px 10px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.35)', color: '#a5b4fc', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Fine Tune
                  </button>
                  <button
                    onClick={() => handleRemoveJob(j.id)}
                    style={{ padding: '6px 10px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                  <div style={{ padding: '4px 10px', borderRadius: 20, background: `${STAGE_COLORS[j.stage]}22`, color: STAGE_COLORS[j.stage], fontSize: '0.72rem', fontWeight: 700 }}>
                    {STAGE_LABELS[j.stage]}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
