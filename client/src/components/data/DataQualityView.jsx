import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck, EyeOff, RefreshCw, FileCheck2, Scale, AlertTriangle
} from 'lucide-react';

const PRESETS = {
  mixed: {
    label: 'Mixed PII',
    framework: 'FULL',
    format: 'text',
    text: 'Employee John Doe (SSN: 123-45-6789, email: jdoe@enterprise.com, phone: +1 415-555-0199) processed card 4532-1234-5678-9012 CVV 123 at 221B Baker Street, London 94105 for INR 45,000.'
  },
  gdpr: {
    label: 'GDPR',
    framework: 'GDPR',
    format: 'text',
    text: 'Customer Jane Smith (email: jane.smith@contoso.org, phone: 202-555-0188) lives at 14 Market Street, Boston 02108 and requested data export.'
  },
  hipaa: {
    label: 'HIPAA',
    framework: 'HIPAA',
    text: 'Patient ID PAT-8821 MRN: 7744122. Patient Maria Alvarez diagnosis: ICD-10 E11.9. Contact maria.alvarez@clinic.org. SSN 987-65-4321.',
    format: 'text'
  },
  pci: {
    label: 'PCI-DSS',
    framework: 'PCI-DSS',
    format: 'text',
    text: 'Authorization PAN 4111 1111 1111 1111 CVV 987 for merchant SOVEREIGN-FIN. Expiry 09/28. Order 45000 INR.'
  },
  json: {
    label: 'JSON',
    framework: 'FULL',
    format: 'json',
    text: '{\n  "employee": "John Doe",\n  "email": "jdoe@enterprise.com",\n  "ssn": "123-45-6789",\n  "card": "4532-1234-5678-9012"\n}'
  },
  log: {
    label: 'Unstructured log',
    framework: 'FULL',
    format: 'log',
    text: '2026-09-12T08:10:11Z INFO billing user=jdoe@enterprise.com pan=4532-1234-5678-9012 phone=415-555-0199 action=charge'
  }
};

const COUNT_LABELS = {
  SSN: 'SSN',
  CREDIT_CARD: 'CREDIT_CARD',
  CVV: 'CVV',
  EMAIL: 'EMAIL',
  PHONE: 'PHONE',
  ADDRESS: 'ADDRESS',
  PERSON_NAME: 'NAME',
  PATIENT_ID: 'PATIENT_ID',
  MEDICAL_RECORD: 'MEDICAL_RECORD'
};

