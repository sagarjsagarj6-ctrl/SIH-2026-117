import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Activity, CheckCircle2, AlertTriangle, Clock, RefreshCw, 
  Layers, Database, FileText, ChevronDown, ChevronUp, ShieldCheck, Trash2 
} from 'lucide-react';

export const IngestionDashboard = ({ refreshKey = 0 }) => {
  const { token, API_URL } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedJob, setExpandedJob] = useState(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/ingest/jobs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error('Failed to fetch ingestion jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearJobs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/ingest/jobs`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setJobs([]);
      }
    } catch (err) {
      console.error('Failed to clear ingestion jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();

    const handleDocIndexed = () => {
      fetchJobs();
    };

    window.addEventListener('document-indexed', handleDocIndexed);
    const interval = setInterval(fetchJobs, 12000); // 12s auto-refresh
    return () => {
      window.removeEventListener('document-indexed', handleDocIndexed);
      clearInterval(interval);
    };
  }, [refreshKey]);

  const totalProcessed = jobs.length;
  const successfulCount = jobs.filter(j => j.status === 'COMPLETED').length;
  const totalChunks = jobs.reduce((acc, j) => acc + (j.chunksGenerated || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="glass-card" style={{ padding: '18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
            TOTAL INGESTION JOBS
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent-cyan)' }}>
            {totalProcessed}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Air-gapped batch pipeline runs
          </div>
        </div>

        <div className="glass-card" style={{ padding: '18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
            PIPELINE SUCCESS RATE
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent-green)' }}>
            {totalProcessed > 0 ? `${Math.round((successfulCount / totalProcessed) * 100)}%` : '100%'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Zero data leakages recorded
          </div>
        </div>

        <div className="glass-card" style={{ padding: '18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
            VECTOR CHUNKS GENERATED
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent-purple)' }}>
            {totalChunks}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Indexed across 768 dimensions
          </div>
        </div>

        <div className="glass-card" style={{ padding: '18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
            STORAGE DISPATCH MODE
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
            LOCAL / AIR-GAP
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Isolated Private Subnet
          </div>
        </div>
      </div>

      {/* Real-Time Job Stream */}
      <div className="glass-card" style={{ padding: '24px', borderRadius: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} style={{ color: 'var(--accent-cyan)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Real-Time Ingestion Pipeline Monitor</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {jobs.length > 0 && (
              <button
                onClick={clearJobs}
                title="Clear job stream history"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '8px',
                  color: '#f87171',
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={14} /> Clear Stream
              </button>
            )}
            <button
              onClick={fetchJobs}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-main)',
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Stream
            </button>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No recent ingestion jobs found. Upload documents via the File Ingestor tab to view real-time pipeline execution.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {jobs.map((job) => {
              const isExpanded = expandedJob === job.jobId;
              const isCompleted = job.status === 'COMPLETED';

              return (
                <div
                  key={job.jobId}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '16px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div
                    onClick={() => setExpandedJob(isExpanded ? null : job.jobId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {isCompleted ? (
                        <CheckCircle2 size={18} style={{ color: 'var(--accent-green)' }} />
                      ) : (
                        <AlertTriangle size={18} style={{ color: 'var(--accent-rose)' }} />
                      )}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                          {job.document?.title || job.jobId}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '12px', marginTop: '2px' }}>
                          <span>Dept: <strong style={{ color: 'var(--text-main)' }}>{job.document?.department || 'All'}</strong></span>
                          <span>Sensitivity: <strong style={{ color: 'var(--accent-cyan)' }}>{job.document?.sensitivity || 'Confidential'}</strong></span>
                          <span>Chunks: <strong style={{ color: 'var(--accent-purple)' }}>{job.chunksGenerated || 0}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className={`badge ${isCompleted ? 'badge-green' : 'badge-rose'}`} style={{ fontSize: '0.7rem' }}>
                        {job.status}
                      </span>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {/* Stage-by-Stage Detailed Breakdown */}
                  {isExpanded && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '10px' }}>
                        PIPELINE EXECUTION STAGES:
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                        {(job.stages || []).map((stage, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '10px',
                              background: 'var(--bg-card)',
                              borderRadius: '8px',
                              border: '1px solid var(--border-color)',
                              fontSize: '0.75rem'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontWeight: 700 }}>{stage.stage}</span>
                              <span style={{ color: stage.status === 'SUCCESS' ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                                {stage.status}
                              </span>
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', wordBreak: 'break-word' }}>
                              {stage.details}
                            </div>
                          </div>
                        ))}
                      </div>

                      {job.qualityReport && (
                        <div style={{
                          marginTop: '12px',
                          padding: '10px 14px',
                          background: 'rgba(0, 255, 242, 0.05)',
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.78rem'
                        }}>
                          <span>Quality Score: <strong>{job.qualityReport.overallScore}/100</strong> ({job.qualityReport.status})</span>
                          <span>SHA-256: <code className="mono" style={{ color: 'var(--accent-cyan)' }}>{job.qualityReport.checksum?.substring(0, 16)}...</code></span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
