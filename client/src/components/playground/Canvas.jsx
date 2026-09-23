import { useRef, useState, useEffect } from 'react';
import { Trash2, X, Check, AlertCircle, Clock } from 'lucide-react';

const nodeWidth = 200;
const nodeHeight = 142;

const categoryColors = {
  TRIGGER: 'var(--accent-green)',
  AGENT: 'var(--accent-cyan)',
  TOOL: 'var(--accent-purple)',
  LOGIC: '#818cf8',
  OUTPUT: 'var(--accent-amber)',
  TRAIN: '#fb7185',
  INPUT: 'var(--accent-amber)'
};

const calculateBezierPath = (x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx >= 0) {
    const cx1 = x1 + Math.max(40, Math.min(180, dx * 0.5));
    const cy1 = y1;
    const cx2 = x2 - Math.max(40, Math.min(180, dx * 0.5));
    const cy2 = y2;
    return {
      d: `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`,
      midX: (x1 + x2) / 2,
      midY: (y1 + y2) / 2
    };
  } else {
    const curveX = Math.max(50, Math.abs(dx) * 0.35);
    const curveY = Math.max(35, Math.abs(dy) * 0.25);
    const cyOffset = dy >= 0 ? curveY : -curveY;
    const cx1 = x1 + curveX;
    const cy1 = y1 + cyOffset;
    const cx2 = x2 - curveX;
    const cy2 = y2 - cyOffset;
    return {
      d: `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`,
      midX: (x1 + x2) / 2,
      midY: (y1 + y2) / 2
    };
  }
};

