import { useState, useEffect, useRef } from 'react';
import {
  Play, Square, CheckCircle, BarChart2, Settings
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const STAGE_LABELS = {
  idle: 'Idle',
  preparing: 'Preparing Dataset',
  training: 'Training',
  validating: 'Validating',
  done: 'Complete',
  cancelled: 'Cancelled',
  error: 'Error',
};

const STAGE_COLORS = {
  idle: '#64748b',
  preparing: '#f59e0b',
  training: '#6366f1',
  validating: '#06b6d4',
  done: '#22c55e',
  cancelled: '#94a3b8',
  error: '#ef4444',
};

const mapServerStatus = (status = '') => {
  const s = String(status).toLowerCase();
  if (s.includes('complete') || s.includes('deploy') || s === 'done') return 'done';
  if (s.includes('cancel')) return 'cancelled';
  if (s.includes('valid')) return 'validating';
  if (s.includes('train') || s.includes('running')) return 'training';
  if (s.includes('fail') || s.includes('error')) return 'error';
  if (s.includes('prep') || s.includes('queued')) return 'preparing';
  return 'training';
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

export const FineTuneManager = () => {
  const { user, token, API_URL } = useAuth();
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
    trainDataFilePath: '',
    testDataFilePath: '',
    executionMode: 'AUTO',
  });
  const [form, setForm] = useState({ showForm: false });
  const [lossData, setLossData] = useState([]);
  const [validationScore, setValidationScore] = useState(null);
  const [stage, setStage] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [trainingCapabilities, setTrainingCapabilities] = useState(null);
  const intervalRef = useRef(null);
  const logRef = useRef(null);

  const baseModels = ['llama3.2:3b', 'llama3.2:1b', 'qwen2.5:7b', 'mistral:7b', 'phi3:mini'];
  const departments = ['Finance', 'HR', 'Operations', 'Legal', 'Engineering', 'Marketing'];

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [...prev.slice(-49), { msg, type, ts: new Date().toLocaleTimeString() }]);
  };

  const normalizeJob = (job) => ({
    id: job._id || job.id,
    ...job,
    stage: mapServerStatus(job.status),
    hosted: Boolean(job.isDeployed || job.hosted),
    trainDataFileName: job.trainDataFile || job.trainDataFileName || '',
    testDataFileName: job.testDataFile || job.testDataFileName || '',
    trainDataFilePath: job.trainDataFilePath || '',
    testDataFilePath: job.testDataFilePath || '',
    lossHistory: job.lossHistory || [],
    executionMode: job.executionMode || 'SIMULATED_PROGRESS',
    simulation: job.simulation !== false,
    validation: job.validation || null
  });

  const applyJobToUi = (job) => {
    if (!job) return;
    const normalized = normalizeJob(job);
    setActiveJob(normalized);
    setStage(normalized.stage);
    setProgress(Number(normalized.progressPercent || 0));
    setLossData((normalized.lossHistory || []).map(entry => ({
      epoch: entry.epoch,
      loss: Number(entry.loss)
    })));
    if (normalized.validation) setValidationScore(normalized.validation);
  };

  const fetchJobs = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/models/fine-tune`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load fine-tune jobs');
      const list = (Array.isArray(data) ? data : data.jobs || []).map(normalizeJob);
      setJobs(list);
      if (activeJob) {
        const latest = list.find(item => item.id === activeJob.id);
        if (latest) applyJobToUi(latest);
      }
    } catch (err) {
      addLog(err.message, 'error');
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [token, API_URL]);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    fetch(`${API_URL}/models/training/capabilities`, { headers: { Authorization: `Bearer ${token}` } })
      .then(response => response.json())
      .then(data => {
        if (!cancelled) setTrainingCapabilities(data);
      })
      .catch(() => {
        if (!cancelled) setTrainingCapabilities({ selectedMode: 'SIMULATED_PROGRESS', detail: 'Training capability probe unavailable.' });
      });
    return () => { cancelled = true; };
  }, [token, API_URL]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const pollJob = async (jobId) => {
    try {
      const res = await fetch(`${API_URL}/models/fine-tune/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to refresh training job');
      const latest = normalizeJob(data);
      setJobs(prev => prev.map(item => item.id === latest.id ? latest : item));
      applyJobToUi(latest);
      if (['Completed', 'Failed', 'Cancelled'].includes(latest.status)) {
        clearInterval(intervalRef.current);
        addLog(`[${latest.id}] Server job ended with status ${latest.status}.`, latest.status === 'Completed' ? 'success' : 'error');
      }
    } catch (err) {
      addLog(err.message, 'error');
    }
  };

  const startFineTune = async () => {
    setStage('preparing');
    setProgress(0);
    setLossData([]);
    setValidationScore(null);
    addLog(`Submitting fine-tune job for ${config.department} (${config.epochs} epochs)…`, 'info');

    try {
      const res = await fetch(`${API_URL}/models/fine-tune`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          jobName: `${config.department.replace(/\s+/g, '_')}_QLoRA_${Date.now()}`,
          baseModel: config.modelBase,
          department: config.department,
          method: 'QLoRA',
          epochs: config.epochs,
          learningRate: String(config.learningRate),
          trainDataFile: config.trainDataFileName,
          testDataFile: config.testDataFileName,
          trainDataFilePath: config.trainDataFilePath,
          testDataFilePath: config.testDataFilePath,
          requestedExecutionMode: config.executionMode,
          trainingConfig: {
            batchSize: config.batchSize,
            loraRank: config.loraRank,
            loraAlpha: config.loraAlpha,
            warmupSteps: config.warmupSteps
          }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to launch fine-tune job');

      const job = normalizeJob(data.job || data);
      setJobs((prev) => [job, ...prev.filter((j) => j.id !== job.id)]);
      applyJobToUi(job);
      addLog(`[${job.id}] Job registered on server — ${job.executionMode}${job.simulation ? ' (simulation)' : ' (live local trainer)'}.`, 'success');
      addLog(`[${job.id}] base=${job.baseModel} dept=${job.department} epochs=${job.epochs}`, 'info');
      if (data.datasetSummary) {
        addLog(`[${job.id}] dataset=${data.datasetSummary.totalSamples} samples (${data.datasetSummary.trainCount} train / ${data.datasetSummary.testCount} test).`, 'info');
      }

      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => pollJob(job.id), 800);
    } catch (err) {
      setStage('error');
      addLog(err.message, 'error');
    }
  };

  const stopJob = async () => {
    clearInterval(intervalRef.current);
    if (!activeJob?.id) {
      setStage('idle');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/models/fine-tune/${activeJob.id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cancellation failed');
      applyJobToUi(data.job);
      addLog(`[${activeJob.id}] Cancellation requested.`, 'error');
    } catch (err) {
      addLog(err.message, 'error');
    }
  };

  const handleDatasetUpload = async (key, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const pathKey = key.replace('Name', 'Path');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_URL}/models/fine-tune/dataset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Dataset upload failed');
      setConfig(prev => ({ ...prev, [key]: file.name, [pathKey]: data.datasetPath }));
      addLog(`${file.name} staged as ${key === 'trainDataFileName' ? 'training' : 'test'} dataset (${data.sizeBytes} bytes).`, 'success');
    } catch (err) {
      addLog(err.message, 'error');
    }
  };

  const handleHostToLan = async (job) => {
    try {
      const res = await fetch(`${API_URL}/models/fine-tune/${job.id}/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deploy failed (Admin only)');
      setJobs((prev) => prev.map((item) => (item.id === job.id ? { ...item, hosted: true, isDeployed: true } : item)));
      addLog(`[${job.id}] Deployed to LAN via API.`, 'success');
      fetchJobs();
    } catch (err) {
      addLog(err.message, 'error');
    }
  };

  const handleRemoveJob = async (jobId) => {
    try {
      const res = await fetch(`${API_URL}/models/fine-tune/${jobId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setJobs((prev) => prev.filter((item) => item.id !== jobId));
      if (activeJob?.id === jobId) setActiveJob(null);
      addLog(`[${jobId}] Removed from fine-tune registry.`, 'error');
    } catch (err) {
      addLog(err.message, 'error');
    }
  };

  const hasMeasuredValidation = validationScore && [
    validationScore.bleu,
    validationScore.rouge,
    validationScore.perplexity
  ].some(value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)));

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
          <div style={{ color: trainingCapabilities?.liveReady ? '#22c55e' : '#f59e0b', fontSize: '0.72rem', marginTop: 6 }}>
            Runtime: {trainingCapabilities?.selectedMode || 'Checking…'} · {trainingCapabilities?.detail || 'Checking local trainer capabilities…'}
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
              { key: 'executionMode', label: 'Runtime Mode', type: 'select', opts: ['AUTO', 'SIMULATED', 'LIVE'] },
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
              {hasMeasuredValidation ? [
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
              )) : (
                <div style={{ padding: '14px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, color: '#fbbf24', fontSize: '0.8rem' }}>
                  {validationScore.status || 'VALIDATION_PENDING'} — {validationScore.message || 'A held-out evaluation is required before quality metrics can be claimed.'}
                </div>
              )}
              {hasMeasuredValidation && <div style={{ marginTop: 12, padding: '12px 16px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle size={18} color="#22c55e" />
                <div>
                  <div style={{ fontWeight: 700, color: '#22c55e', fontSize: '0.85rem' }}>Adapter Validated</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Performance improvement: {validationScore.improvement}</div>
                </div>
              </div>}
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
                  <div style={{ color: j.simulation ? '#fbbf24' : '#86efac', fontSize: '0.72rem', marginTop: 3 }}>
                    {j.executionMode} · {j.simulation ? 'development simulation' : 'live local trainer'} · {j.progressPercent || 0}%
                  </div>
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
