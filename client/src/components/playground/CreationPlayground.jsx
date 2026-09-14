import { useEffect, useState } from 'react';
import { Copy, Play, Plus, RefreshCw, Save, Trash2, Workflow } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import { Canvas } from './Canvas';
import { ExecutionLog } from './ExecutionLog';
import { NodePalette } from './NodePalette';
import { PropertiesPanel } from './PropertiesPanel';

const starterNodes = () => ([
  { id: 'manual-start', type: 'trigger.manual', position: { x: 45, y: 150 }, data: { label: 'Manual Start', config: { input: '' } } },
  { id: 'knowledge-search', type: 'agent.rag', position: { x: 330, y: 150 }, data: { label: 'Knowledge Search', config: { query: 'Summarize the most relevant local policy.', topK: 4 } } },
  { id: 'save-result', type: 'output.database', position: { x: 615, y: 150 }, data: { label: 'Save Result', config: { collection: 'workflow_results' } } }
]);

const imageModelStarterNodes = () => ([
  { id: 'manual-start', type: 'trigger.manual', position: { x: 40, y: 150 }, data: { label: 'Manual Start', config: { input: 'Identify this part, category, metal type, and lifespan.' } } },
  { id: 'add-image', type: 'input.image', position: { x: 280, y: 150 }, data: { label: 'Add Image', config: { imageUploadId: '', fileName: '' } } },
  { id: 'img-model', type: 'agent.image-model', position: { x: 520, y: 150 }, data: { label: 'Image Model', config: { query: 'Identify this part, category, metal type, and lifespan.', imageUploadId: '' } } },
  { id: 'save-result', type: 'output.database', position: { x: 760, y: 150 }, data: { label: 'Save Result', config: { collection: 'image_model_results' } } }
]);

const imageModelStarterEdges = () => ([
  { id: 'edge-start-image', source: 'manual-start', sourceHandle: 'output', target: 'add-image', targetHandle: 'input' },
  { id: 'edge-image-model', source: 'add-image', sourceHandle: 'output', target: 'img-model', targetHandle: 'image' },
  { id: 'edge-model-save', source: 'img-model', sourceHandle: 'prediction', target: 'save-result', targetHandle: 'data' }
]);

const trainImageStarterNodes = () => ([
  { id: 'manual-start', type: 'trigger.manual', position: { x: 50, y: 150 }, data: { label: 'Manual Start', config: { input: 'Train on company hardware manuals and labeled images.' } } },
  { id: 'train-image-model', type: 'train.image-model', position: { x: 340, y: 140 }, data: { label: 'Train Image Model', config: { jobName: 'Hardware Image Model', manualText: '', sampleName: '', sampleCategory: '', sampleMetal: '', sampleLifespan: '', imageUploadId: '' } } }
]);

const trainImageStarterEdges = () => ([
  { id: 'edge-start-train', source: 'manual-start', sourceHandle: 'output', target: 'train-image-model', targetHandle: 'manuals' }
]);

const starterEdges = () => ([
  { id: 'edge-manual-rag', source: 'manual-start', sourceHandle: 'output', target: 'knowledge-search', targetHandle: 'input' },
  { id: 'edge-rag-save', source: 'knowledge-search', sourceHandle: 'answer', target: 'save-result', targetHandle: 'data' }
]);

const blankWorkflow = () => ({
  _id: null,
  name: 'Untitled Local Workflow',
  description: 'A private, local-first workflow.',
  nodes: starterNodes(),
  edges: starterEdges(),
  settings: { concurrency: 1, errorHandling: 'stop', timeout: 300000 },
  runCount: 0
});

