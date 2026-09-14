import { useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';

const nodeWidth = 190;
const nodeHeight = 138;
const categoryColors = {
  TRIGGER: 'var(--accent-green)',
  AGENT: 'var(--accent-cyan)',
  TOOL: 'var(--accent-purple)',
  OUTPUT: 'var(--accent-amber)',
  TRAIN: '#fb7185',
  INPUT: 'var(--accent-amber)'
};

export const Canvas = ({
  nodes,
  edges,
  definitions,
  selectedNodeId,
  connectionStart,
  onDropNode,
  onSelectNode,
  onMoveNode,
  onDeleteNode,
  onStartConnection,
  onFinishConnection
}) => {
  const canvasRef = useRef(null);
  const [dragging, setDragging] = useState(null);

  const definitionFor = (type) => definitions.find((definition) => definition.type === type);

  const handleDrop = (event) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/x-playground-node');
    if (!type || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    onDropNode(type, Math.max(16, event.clientX - rect.left - 95), Math.max(16, event.clientY - rect.top - 35));
  };

  const beginMove = (event, node) => {
    if (event.button !== 0 || event.target.closest('button')) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setDragging({ id: node.id, offsetX: event.clientX - rect.left - node.position.x, offsetY: event.clientY - rect.top - node.position.y });
    onSelectNode(node.id);
  };

  const moveNode = (event) => {
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    onMoveNode(dragging.id, {
      x: Math.max(8, event.clientX - rect.left - dragging.offsetX),
      y: Math.max(8, event.clientY - rect.top - dragging.offsetY)
    });
  };

  return (
    <div
      ref={canvasRef}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      onPointerMove={moveNode}
      onPointerUp={() => setDragging(null)}
      onPointerLeave={() => setDragging(null)}
      style={{ position: 'relative', flex: 1, minWidth: 0, minHeight: '520px', overflow: 'auto', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'radial-gradient(circle at 20% 20%, rgba(0,255,242,0.06), transparent 28%), linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)', backgroundSize: 'auto, 24px 24px, 24px 24px' }}
    >
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, minWidth: '900px', minHeight: '520px', pointerEvents: 'none', overflow: 'visible' }}>
        {edges.map((edge) => {
          const source = nodes.find((node) => node.id === edge.source);
          const target = nodes.find((node) => node.id === edge.target);
          if (!source || !target) return null;
          const x1 = source.position.x + nodeWidth;
          const y1 = source.position.y + 68;
          const x2 = target.position.x;
          const y2 = target.position.y + 68;
          const curve = Math.max(45, Math.abs(x2 - x1) * 0.45);
          return <path key={edge.id} d={`M ${x1} ${y1} C ${x1 + curve} ${y1}, ${x2 - curve} ${y2}, ${x2} ${y2}`} fill="none" stroke="var(--accent-cyan)" strokeWidth="2" strokeOpacity="0.7" />;
        })}
      </svg>

      {nodes.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--text-dim)', fontSize: '0.8rem', pointerEvents: 'none' }}>
          Drop a Trigger, Agent, or Output node here to begin.
        </div>
      )}

      {nodes.map((node) => {
        const definition = definitionFor(node.type) || { name: node.type, category: 'TOOL', icon: '?' };
        const color = categoryColors[definition.category] || 'var(--accent-cyan)';
        const isSelected = selectedNodeId === node.id;
        return (
          <div
            key={node.id}
            onPointerDown={(event) => beginMove(event, node)}
            onClick={() => onSelectNode(node.id)}
            style={{ position: 'absolute', left: node.position.x, top: node.position.y, width: `${nodeWidth}px`, minHeight: `${nodeHeight}px`, boxSizing: 'border-box', borderRadius: '10px', border: `1px solid ${isSelected ? color : 'var(--border-color)'}`, background: 'var(--bg-card)', boxShadow: isSelected ? `0 0 24px ${color}44` : '0 10px 24px rgba(0,0,0,0.2)', userSelect: 'none', cursor: dragging?.id === node.id ? 'grabbing' : 'grab', zIndex: isSelected ? 3 : 2 }}
          >
            <button onClick={() => onDeleteNode(node.id)} aria-label={`Delete ${definition.name}`} title="Delete node" style={{ position: 'absolute', right: '5px', top: '5px', border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', padding: '3px', zIndex: 2 }}><Trash2 size={13} /></button>
            <div style={{ padding: '9px 10px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ color, fontWeight: 900 }}>{definition.icon}</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, paddingRight: '16px' }}>{node.data?.label || definition.name}</span>
            </div>
            <div style={{ padding: '9px 10px', color: 'var(--text-muted)', fontSize: '0.63rem', lineHeight: 1.35 }}>
              <div className="badge badge-cyan" style={{ fontSize: '0.56rem', marginBottom: '7px', color }}>READY</div>
              <div>{definition.description}</div>
              <div style={{ marginTop: '7px', color: 'var(--text-dim)' }}>Inputs: {(definition.inputs || []).join(', ') || 'none'}</div>
              <div style={{ marginTop: '2px', color: 'var(--text-dim)' }}>Outputs: {(definition.outputs || []).join(', ') || 'none'}</div>
            </div>
            <button onClick={() => onFinishConnection(node.id, 'input')} aria-label={`Connect into ${definition.name}`} title="Connect target" style={{ position: 'absolute', left: '-7px', top: '62px', width: '14px', height: '14px', borderRadius: '50%', border: `2px solid ${color}`, background: connectionStart ? color : 'var(--bg-card)', cursor: 'crosshair', padding: 0 }} />
            <button onClick={() => onStartConnection(node.id, 'output')} aria-label={`Connect from ${definition.name}`} title="Connect source" style={{ position: 'absolute', right: '-7px', top: '62px', width: '14px', height: '14px', borderRadius: '50%', border: `2px solid ${color}`, background: connectionStart?.nodeId === node.id ? color : 'var(--bg-card)', cursor: 'crosshair', padding: 0 }} />
          </div>
        );
      })}
    </div>
  );
};
