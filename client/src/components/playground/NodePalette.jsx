import { Plus } from 'lucide-react';

const categoryColors = {
  TRIGGER: 'var(--accent-green)',
  AGENT: 'var(--accent-cyan)',
  TOOL: 'var(--accent-purple)',
  LOGIC: '#818cf8',
  OUTPUT: 'var(--accent-amber)',
  TRAIN: '#fb7185',
  INPUT: 'var(--accent-amber)'
};

export const NodePalette = ({ definitions, onAddNode, paletteGroup = 'all', onPaletteGroupChange, role }) => {
  const handleDragStart = (event, type) => {
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/x-playground-node', type);
  };

  const tabs = role === 'Admin'
    ? [
        { id: 'all', label: 'All nodes' },
        { id: 'train-image-model', label: 'Train Image Model' },
        { id: 'image-model', label: 'Image Model' }
      ]
    : [
        { id: 'all', label: 'All nodes' },
        { id: 'image-model', label: 'Image Model' }
      ];

  const visible = definitions.filter((definition) => paletteGroup === 'all' || definition.paletteGroup === paletteGroup);

  return (
    <aside style={{ width: '220px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0 }}>
      <div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 800 }}>NODE PALETTE</div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '4px' }}>Drag nodes onto the canvas.</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {tabs.map((tab) => {
          const active = paletteGroup === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onPaletteGroupChange?.(tab.id)}
              style={{
                textAlign: 'left',
                padding: '7px 9px',
                borderRadius: '8px',
                border: active ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                background: active ? 'rgba(6,182,212,0.14)' : 'transparent',
                color: active ? 'var(--text-main)' : 'var(--text-muted)',
                fontSize: '0.66rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '7px', paddingRight: '3px' }}>
        {visible.map((definition) => (
          <button
            key={definition.type}
            draggable
            onDragStart={(event) => handleDragStart(event, definition.type)}
            onClick={() => onAddNode(definition.type)}
            style={{
              textAlign: 'left',
              padding: '9px 10px',
              borderRadius: '9px',
              border: `1px solid ${categoryColors[definition.category] || 'var(--border-color)'}`,
              background: 'rgba(255,255,255,0.035)',
              color: 'var(--text-main)',
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              gap: '9px'
            }}
          >
            <span style={{ width: '25px', height: '25px', display: 'grid', placeItems: 'center', borderRadius: '7px', color: categoryColors[definition.category], background: 'rgba(255,255,255,0.08)', fontWeight: 900 }}>
              {definition.icon}
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem', fontWeight: 800 }}>
                {definition.name}
                <Plus size={11} style={{ marginLeft: 'auto', color: 'var(--text-dim)' }} />
              </span>
              <span style={{ display: 'block', marginTop: '3px', color: 'var(--text-dim)', fontSize: '0.62rem', lineHeight: 1.25 }}>{definition.description}</span>
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
};
