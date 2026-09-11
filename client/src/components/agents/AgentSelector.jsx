import { 
  FileText, BarChart3, Zap, Terminal, 
  Workflow, GitFork, ShieldCheck, Sparkles 
} from 'lucide-react';

export const AgentSelector = ({
  activeMode,
  setActiveMode,
  activeAgent,
  setActiveAgent
}) => {
  const modes = [
    { id: 'AUTO', name: 'Auto-Orchestrator', icon: <Sparkles size={16} />, desc: 'Decomposes query automatically' },
    { id: 'SEQUENTIAL', name: 'Sequential Pipeline', icon: <Workflow size={16} />, desc: 'RAG → Data Science → Report' },
    { id: 'PARALLEL', name: 'Parallel Fan-Out', icon: <GitFork size={16} />, desc: 'Concurrent specialist analysis' },
    { id: 'SUPERVISOR', name: 'Supervisor Loop', icon: <ShieldCheck size={16} />, desc: 'Draft & refinement verification' }
  ];

  const specialists = [
    { id: 'RAG', name: 'RAG Knowledge Agent', icon: <FileText size={16} />, color: 'var(--accent-cyan)' },
    { id: 'DATA_SCIENCE', name: 'Data Science & Anomaly', icon: <BarChart3 size={16} />, color: 'var(--accent-indigo)' },
    { id: 'VISION', name: 'Vision OCR Agent', icon: <Zap size={16} />, color: 'var(--accent-purple)' },
    { id: 'REPORTING', name: 'Executive Reporting', icon: <Terminal size={16} />, color: 'var(--accent-green)' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
      {/* Mode Selector Row */}
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', letterSpacing: '0.04em' }}>
          ORCHESTRATION ARCHITECTURE MODE
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px' }}>
          {modes.map((m) => {
            const isSelected = activeMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setActiveMode(m.id);
                  if (m.id !== 'SINGLE') setActiveAgent(null);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  background: isSelected ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(6,182,212,0.2))' : 'var(--bg-surface)',
                  border: isSelected ? '2px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                  borderRadius: '10px',
                  color: isSelected ? 'var(--text-main)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ color: isSelected ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>{m.icon}</span>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800 }}>{m.name}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '2px' }}>{m.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Or Pick a Direct Specialist */}
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', letterSpacing: '0.04em' }}>
          OR DIRECT SPECIALIST DISPATCH
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px' }}>
          {specialists.map((s) => {
            const isSelected = activeMode === 'SINGLE' && activeAgent === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setActiveMode('SINGLE');
                  setActiveAgent(s.id);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  background: isSelected ? 'var(--bg-surface)' : 'var(--bg-card)',
                  border: isSelected ? `2px solid ${s.color}` : '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: isSelected ? 'var(--text-main)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ color: s.color }}>{s.icon}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: isSelected ? 800 : 600 }}>{s.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