export const DataQualityView = ({ refreshKey = 0 }) => {
  const { token, API_URL, user } = useAuth();
  const [reports, setReports] = useState([]);
  const [complianceReports, setComplianceReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sandboxText, setSandboxText] = useState(PRESETS.mixed.text);
  const [framework, setFramework] = useState('FULL');
  const [format, setFormat] = useState('auto');
  const [sandboxResult, setSandboxResult] = useState(null);
  const [sandboxError, setSandboxError] = useState('');
  const [scanningSandbox, setScanningSandbox] = useState(false);
  const [auditBusy, setAuditBusy] = useState(false);
  const [complianceBusy, setComplianceBusy] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [qualityRes, complianceRes] = await Promise.all([
        fetch(`${API_URL}/quality/reports`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/quality/compliance-reports`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (qualityRes.ok) {
        const data = await qualityRes.json();
        setReports(data.reports || []);
      }
      if (complianceRes.ok) {
        const data = await complianceRes.json();
        setComplianceReports(data.reports || []);
      }
    } catch (err) {
      console.error('Failed to fetch quality reports:', err);
    } finally {
      setLoading(false);
    }
  };

  async function handleScanSandbox() {
    setScanningSandbox(true);
    setSandboxError('');
    try {
      const res = await fetch(`${API_URL}/quality/scan-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text: sandboxText, format, framework, persistAudit: true, fileName: 'pii-sandbox' })
      });
      const data = await res.json();
      if (!res.ok) {
        setSandboxResult(null);
        setSandboxError(data.error || 'PII scanning failed');
        return;
      }
      setSandboxResult(data);
    } catch (err) {
      setSandboxError(err.message || 'Sandbox scan error');
    } finally {
      setScanningSandbox(false);
    }
  }

  async function handleAuditDocument() {
    setAuditBusy(true);
    setSandboxError('');
    try {
      const res = await fetch(`${API_URL}/quality/audit-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fileName: 'financial_risk_guidelines.txt',
          fileType: 'TXT',
          department: user?.department || 'Finance',
          text: sandboxText || 'SOVEREIGN AI financial risk guidelines. No PII in this control sample.'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Audit failed');
      await fetchReports();
      if (data.redactedPreview) {
        setSandboxResult((prev) => ({
          ...(prev || {}),
          redactedPreview: data.redactedPreview,
          matches: data.pii?.matches || prev?.matches,
          counts: data.pii?.counts || prev?.counts,
          piiDetected: data.pii?.detected
        }));
      }
    } catch (err) {
      setSandboxError(err.message);
    } finally {
      setAuditBusy(false);
    }
  }

  async function handleComplianceScan(targetFramework = framework) {
    setComplianceBusy(true);
    setSandboxError('');
    try {
      const res = await fetch(`${API_URL}/quality/compliance-scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          text: sandboxText,
          framework: targetFramework,
          format,
          fileName: `${targetFramework.toLowerCase()}-simulation.txt`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Compliance scan failed');
      setSandboxResult(data.scan);
      await fetchReports();
    } catch (err) {
      setSandboxError(err.message);
    } finally {
      setComplianceBusy(false);
    }
  }

  useEffect(() => {
    fetchReports();
    handleScanSandbox();

    const handleDocIndexed = () => {
      fetchReports();
    };

    window.addEventListener('document-indexed', handleDocIndexed);
    return () => window.removeEventListener('document-indexed', handleDocIndexed);
  }, [refreshKey]);

  const detectedCounts = sandboxResult?.counts
    ? Object.entries(sandboxResult.counts).filter(([, count]) => count > 0)
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '100%', overflow: 'auto' }}>
      <div className="glass-card" style={{ padding: '12px 14px', borderRadius: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} style={{ color: 'var(--accent-green)' }} />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Data Quality & PII Governance Matrix</h2>
          </div>
          <button
            onClick={fetchReports}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-main)',
              fontSize: '0.68rem',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Quality Audits
          </button>
        </div>
        
      </div>

      <div className="glass-card" style={{ padding: '14px', borderRadius: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '9px' }}>
          <EyeOff size={16} style={{ color: 'var(--accent-purple)' }} />
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0 }}>Interactive PII Detection & Redaction Sandbox</h3>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setSandboxText(preset.text);
                setFramework(preset.framework);
                setFormat(preset.format);
              }}
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                border: '1px solid var(--border-color)',
                background: 'var(--bg-surface)',
                color: 'var(--text-muted)',
                fontSize: '0.66rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            Framework{' '}
            <select value={framework} onChange={(e) => setFramework(e.target.value)} style={{ marginLeft: 6, padding: '4px 8px', borderRadius: 6, background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
              <option value="FULL">FULL</option>
              <option value="GDPR">GDPR</option>
              <option value="HIPAA">HIPAA</option>
              <option value="PCI-DSS">PCI-DSS</option>
            </select>
          </label>
          <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            Format{' '}
            <select value={format} onChange={(e) => setFormat(e.target.value)} style={{ marginLeft: 6, padding: '4px 8px', borderRadius: 6, background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
              <option value="auto">auto</option>
              <option value="text">text</option>
              <option value="json">json</option>
              <option value="log">log</option>
            </select>
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-dim)', display: 'block', marginBottom: '3px' }}>
              RAW ENTERPRISE TEXT INPUT:
            </label>
            <textarea
              value={sandboxText}
              onChange={(e) => setSandboxText(e.target.value)}
              rows={4}
              style={{
                width: '100%',
                padding: '8px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-main)',
                fontSize: '0.74rem',
                fontFamily: 'monospace'
              }}
            />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 7 }}>
              <button
                onClick={handleScanSandbox}
                disabled={scanningSandbox}
                style={{
                  padding: '6px 10px',
                  background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-indigo))',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  cursor: 'pointer'
                }}
              >
                {scanningSandbox ? 'SCANNING...' : 'SCAN & REDACT PII'}
              </button>
              <button
                onClick={handleAuditDocument}
                disabled={auditBusy}
                style={{ padding: '6px 9px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.68rem', cursor: 'pointer' }}
              >
                <FileCheck2 size={13} style={{ display: 'inline', marginRight: 6 }} />
                {auditBusy ? 'AUDITING...' : 'AUDIT AS financial_risk_guidelines.txt'}
              </button>
              <button
                onClick={() => handleComplianceScan(framework === 'FULL' ? 'GDPR' : framework)}
                disabled={complianceBusy}
                style={{ padding: '6px 9px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.68rem', cursor: 'pointer' }}
              >
                <Scale size={13} style={{ display: 'inline', marginRight: 6 }} />
                {complianceBusy ? 'SIMULATING...' : 'RUN COMPLIANCE SIM'}
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-dim)', display: 'block', marginBottom: '3px' }}>
              PII DETECTION SUMMARY & SANITIZED PREVIEW:
            </label>
            {sandboxError && (
              <div style={{ marginBottom: 8, padding: 10, borderRadius: 8, background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '0.78rem' }}>
                <AlertTriangle size={13} style={{ display: 'inline', marginRight: 6 }} />{sandboxError}
              </div>
            )}
            {sandboxResult && (
              <div style={{
                padding: '9px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                minHeight: '78px',
                maxHeight: '128px',
                overflowY: 'auto'
              }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  {sandboxResult.piiDetected ? (
                    (detectedCounts.length ? detectedCounts : (sandboxResult.matches || []).map((m) => [m.type, m.count])).map(([type, count]) => (
                  <span key={type} className="badge badge-rose" style={{ fontSize: '0.62rem' }}>
                        {COUNT_LABELS[type] || type}: {count} DETECTED
                      </span>
                    ))
                  ) : (
                    <span className="badge badge-green" style={{ fontSize: '0.62rem' }}>
                      Clean: No PII Detected
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Format: <strong>{sandboxResult.format || format}</strong> · Framework: <strong>{sandboxResult.framework || framework}</strong>
                  {sandboxResult.parseWarning ? ` · ${sandboxResult.parseWarning}` : ''}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', fontFamily: 'monospace', lineHeight: 1.3, whiteSpace: 'pre-wrap' }}>
                  {sandboxResult.redactedPreview}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {complianceReports.length > 0 && (
        <div className="glass-card" style={{ padding: '12px 14px', borderRadius: '10px' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '9px' }}>
            Compliance Simulation Reports ({complianceReports.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {complianceReports.slice(0, 3).map((report) => (
              <div key={report._id || report.createdAt} style={{ padding: '8px 10px', borderRadius: 7, background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <strong style={{ fontSize: '0.75rem' }}>{report.framework}</strong><span style={{ fontSize: '0.72rem' }}> · {report.fileName} · {report.format}</span>
                    <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {(report.notes || []).join(' · ')}
                    </div>
                  </div>
                  <span className={`badge ${report.compliant ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: '0.6rem' }}>
                    {report.compliant ? 'COMPLIANT' : 'RESIDUAL RISK'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass-card" style={{ padding: '12px 14px', borderRadius: '10px' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '9px' }}>
          Document Quality Audit Log ({reports.length} Reports)
        </h3>

        {reports.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            No document quality audit reports yet. Upload documents via the File Ingestor or run an on-page audit.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', maxHeight: '210px', overflowY: 'auto', paddingRight: '2px' }}>
            {reports.slice(0, 3).map((report) => (
              <div
                key={report._id || report.id}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '7px',
                  padding: '9px 10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: '7px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.78rem' }}>{report.fileName}</div>
                    <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                      <span>Dept: <strong>{report.department}</strong></span>
                      <span>Type: <strong>{report.fileType}</strong></span>
                      <span>SHA-256: <code className="mono" style={{ color: 'var(--accent-cyan)' }}>{report.checksum?.substring(0, 16)}...</code></span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 900, color: report.overallScore >= 85 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                      {report.overallScore}/100
                    </div>
                    <span className={`badge ${report.status === 'PASSED' ? 'badge-green' : report.status === 'FAILED' ? 'badge-rose' : 'badge-amber'}`} style={{ fontSize: '0.58rem' }}>
                      {report.status}
                    </span>
                  </div>
                </div>

                {report.metrics && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '7px', marginTop: '7px' }}>
                    {[
                      ['Completeness', report.metrics.completeness, 'var(--accent-green)'],
                      ['Consistency', report.metrics.consistency, 'var(--accent-cyan)'],
                      ['Encoding Validity', report.metrics.encodingValidity, 'var(--accent-purple)'],
                      ['Accuracy', report.metrics.accuracyScore, 'var(--accent-amber)']
                    ].map(([label, value, color]) => (
                      <div key={label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--text-dim)' }}>
                          <span>{label}</span>
                          <span>{value}%</span>
                        </div>
                        <div style={{ height: '4px', background: 'var(--bg-card)', borderRadius: '2px', overflow: 'hidden', marginTop: '2px' }}>
                          <div style={{ height: '100%', width: `${value}%`, background: color }} />
                        </div>
                      </div>
                    ))}
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