export const CreationPlayground = () => {
  const { token, API_URL, user } = useAuth();
  const [definitions, setDefinitions] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [workflow, setWorkflow] = useState(blankWorkflow);
  const [selectedNodeId, setSelectedNodeId] = useState('knowledge-search');
  const [connectionStart, setConnectionStart] = useState(null);
  const [run, setRun] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [imageModelStatus, setImageModelStatus] = useState(null);
  const [paletteGroup, setPaletteGroup] = useState('all');

  const headers = { Authorization: `Bearer ${token}` };
  const selectedNode = workflow.nodes.find((node) => node.id === selectedNodeId) || null;
  const selectedDefinition = definitions.find((definition) => definition.type === selectedNode?.type) || null;

  const loadWorkflows = async () => {
    const [nodeData, workflowData, imageModelData] = await Promise.all([
      apiRequest(`${API_URL}/playground/nodes`, { headers }),
      apiRequest(`${API_URL}/playground/workflows`, { headers }),
      apiRequest(`${API_URL}/image-models`, { headers })
    ]);
    setDefinitions(nodeData.nodes || []);
    setWorkflows(workflowData.workflows || []);
    setImageModelStatus(imageModelData);
    if (workflowData.workflows?.length) {
      setWorkflow(workflowData.workflows[0]);
      setSelectedNodeId(workflowData.workflows[0].nodes?.[0]?.id || null);
    }
  };

  useEffect(() => {
    loadWorkflows().catch((loadError) => setError(loadError.message)).finally(() => setLoading(false));
  }, []);

  const updateWorkflow = (patch) => setWorkflow((current) => ({ ...current, ...patch }));

  const definitionFor = (type) => definitions.find((definition) => definition.type === type);

  const addNode = (type, x = 100 + (workflow.nodes.length % 3) * 230, y = 80 + Math.floor(workflow.nodes.length / 3) * 175) => {
    const definition = definitionFor(type);
    if (!definition) return;
    const id = `${type.replace(/[^a-z0-9]+/gi, '-')}-${Date.now()}`;
    const config = Object.fromEntries((definition.config || []).map((field) => [field.key, field.default ?? '']));
    const node = { id, type, position: { x, y }, data: { label: definition.name, config } };
    updateWorkflow({ nodes: [...workflow.nodes, node] });
    setSelectedNodeId(id);
  };

  const updateNode = (updatedNode) => updateWorkflow({ nodes: workflow.nodes.map((node) => node.id === updatedNode.id ? updatedNode : node) });
  const moveNode = (id, position) => updateWorkflow({ nodes: workflow.nodes.map((node) => node.id === id ? { ...node, position } : node) });
  const deleteNode = (id) => {
    updateWorkflow({ nodes: workflow.nodes.filter((node) => node.id !== id), edges: workflow.edges.filter((edge) => edge.source !== id && edge.target !== id) });
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  const finishConnection = (targetId, targetHandle) => {
    if (!connectionStart || connectionStart.nodeId === targetId) {
      setConnectionStart(null);
      return;
    }
    const duplicate = workflow.edges.some((edge) => edge.source === connectionStart.nodeId && edge.target === targetId);
    if (!duplicate) {
      updateWorkflow({ edges: [...workflow.edges, { id: `edge-${Date.now()}`, source: connectionStart.nodeId, sourceHandle: connectionStart.handle, target: targetId, targetHandle }] });
    }
    setConnectionStart(null);
  };

  const saveWorkflow = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = { name: workflow.name, description: workflow.description, nodes: workflow.nodes, edges: workflow.edges, settings: workflow.settings };
      const data = workflow._id
        ? await apiRequest(`${API_URL}/playground/workflows/${workflow._id}`, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await apiRequest(`${API_URL}/playground/workflows`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      setWorkflow(data.workflow);
      setWorkflows((current) => [data.workflow, ...current.filter((item) => item._id !== data.workflow._id)]);
      return data.workflow;
    } catch (saveError) {
      setError(saveError.message);
      throw saveError;
    } finally {
      setSaving(false);
    }
  };

  const runWorkflow = async () => {
    setRunning(true);
    setError('');
    try {
      const saved = await saveWorkflow();
      const data = await apiRequest(`${API_URL}/playground/workflows/${saved._id}/run`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ input: { department: user.department } }) }, 60000);
      setRun(data.run);
      setLogs(data.run?.nodes || []);
      setWorkflow((current) => ({ ...current, runCount: (current.runCount || 0) + 1, lastRunAt: new Date().toISOString() }));
    } catch (runError) {
      setError(runError.message);
      if (runError.run) {
        setRun(runError.run);
        setLogs(runError.run.nodes || []);
      }
    } finally {
      setRunning(false);
    }
  };

  const containsImageModel = workflow.nodes.some((node) => ['input.image', 'agent.image-model'].includes(node.type));

  const selectWorkflow = (id) => {
    const next = workflows.find((item) => item._id === id);
    if (!next) return;
    setWorkflow(next);
    setSelectedNodeId(next.nodes?.[0]?.id || null);
    setRun(null);
    setLogs([]);
  };

  const cloneWorkflow = async () => {
    if (!workflow._id) return;
    try {
      const data = await apiRequest(`${API_URL}/playground/workflows/${workflow._id}/clone`, { method: 'POST', headers });
      setWorkflows((current) => [data.workflow, ...current]);
      setWorkflow(data.workflow);
      setSelectedNodeId(data.workflow.nodes?.[0]?.id || null);
    } catch (cloneError) {
      setError(cloneError.message);
    }
  };

  const deleteWorkflow = async () => {
    if (!workflow._id || !window.confirm('Delete this workflow?')) return;
    try {
      await apiRequest(`${API_URL}/playground/workflows/${workflow._id}`, { method: 'DELETE', headers });
      const remaining = workflows.filter((item) => item._id !== workflow._id);
      setWorkflows(remaining);
      setWorkflow(remaining[0] || blankWorkflow());
      setSelectedNodeId(remaining[0]?.nodes?.[0]?.id || 'knowledge-search');
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const toggleSchedule = async () => {
    if (!workflow._id) {
      setError('Save the workflow before activating a schedule.');
      return;
    }
    try {
      const data = await apiRequest(`${API_URL}/playground/workflows/${workflow._id}/activate`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !workflow.isActive })
      });
      setWorkflow(data.workflow);
      setWorkflows((current) => current.map((item) => item._id === data.workflow._id ? data.workflow : item));
    } catch (scheduleError) {
      setError(scheduleError.message);
    }
  };

  const applyPaletteGroup = (group) => {
    setPaletteGroup(group);
    if (workflow._id) return;
    if (group === 'image-model') {
      setWorkflow({
        ...blankWorkflow(),
        name: 'Img-Model Workspace',
        description: 'Add a camera or gallery image, then run the hardware image agent team.',
        nodes: imageModelStarterNodes(),
        edges: imageModelStarterEdges()
      });
      setSelectedNodeId('add-image');
    } else if (group === 'train-image-model' && user.role === 'Admin') {
      setWorkflow({
        ...blankWorkflow(),
        name: 'Train-Deploy Img-Model',
        description: 'Admin trains hardware manuals and labeled images, then deploys over LAN.',
        nodes: trainImageStarterNodes(),
        edges: trainImageStarterEdges()
      });
      setSelectedNodeId('train-image-model');
    }
  };

  const headerButtonStyle = { padding: '7px 10px', fontSize: '0.68rem' };

  if (loading) return <div className="glass-panel" style={{ padding: '28px', color: 'var(--text-muted)' }}>Loading Creation Playground...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: 'calc(100vh - 80px)', minHeight: '640px' }}>
      <div className="glass-panel" style={{ padding: '12px 14px', display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <Workflow size={20} style={{ color: 'var(--accent-cyan)' }} />
          <div><div style={{ fontWeight: 900, fontSize: '1rem' }}>Creation Playground</div><div style={{ color: 'var(--text-muted)', fontSize: '0.66rem' }}>Visual local workflows — no cloud execution</div></div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          <select value={workflow._id || ''} onChange={(event) => selectWorkflow(event.target.value)} style={{ maxWidth: '190px', padding: '7px 8px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.68rem' }}>
            <option value="">New workflow</option>
            {workflows.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
          </select>
          <button className="btn-secondary" style={headerButtonStyle} onClick={() => { setWorkflow(blankWorkflow()); setSelectedNodeId('knowledge-search'); setRun(null); setLogs([]); }}><Plus size={14} /> New</button>
          <button className="btn-secondary" style={headerButtonStyle} onClick={cloneWorkflow} disabled={!workflow._id}><Copy size={14} /> Clone</button>
          <button className="btn-secondary" style={headerButtonStyle} onClick={saveWorkflow} disabled={saving}><Save size={14} /> {saving ? 'Saving' : 'Save'}</button>
          <button className="btn-secondary" style={{ ...headerButtonStyle, color: workflow.isActive ? 'var(--accent-green)' : 'var(--text-main)' }} onClick={toggleSchedule} disabled={!workflow._id}>{workflow.isActive ? 'Pause Schedule' : 'Activate Schedule'}</button>
          <button className="btn-primary" style={headerButtonStyle} onClick={runWorkflow} disabled={running || (containsImageModel && imageModelStatus && !imageModelStatus.lanConnected)}>{running ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />} {running ? 'Running' : 'Run'}</button>
          <button className="btn-secondary" style={{ ...headerButtonStyle, color: 'var(--accent-rose)' }} onClick={deleteWorkflow} disabled={!workflow._id} title="Delete workflow"><Trash2 size={14} /></button>
        </div>
      </div>

      {containsImageModel && imageModelStatus && !imageModelStatus.lanConnected && (
        <div className="glass-card" style={{ padding: '9px 12px', color: 'var(--accent-cyan)', borderColor: 'rgba(34,211,238,0.35)', fontSize: '0.72rem' }}>
          Connect to LAN to use the image model. Image capture remains local, but inference and image-model workflow runs unlock only after LAN membership is active.
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', minHeight: 0, flex: 1 }}>
        <NodePalette definitions={definitions} onAddNode={addNode} paletteGroup={paletteGroup} onPaletteGroupChange={applyPaletteGroup} role={user.role} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input value={workflow.name} onChange={(event) => updateWorkflow({ name: event.target.value })} placeholder="Workflow name" style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.76rem' }} />
            <input value={workflow.description || ''} onChange={(event) => updateWorkflow({ description: event.target.value })} placeholder="Description" style={{ flex: 1.4, padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.76rem' }} />
          </div>
          <Canvas nodes={workflow.nodes} edges={workflow.edges} definitions={definitions} selectedNodeId={selectedNodeId} connectionStart={connectionStart} onDropNode={addNode} onSelectNode={setSelectedNodeId} onMoveNode={moveNode} onDeleteNode={deleteNode} onStartConnection={(nodeId, handle) => setConnectionStart({ nodeId, handle })} onFinishConnection={finishConnection} />
          <ExecutionLog run={run} logs={logs} />
        </div>
        <PropertiesPanel node={selectedNode} definition={selectedDefinition} onChange={updateNode} onDelete={deleteNode} />
      </div>

      {error && <div className="glass-card" style={{ padding: '9px 12px', color: 'var(--accent-rose)', borderColor: 'rgba(244,63,94,0.35)', fontSize: '0.72rem' }}>{error}</div>}
      <div style={{ color: 'var(--text-dim)', fontSize: '0.63rem' }}>MVP safety boundary: workflows execute through approved local agents and tools only. Current workflow runs: {workflow.runCount || 0}.</div>
    </div>
  );
};
