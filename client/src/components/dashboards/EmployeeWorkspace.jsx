import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useHardware } from '../../context/HardwareContext';
import { 
  Bot, Search, FileText, BarChart3, Zap, Terminal, 
  Upload, CheckCircle2, AlertTriangle, ShieldCheck, 
  Sparkles, Layers, ArrowRight, CornerDownRight,
  UploadCloud, File, X, RefreshCw, Lock, EyeOff, Check,
  Eye, Trash2
} from 'lucide-react';

export const EmployeeWorkspace = () => {
  const { user, token, API_URL } = useAuth();
  const { activeProfile } = useHardware();

  const [activeAgent, setActiveAgent] = useState('RAG'); // 'RAG', 'DATA_SCIENCE', 'VISION', 'REPORTING'
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [queryResult, setQueryResult] = useState(null);
  
  const [documents, setDocuments] = useState([]);
  const [fetchingDocs, setFetchingDocs] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccessToast, setUploadSuccessToast] = useState('');
  const [autoRedactPII, setAutoRedactPII] = useState(true);
  const [newDoc, setNewDoc] = useState({
    title: '',
    category: 'Policy',
    fileType: 'PDF',
    sensitivity: 'Confidential'
  });
  const fileInputRef = useRef(null);

  // Document Inspection & Deletion Modals State
  const [viewingDoc, setViewingDoc] = useState(null);
  const [deletingDoc, setDeletingDoc] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchDocuments();
    updateDefaultPrompt('RAG');

    // Dynamic cross-component synchronization listener
    const handleDocIndexed = () => {
      fetchDocuments(true);
    };

    window.addEventListener('document-indexed', handleDocIndexed);

    // Auto-poll every 8s so indexed documents stay fresh across sessions
    const pollInterval = setInterval(() => {
      fetchDocuments(true);
    }, 8000);

    return () => {
      window.removeEventListener('document-indexed', handleDocIndexed);
      clearInterval(pollInterval);
    };
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

  const fetchDocuments = async (silent = false) => {
    if (!silent) setFetchingDocs(true);
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
    } finally {
      if (!silent) setFetchingDocs(false);
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

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (file) => {
    setUploadError('');
    if (file.size > 50 * 1024 * 1024) {
      setUploadError('Selected file exceeds maximum allowable air-gap limit (50MB).');
      return;
    }

    setSelectedFile(file);
    const ext = file.name.includes('.') ? file.name.split('.').pop().toUpperCase() : 'PDF';
    const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const formattedTitle = nameWithoutExt.replace(/[-_]/g, ' ');

    setNewDoc(prev => ({
      ...prev,
      title: prev.title.trim() === '' ? formattedTitle : prev.title,
      fileType: ext
    }));
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  const handleDocumentUpload = async (e) => {
    e.preventDefault();
    setUploadError('');
    setUploadingDoc(true);

    try {
      let createdDoc = null;

      if (selectedFile) {
        // Full air-gapped ingestion pipeline via /api/ingest/upload
        const formData = new FormData();
        formData.append('files', selectedFile);
        formData.append('title', newDoc.title.trim() || selectedFile.name);
        formData.append('category', newDoc.category);
        formData.append('sensitivity', newDoc.sensitivity);
        formData.append('department', user.department);
        formData.append('autoRedactPII', autoRedactPII.toString());

        const res = await fetch(`${API_URL}/ingest/upload`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Vector ingestion failed.');
        }

        createdDoc = data.successfulJobs?.[0]?.document || {
          title: newDoc.title || selectedFile.name,
          category: newDoc.category,
          sensitivity: newDoc.sensitivity,
          fileType: newDoc.fileType
        };
      } else {
        // Fallback metadata entry
        if (!newDoc.title.trim()) {
          throw new Error('Please select a file from your computer or enter a document title.');
        }

        const res = await fetch(`${API_URL}/documents/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            ...newDoc,
            department: user.department
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Document registration failed.');
        }
        createdDoc = data.document;
      }

      // Successful upload
      setShowUploadModal(false);
      const indexedTitle = newDoc.title || selectedFile?.name || 'Document';
      setSelectedFile(null);
      setNewDoc({ title: '', category: 'Policy', fileType: 'PDF', sensitivity: 'Confidential' });
      if (fileInputRef.current) fileInputRef.current.value = null;

      // Immediately refresh indexed documents
      await fetchDocuments();

      // Dispatch cross-component event so all dashboards update dynamically
      window.dispatchEvent(new CustomEvent('document-indexed', { detail: createdDoc }));

      // Display success toast
      setUploadSuccessToast(`"${indexedTitle}" successfully ingested & vectorized into ${user.department}!`);
      setTimeout(() => setUploadSuccessToast(''), 5000);

    } catch (err) {
      console.error('Upload failed:', err);
      setUploadError(err.message || 'File upload failed. Please try again.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const confirmDeleteDocument = async () => {
    if (!deletingDoc) return;
    setIsDeleting(true);
    try {
      const docId = deletingDoc._id || deletingDoc.id;
      const res = await fetch(`${API_URL}/documents/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      let data = { error: 'Failed to remove document' };
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        data = { error: `Server error (${res.status}): ${text.substring(0, 180)}` };
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove document');
      }

      setDocuments(prev => prev.filter(d => (d._id || d.id) !== docId));
      if (viewingDoc && (viewingDoc._id || viewingDoc.id) === docId) {
        setViewingDoc(null);
      }
      const title = deletingDoc.title;
      setDeletingDoc(null);

      window.dispatchEvent(new CustomEvent('document-indexed'));
      setUploadSuccessToast(`"${title}" permanently removed from local vector store.`);
      setTimeout(() => setUploadSuccessToast(''), 5000);
    } catch (err) {
      console.error('Delete failed:', err);
      alert(err.message || 'Failed to delete document');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ padding: '32px', color: 'var(--text-main)', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Upload Success Toast Banner */}
      {uploadSuccessToast && (
        <div style={{
          padding: '12px 20px',
          borderRadius: '10px',
          background: 'rgba(34, 197, 94, 0.15)',
          border: '1px solid var(--accent-green)',
          color: '#86efac',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          fontSize: '0.88rem',
          boxShadow: '0 4px 16px rgba(34, 197, 94, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} color="var(--accent-green)" />
            <span>{uploadSuccessToast}</span>
          </div>
          <button
            onClick={() => setUploadSuccessToast('')}
            style={{ background: 'transparent', border: 'none', color: '#86efac', cursor: 'pointer', padding: '2px' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Indexed Department Docs</h3>
                <button
                  onClick={() => fetchDocuments()}
                  title="Refresh Document Index"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: fetchingDocs ? 'var(--accent-cyan)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px'
                  }}
                >
                  <RefreshCw size={14} className={fetchingDocs ? 'spin-animation' : ''} />
                </button>
              </div>
              <span className="badge badge-indigo">{documents.length} Files</span>
            </div>

            {documents.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No indexed documents found for {user.department}. Click "Upload & Vector Index Doc" to add your first document.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '550px', overflowY: 'auto' }}>
                {documents.map((doc, idx) => (
                  <div key={doc._id || idx} style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-color)',
                    transition: 'all 0.2s ease'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }} title={doc.title}>
                        {doc.title}
                      </span>
                      <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>{doc.fileType || 'DOC'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      <span>Category: <strong style={{ color: 'var(--accent-cyan)' }}>{doc.category || 'Policy'}</strong></span>
                      <span>Sensitivity: <strong style={{ color: '#fb7185' }}>{doc.sensitivity || 'Confidential'}</strong></span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                      <CheckCircle2 size={12} /> Vector Index Active ({doc.tokenCount || 1200} Tokens)
                    </div>

                    {/* File Card Actions: View Content & Remove File */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <button
                        type="button"
                        onClick={() => setViewingDoc(doc)}
                        style={{
                          background: 'rgba(0, 255, 242, 0.08)',
                          border: '1px solid rgba(0, 255, 242, 0.25)',
                          borderRadius: '6px',
                          color: 'var(--accent-cyan)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '4px 10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease'
                        }}
                        title="View extracted content and indexing details"
                      >
                        <Eye size={12} /> View File
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingDoc(doc)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          borderRadius: '6px',
                          color: '#f87171',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '4px 10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease'
                        }}
                        title="Remove file from vector store"
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Document Modal with Native Local File Manager Integration */}
      {showUploadModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(7,9,14,0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '32px', borderRadius: '16px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UploadCloud size={20} style={{ color: 'var(--accent-cyan)' }} />
                  Upload Document to Local Vector Store
                </h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Ingest files into the air-gapped vector store for <strong>{user.department}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setShowUploadModal(false); setUploadError(''); setSelectedFile(null); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {uploadError && (
              <div style={{
                padding: '10px 14px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                color: '#fca5a5',
                fontSize: '0.8rem',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertTriangle size={16} />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleDocumentUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Hidden Native File Input */}
              <input
                id="workspace-file-input"
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md,.json,.png,.jpg,.jpeg,.tiff"
                onChange={handleFileSelect}
                onClick={(e) => { e.target.value = null; }}
                style={{ display: 'none' }}
              />

              {/* Drag & Drop / File Browser Selector */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>
                  SELECT FILE FROM COMPUTER
                </label>

                {selectedFile ? (
                  <div style={{
                    padding: '14px 16px',
                    borderRadius: '10px',
                    background: 'rgba(0, 255, 242, 0.05)',
                    border: '1px solid var(--accent-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                      <File size={22} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {selectedFile.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {(selectedFile.size / 1024).toFixed(1)} KB &bull; {newDoc.fileType}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeSelectedFile}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Remove file"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${isDragging ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                      borderRadius: '10px',
                      padding: '24px 16px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: isDragging ? 'rgba(0, 255, 242, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <UploadCloud size={30} style={{ color: 'var(--accent-cyan)', margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                      Click to Browse File Manager or Drag & Drop Here
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Supports PDF, DOCX, XLSX, CSV, TXT, MD, JSON, Images (Max 50MB)
                    </div>
                  </div>
                )}
              </div>

              {/* Document Title */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>
                  DOCUMENT TITLE
                </label>
                <input 
                  type="text" 
                  value={newDoc.title} 
                  onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })} 
                  className="form-input" 
                  placeholder={selectedFile ? selectedFile.name : "e.g. Q4 Compliance & Risk Ledger"}
                  required 
                />
              </div>

              {/* Two Column Row: Category & Sensitivity */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>
                    CATEGORY
                  </label>
                  <select 
                    value={newDoc.category} 
                    onChange={(e) => setNewDoc({ ...newDoc, category: e.target.value })} 
                    className="form-select"
                  >
                    <option value="Policy">Policy</option>
                    <option value="Financial Ledger">Financial Ledger</option>
                    <option value="Compliance Policy">Compliance Policy</option>
                    <option value="Operational SOP">Operational SOP</option>
                    <option value="Architecture Blueprint">Architecture Blueprint</option>
                    <option value="Contract & NDA">Contract & NDA</option>
                    <option value="HR & People Protocol">HR & People Protocol</option>
                    <option value="Technical Telemetry">Technical Telemetry</option>
                    <option value="Executive Memo">Executive Memo</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>
                    SENSITIVITY LEVEL
                  </label>
                  <select 
                    value={newDoc.sensitivity} 
                    onChange={(e) => setNewDoc({ ...newDoc, sensitivity: e.target.value })} 
                    className="form-select"
                  >
                    <option value="Internal">Internal (Staff)</option>
                    <option value="Confidential">Confidential (Dept)</option>
                    <option value="Restricted">Restricted (Managers)</option>
                    <option value="Top Secret">Top Secret (Admin Vault)</option>
                  </select>
                </div>
              </div>

              {/* Privacy Safeguard Option */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer', marginTop: '2px' }}>
                <input
                  type="checkbox"
                  checked={autoRedactPII}
                  onChange={(e) => setAutoRedactPII(e.target.checked)}
                  style={{ accentColor: 'var(--accent-cyan)' }}
                />
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                  <EyeOff size={14} style={{ color: 'var(--accent-green)' }} /> Auto-Redact PII (SSN, Cards, Phone, Emails)
                </span>
              </label>

              {/* Form Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ flex: 1 }} 
                  disabled={uploadingDoc}
                  onClick={() => { setShowUploadModal(false); setUploadError(''); setSelectedFile(null); }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ flex: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  disabled={uploadingDoc}
                >
                  {uploadingDoc ? (
                    <>
                      <RefreshCw size={16} className="spin-animation" />
                      <span>Ingesting & Indexing...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      <span>Index Document</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Document Details Modal */}
      {viewingDoc && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(7,9,14,0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '640px', padding: '32px', borderRadius: '16px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={22} style={{ color: 'var(--accent-cyan)' }} />
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{viewingDoc.title}</h2>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Air-Gapped Vector Index Document &bull; {viewingDoc.department}
                </p>
              </div>
              <button
                onClick={() => setViewingDoc(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '18px' }}>
              <div className="glass-card" style={{ padding: '12px', fontSize: '0.75rem' }}>
                <div style={{ color: 'var(--text-muted)' }}>FILE FORMAT</div>
                <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '2px' }}>{viewingDoc.fileType || 'PDF'}</div>
              </div>
              <div className="glass-card" style={{ padding: '12px', fontSize: '0.75rem' }}>
                <div style={{ color: 'var(--text-muted)' }}>SECURITY LEVEL</div>
                <div style={{ fontWeight: 700, color: '#fb7185', marginTop: '2px' }}>{viewingDoc.sensitivity || 'Confidential'}</div>
              </div>
              <div className="glass-card" style={{ padding: '12px', fontSize: '0.75rem' }}>
                <div style={{ color: 'var(--text-muted)' }}>INDEXED TOKENS</div>
                <div style={{ fontWeight: 700, color: 'var(--accent-green)', marginTop: '2px' }}>{viewingDoc.tokenCount || 1200} Tokens</div>
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px' }}>
                DOCUMENT CONTENT & EXTRACTED SNIPPET:
              </div>
              <div style={{
                padding: '16px',
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                fontSize: '0.85rem',
                lineHeight: 1.6,
                color: 'var(--text-main)',
                maxHeight: '260px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace'
              }}>
                {viewingDoc.snippet || 'No text snippet available for this indexed entity.'}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              <span>Uploaded by: <strong style={{ color: 'var(--text-dim)' }}>{viewingDoc.uploadedBy || 'User'}</strong></span>
              <span>Indexed: <strong style={{ color: 'var(--text-dim)' }}>{new Date(viewingDoc.createdAt || Date.now()).toLocaleString()}</strong></span>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => { const target = viewingDoc; setViewingDoc(null); setDeletingDoc(target); }}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  color: '#f87171',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Trash2 size={15} /> Remove File & Vectors
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={() => setViewingDoc(null)}
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingDoc && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(7,9,14,0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '16px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '28px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', color: '#f87171' }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Confirm Document Removal</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '20px' }}>
              Are you sure you want to remove <strong style={{ color: 'var(--text-main)' }}>"{deletingDoc.title}"</strong>? This will permanently delete its 768-dim vector embeddings, semantic chunks, and knowledge store entry.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1 }}
                disabled={isDeleting}
                onClick={() => setDeletingDoc(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
                disabled={isDeleting}
                onClick={confirmDeleteDocument}
              >
                {isDeleting ? <RefreshCw size={15} className="spin-animation" /> : <Trash2 size={15} />}
                <span>{isDeleting ? 'Deleting...' : 'Confirm Remove'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
