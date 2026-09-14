import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  UploadCloud, Activity, ShieldCheck, Search, Server, Sparkles
} from 'lucide-react';

import { FileUploader } from '../data/FileUploader';
import { IngestionDashboard } from '../data/IngestionDashboard';
import { KnowledgeExplorer } from '../data/KnowledgeExplorer';
import { DataQualityView } from '../data/DataQualityView';
import { DatabaseConnectorUI } from '../data/DatabaseConnectorUI';

export const DataFoundationDashboard = () => {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('ingest'); // 'ingest', 'pipeline', 'explorer', 'quality', 'database'
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1);
    setActiveSubTab('pipeline');
  };

  const subTabs = [
    { id: 'ingest', label: 'File Ingestion & Parsers', icon: <UploadCloud size={16} /> },
    { id: 'pipeline', label: 'Pipeline Monitor', icon: <Activity size={16} /> },
    { id: 'explorer', label: 'Knowledge Base & Vector Store', icon: <Search size={16} /> },
    { id: 'quality', label: 'Data Quality & PII Governance', icon: <ShieldCheck size={16} /> },
    { id: 'database', label: 'LAN Database Connectors', icon: <Server size={16} /> }
  ];

  return (
    <div style={{ maxWidth: '1400px', width: '100%', height: '100%', boxSizing: 'border-box', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'hidden' }}>
      {/* Page Title & Subtitle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <div>
         
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
            Enterprise Data Engineering & Sovereign Vector Store
          </h1>
          
        </div>

        <div className="glass-card" style={{ padding: '7px 10px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <Sparkles size={13} style={{ color: 'var(--accent-cyan)' }} />
          <span style={{ fontSize: '0.68rem', fontWeight: 700 }}>
            Vector Scope: <code className="mono" style={{ color: 'var(--accent-cyan)' }}>{user?.department}</code>
          </span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '3px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: '9px',
        overflowX: 'auto',
        flexShrink: 0
      }}>
        {subTabs.map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 10px',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? 'linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))' : 'transparent',
                color: isActive ? '#000' : 'var(--text-muted)',
                fontWeight: isActive ? 800 : 600,
                fontSize: '0.68rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Render Active View */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {activeSubTab === 'ingest' && <FileUploader onUploadSuccess={handleUploadSuccess} />}
        {activeSubTab === 'pipeline' && <IngestionDashboard refreshKey={refreshKey} />}
        {activeSubTab === 'explorer' && <KnowledgeExplorer refreshKey={refreshKey} />}
        {activeSubTab === 'quality' && <DataQualityView refreshKey={refreshKey} />}
        {activeSubTab === 'database' && <DatabaseConnectorUI />}
      </div>
    </div>
  );
};
