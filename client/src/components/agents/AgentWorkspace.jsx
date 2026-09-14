import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AgentSelector } from './AgentSelector';
import { ResponseRenderer } from './ResponseRenderer';
import { AgentTraceViewer } from './AgentTraceViewer';
import { 
  Bot, Sparkles, RefreshCw
} from 'lucide-react';

export const AgentWorkspace = () => {
  const { user, token, API_URL } = useAuth();

  const [activeMode, setActiveMode] = useState('AUTO'); // 'AUTO' | 'SEQUENTIAL' | 'PARALLEL' | 'SUPERVISOR'
  const [prompt, setPrompt] = useState(`Analyze ${user.department} quarterly financial metrics, detect any variance anomalies, and compile a compliance executive report.`);
  const [loading, setLoading] = useState(false);
  const [orchestrationResponse, setOrchestrationResponse] = useState(null);
  const [decomposition, setDecomposition] = useState(null);

  const handlePreviewDecomposition = async () => {
    if (!prompt.trim()) return;
    try {
      const res = await fetch(`${API_URL}/agents/decompose`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ query: prompt })
      });
      if (res.ok) {
        const data = await res.json();
        setDecomposition(data);
      }
    } catch (err) {
      console.error('Decomposition error:', err);
    }
  };

  const handleExecuteOrchestration = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setOrchestrationResponse(null);

    try {
      const res = await fetch(`${API_URL}/agents/orchestrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          query: prompt,
          mode: activeMode,
          sessionId: `session_${user._id || user.id}`
        })
      });

      if (res.ok) {
        const data = await res.json();
        setOrchestrationResponse(data);
      }
    } catch (err) {
      console.error('Orchestration failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Controls & Prompt Form */}
      <div className="glass-card" style={{ padding: '14px 16px', borderRadius: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bot size={18} style={{ color: 'var(--accent-cyan)' }} />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Multi-Agent Orchestration Studio</h2>
          </div>
          <span className="badge badge-cyan" style={{ fontSize: '0.62rem' }}>
            DEPT SCOPE: {user.department.toUpperCase()}
          </span>
        </div>

        {/* Agent & Mode Selector */}
        <AgentSelector
          activeMode={activeMode}
          setActiveMode={setActiveMode}
        />

        {/* Prompt Input Form */}
        <form onSubmit={handleExecuteOrchestration}>
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <textarea
          rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your enterprise query or mission statement for the multi-agent system..."
              style={{
                width: '100%',
                padding: '9px 12px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                color: 'var(--text-main)',
                fontSize: '0.78rem',
                lineHeight: 1.35,
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handlePreviewDecomposition}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '6px 10px',
                color: 'var(--text-muted)',
                fontSize: '0.68rem',
                cursor: 'pointer'
              }}
            >
              Preview Task Decomposition
            </button>

            <button
              type="submit"
              disabled={loading}
              className="btn-glow"
              style={{
                padding: '7px 14px',
                background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))',
                border: 'none',
                borderRadius: '8px',
                color: '#000',
                fontWeight: 800,
                fontSize: '0.74rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> EXECUTING MULTI-AGENT PIPELINE...
                </>
              ) : (
                <>
                  <Sparkles size={16} /> DISPATCH ORCHESTRATION
                </>
              )}
            </button>
          </div>
        </form>

        {/* Task Decomposition Preview */}
        {decomposition && (
          <div style={{
            marginTop: '10px',
            padding: '10px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            fontSize: '0.7rem'
          }}>
            <div style={{ fontWeight: 800, color: 'var(--accent-purple)', marginBottom: '8px' }}>
              Planner Decomposition ({decomposition.mode} Mode — {decomposition.tasks.length} Sub-Tasks):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {decomposition.tasks.map((t, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>Step {t.step}: {t.agentKey}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{t.goal}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results View */}
      {orchestrationResponse && (
        <>
          <ResponseRenderer
            responseData={orchestrationResponse}
            userDepartment={user.department}
          />
          <AgentTraceViewer trace={orchestrationResponse.trace} />
        </>
      )}
    </div>
  );
};
