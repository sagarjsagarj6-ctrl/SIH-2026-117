import { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  UploadCloud, FileText, CheckCircle2, AlertCircle,
  Sparkles, X, EyeOff
} from 'lucide-react';

export const FileUploader = ({ onUploadSuccess }) => {
  const { user, token, API_URL } = useAuth();
  const fileInputRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Form options
  const [department, setDepartment] = useState(user?.department || 'Finance & Accounting');
  const [sensitivity, setSensitivity] = useState('Confidential');
  const [category, setCategory] = useState('Financial Ledger');
  const [autoRedactPII, setAutoRedactPII] = useState(true);

  const acceptedExtensions = ['.pdf', '.docx', '.xlsx', '.csv', '.txt', '.md', '.json', '.png', '.jpg', '.jpeg', '.tiff'];

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
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles) => {
    setErrorMessage('');
    const valid = newFiles.filter(file => {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      return acceptedExtensions.includes(ext) && file.size <= 50 * 1024 * 1024;
    });

    if (valid.length < newFiles.length) {
      setErrorMessage('Some files were skipped (unsupported format or >50MB).');
    }

    setFiles(prev => [...prev, ...valid].slice(0, 10)); // max 10
  };

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) return;

    setUploading(true);
    setProgress(15);
    setErrorMessage('');
    setUploadResults(null);

    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    formData.append('department', department);
    formData.append('sensitivity', sensitivity);
    formData.append('category', category);
    formData.append('autoRedactPII', autoRedactPII.toString());

    try {
      setProgress(45);
      const res = await fetch(`${API_URL}/ingest/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      setProgress(85);
      const data = await res.json();

      if (res.ok) {
        setProgress(100);
        setUploadResults(data);
        setFiles([]);
        window.dispatchEvent(new CustomEvent('document-indexed', { detail: data }));
        if (onUploadSuccess) onUploadSuccess(data);
      } else {
        setErrorMessage(data.error || 'Upload failed');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Network error during file upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="glass-card" style={{ padding: '14px 16px', borderRadius: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UploadCloud size={18} style={{ color: 'var(--accent-cyan)' }} />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>File Ingestor</h2>
          </div>
        
        </div>
       
      </div>

      <form onSubmit={handleSubmit}>
        {/* Configuration Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px', marginBottom: '10px' }}>
          <div>
            <label style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '3px', display: 'block' }}>
              DEPARTMENT SCOPE
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              disabled={user?.role === 'Employee'}
              style={{
                width: '100%',
                padding: '6px 9px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-main)',
                fontSize: '0.74rem'
              }}
            >
              <option value="Finance & Accounting">Finance & Accounting</option>
              <option value="R&D / Engineering">R&D / Engineering</option>
              <option value="Legal & Compliance">Legal & Compliance</option>
              <option value="Operations & Logistics">Operations & Logistics</option>
              <option value="Executive & Strategy">Executive & Strategy</option>
              <option value="All">All Departments (Global)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '3px', display: 'block' }}>
              SECURITY CLASSIFICATION
            </label>
            <select
              value={sensitivity}
              onChange={(e) => setSensitivity(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 9px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-main)',
                fontSize: '0.74rem'
              }}
            >
              <option value="Public">Public (Unrestricted)</option>
              <option value="Internal">Internal (All Staff)</option>
              <option value="Confidential">Confidential (Dept Only)</option>
              <option value="Restricted">Restricted (Managers + Leads)</option>
              <option value="Top Secret">Top Secret (Air-Gap Admin Vault)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '3px', display: 'block' }}>
              CATEGORY TAG
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 9px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-main)',
                fontSize: '0.74rem'
              }}
            >
              <option value="Financial Ledger">Financial Ledger</option>
              <option value="Operational SOP">Operational SOP</option>
              <option value="Compliance Policy">Compliance Policy</option>
              <option value="Architecture Blueprint">Architecture Blueprint</option>
              <option value="Contract & NDA">Contract & NDA</option>
              <option value="HR & People Protocol">HR & People Protocol</option>
              <option value="Executive Memo">Executive Memo</option>
              <option value="Technical Telemetry">Technical Telemetry</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <label style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '4px' }}>
              PRIVACY SAFEGUARD
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoRedactPII}
                onChange={(e) => setAutoRedactPII(e.target.checked)}
                style={{ accentColor: 'var(--accent-cyan)' }}
              />
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <EyeOff size={14} style={{ color: 'var(--accent-green)' }} /> Auto-Redact PII (SSN, Cards, Emails)
              </span>
            </label>
          </div>
        </div>

        {/* Drag & Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
            borderRadius: '9px',
            padding: '20px 12px',
            textAlign: 'center',
            cursor: 'pointer',
            background: isDragging ? 'rgba(0, 255, 242, 0.05)' : 'rgba(255, 255, 255, 0.01)',
            transition: 'all 0.2s ease',
            marginBottom: '10px'
          }}
        >
          <input
            id="file-upload-input"
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md,.json,.png,.jpg,.jpeg,.tiff"
            onChange={handleFileSelect}
            onClick={(e) => { e.target.value = null; }}
            style={{ display: 'none' }}
          />

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '7px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(6,182,212,0.2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-cyan)'
            }}>
              <UploadCloud size={22} style={{ color: 'var(--accent-cyan)' }} />
            </div>
          </div>

          <div style={{ fontSize: '0.86rem', fontWeight: 700, marginBottom: '3px' }}>
            Drag & drop files here, or <span style={{ color: 'var(--accent-cyan)', textDecoration: 'underline' }}>browse</span>
          </div>
        </div>

        {/* Selected Files Queue */}
        {files.length > 0 && (
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '5px' }}>
              STAGED FOR INGESTION ({files.length} / 10):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {files.map((file, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: '0.72rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={16} style={{ color: 'var(--accent-indigo)' }} />
                    <span style={{ fontWeight: 600 }}>{file.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent-rose)',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {uploading && (
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', marginBottom: '3px' }}>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>PIPELINE: Validating → Parsing → PII Scrubbing → Chunking → Vectorizing...</span>
              <span>{progress}%</span>
            </div>
            <div style={{ height: '6px', background: 'var(--bg-surface)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, var(--accent-indigo), var(--accent-cyan))',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}

        {errorMessage && (
          <div style={{
            padding: '8px 10px',
            background: 'rgba(255, 0, 85, 0.12)',
            border: '1px solid var(--accent-rose)',
            borderRadius: '8px',
            color: 'var(--accent-rose)',
            fontSize: '0.72rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '10px'
          }}>
            <AlertCircle size={16} /> {errorMessage}
          </div>
        )}

        {/* Upload Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          {files.length > 0 && (
            <button
              type="button"
              onClick={() => setFiles([])}
              style={{
                padding: '7px 12px',
                background: 'transparent',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-muted)',
                fontSize: '0.74rem',
                cursor: 'pointer'
              }}
            >
              Clear Queue
            </button>
          )}

          <button
            type="submit"
            disabled={uploading || files.length === 0}
            className="btn-glow"
            style={{
              padding: '7px 14px',
              background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))',
              border: 'none',
              borderRadius: '8px',
              color: '#000',
              fontWeight: 800,
              fontSize: '0.76rem',
              cursor: files.length > 0 && !uploading ? 'pointer' : 'not-allowed',
              opacity: files.length > 0 && !uploading ? 1 : 0.6,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Sparkles size={16} /> {uploading ? 'INGESTING & VECTORIZING...' : `INGEST ${files.length > 0 ? `(${files.length})` : ''} TO VECTOR STORE`}
          </button>
        </div>
      </form>

      {/* Success Notification Result */}
      {uploadResults && (
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: 'rgba(57, 255, 20, 0.08)',
          border: '1px solid var(--accent-green)',
          borderRadius: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-green)', fontWeight: 700, marginBottom: '8px' }}>
            <CheckCircle2 size={18} /> Ingestion Successful: {uploadResults.successfulJobs?.length} Documents Processed & Vector Indexed
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            All documents parsed, scrubbed of PII, categorized, and inserted into local 768-dim VectorDB partition.
          </div>
        </div>
      )}
    </div>
  );
};