export const Canvas = ({
  nodes,
  edges,
  definitions,
  selectedNodeId,
  selectedEdgeId,
  connectionStart,
  run,
  onDropNode,
  onSelectNode,
  onSelectEdge,
  onDeleteEdge,
  onMoveNode,
  onDeleteNode,
  onStartConnection,
  onFinishConnection,
  onCancelConnection
}) => {
  const canvasRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [dragWire, setDragWire] = useState(null);
  const [hoveredPort, setHoveredPort] = useState(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState(null);

  const definitionFor = (type) => definitions.find((definition) => definition.type === type) || { name: type, category: 'TOOL', icon: '?' };

  const getOutputHandlePosition = (node, handleName = 'output') => {
    const def = definitionFor(node.type);
    const outputs = def.outputs && def.outputs.length > 0 ? def.outputs : ['output'];
    const index = outputs.indexOf(handleName);
    const validIndex = index >= 0 ? index : 0;
    const x = node.position.x + nodeWidth;
    let y = node.position.y + 68;
    if (outputs.length === 2) {
      y = node.position.y + (validIndex === 0 ? 46 : 94);
    } else if (outputs.length > 2) {
      const step = 80 / (outputs.length - 1);
      y = node.position.y + 36 + validIndex * step;
    }
    return { x, y };
  };

  const getInputHandlePosition = (node, handleName = 'input') => {
    const def = definitionFor(node.type);
    const inputs = def.inputs && def.inputs.length > 0 ? def.inputs : ['input'];
    const index = inputs.indexOf(handleName);
    const validIndex = index >= 0 ? index : 0;
    const x = node.position.x;
    let y = node.position.y + 68;
    if (inputs.length === 2) {
      y = node.position.y + (validIndex === 0 ? 46 : 94);
    } else if (inputs.length > 2) {
      const step = 80 / (inputs.length - 1);
      y = node.position.y + 36 + validIndex * step;
    }
    return { x, y };
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/x-playground-node');
    if (!type || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    onDropNode(
      type,
      Math.max(16, event.clientX - rect.left + canvasRef.current.scrollLeft - 100),
      Math.max(16, event.clientY - rect.top + canvasRef.current.scrollTop - 40)
    );
  };

  const beginMove = (event, node) => {
    if (event.button !== 0 || event.target.closest('button')) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setDragging({
      id: node.id,
      offsetX: event.clientX - rect.left + canvasRef.current.scrollLeft - node.position.x,
      offsetY: event.clientY - rect.top + canvasRef.current.scrollTop - node.position.y
    });
    onSelectNode(node.id);
    onSelectEdge?.(null);
  };

  const handlePointerMove = (event) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = event.clientX - rect.left + canvasRef.current.scrollLeft;
    const currentY = event.clientY - rect.top + canvasRef.current.scrollTop;

    if (dragging) {
      onMoveNode(dragging.id, {
        x: Math.max(8, currentX - dragging.offsetX),
        y: Math.max(8, currentY - dragging.offsetY)
      });
    } else if (dragWire || connectionStart) {
      setDragWire((prev) => ({
        ...(prev || {
          sourceNodeId: connectionStart?.nodeId,
          sourceHandle: connectionStart?.handle,
          ...getOutputHandlePosition(nodes.find((n) => n.id === connectionStart?.nodeId) || { position: { x: 0, y: 0 } }, connectionStart?.handle)
        }),
        currentX,
        currentY
      }));
    }
  };

  const handlePointerUp = () => {
    setDragging(null);
    if (dragWire && !hoveredPort) {
      setDragWire(null);
      onCancelConnection?.();
    }
  };

  const startConnectionDrag = (event, nodeId, handle) => {
    event.stopPropagation();
    event.preventDefault();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const startPos = getOutputHandlePosition(node, handle);
    setDragWire({
      sourceNodeId: nodeId,
      sourceHandle: handle,
      startX: startPos.x,
      startY: startPos.y,
      currentX: startPos.x,
      currentY: startPos.y
    });
    onStartConnection?.(nodeId, handle);
  };

  const completeConnection = (targetNodeId, targetHandle) => {
    const sourceNodeId = dragWire?.sourceNodeId || connectionStart?.nodeId;
    const sourceHandle = dragWire?.sourceHandle || connectionStart?.handle || 'output';

    if (!sourceNodeId || sourceNodeId === targetNodeId) {
      setDragWire(null);
      onCancelConnection?.();
      return;
    }
    onFinishConnection(targetNodeId, targetHandle);
    setDragWire(null);
    setHoveredPort(null);
  };

  // Keyboard shortcut for deleting selected edge or node
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedEdgeId) {
          onDeleteEdge?.(selectedEdgeId);
        } else if (selectedNodeId) {
          onDeleteNode?.(selectedNodeId);
        }
      } else if (e.key === 'Escape') {
        setDragWire(null);
        onCancelConnection?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEdgeId, selectedNodeId, onDeleteEdge, onDeleteNode, onCancelConnection]);

  // Compute node execution statuses from run
  const nodeStatusMap = {};
  if (run?.nodes) {
    for (const nodeRun of run.nodes) {
      nodeStatusMap[nodeRun.nodeId] = {
        status: nodeRun.status,
        durationMs: nodeRun.durationMs,
        error: nodeRun.error
      };
    }
  }

  return (
    <div
      ref={canvasRef}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={(e) => {
        if (e.target === canvasRef.current || e.target.tagName === 'svg') {
          onSelectEdge?.(null);
          setDragWire(null);
          onCancelConnection?.();
        }
      }}
      style={{
        position: 'relative',
        flex: 1,
        minWidth: 0,
        minHeight: '520px',
        overflow: 'auto',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        background: 'radial-gradient(circle at 20% 20%, rgba(0,255,242,0.06), transparent 28%), linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
        backgroundSize: 'auto, 24px 24px, 24px 24px'
      }}
    >
      <style>{`
        @keyframes n8nFlow {
          from { stroke-dashoffset: 24; }
          to { stroke-dashoffset: 0; }
        }
        .n8n-wire-active {
          stroke-dasharray: 6 6;
          animation: n8nFlow 1.2s linear infinite;
        }
        .n8n-handle-hover {
          transform: scale(1.35) !important;
          box-shadow: 0 0 12px var(--accent-cyan) !important;
        }
      `}</style>

      {/* SVG Edge Overlay */}
      <svg
        width="100%"
        height="100%"
        style={{
          position: 'absolute',
          inset: 0,
          minWidth: '1200px',
          minHeight: '800px',
          pointerEvents: 'none',
          overflow: 'visible'
        }}
      >
        <defs>
          <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.85" />
          </linearGradient>
          <filter id="wireGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Existing Edges */}
        {edges.map((edge) => {
          const source = nodes.find((node) => node.id === edge.source);
          const target = nodes.find((node) => node.id === edge.target);
          if (!source || !target) return null;

          const p1 = getOutputHandlePosition(source, edge.sourceHandle);
          const p2 = getInputHandlePosition(target, edge.targetHandle);
          const { d, midX, midY } = calculateBezierPath(p1.x, p1.y, p2.x, p2.y);
          const isSelected = selectedEdgeId === edge.id;
          const isHovered = hoveredEdgeId === edge.id;

          const sourceDef = definitionFor(source.type);
          const color = categoryColors[sourceDef.category] || 'var(--accent-cyan)';
          const isFlowing = run?.status === 'running' || run?.status === 'success';

          return (
            <g key={edge.id} style={{ pointerEvents: 'all' }}>
              {/* Invisible wide hit area for easy selection */}
              <path
                d={d}
                fill="none"
                stroke="transparent"
                strokeWidth="18"
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectEdge?.(edge.id);
                  onSelectNode?.(null);
                }}
                onMouseEnter={() => setHoveredEdgeId(edge.id)}
                onMouseLeave={() => setHoveredEdgeId(null)}
              />

              {/* Visible bezier curve */}
              <path
                d={d}
                fill="none"
                stroke={isSelected ? '#ffffff' : isHovered ? 'var(--accent-cyan)' : color}
                strokeWidth={isSelected ? '3.5' : isHovered ? '2.8' : '2'}
                strokeOpacity={isSelected ? 1 : 0.75}
                className={isFlowing ? 'n8n-wire-active' : ''}
                filter={isSelected ? 'url(#wireGlow)' : undefined}
                style={{ cursor: 'pointer', transition: 'stroke 0.15s, stroke-width 0.15s' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectEdge?.(edge.id);
                  onSelectNode?.(null);
                }}
                onMouseEnter={() => setHoveredEdgeId(edge.id)}
                onMouseLeave={() => setHoveredEdgeId(null)}
              />

              {/* Edge Delete Button (shown when selected or hovered) */}
              {(isSelected || isHovered) && (
                <g
                  transform={`translate(${midX}, ${midY})`}
                  style={{ cursor: 'pointer', pointerEvents: 'all' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteEdge?.(edge.id);
                  }}
                >
                  <circle r="10" fill="var(--bg-card)" stroke="var(--accent-rose)" strokeWidth="1.5" />
                  <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" stroke="var(--accent-rose)" strokeWidth="1.8" strokeLinecap="round" />
                  <line x1="3.5" y1="-3.5" x2="-3.5" y2="3.5" stroke="var(--accent-rose)" strokeWidth="1.8" strokeLinecap="round" />
                </g>
              )}
            </g>
          );
        })}

        {/* Active Dragging Wire */}
        {dragWire && (
          <path
            d={calculateBezierPath(dragWire.startX, dragWire.startY, dragWire.currentX, dragWire.currentY).d}
            fill="none"
            stroke="var(--accent-cyan)"
            strokeWidth="2.5"
            strokeDasharray="5 5"
            className="n8n-wire-active"
            filter="url(#wireGlow)"
            style={{ pointerEvents: 'none' }}
          />
        )}
      </svg>

      {/* Empty State */}
      {nodes.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--text-dim)', fontSize: '0.8rem', pointerEvents: 'none' }}>
          Drop a Trigger, Agent, Tool, or Output node here to begin.
        </div>
      )}

      {/* Canvas Nodes */}
      {nodes.map((node) => {
        const definition = definitionFor(node.type);
        const color = categoryColors[definition.category] || 'var(--accent-cyan)';
        const isSelected = selectedNodeId === node.id;
        const execStatus = nodeStatusMap[node.id];

        const inputs = definition.inputs || [];
        const outputs = definition.outputs && definition.outputs.length > 0 ? definition.outputs : ['output'];

        return (
          <div
            key={node.id}
            onPointerDown={(event) => beginMove(event, node)}
            onClick={(e) => {
              e.stopPropagation();
              onSelectNode(node.id);
              onSelectEdge?.(null);
            }}
            style={{
              position: 'absolute',
              left: node.position.x,
              top: node.position.y,
              width: `${nodeWidth}px`,
              minHeight: `${nodeHeight}px`,
              boxSizing: 'border-box',
              borderRadius: '10px',
              border: `1px solid ${isSelected ? color : 'var(--border-color)'}`,
              background: 'var(--bg-card)',
              boxShadow: isSelected ? `0 0 24px ${color}44` : '0 10px 24px rgba(0,0,0,0.2)',
              userSelect: 'none',
              cursor: dragging?.id === node.id ? 'grabbing' : 'grab',
              zIndex: isSelected ? 4 : 2,
              transition: 'box-shadow 0.15s, border-color 0.15s'
            }}
          >
            {/* Delete Node Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteNode(node.id);
              }}
              aria-label={`Delete ${definition.name}`}
              title="Delete node"
              style={{
                position: 'absolute',
                right: '5px',
                top: '5px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                padding: '3px',
                zIndex: 5
              }}
            >
              <Trash2 size={13} />
            </button>

            {/* Node Header */}
            <div style={{ padding: '9px 10px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ color, fontWeight: 900, fontSize: '0.85rem' }}>{definition.icon}</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, paddingRight: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {node.data?.label || definition.name}
              </span>
            </div>

            {/* Node Content & Dynamic Status Badge */}
            <div style={{ padding: '9px 10px', color: 'var(--text-muted)', fontSize: '0.63rem', lineHeight: 1.35 }}>
              {execStatus ? (
                execStatus.status === 'success' ? (
                  <div className="badge badge-green" style={{ fontSize: '0.56rem', marginBottom: '7px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <Check size={10} /> SUCCESS {execStatus.durationMs !== undefined ? `(${execStatus.durationMs}ms)` : ''}
                  </div>
                ) : execStatus.status === 'failed' ? (
                  <div className="badge badge-rose" style={{ fontSize: '0.56rem', marginBottom: '7px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <AlertCircle size={10} /> FAILED
                  </div>
                ) : execStatus.status === 'skipped' ? (
                  <div className="badge" style={{ fontSize: '0.56rem', marginBottom: '7px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-dim)' }}>
                    SKIPPED
                  </div>
                ) : (
                  <div className="badge badge-amber" style={{ fontSize: '0.56rem', marginBottom: '7px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <Clock size={10} className="animate-spin" /> RUNNING
                  </div>
                )
              ) : (
                <div className="badge badge-cyan" style={{ fontSize: '0.56rem', marginBottom: '7px', color }}>READY</div>
              )}
              <div style={{ maxHeight: '36px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{definition.description}</div>
              <div style={{ marginTop: '7px', color: 'var(--text-dim)' }}>Inputs: {inputs.join(', ') || 'none'}</div>
              <div style={{ marginTop: '2px', color: 'var(--text-dim)' }}>Outputs: {outputs.join(', ') || 'none'}</div>
            </div>

            {/* Input Port(s) on Left Edge */}
            {inputs.length > 0 && inputs.map((inputHandle, idx) => {
              const pos = getInputHandlePosition(node, inputHandle);
              const topOffset = pos.y - node.position.y - 7;
              const isHovered = hoveredPort?.nodeId === node.id && hoveredPort?.handle === inputHandle;
              return (
                <button
                  key={`in-${inputHandle}-${idx}`}
                  type="button"
                  onPointerEnter={() => setHoveredPort({ nodeId: node.id, handle: inputHandle })}
                  onPointerLeave={() => setHoveredPort(null)}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    completeConnection(node.id, inputHandle);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    completeConnection(node.id, inputHandle);
                  }}
                  aria-label={`Connect input into ${definition.name} (${inputHandle})`}
                  title={`Input: ${inputHandle}`}
                  className={isHovered ? 'n8n-handle-hover' : ''}
                  style={{
                    position: 'absolute',
                    left: '-7px',
                    top: `${topOffset}px`,
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    border: `2px solid ${color}`,
                    background: (dragWire || connectionStart) ? (isHovered ? 'var(--accent-cyan)' : color) : 'var(--bg-card)',
                    cursor: 'crosshair',
                    padding: 0,
                    zIndex: 10,
                    transition: 'transform 0.15s, background 0.15s'
                  }}
                />
              );
            })}

            {/* Output Port(s) on Right Edge */}
            {outputs.map((outputHandle, idx) => {
              const pos = getOutputHandlePosition(node, outputHandle);
              const topOffset = pos.y - node.position.y - 7;
              const isConnectedSource = (dragWire?.sourceNodeId === node.id && dragWire?.sourceHandle === outputHandle) ||
                (connectionStart?.nodeId === node.id && connectionStart?.handle === outputHandle);
              return (
                <div key={`out-wrapper-${outputHandle}-${idx}`} style={{ position: 'absolute', right: '-7px', top: `${topOffset}px`, display: 'flex', alignItems: 'center' }}>
                  {outputs.length > 1 && (
                    <span
                      style={{
                        position: 'absolute',
                        right: '18px',
                        fontSize: '0.52rem',
                        fontWeight: 800,
                        color: outputHandle === 'true' ? 'var(--accent-green)' : outputHandle === 'false' ? 'var(--accent-rose)' : 'var(--text-dim)',
                        background: 'rgba(0,0,0,0.5)',
                        padding: '1px 4px',
                        borderRadius: '4px',
                        pointerEvents: 'none',
                        letterSpacing: '0.04em'
                      }}
                    >
                      {outputHandle}
                    </span>
                  )}
                  <button
                    type="button"
                    onPointerDown={(e) => startConnectionDrag(e, node.id, outputHandle)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartConnection?.(node.id, outputHandle);
                    }}
                    aria-label={`Connect from ${definition.name} (${outputHandle})`}
                    title={`Output: ${outputHandle} — Drag or click to connect`}
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      border: `2px solid ${color}`,
                      background: isConnectedSource ? color : 'var(--bg-card)',
                      cursor: 'crosshair',
                      padding: 0,
                      zIndex: 10,
                      transition: 'transform 0.15s, background 0.15s'
                    }}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
