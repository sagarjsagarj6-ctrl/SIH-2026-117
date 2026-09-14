import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { NodeRegistry } from '../services/playground/NodeRegistry.js';
import { WorkflowStore } from '../services/playground/WorkflowStore.js';
import { ExecutionEngine } from '../services/playground/ExecutionEngine.js';

const router = express.Router();
router.use(authenticateToken, requireRole(['Admin', 'Manager', 'Employee']));
const idOf = (user) => String(user?._id || user?.id || '');

const canAccess = (workflow, user, write = false) => {
  if (!workflow) return false;
  if (user.role === 'Admin') return true;
  if (workflow.ownerId === idOf(user)) return true;
  return !write && user.role === 'Manager' && workflow.department === user.department;
};

const validateDefinition = (body, user) => {
  const nodes = Array.isArray(body.nodes) ? body.nodes : [];
  const edges = Array.isArray(body.edges) ? body.edges : [];
  if (nodes.length > 30) return 'A workflow may contain at most 30 nodes.';
  const nodeIds = new Set(nodes.map((node) => node.id));
  if (nodeIds.size !== nodes.length) return 'Every workflow node must have a unique id.';
  if (nodes.some((node) => {
    const definition = NodeRegistry.get(node.type);
    if (!definition) return true;
    return Array.isArray(definition.roles) && user?.role && !definition.roles.includes(user.role);
  })) return 'Workflow contains an unsupported node type.';
  if (edges.some((edge) => !nodeIds.has(edge.source) || !nodeIds.has(edge.target))) return 'Workflow contains an invalid connection.';
  return null;
};

router.get('/nodes', authenticateToken, (req, res) => {
  res.json({ nodes: NodeRegistry.list(req.user.role), plugins: [] });
});

router.get('/plugins', authenticateToken, (_req, res) => {
  res.json({ plugins: [], message: 'Plugin loading is reserved for the next secure extension phase.' });
});

router.get('/workflows', authenticateToken, async (req, res) => {
  try {
    const workflows = await WorkflowStore.listForUser(req.user);
    res.json({ workflows, total: workflows.length });
  } catch (error) {
    res.status(500).json({ error: `Failed to list playground workflows: ${error.message}` });
  }
});

router.post('/workflows', authenticateToken, async (req, res) => {
  try {
    const validationError = validateDefinition(req.body || {}, req.user);
    if (validationError) return res.status(400).json({ error: validationError });
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Workflow name is required.' });
    const workflow = await WorkflowStore.create({ ...req.body, name: name.slice(0, 120) }, req.user);
    res.status(201).json({ workflow });
  } catch (error) {
    res.status(500).json({ error: `Failed to create workflow: ${error.message}` });
  }
});

router.get('/workflows/:workflowId', authenticateToken, async (req, res) => {
  const workflow = await WorkflowStore.get(req.params.workflowId);
  if (!workflow || !canAccess(workflow, req.user)) return res.status(404).json({ error: 'Workflow not found.' });
  res.json({ workflow });
});

router.put('/workflows/:workflowId', authenticateToken, async (req, res) => {
  const existing = await WorkflowStore.get(req.params.workflowId);
  if (!existing || !canAccess(existing, req.user, true)) return res.status(404).json({ error: 'Workflow not found.' });
  const validationError = validateDefinition(req.body || {}, req.user);
  if (validationError) return res.status(400).json({ error: validationError });
  const workflow = await WorkflowStore.update(req.params.workflowId, req.body || {});
  res.json({ workflow });
});

router.delete('/workflows/:workflowId', authenticateToken, async (req, res) => {
  const existing = await WorkflowStore.get(req.params.workflowId);
  if (!existing || !canAccess(existing, req.user, true)) return res.status(404).json({ error: 'Workflow not found.' });
  await WorkflowStore.remove(req.params.workflowId);
  res.json({ deleted: true });
});

router.post('/workflows/:workflowId/clone', authenticateToken, async (req, res) => {
  const existing = await WorkflowStore.get(req.params.workflowId);
  if (!existing || !canAccess(existing, req.user)) return res.status(404).json({ error: 'Workflow not found.' });
  const workflow = await WorkflowStore.clone(req.params.workflowId, req.user);
  res.status(201).json({ workflow });
});

router.post('/workflows/:workflowId/activate', authenticateToken, async (req, res) => {
  const existing = await WorkflowStore.get(req.params.workflowId);
  if (!existing || !canAccess(existing, req.user, true)) return res.status(404).json({ error: 'Workflow not found.' });
  const isActive = Boolean(req.body?.isActive);
  if (isActive && !existing.nodes.some((node) => node.type === 'trigger.schedule')) {
    return res.status(400).json({ error: 'Add a Scheduled Run trigger before activating a workflow.' });
  }
  const workflow = await WorkflowStore.update(req.params.workflowId, { isActive });
  res.json({ workflow, message: isActive ? 'Local schedule activated.' : 'Local schedule paused.' });
});

router.post('/workflows/:workflowId/run', authenticateToken, async (req, res) => {
  const workflow = await WorkflowStore.get(req.params.workflowId);
  if (!workflow || !canAccess(workflow, req.user)) return res.status(404).json({ error: 'Workflow not found.' });
  try {
    const run = await ExecutionEngine.run({ workflow, user: req.user, input: req.body?.input || {}, trigger: 'manual' });
    res.json({ run });
  } catch (error) {
    res.status(422).json({ error: error.message, run: error.run || null });
  }
});

router.get('/workflows/:workflowId/runs', authenticateToken, async (req, res) => {
  const workflow = await WorkflowStore.get(req.params.workflowId);
  if (!workflow || !canAccess(workflow, req.user)) return res.status(404).json({ error: 'Workflow not found.' });
  const runs = await WorkflowStore.listRuns(req.params.workflowId);
  res.json({ runs });
});

router.get('/triggers/active', authenticateToken, async (_req, res) => {
  const workflows = await WorkflowStore.listActive();
  res.json({ triggers: workflows.map((workflow) => ({ workflowId: workflow._id, name: workflow.name, department: workflow.department })) });
});

router.get('/workflows/:workflowId/runs/:runId', authenticateToken, async (req, res) => {
  const workflow = await WorkflowStore.get(req.params.workflowId);
  if (!workflow || !canAccess(workflow, req.user)) return res.status(404).json({ error: 'Workflow not found.' });
  const run = await WorkflowStore.getRun(req.params.runId);
  if (!run || String(run.workflowId) !== String(req.params.workflowId)) return res.status(404).json({ error: 'Workflow run not found.' });
  res.json({ run });
});

router.post('/workflows/:workflowId/stop', authenticateToken, async (req, res) => {
  const workflow = await WorkflowStore.get(req.params.workflowId);
  if (!workflow || !canAccess(workflow, req.user, true)) return res.status(404).json({ error: 'Workflow not found.' });
  const run = await WorkflowStore.getRun(req.body?.runId);
  if (!run || String(run.workflowId) !== String(req.params.workflowId)) return res.status(404).json({ error: 'Workflow run not found.' });
  const stopped = await WorkflowStore.updateRun(run._id, { status: 'stopped', completedAt: new Date() });
  res.json({ run: stopped });
});

export default router;
