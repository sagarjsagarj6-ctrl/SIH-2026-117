export const ExecutionLog = ({ run, logs = [] }) => (
  <div style={{ marginTop: '10px', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.12)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-cyan)', letterSpacing: '0.06em' }}>EXECUTION LOG</span>
      {run && <span className={`badge ${run.status === 'success' ? 'badge-green' : run.status === 'failed' ? 'badge-rose' : 'badge-amber'}`}>{run.status}</span>}
    </div>
    {logs.length === 0 ? <div style={{ color: 'var(--text-dim)', fontSize: '0.68rem' }}>Run the workflow to see node-level execution details.</div> : logs.map((log) => (
      <div key={`${log.nodeId}-${log.startedAt}`} style={{ display: 'flex', gap: '8px', alignItems: 'baseline', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.68rem' }}>
        <span style={{ color: log.status === 'success' ? 'var(--accent-green)' : 'var(--accent-rose)' }}>{log.status === 'success' ? '✓' : '!'}</span>
        <span style={{ color: 'var(--text-muted)' }}>{log.nodeType}</span>
        <span style={{ color: 'var(--text-dim)' }}>{log.error || `${log.durationMs || 0} ms`}</span>
      </div>
    ))}
  </div>
);
