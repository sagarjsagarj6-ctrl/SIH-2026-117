import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Database, UploadCloud, Activity, ShieldCheck, 
  Search, Layers, Server, Sparkles 
} from 'lucide-react';

import { FileUploader } from '../data/FileUploader';
import { IngestionDashboard } from '../data/IngestionDashboard';
import { KnowledgeExplorer } from '../data/KnowledgeExplorer';
import { DataQualityView } from '../data/DataQualityView';
import { DatabaseConnectorUI } from '../data/DatabaseConnectorUI';

export const DataFoundationDashboard = () => {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('ingest'); // 'ingest', 'pipeline', 'explorer', 'quality', 'database'

  const subTabs = [
    { id: 'ingest', label: 'File Ingestion & Parsers', icon: <UploadCloud size={16} /> },
    { id: 'pipeline', label: 'Pipeline Monitor', icon: <Activity size={16} /> },
    { id: 'explorer', label: 'Knowledge Base & Vector Store', icon: <Search size={16} /> },
    { id: 'quality', label: 'Data Quality & PII Governance', icon: <ShieldCheck size={16} /> },
    { id: 'database', label: 'LAN Database Connectors', icon: <Server size={16} /> }
  ];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Title & Subtitle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="badge badge-cyan" style={{ marginBottom: '8px' }}>
            CATEGORY A — DATA FOUNDATION & KNOWLEDGE MATRIX
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900 }}>
            Enterprise Data Engineering & Sovereign Vector Store
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Air-gapped multi-format ingestion, PII scrubbing, 768-dim vector embeddings, and on-premise database sync.
          </p>
        </div>

        <div className="glass-card" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} style={{ color: 'var(--accent-cyan)' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>
            Vector Scope: <code className="mono" style={{ color: 'var(--accent-cyan)' }}>{user?.department}</code>
          </span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '6px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        overflowX: 'auto'
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
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? 'linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))' : 'transparent',
                color: isActive ? '#000' : 'var(--text-muted)',
                fontWeight: isActive ? 800 : 600,
                fontSize: '0.82rem',
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
      <div>
        {activeSubTab === 'ingest' && <FileUploader onUploadSuccess={() => setActiveSubTab('pipeline')} />}
        {activeSubTab === 'pipeline' && <IngestionDashboard />}
        {activeSubTab === 'explorer' && <KnowledgeExplorer />}
        {activeSubTab === 'quality' && <DataQualityView />}
        {activeSubTab === 'database' && <DatabaseConnectorUI />}
      </div>
    </div>
  );
};
