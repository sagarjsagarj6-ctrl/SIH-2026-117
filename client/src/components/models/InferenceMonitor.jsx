import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Server, RefreshCw
} from 'lucide-react';

export const InferenceMonitor = () => {
  const { token, API_URL } = useAuth();
  
  const [telemetry, setTelemetry] = useState(null);
  const [backends, setBackends] = useState(null);
  const [allocation, setAllocation] = useState(null);
  const [loading, setLoading] = useState(true);

  const formatBackendName = (key) => key.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase();

  const fetchTelemetry = async () => {
    try {
      const [telRes, bkdRes, allocRes] = await Promise.all([
        fetch(`${API_URL}/inference/telemetry`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/inference/backends`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/inference/allocation`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (telRes.ok) setTelemetry(await telRes.json());
      if (bkdRes.ok) setBackends(await bkdRes.json());
      if (allocRes.ok) setAllocation(await allocRes.json());
    } catch (err) {
      console.error('Inference telemetry error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 6000); // 6s polling
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '100%' }}>
      {/* Backend Statuses Header */}
      <div className="glass-card" style={{ padding: '12px 14px', borderRadius: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '9px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={17} style={{ color: 'var(--accent-cyan)' }} />
            <h3 style={{ fontSize: '0.92rem', fontWeight: 800, margin: 0 }}>Inference Daemons & Engine Routing</h3>
          </div>
          <button
            onClick={fetchTelemetry}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 9px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: 'var(--text-main)',
              fontSize: '0.66rem',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh Telemetry
          </button>
        </div>

        {backends && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '8px', alignItems: 'stretch' }}>
            {Object.entries(backends.backends || {})
              .filter(([key]) => key !== 'externalAPIs')
              .map(([key, status]) => (
              <div
                key={key}
                style={{
                  padding: '8px 10px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '6px',
                  minWidth: 0,
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.72rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatBackendName(key)}</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                    {key === 'sovereignEngine' ? 'Built-in Air-Gap' : 'Local Daemon'}
                  </div>
                </div>
                <span className={`badge ${status === 'ONLINE' ? 'badge-green' : 'badge-cyan'}`} style={{ fontSize: '0.54rem', flexShrink: 0, whiteSpace: 'nowrap', maxWidth: '48%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {status}
                </span>
              </div>
              ))}
          </div>
        )}
      </div>

      {/* Real-time Hardware Utilization Gauges */}
      {telemetry && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
          {/* GPU VRAM Card */}
          <div className="glass-card" style={{ padding: '11px 12px', borderRadius: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
              <span style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-dim)' }}>GPU VRAM ALLOCATION</span>
              <span style={{ fontSize: '0.64rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                {telemetry.gpu.vramUsedGB} / {telemetry.gpu.vramTotalGB} GB
              </span>
            </div>
            <div style={{ height: '6px', background: 'var(--bg-surface)', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' }}>
              <div style={{
                height: '100%',
                width: `${(telemetry.gpu.vramUsedGB / telemetry.gpu.vramTotalGB) * 100}%`,
                background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-purple))'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
              <span>Utilization: {telemetry.gpu.utilizationPct}%</span>
              <span>Temp: {telemetry.gpu.temperatureC}°C</span>
              <span>Power: {telemetry.gpu.powerDrawWatts}W</span>
            </div>
          </div>

          {/* CPU Load Card */}
          <div className="glass-card" style={{ padding: '11px 12px', borderRadius: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
              <span style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-dim)' }}>CPU THREAD UTILIZATION</span>
              <span style={{ fontSize: '0.64rem', color: 'var(--accent-purple)', fontWeight: 700 }}>
                {telemetry.cpu.utilizationPct}%
              </span>
            </div>
            <div style={{ height: '6px', background: 'var(--bg-surface)', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' }}>
              <div style={{
                height: '100%',
                width: `${telemetry.cpu.utilizationPct}%`,
                background: 'linear-gradient(90deg, var(--accent-indigo), var(--accent-purple))'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
              <span>Cores: {telemetry.cpu.cores} Physical/Logic</span>
              <span>Load: {telemetry.cpu.loadAverage}</span>
            </div>
          </div>

          {/* System Memory Card */}
          <div className="glass-card" style={{ padding: '11px 12px', borderRadius: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
              <span style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-dim)' }}>HOST SYSTEM RAM</span>
              <span style={{ fontSize: '0.64rem', color: 'var(--accent-green)', fontWeight: 700 }}>
                {telemetry.ram.usedGB} / {telemetry.ram.totalGB} GB
              </span>
            </div>
            <div style={{ height: '6px', background: 'var(--bg-surface)', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' }}>
              <div style={{
                height: '100%',
                width: `${telemetry.ram.utilizationPct}%`,
                background: 'linear-gradient(90deg, var(--accent-green), var(--accent-amber))'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
              <span>Free: {telemetry.ram.freeGB} GB</span>
              <span>Utilized: {telemetry.ram.utilizationPct}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Hardware-Aware Model Allocation Recommendation */}
      {allocation && (
        <div className="glass-card" style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--accent-cyan)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
            <span style={{ fontWeight: 800, fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
              AUTOMATED HARDWARE MODEL ALLOCATOR (VRAM TIER RULE)
            </span>
            <span className="badge badge-purple" style={{ fontSize: '0.58rem' }}>
              ACTIVE TIER: {allocation.tier}
            </span>
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-main)', margin: '0 0 7px' }}>
            {allocation.recommendation}
          </p>
          <div style={{ display: 'flex', gap: '12px', fontSize: '0.64rem', color: 'var(--text-muted)' }}>
            <span>Recommended Model: <strong style={{ color: 'var(--text-main)' }}>{allocation.allocation?.model}</strong></span>
            <span>Quantization: <strong style={{ color: 'var(--accent-green)' }}>{allocation.allocation?.quantization}</strong></span>
            <span>Target Device: <strong style={{ color: 'var(--accent-cyan)' }}>{allocation.allocation?.device}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};
