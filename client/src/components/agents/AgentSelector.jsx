import { Workflow, GitFork, ShieldCheck, Sparkles } from 'lucide-react';

export const AgentSelector = ({
  activeMode,
  setActiveMode
}) => {
  const modes = [
    { id: 'AUTO', name: 'Auto-Orchestrator', icon: <Sparkles size={16} />, desc: 'Decomposes query automatically' },
    { id: 'SEQUENTIAL', name: 'Sequential Pipeline', icon: <Workflow size={16} />, desc: 'RAG → Data Science → Report' },
    { id: 'PARALLEL', name: 'Parallel Fan-Out', icon: <GitFork size={16} />, desc: 'Concurrent specialist analysis' },
    { id: 'SUPERVISOR', name: 'Supervisor Loop', icon: <ShieldCheck size={16} />, desc: 'Draft & refinement verification' }
  ];

  return (
    <div style={{ marginBottom: '20px' }}>
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
    </div>
  );
};
