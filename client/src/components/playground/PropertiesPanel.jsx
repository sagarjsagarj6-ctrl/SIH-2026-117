import { useState } from 'react';
import { Settings2, Trash2, Database, Copy, Check, Terminal } from 'lucide-react';
import { ImageNodeExtras } from './ImageNodeExtras';

export const PropertiesPanel = ({ node, definition, runData, onChange, onDelete }) => {
  const [activeTab, setActiveTab] = useState('params');
  const [copiedKey, setCopiedKey] = useState('');

  if (!node || !definition) {
    return (
      <aside style={{ width: '270px', flexShrink: 0, padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--text-dim)', fontSize: '0.72rem' }}>
        Select a node to edit its configuration or inspect execution results.
      </aside>
    );
  }

  const updateConfig = (key, value) => {
    onChange({
      ...node,
      data: {
        ...node.data,
        config: {
          ...(node.data?.config || {}),
          [key]: value
        }
      }
    });
  };

  const copyJson = (text, key) => {
    navigator.clipboard.writeText(typeof text === 'string' ? text : JSON.stringify(text, null, 2));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 1500);
  };

  return (
    <aside style={{ width: '270px', flexShrink: 0, padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.08)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--accent-cyan)', fontSize: '0.75rem', fontWeight: 800 }}>
          <Settings2 size={15} /> PROPERTIES
        </div>
      </div>

      {/* Tabs: Parameters vs Run Data */}
      <div style={{ display: 'flex', gap: '5px', background: 'rgba(255,255,255,0.04)', padding: '3px', borderRadius: '8px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('params')}
          style={{
            flex: 1,
            padding: '6px 8px',
            borderRadius: '6px',
            border: 'none',
            background: activeTab === 'params' ? 'var(--accent-cyan)' : 'transparent',
            color: activeTab === 'params' ? '#000' : 'var(--text-muted)',
            fontWeight: 800,
            fontSize: '0.66rem',
            cursor: 'pointer'
          }}
        >
          Parameters
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('data')}
          style={{
            flex: 1,
            padding: '6px 8px',
            borderRadius: '6px',
            border: 'none',
            background: activeTab === 'data' ? 'var(--accent-cyan)' : 'transparent',
            color: activeTab === 'data' ? '#000' : 'var(--text-muted)',
            fontWeight: 800,
            fontSize: '0.66rem',
            cursor: 'pointer'
          }}
        >
          Run Data {runData && <span style={{ fontSize: '0.55rem', opacity: 0.8 }}>({runData.status})</span>}
        </button>
      </div>

      {activeTab === 'params' ? (
        <div>
          {/* Node Label */}
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.66rem', marginBottom: '5px' }}>Node label</label>
          <input
            value={node.data?.label || definition.name}
            onChange={(event) => onChange({ ...node, data: { ...node.data, label: event.target.value } })}
            style={{ width: '100%', boxSizing: 'border-box', marginBottom: '10px', padding: '8px', borderRadius: '7px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.72rem' }}
          />

          <div style={{ fontSize: '0.64rem', color: 'var(--text-dim)', marginBottom: '12px' }}>{definition.type}</div>

          {['input.image', 'agent.image-model', 'train.image-model'].includes(node.type) && (
            <ImageNodeExtras node={node} onChange={onChange} />
          )}

          {/* Form Fields */}
          {(definition.config || []).map((field) => (
            <label key={field.key} style={{ display: 'block', marginBottom: '12px', color: 'var(--text-muted)', fontSize: '0.66rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>{field.label}</span>
                {field.key.toLowerCase().includes('expression') && (
                  <span style={{ color: 'var(--accent-cyan)', fontSize: '0.58rem' }}>n8n expression syntax</span>
                )}
              </div>
              {field.type === 'select' ? (
                <select
                  value={node.data?.config?.[field.key] ?? field.default ?? ''}
                  onChange={(event) => updateConfig(field.key, event.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '7px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.72rem' }}
                >
                  {(field.options || []).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea
                  rows={field.key === 'code' ? 8 : 4}
                  value={node.data?.config?.[field.key] ?? field.default ?? ''}
                  onChange={(event) => updateConfig(field.key, event.target.value)}
                  spellCheck="false"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px',
                    borderRadius: '7px',
                    border: '1px solid var(--border-color)',
                    background: field.key === 'code' ? 'rgba(0,0,0,0.45)' : 'var(--bg-surface)',
                    color: field.key === 'code' ? '#a5f3fc' : 'var(--text-main)',
                    fontFamily: field.key === 'code' ? 'monospace' : 'inherit',
                    fontSize: '0.70rem',
                    resize: 'vertical',
                    lineHeight: 1.4
                  }}
                />
              ) : (
                <input
                  type={field.type === 'number' ? 'number' : 'text'}
                  min={field.min}
                  max={field.max}
                  value={node.data?.config?.[field.key] ?? field.default ?? ''}
                  onChange={(event) => updateConfig(field.key, field.type === 'number' ? Number(event.target.value) : event.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '7px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.72rem' }}
                />
              )}
            </label>
          ))}

          <button
            onClick={() => onDelete(node.id)}
            className="btn-secondary"
            style={{ width: '100%', marginTop: '12px', color: 'var(--accent-rose)', borderColor: 'rgba(244,63,94,0.35)', fontSize: '0.68rem' }}
          >
            <Trash2 size={14} /> Remove node
          </button>
        </div>
      ) : (
        /* Run Data Inspection Tab (n8n Style) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {!runData ? (
            <div style={{ color: 'var(--text-dim)', fontSize: '0.68rem', padding: '16px 0', textAlign: 'center' }}>
              Run the workflow to inspect live input & output data for this node.
            </div>
          ) : (
            <>
              {/* Status Banner */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
                <span className={`badge ${runData.status === 'success' ? 'badge-green' : runData.status === 'failed' ? 'badge-rose' : 'badge-amber'}`} style={{ fontSize: '0.62rem' }}>
                  {runData.status?.toUpperCase()}
                </span>
                <span style={{ fontSize: '0.64rem', color: 'var(--text-dim)' }}>
                  Duration: {runData.durationMs || 0} ms
                </span>
              </div>

              {runData.error && (
                <div style={{ padding: '8px', borderRadius: '6px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: 'var(--accent-rose)', fontSize: '0.66rem' }}>
                  {runData.error}
                </div>
              )}

              {/* Input Data */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)' }}>INPUT DATA</span>
                  <button
                    type="button"
                    onClick={() => copyJson(runData.input, 'input')}
                    style={{ border: 'none', background: 'transparent', color: 'var(--accent-cyan)', cursor: 'pointer', fontSize: '0.62rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    {copiedKey === 'input' ? <Check size={11} /> : <Copy size={11} />} Copy
                  </button>
                </div>
                <pre style={{ margin: 0, padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.5)', color: '#86efac', fontSize: '0.63rem', maxHeight: '140px', overflow: 'auto', fontFamily: 'monospace' }}>
                  {JSON.stringify(runData.input, null, 2) || '{}'}
                </pre>
              </div>

              {/* Output Data */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)' }}>OUTPUT DATA</span>
                  <button
                    type="button"
                    onClick={() => copyJson(runData.output, 'output')}
                    style={{ border: 'none', background: 'transparent', color: 'var(--accent-cyan)', cursor: 'pointer', fontSize: '0.62rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    {copiedKey === 'output' ? <Check size={11} /> : <Copy size={11} />} Copy
                  </button>
                </div>
                <pre style={{ margin: 0, padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.5)', color: '#93c5fd', fontSize: '0.63rem', maxHeight: '180px', overflow: 'auto', fontFamily: 'monospace' }}>
                  {JSON.stringify(runData.output, null, 2) || (runData.status === 'failed' ? 'null (execution failed)' : '{}')}
                </pre>
              </div>
            </>
          )}
        </div>
      )}
    </aside>
  );
};
