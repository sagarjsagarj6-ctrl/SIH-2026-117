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

  const [activeMode, setActiveMode] = useState('AUTO'); // 'AUTO' | 'SINGLE' | 'SEQUENTIAL' | 'PARALLEL' | 'SUPERVISOR'
  const [activeAgent, setActiveAgent] = useState(null); // 'RAG' | 'DATA_SCIENCE' | 'VISION' | 'REPORTING'
  const [prompt, setPrompt] = useState(`Analyze ${user.department} quarterly financial metrics, detect any variance anomalies, and compile a compliance executive report.`);
  const [loading, setLoading] = useState(false);
  const [orchestrationResponse, setOrchestrationResponse] = useState(null);
  const [decomposition, setDecomposition] = useState(null);

  const samplePrompts = [
    {
      label: 'Multi-Agent Sequential Dossier',
      mode: 'SEQUENTIAL',
      agent: null,
      text: `Audit ${user.department} operational guidelines, detect statistical numerical anomalies, and generate an executive summary report.`
    },
    {
      label: 'RAG Knowledge & Citation Search',
      mode: 'SINGLE',
      agent: 'RAG',
      text: `Summarize key enterprise security charter rules and department compliance guidelines in the local repository.`
    },
    {
      label: 'Quantitative Anomaly Detection',
      mode: 'SINGLE',
      agent: 'DATA_SCIENCE',
      text: `Perform statistical IQR and Z-score outlier detection on recent ${user.department} dataset throughput.`
    },
    {
      label: 'Visual OCR & Table Extraction',
      mode: 'SINGLE',
      agent: 'VISION',
      text: `Scan operational technical blueprint REF-2026, parse tabular telemetry specifications, and verify security classification.`
    },
    {
      label: 'Supervisor Quality Verification Loop',
      mode: 'SUPERVISOR',
      agent: null,
      text: `Verify evidence citations and validate regulatory accuracy for ${user.department} operational risk protocol.`
    }
  ];

  const handleApplySample = (sample) => {
    setActiveMode(sample.mode);
    setActiveAgent(sample.agent);
    setPrompt(sample.text);
    setOrchestrationResponse(null);
    setDecomposition(null);
  };

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
          specificAgent: activeAgent,
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Controls & Prompt Form */}
      <div className="glass-card" style={{ padding: '24px', borderRadius: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bot size={22} style={{ color: 'var(--accent-cyan)' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Multi-Agent Orchestration Studio</h2>
          </div>
          <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>
            DEPT SCOPE: {user.department.toUpperCase()}
          </span>
        </div>

        {/* Quick Sample Prompts */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px' }}>
            PRE-CONFIGURED ORCHESTRATION RECIPES:
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {samplePrompts.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplySample(s)}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--accent-cyan)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Agent & Mode Selector */}
        <AgentSelector
          activeMode={activeMode}
          setActiveMode={setActiveMode}
          activeAgent={activeAgent}
          setActiveAgent={setActiveAgent}
        />

        {/* Prompt Input Form */}
        <form onSubmit={handleExecuteOrchestration}>
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your enterprise query or mission statement for the multi-agent system..."
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                lineHeight: 1.5,
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
                padding: '8px 14px',
                color: 'var(--text-muted)',
                fontSize: '0.78rem',
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
                padding: '10px 24px',
                background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))',
                border: 'none',
                borderRadius: '8px',
                color: '#000',
                fontWeight: 800,
                fontSize: '0.88rem',
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
            marginTop: '16px',
            padding: '14px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            fontSize: '0.78rem'
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
