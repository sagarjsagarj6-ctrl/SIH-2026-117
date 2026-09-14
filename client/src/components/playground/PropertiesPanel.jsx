import { Settings2, Trash2 } from 'lucide-react';
import { ImageNodeExtras } from './ImageNodeExtras';

export const PropertiesPanel = ({ node, definition, onChange, onDelete }) => {
  if (!node || !definition) {
    return <aside style={{ width: '250px', flexShrink: 0, padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--text-dim)', fontSize: '0.72rem' }}>Select a node to edit its configuration.</aside>;
  }

  const updateConfig = (key, value) => onChange({ ...node, data: { ...node.data, config: { ...(node.data?.config || {}), [key]: value } } });

  return (
    <aside style={{ width: '250px', flexShrink: 0, padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.08)', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--accent-cyan)', fontSize: '0.75rem', fontWeight: 800, marginBottom: '14px' }}><Settings2 size={15} /> PROPERTIES</div>
      <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.66rem', marginBottom: '5px' }}>Node label</label>
      <input value={node.data?.label || definition.name} onChange={(event) => onChange({ ...node, data: { ...node.data, label: event.target.value } })} style={{ width: '100%', boxSizing: 'border-box', marginBottom: '14px', padding: '8px', borderRadius: '7px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.72rem' }} />
      <div style={{ fontSize: '0.64rem', color: 'var(--text-dim)', marginBottom: '12px' }}>{definition.type}</div>
      {['input.image', 'agent.image-model', 'train.image-model'].includes(node.type) && (
        <ImageNodeExtras node={node} onChange={onChange} />
      )}
      {(definition.config || []).map((field) => (
        <label key={field.key} style={{ display: 'block', marginBottom: '12px', color: 'var(--text-muted)', fontSize: '0.66rem' }}>
          {field.label}
          {field.type === 'select' ? (
            <select value={node.data?.config?.[field.key] ?? field.default ?? ''} onChange={(event) => updateConfig(field.key, event.target.value)} style={{ width: '100%', marginTop: '5px', padding: '8px', borderRadius: '7px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.72rem' }}>
              {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          ) : field.type === 'textarea' ? (
            <textarea rows={4} value={node.data?.config?.[field.key] ?? field.default ?? ''} onChange={(event) => updateConfig(field.key, event.target.value)} style={{ width: '100%', boxSizing: 'border-box', marginTop: '5px', padding: '8px', borderRadius: '7px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.72rem', resize: 'vertical' }} />
          ) : (
            <input type={field.type === 'number' ? 'number' : 'text'} min={field.min} max={field.max} value={node.data?.config?.[field.key] ?? field.default ?? ''} onChange={(event) => updateConfig(field.key, field.type === 'number' ? Number(event.target.value) : event.target.value)} style={{ width: '100%', boxSizing: 'border-box', marginTop: '5px', padding: '8px', borderRadius: '7px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.72rem' }} />
          )}
        </label>
      ))}
      <button onClick={() => onDelete(node.id)} className="btn-secondary" style={{ width: '100%', color: 'var(--accent-rose)', borderColor: 'rgba(244,63,94,0.35)', fontSize: '0.68rem' }}><Trash2 size={14} /> Remove node</button>
    </aside>
  );
};
