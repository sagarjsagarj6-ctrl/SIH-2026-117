import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  ShieldCheck, EyeOff, RefreshCw
} from 'lucide-react';

export const DataQualityView = ({ refreshKey = 0 }) => {
  const { token, API_URL } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Live PII Sandbox
  const [sandboxText, setSandboxText] = useState('Employee John Doe (SSN: 123-45-6789, email: jdoe@enterprise.com) processed card 4532-1234-5678-9012 for INR 45,000.');
  const [sandboxResult, setSandboxResult] = useState(null);
  const [scanningSandbox, setScanningSandbox] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/quality/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error('Failed to fetch quality reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    handleScanSandbox();

    const handleDocIndexed = () => {
      fetchReports();
    };

    window.addEventListener('document-indexed', handleDocIndexed);
    return () => window.removeEventListener('document-indexed', handleDocIndexed);
  }, [refreshKey]);

  async function handleScanSandbox() {
    if (!sandboxText) return;
    setScanningSandbox(true);
    try {
      const res = await fetch(`${API_URL}/quality/scan-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text: sandboxText })
      });
      if (res.ok) {
        const data = await res.json();
        setSandboxResult(data);
      }
    } catch (err) {
      console.error('Sandbox scan error:', err);
    } finally {
      setScanningSandbox(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Overview Card */}
      <div className="glass-card" style={{ padding: '24px', borderRadius: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={22} style={{ color: 'var(--accent-green)' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Data Quality & PII Governance Matrix</h2>
          </div>
          <button
            onClick={fetchReports}
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
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Quality Audits
          </button>
        </div>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
          Real-time quality validation scores (Completeness, Consistency, Encoding Validity, and Accuracy), SHA-256 air-gap checksums, and zero-trust PII sanitization.
        </p>
      </div>

      {/* Interactive PII Sandbox Scanner */}
      <div className="glass-card" style={{ padding: '24px', borderRadius: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <EyeOff size={18} style={{ color: 'var(--accent-purple)' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Interactive PII Detection & Redaction Sandbox</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', display: 'block', marginBottom: '6px' }}>
              RAW ENTERPRISE TEXT INPUT:
            </label>
            <textarea
              value={sandboxText}
              onChange={(e) => setSandboxText(e.target.value)}
              rows={4}
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-main)',
                fontSize: '0.82rem',
                fontFamily: 'monospace'
              }}
            />
            <button
              onClick={handleScanSandbox}
              disabled={scanningSandbox}
              style={{
                marginTop: '10px',
                padding: '8px 16px',
                background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-indigo))',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              {scanningSandbox ? 'SCANNING...' : 'SCAN & REDACT PII'}
            </button>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', display: 'block', marginBottom: '6px' }}>
              PII DETECTION SUMMARY & SANITIZED PREVIEW:
            </label>
            {sandboxResult && (
              <div style={{
                padding: '12px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                minHeight: '110px'
              }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  {sandboxResult.piiDetected ? (
                    sandboxResult.matches?.map((m, i) => (
                      <span key={i} className="badge badge-rose" style={{ fontSize: '0.7rem' }}>
                        {m.type}: {m.count} Detected
                      </span>
                    ))
                  ) : (
                    <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
                      Clean: No PII Detected
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', fontFamily: 'monospace', lineHeight: 1.4 }}>
                  {sandboxResult.redactedPreview}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quality Audit Reports List */}
      <div className="glass-card" style={{ padding: '24px', borderRadius: '14px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px' }}>
          Document Quality Audit Log ({reports.length} Reports)
        </h3>

        {reports.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No document quality audit reports yet. Upload documents via the File Ingestor to generate automatic quality scorecards.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {reports.map((report) => (
              <div
                key={report._id || report.id}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{report.fileName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '12px', marginTop: '2px' }}>
                      <span>Dept: <strong>{report.department}</strong></span>
                      <span>Type: <strong>{report.fileType}</strong></span>
                      <span>SHA-256: <code className="mono" style={{ color: 'var(--accent-cyan)' }}>{report.checksum?.substring(0, 16)}...</code></span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: report.overallScore >= 85 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                        {report.overallScore}/100
                      </div>
                      <span className={`badge ${report.status === 'PASSED' ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: '0.65rem' }}>
                        {report.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Score Breakdown Bars */}
                {report.metrics && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginTop: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                        <span>Completeness</span>
                        <span>{report.metrics.completeness}%</span>
                      </div>
                      <div style={{ height: '4px', background: 'var(--bg-card)', borderRadius: '2px', overflow: 'hidden', marginTop: '2px' }}>
                        <div style={{ height: '100%', width: `${report.metrics.completeness}%`, background: 'var(--accent-green)' }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                        <span>Consistency</span>
                        <span>{report.metrics.consistency}%</span>
                      </div>
                      <div style={{ height: '4px', background: 'var(--bg-card)', borderRadius: '2px', overflow: 'hidden', marginTop: '2px' }}>
                        <div style={{ height: '100%', width: `${report.metrics.consistency}%`, background: 'var(--accent-cyan)' }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                        <span>Encoding Validity</span>
                        <span>{report.metrics.encodingValidity}%</span>
                      </div>
                      <div style={{ height: '4px', background: 'var(--bg-card)', borderRadius: '2px', overflow: 'hidden', marginTop: '2px' }}>
                        <div style={{ height: '100%', width: `${report.metrics.encodingValidity}%`, background: 'var(--accent-purple)' }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                        <span>Accuracy</span>
                        <span>{report.metrics.accuracyScore}%</span>
                      </div>
                      <div style={{ height: '4px', background: 'var(--bg-card)', borderRadius: '2px', overflow: 'hidden', marginTop: '2px' }}>
                        <div style={{ height: '100%', width: `${report.metrics.accuracyScore}%`, background: 'var(--accent-amber)' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
