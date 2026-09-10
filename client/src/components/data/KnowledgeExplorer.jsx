import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Search, BookOpen, Layers, Cpu, ShieldCheck, 
  Sparkles, RefreshCw, FileText, ChevronRight, ExternalLink,
  Eye, Trash2, AlertTriangle, X, CheckCircle2
} from 'lucide-react';

export const KnowledgeExplorer = ({ refreshKey = 0 }) => {
  const { user, token, API_URL } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('financial risk compliance guidelines');
  const [departmentFilter, setDepartmentFilter] = useState(user?.role === 'Admin' ? 'All' : user?.department);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);

  const [stats, setStats] = useState(null);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [docChunks, setDocChunks] = useState([]);
  const [loadingChunks, setLoadingChunks] = useState(false);

  // Document Repository & Management State
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docFilterText, setDocFilterText] = useState('');
  const [viewingDoc, setViewingDoc] = useState(null);
  const [deletingDoc, setDeletingDoc] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');


  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/knowledge/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoadingDocs(true);
      const res = await fetch(`${API_URL}/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const confirmDeleteDocument = async () => {
    if (!deletingDoc) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      const docId = deletingDoc._id || deletingDoc.id;
      const res = await fetch(`${API_URL}/documents/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      // Safe JSON parse — server might return HTML on unexpected errors
      let data = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        data = { error: `Server error (${res.status}): ${text.substring(0, 120)}` };
      }

      if (res.ok) {
        setDocuments(prev => prev.filter(d => String(d._id || d.id) !== String(docId)));
        if (viewingDoc && String(viewingDoc._id || viewingDoc.id) === String(docId)) {
          setViewingDoc(null);
        }
        setDeletingDoc(null);
        fetchStats();
        handleSearch();
        window.dispatchEvent(new CustomEvent('document-indexed'));
      } else {
        setDeleteError(data.error || 'Failed to remove document');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setDeleteError(err.message || 'Network error while deleting document');
    } finally {
      setIsDeleting(false);
    }
  };


  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await fetch(`${API_URL}/knowledge/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          query: searchQuery,
          department: departmentFilter === 'All' ? null : departmentFilter,
          topK: 5
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleInspectChunks = async (docId) => {
    setSelectedDocId(docId);
    setLoadingChunks(true);
    try {
      const res = await fetch(`${API_URL}/knowledge/chunks/${docId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDocChunks(data.chunks || []);
      }
    } catch (err) {
      console.error('Chunk inspect error:', err);
    } finally {
      setLoadingChunks(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchDocuments();
    handleSearch();

    const handleDocIndexed = () => {
      fetchStats();
      fetchDocuments();
      handleSearch();
    };

    window.addEventListener('document-indexed', handleDocIndexed);
    return () => window.removeEventListener('document-indexed', handleDocIndexed);
  }, [refreshKey]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Vector Store Health & Stats Card */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div className="glass-card" style={{ padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)' }}>TOTAL VECTORS INDEXED</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent-cyan)' }}>{stats.totalVectors}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Local Cosine ANN Index</div>
          </div>

          <div className="glass-card" style={{ padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)' }}>EMBEDDING DIMENSIONS</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent-purple)' }}>{stats.dimension}-dim</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>NVIDIA NeMo / Enterprise BERT</div>
          </div>

          <div className="glass-card" style={{ padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)' }}>TOTAL INDEXED TOKENS</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent-green)' }}>{stats.totalIndexedTokens?.toLocaleString()}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Semantic Knowledge Corpus</div>
          </div>

          <div className="glass-card" style={{ padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)' }}>SECURITY ACCESS ENFORCEMENT</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-amber)' }}>ABAC / RBAC LIVE</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Isolated Department Scopes</div>
          </div>
        </div>
      )}

      {/* Hybrid Search Interface */}
      <div className="glass-card" style={{ padding: '24px', borderRadius: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={22} style={{ color: 'var(--accent-cyan)' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Hybrid Vector & Keyword Knowledge Search</h2>
          </div>
          <span className="badge badge-purple" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} /> 768-DIM VECTOR COSINE + BM25
          </span>
        </div>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter search query (e.g. quarterly ledger variances, security charter, employee compensation)..."
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-main)',
                fontSize: '0.88rem'
              }}
            />
          </div>

          {user?.role === 'Admin' && (
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              style={{
                padding: '12px 16px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-main)',
                fontSize: '0.85rem'
              }}
            >
              <option value="All">All Departments</option>
              <option value="Finance & Accounting">Finance</option>
              <option value="R&D / Engineering">R&D</option>
              <option value="Legal & Compliance">Legal</option>
            </select>
          )}

          <button
            type="submit"
            disabled={searching}
            className="btn-glow"
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))',
              border: 'none',
              borderRadius: '8px',
              color: '#000',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {searching ? 'SEARCHING...' : 'RUN HYBRID SEARCH'}
          </button>
        </form>

        {/* Search Results Display */}
        {searchResults && (
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
              <span>MATCHED KNOWLEDGE CHUNKS ({searchResults.resultsCount} Results)</span>
              <span>Scope: {searchResults.userContext?.department} | Role: {searchResults.userContext?.role}</span>
            </div>

            {searchResults.results?.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No relevant documents matched your query within your department's ABAC security scope.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {searchResults.results.map((result, idx) => (
                  <div
                    key={result.chunkId || idx}
                    style={{
                      padding: '16px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div>
                        <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                          {result.documentTitle}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '10px' }}>
                          — {result.sectionTitle}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                          Vector Cosine: {(result.scores?.vectorSimilarity * 100).toFixed(1)}%
                        </span>
                        <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
                          Hybrid Score: {(result.hybridScore * 100).toFixed(1)}%
                        </span>
                        <button
                          onClick={() => handleInspectChunks(result.docId)}
                          style={{
                            padding: '4px 10px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            color: 'var(--accent-cyan)',
                            fontSize: '0.72rem',
                            cursor: 'pointer'
                          }}
                        >
                          Inspect Chunks
                        </button>
                      </div>
                    </div>

                    <div style={{
                      fontSize: '0.82rem',
                      color: 'var(--text-main)',
                      lineHeight: 1.5,
                      background: 'var(--bg-card)',
                      padding: '12px',
                      borderRadius: '8px',
                      borderLeft: '3px solid var(--accent-cyan)'
                    }}>
                      {result.text}
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      <span>Dept: <strong style={{ color: 'var(--text-dim)' }}>{result.metadata?.department}</strong></span>
                      <span>Sensitivity: <strong style={{ color: 'var(--accent-amber)' }}>{result.metadata?.sensitivity}</strong></span>
                      <span>Tokens: <strong style={{ color: 'var(--text-dim)' }}>{result.tokenCount}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Semantic Chunk Inspector Modal / Panel */}
      {selectedDocId && (
        <div className="glass-card" style={{ padding: '24px', borderRadius: '14px', border: '1px solid var(--accent-cyan)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} style={{ color: 'var(--accent-cyan)' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                Document Semantic Chunks Inspector: {selectedDocId} ({docChunks.length} Chunks)
              </h3>
            </div>
            <button
              onClick={() => setSelectedDocId(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.82rem'
              }}
            >
              Close Inspector ✕
            </button>
          </div>

          {loadingChunks ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>Loading document chunks...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
              {docChunks.map((chunk, i) => (
                <div
                  key={chunk.chunkId || i}
                  style={{
                    padding: '12px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '0.78rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: '6px' }}>
                    <span style={{ color: 'var(--accent-cyan)' }}>Chunk #{chunk.chunkIndex} / {chunk.totalChunks}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{chunk.tokenCount} tokens</span>
                  </div>
                  <div style={{ color: 'var(--text-main)', maxHeight: '100px', overflowY: 'auto', lineHeight: 1.4 }}>
                    {chunk.text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Indexed Documents Repository & Management */}
      <div className="glass-card" style={{ padding: '24px', borderRadius: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={18} style={{ color: 'var(--accent-cyan)' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Indexed Document Repository</h3>
              <span className="badge badge-indigo">{documents.length} Files</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Manage local files, preview extracted snippets, or remove obsolete vectors from the air-gapped index.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              value={docFilterText}
              onChange={(e) => setDocFilterText(e.target.value)}
              placeholder="Filter indexed files..."
              className="form-input"
              style={{ padding: '6px 12px', fontSize: '0.8rem', width: '200px' }}
            />
            <button
              onClick={() => fetchDocuments()}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '8px',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
              title="Refresh document repository"
            >
              <RefreshCw size={14} className={loadingDocs ? 'spin-animation' : ''} />
            </button>
          </div>
        </div>

        {loadingDocs ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>Refreshing repository files...</div>
        ) : documents.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No documents found in knowledge base. Ingest documents via the "File Ingestion & Parsers" tab.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
            {documents
              .filter(d => !docFilterText || d.title?.toLowerCase().includes(docFilterText.toLowerCase()) || d.category?.toLowerCase().includes(docFilterText.toLowerCase()))
              .map((doc, idx) => (
                <div
                  key={doc._id || idx}
                  style={{
                    padding: '16px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-main)', wordBreak: 'break-word' }}>
                        {doc.title}
                      </span>
                      <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>{doc.fileType || 'PDF'}</span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '0.72rem', marginBottom: '8px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Dept: <strong style={{ color: 'var(--text-dim)' }}>{doc.department}</strong></span>
                      <span style={{ color: 'var(--text-muted)' }}>&bull; Category: <strong style={{ color: 'var(--accent-cyan)' }}>{doc.category}</strong></span>
                      <span style={{ color: 'var(--text-muted)' }}>&bull; Tokens: <strong style={{ color: 'var(--accent-green)' }}>{doc.tokenCount || 1200}</strong></span>
                    </div>

                    <div style={{
                      fontSize: '0.76rem',
                      color: 'var(--text-muted)',
                      background: 'rgba(0,0,0,0.25)',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      lineHeight: 1.4,
                      maxHeight: '52px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {doc.snippet || 'Vector indexed document content.'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setViewingDoc(doc)}
                        style={{
                          padding: '5px 10px',
                          background: 'rgba(0, 255, 242, 0.08)',
                          border: '1px solid rgba(0, 255, 242, 0.25)',
                          borderRadius: '6px',
                          color: 'var(--accent-cyan)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Eye size={12} /> View
                      </button>
                      <button
                        onClick={() => handleInspectChunks(doc._id)}
                        style={{
                          padding: '5px 10px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--text-dim)',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Layers size={12} /> Chunks
                      </button>
                    </div>

                    <button
                      onClick={() => setDeletingDoc(doc)}
                      style={{
                        padding: '5px 10px',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: '6px',
                        color: '#f87171',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Permanently remove document & vectors"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

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
                onClick={() => { setDeletingDoc(null); setDeleteError(''); }}

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

            {/* Inline error display instead of browser alert */}
            {deleteError && (
              <div style={{
                marginTop: '12px',
                padding: '10px 14px',
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.4)',
                borderRadius: '8px',
                color: '#f87171',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertTriangle size={14} />
                {deleteError}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
