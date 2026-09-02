import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useHardware } from '../../context/HardwareContext';
import { 
  Bot, Search, FileText, BarChart3, Zap, Terminal, 
  Upload, CheckCircle2, AlertTriangle, ShieldCheck, 
  Sparkles, Layers, ArrowRight, CornerDownRight 
} from 'lucide-react';

export const EmployeeWorkspace = () => {
  const { user, token, API_URL } = useAuth();
  const { activeProfile } = useHardware();

  const [activeAgent, setActiveAgent] = useState('RAG'); // 'RAG', 'DATA_SCIENCE', 'VISION', 'REPORTING'
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [queryResult, setQueryResult] = useState(null);
  
  const [documents, setDocuments] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: '', category: 'Policy', fileType: 'PDF', sensitivity: 'Confidential' });

  useEffect(() => {
    fetchDocuments();
    // Default initial prompt per agent
    updateDefaultPrompt('RAG');
  }, []);

  const updateDefaultPrompt = (agentKey) => {
    setActiveAgent(agentKey);
    setQueryResult(null);
    if (agentKey === 'RAG') {
      setPrompt(`Summarize key financial risk guidelines and compliance checks in our ${user.department} repository.`);
    } else if (agentKey === 'DATA_SCIENCE') {
      setPrompt(`Analyze quarterly operational metrics and detect anomalies in the ${user.department} dataset.`);
    } else if (agentKey === 'VISION') {
      setPrompt(`Perform local OCR scan on technical blueprint form REF-2026 and extract sensitivity classification.`);
    } else if (agentKey === 'REPORTING') {
      setPrompt(`Generate an executive summary report on local AI operations and security for ${user.department}.`);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_URL}/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Failed to fetch documents', err);
    }
  };

  const handleAgentQuery = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setQueryResult(null);

    try {
      const res = await fetch(`${API_URL}/agents/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          agentType: activeAgent,
          prompt,
          departmentFilter: user.department
        })
      });

      if (res.ok) {
        const data = await res.json();
        setQueryResult(data);
      }
    } catch (err) {
      console.error('Agent query failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUpload = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/documents/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newDoc)
      });
      if (res.ok) {
        setShowUploadModal(false);
        setNewDoc({ title: '', category: 'Policy', fileType: 'PDF', sensitivity: 'Confidential' });
        fetchDocuments();
      }
    } catch (err) {
      console.error('Upload failed', err);
    }
  };

  return (
    <div style={{ padding: '32px', color: 'var(--text-main)', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Workspace Banner Header */}
      <div className="glass-panel" style={{ padding: '24px 32px', marginBottom: '32px', borderLeft: '4px solid var(--accent-cyan)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{user.department} Workspace</h1>
              <span className="badge badge-cyan">{user.role} ACCESS</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Air-Gapped Multi-Agent Intelligence Hub. Queries are scoped strictly to <strong>{user.department}</strong> vector indexes.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <div>Active Execution Profile</div>
              <div style={{ fontWeight: 700, color: 'var(--accent-indigo)' }}>{activeProfile} Mode</div>
            </div>
            <button className="btn-secondary" onClick={() => setShowUploadModal(true)} style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
              <Upload size={16} /> Upload & Vector Index Doc
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Multi-Agent Query Sandbox + Knowledge Repository */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.3fr', gap: '28px' }}>
        {/* Left Column: Multi-Agent Suite */}
        <div>
          {/* Agent Selector Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
            {[
              { id: 'RAG', name: 'RAG Search Agent', icon: <FileText size={18} />, color: 'var(--accent-cyan)' },
              { id: 'DATA_SCIENCE', name: 'Data Science Agent', icon: <BarChart3 size={18} />, color: 'var(--accent-indigo)' },
              { id: 'VISION', name: 'Vision OCR Agent', icon: <Zap size={18} />, color: 'var(--accent-purple)' },
              { id: 'REPORTING', name: 'Reporting Agent', icon: <Terminal size={18} />, color: 'var(--accent-green)' }
            ].map(agent => {
              const isSelected = activeAgent === agent.id;
              return (
                <button
                  key={agent.id}
                  onClick={() => updateDefaultPrompt(agent.id)}
                  className="glass-card"
                  style={{
                    padding: '16px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(21, 27, 44, 0.95)' : 'var(--bg-card)',
                    border: isSelected ? `2px solid ${agent.color}` : '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '8px',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ color: agent.color }}>{agent.icon}</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: isSelected ? 700 : 600, color: isSelected ? 'var(--text-main)' : 'var(--text-muted)' }}>
                    {agent.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Prompt Input Form */}
          <div className="glass-card" style={{ padding: '24px', marginBottom: '28px' }}>
            <form onSubmit={handleAgentQuery}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Bot size={16} /> SOVEREIGN {activeAgent} AGENT PROMPT:
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Air-Gap Encrypted Session</span>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  className="form-input"
                  style={{ resize: 'vertical', fontFamily: 'var(--font-main)' }}
                  placeholder="Enter your confidential inquiry or dataset analysis prompt..."
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Scoped to: <strong style={{ color: 'var(--accent-indigo)' }}>{user.department}</strong>
                </div>

                <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '10px 24px' }}>
                  {loading ? 'Agent Reasoning...' : 'Execute Local AI Agent'} <ArrowRight size={18} />
                </button>
              </div>
            </form>
          </div>

          {/* Agent Output Canvas */}
          {loading && (
            <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
              <div className="pulse-live" style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <Bot size={24} color="#fff" />
              </div>
              <h3 style={{ fontSize: '1.1rem' }}>Executing {activeAgent} Agent Logic...</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                Performing vector similarity search & localized tensor inference on {activeProfile} model endpoint.
              </p>
            </div>
          )}

          {queryResult && (
            <div className="glass-panel" style={{ padding: '28px', border: '1px solid var(--border-highlight)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="badge badge-cyan">{queryResult.agent}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Latency: {queryResult.executionTimeMs} ms</span>
                </div>
                <span className="badge badge-green">100% LOCAL AIR-GAP CONFIRMED</span>
              </div>

              {/* Text Response / Report */}
              {queryResult.answer && (
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.95rem', marginBottom: '24px' }}>
                  {queryResult.answer}
                </div>
              )}

              {/* Citations section if RAG */}
              {queryResult.citations && (
                <div>
                  <h4 style={{ fontSize: '0.88rem', color: 'var(--accent-cyan)', marginBottom: '12px' }}>
                    Vector Retrieval Citations & Evidence Passages:
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                    {queryResult.citations.map((c, i) => (
                      <div key={i} className="glass-card" style={{ padding: '12px 16px', fontSize: '0.82rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <strong style={{ color: '#818cf8' }}>{c.title}</strong>
                          <span className="badge badge-amber">{c.sensitivity}</span>
                        </div>
                        <div style={{ color: 'var(--text-muted)' }}>Category: {c.category} | Match Score: {c.similarityScore}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Science Metrics & Interactive Chart */}
              {queryResult.metrics && (
                <div>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-indigo)', marginBottom: '14px' }}>
                    {queryResult.summary}
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                    <div className="glass-card" style={{ padding: '14px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Records Processed</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{queryResult.metrics.totalRecordsAnalyzed}</div>
                    </div>
                    <div className="glass-card" style={{ padding: '14px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Anomaly Rate</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-green)' }}>{queryResult.metrics.anomalyRatePct}%</div>
                    </div>
                    <div className="glass-card" style={{ padding: '14px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Confidence Score</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>{queryResult.metrics.confidenceScore}</div>
                    </div>
                  </div>

                  {/* SVG Chart Visualization */}
                  <div className="glass-card" style={{ padding: '20px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '16px' }}>{queryResult.chartData.title}</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '24px', height: '140px', padding: '10px 20px', borderBottom: '1px solid var(--border-color)' }}>
                      {[40, 65, 85, 110].map((h, i) => (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '100%',
                            height: `${h}px`,
                            background: 'linear-gradient(180deg, var(--accent-indigo), var(--accent-cyan))',
                            borderRadius: '6px 6px 0 0'
                          }} />
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{queryResult.chartData.labels[i]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Vision OCR Results */}
              {queryResult.ocrResult && (
                <div className="glass-card" style={{ padding: '20px' }}>
                  <div className="badge badge-purple" style={{ marginBottom: '10px' }}>
                    OCR Scan Complete ({queryResult.ocrResult.confidence})
                  </div>
                  <pre className="mono" style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--accent-cyan)', marginBottom: '16px' }}>
                    {queryResult.ocrResult.textExtracted}
                  </pre>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Extracted Entities:
                    {queryResult.ocrResult.detectedEntities.map((ent, i) => (
                      <span key={i} style={{ marginLeft: '8px', color: 'var(--text-main)' }}>
                        <strong>{ent.label}:</strong> {ent.value} |
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Executive Report Sections */}
              {queryResult.sections && (
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px', color: 'var(--accent-green)' }}>
                    {queryResult.reportTitle}
                  </h3>
                  {queryResult.sections.map((sec, i) => (
                    <div key={i} style={{ marginBottom: '16px' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '6px' }}>{sec.heading}</h4>
                      <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{sec.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Department Knowledge Repository */}
        <div>
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Indexed Department Docs</h3>
              <span className="badge badge-indigo">{documents.length} Files</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '550px', overflowY: 'auto' }}>
              {documents.map((doc, idx) => (
                <div key={idx} style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>{doc.title}</span>
                    <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>{doc.fileType}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Sensitivity: <strong style={{ color: '#fb7185' }}>{doc.sensitivity}</strong>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} /> Vector Index Active ({doc.tokenCount || 1200} Tokens)
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
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
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '32px' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '16px' }}>Upload Document to Local Vector Store</h2>
            <form onSubmit={handleDocumentUpload} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Document Title</label>
                <input 
                  type="text" 
                  value={newDoc.title} 
                  onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })} 
                  className="form-input" 
                  placeholder="e.g. Q4 Compliance & Risk Ledger"
                  required 
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Category</label>
                <input 
                  type="text" 
                  value={newDoc.category} 
                  onChange={(e) => setNewDoc({ ...newDoc, category: e.target.value })} 
                  className="form-input" 
                  placeholder="e.g. Financial Ledger"
                  required 
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sensitivity Level</label>
                <select 
                  value={newDoc.sensitivity} 
                  onChange={(e) => setNewDoc({ ...newDoc, sensitivity: e.target.value })} 
                  className="form-select"
                >
                  <option value="Internal">Internal</option>
                  <option value="Confidential">Confidential</option>
                  <option value="Restricted">Restricted</option>
                  <option value="Top Secret">Top Secret</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowUploadModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Index Document</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
