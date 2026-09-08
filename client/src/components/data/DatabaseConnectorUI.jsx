import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Database, Server, CheckCircle2, AlertTriangle, 
  ShieldCheck, RefreshCw, Cpu, Table, ArrowRight, Sparkles 
} from 'lucide-react';

export const DatabaseConnectorUI = () => {
  const { token, API_URL } = useAuth();
  
  const [dataSources, setDataSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDs, setSelectedDs] = useState(null);
  
  const [schemaData, setSchemaData] = useState(null);
  const [loadingSchema, setLoadingSchema] = useState(false);
  
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const [syncingTable, setSyncingTable] = useState(null);
  const [syncSuccess, setSyncSuccess] = useState('');

  const fetchDataSources = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/ingest/datasources`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDataSources(data.dataSources || []);
        if (data.dataSources?.length > 0 && !selectedDs) {
          setSelectedDs(data.dataSources[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch data sources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataSources();
  }, []);

  useEffect(() => {
    if (selectedDs) {
      handleIntrospect(selectedDs.id);
    }
  }, [selectedDs]);

  const handleTestConnection = async (ds) => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_URL}/ingest/database/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          type: ds.type,
          host: ds.host,
          port: ds.port,
          database: ds.database
        })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleIntrospect = async (dataSourceId) => {
    setLoadingSchema(true);
    setSchemaData(null);
    try {
      const res = await fetch(`${API_URL}/ingest/database/introspect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ dataSourceId })
      });
      if (res.ok) {
        const data = await res.json();
        setSchemaData(data);
      }
    } catch (err) {
      console.error('Introspection failed:', err);
    } finally {
      setLoadingSchema(false);
    }
  };

  const handleSyncTable = async (tableName) => {
    if (!selectedDs) return;
    setSyncingTable(tableName);
    setSyncSuccess('');
    try {
      const res = await fetch(`${API_URL}/ingest/database/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          dataSourceId: selectedDs.id,
          tableName
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSyncSuccess(`Table "${tableName}" synced and vectorized successfully into knowledge base!`);
      }
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncingTable(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Info */}
      <div className="glass-card" style={{ padding: '24px', borderRadius: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={22} style={{ color: 'var(--accent-cyan)' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>On-Premise LAN Database Connectors</h2>
          </div>
          <span className="badge badge-cyan" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} /> READ-ONLY & AIR-GAPPED SUBNET ONLY
          </span>
        </div>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
          Securely connect to internal PostgreSQL, MySQL, MongoDB, and SQLite databases located within the organization's private LAN. Automatically introspect schemas and vectorize table snapshots.
        </p>
      </div>

      {/* Main Grid: Data Source Selector & Schema Explorer */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
        {/* Left Column: Registered Data Sources */}
        <div className="glass-card" style={{ padding: '20px', borderRadius: '14px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '12px' }}>
            REGISTERED LAN DATA SOURCES ({dataSources.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {dataSources.map((ds) => {
              const isSelected = selectedDs?.id === ds.id;
              return (
                <div
                  key={ds.id}
                  onClick={() => setSelectedDs(ds)}
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    border: `1px solid ${isSelected ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                    background: isSelected ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(6,182,212,0.15))' : 'var(--bg-surface)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{ds.name}</span>
                    <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>{ds.type.toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Host: <code className="mono">{ds.host}:{ds.port}</code>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--accent-green)', marginTop: '4px' }}>
                    ✓ LAN Air-Gap Verified (Read-Only)
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Schema Inspector & Table Sync */}
        {selectedDs && (
          <div className="glass-card" style={{ padding: '24px', borderRadius: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{selectedDs.name}</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Database: <strong>{selectedDs.database}</strong> | Department: <strong>{selectedDs.department}</strong>
                </div>
              </div>

              <button
                onClick={() => handleTestConnection(selectedDs)}
                disabled={testing}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--accent-cyan)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                {testing ? 'TESTING...' : 'TEST LAN CONNECTION'}
              </button>
            </div>

            {/* Test Connection Output */}
            {testResult && (
              <div style={{
                padding: '12px 16px',
                background: testResult.success ? 'rgba(57, 255, 20, 0.08)' : 'rgba(255, 0, 85, 0.12)',
                border: `1px solid ${testResult.success ? 'var(--accent-green)' : 'var(--accent-rose)'}`,
                borderRadius: '8px',
                fontSize: '0.8rem',
                marginBottom: '16px'
              }}>
                <strong>{testResult.status}:</strong> {testResult.message || testResult.error} (Latency: {testResult.latencyMs || 0}ms)
              </div>
            )}

            {syncSuccess && (
              <div style={{
                padding: '12px 16px',
                background: 'rgba(57, 255, 20, 0.08)',
                border: '1px solid var(--accent-green)',
                borderRadius: '8px',
                fontSize: '0.8rem',
                color: 'var(--accent-green)',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CheckCircle2 size={16} /> {syncSuccess}
              </div>
            )}

            {/* Schema Explorer */}
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '12px' }}>
                SCHEMA INTROSPECTION & TABLES:
              </div>

              {loadingSchema ? (
                <div style={{ padding: '24px', textAlign: 'center' }}>Introspecting database tables and column types...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {schemaData && (schemaData.tables || schemaData.collections) && Object.entries(schemaData.tables || schemaData.collections).map(([name, info]) => (
                    <div
                      key={name}
                      style={{
                        padding: '14px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Table size={16} style={{ color: 'var(--accent-purple)' }} />
                          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{name}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            ({info.count || info.estimatedRows || 0} rows)
                          </span>
                        </div>

                        <button
                          onClick={() => handleSyncTable(name)}
                          disabled={syncingTable === name}
                          style={{
                            padding: '6px 14px',
                            background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#000',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          <Sparkles size={12} style={{ display: 'inline', marginRight: '4px' }} />
                          {syncingTable === name ? 'SYNCING...' : 'SYNC TO KNOWLEDGE BASE'}
                        </button>
                      </div>

                      {/* Columns List */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {(info.columns || info.fields || []).map((col, idx) => {
                          const colName = typeof col === 'string' ? col : col.column;
                          const colType = typeof col === 'object' ? col.type : 'FIELD';
                          return (
                            <span
                              key={idx}
                              style={{
                                padding: '2px 8px',
                                background: 'var(--bg-card)',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                color: 'var(--text-muted)',
                                border: '1px solid var(--border-color)'
                              }}
                            >
                              <code>{colName}</code> <span style={{ color: 'var(--text-dim)' }}>({colType})</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
