import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Search, BookOpen, Layers, Cpu, ShieldCheck, 
  Sparkles, RefreshCw, FileText, ChevronRight, ExternalLink 
} from 'lucide-react';

export const KnowledgeExplorer = () => {
  const { user, token, API_URL } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('financial risk compliance guidelines');
  const [departmentFilter, setDepartmentFilter] = useState(user?.role === 'Admin' ? 'All' : user?.department);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);

  const [stats, setStats] = useState(null);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [docChunks, setDocChunks] = useState([]);
  const [loadingChunks, setLoadingChunks] = useState(false);

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
    handleSearch();
  }, []);

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
              <option value="Human Resources">HR</option>
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
    </div>
  );
};
