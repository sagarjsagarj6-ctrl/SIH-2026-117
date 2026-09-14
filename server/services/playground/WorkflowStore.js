import { randomUUID } from 'node:crypto';
import { state } from '../../config/db.js';
import PlaygroundWorkflow from '../../models/Workflow.js';
import PlaygroundWorkflowRun from '../../models/WorkflowRun.js';
import User from '../../models/User.js';

const userId = (user) => String(user?._id || user?.id || '');
const now = () => new Date().toISOString();

const cleanNode = (node) => ({
  id: String(node.id),
  type: String(node.type),
  position: {
    x: Number(node.position?.x) || 0,
    y: Number(node.position?.y) || 0
  },
  data: node.data && typeof node.data === 'object' ? node.data : {}
});

const cleanEdge = (edge) => ({
  id: String(edge.id || randomUUID()),
  source: String(edge.source),
  sourceHandle: String(edge.sourceHandle || 'output'),
  target: String(edge.target),
  targetHandle: String(edge.targetHandle || 'input')
});

const normalize = (workflow, fallback = {}) => ({
  ...workflow,
  _id: String(workflow._id || workflow.id),
  name: workflow.name || fallback.name || 'Untitled Workflow',
  description: workflow.description || '',
  ownerId: String(workflow.ownerId || fallback.ownerId || ''),
  department: workflow.department || fallback.department || 'All',
  nodes: (workflow.nodes || []).map(cleanNode),
  edges: (workflow.edges || []).map(cleanEdge),
  settings: {
    concurrency: Number(workflow.settings?.concurrency) || 1,
    errorHandling: workflow.settings?.errorHandling === 'continue' ? 'continue' : 'stop',
    timeout: Number(workflow.settings?.timeout) || 300000
  },
  runCount: Number(workflow.runCount) || 0,
  isActive: Boolean(workflow.isActive),
  createdAt: workflow.createdAt || now(),
  updatedAt: workflow.updatedAt || now()
});

export class WorkflowStore {
  static async listForUser(user) {
    const id = userId(user);
    if (state.isMongooseConnected) {
      const filter = user.role === 'Admin'
        ? {}
        : user.role === 'Manager'
          ? { department: user.department }
          : { ownerId: id };
      const records = await PlaygroundWorkflow.find(filter).sort({ updatedAt: -1 }).lean();
      return records.map((record) => normalize(record));
    }

    const visible = (state.memoryDb.playgroundWorkflows || []).filter((workflow) => (
      user.role === 'Admin'
      || (user.role === 'Manager' && workflow.department === user.department)
      || workflow.ownerId === id
    ));
    return visible.map((workflow) => normalize(workflow));
  }

  static async get(id) {
    if (state.isMongooseConnected) {
      const record = await PlaygroundWorkflow.findById(id).lean();
      return record ? normalize(record) : null;
    }
    const record = (state.memoryDb.playgroundWorkflows || []).find((workflow) => String(workflow._id) === String(id));
    return record ? normalize(record) : null;
  }

  static async listActive() {
    if (state.isMongooseConnected) {
      const records = await PlaygroundWorkflow.find({ isActive: true }).lean();
      return records.map((record) => normalize(record));
    }
    return (state.memoryDb.playgroundWorkflows || [])
      .filter((workflow) => workflow.isActive)
      .map((workflow) => normalize(workflow));
  }

  static async getOwner(workflow) {
    if (state.isMongooseConnected) return User.findById(workflow.ownerId).select('-password').lean();
    return (state.memoryDb.users || []).find((user) => String(user._id || user.id) === String(workflow.ownerId)) || null;
  }

  static async listActive() {
    if (state.isMongooseConnected) {
      const records = await PlaygroundWorkflow.find({ isActive: true }).lean();
      return records.map((record) => normalize(record));
    }
    return (state.memoryDb.playgroundWorkflows || [])
      .filter((workflow) => workflow.isActive)
      .map((workflow) => normalize(workflow));
  }

  static async getOwner(workflow) {
    if (state.isMongooseConnected) return User.findById(workflow.ownerId).select('-password').lean();
    return (state.memoryDb.users || []).find((user) => String(user._id || user.id) === String(workflow.ownerId)) || null;
  }

  static async create(payload, user) {
    const base = normalize({
      _id: randomUUID(),
      name: payload.name,
      description: payload.description,
      ownerId: userId(user),
      department: user.department,
      nodes: payload.nodes || [],
      edges: payload.edges || [],
      settings: payload.settings || {}
    });

    if (state.isMongooseConnected) {
      const created = await PlaygroundWorkflow.create({ ...base, _id: undefined });
      return normalize(created.toObject());
    }
    state.memoryDb.playgroundWorkflows.unshift(base);
    return base;
  }

  static async update(id, payload) {
    const update = {
      ...(payload.name !== undefined ? { name: String(payload.name).trim() } : {}),
      ...(payload.description !== undefined ? { description: String(payload.description) } : {}),
      ...(payload.nodes !== undefined ? { nodes: payload.nodes.map(cleanNode) } : {}),
      ...(payload.edges !== undefined ? { edges: payload.edges.map(cleanEdge) } : {}),
      ...(payload.settings !== undefined ? { settings: payload.settings } : {}),
      ...(payload.isActive !== undefined ? { isActive: Boolean(payload.isActive) } : {}),
      updatedAt: new Date()
    };

    if (state.isMongooseConnected) {
      const updated = await PlaygroundWorkflow.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean();
      return updated ? normalize(updated) : null;
    }
    const index = (state.memoryDb.playgroundWorkflows || []).findIndex((workflow) => String(workflow._id) === String(id));
    if (index === -1) return null;
    state.memoryDb.playgroundWorkflows[index] = normalize({ ...state.memoryDb.playgroundWorkflows[index], ...update });
    return state.memoryDb.playgroundWorkflows[index];
  }

  static async remove(id) {
    if (state.isMongooseConnected) {
      const deleted = await PlaygroundWorkflow.findByIdAndDelete(id).lean();
      if (deleted) await PlaygroundWorkflowRun.deleteMany({ workflowId: String(id) });
      return Boolean(deleted);
    }
    const workflows = state.memoryDb.playgroundWorkflows || [];
    const before = workflows.length;
    state.memoryDb.playgroundWorkflows = workflows.filter((workflow) => String(workflow._id) !== String(id));
    state.memoryDb.playgroundRuns = (state.memoryDb.playgroundRuns || []).filter((run) => String(run.workflowId) !== String(id));
    return state.memoryDb.playgroundWorkflows.length < before;
  }

  static async clone(id, user) {
    const source = await this.get(id);
    if (!source) return null;
    return this.create({
      name: `${source.name} (copy)`,
      description: source.description,
      nodes: source.nodes,
      edges: source.edges,
      settings: source.settings
    }, user);
  }

  static async incrementRunCount(id) {
    if (state.isMongooseConnected) {
      await PlaygroundWorkflow.findByIdAndUpdate(id, { $inc: { runCount: 1 }, lastRunAt: new Date() });
      return;
    }
    const workflow = (state.memoryDb.playgroundWorkflows || []).find((item) => String(item._id) === String(id));
    if (workflow) {
      workflow.runCount = Number(workflow.runCount || 0) + 1;
      workflow.lastRunAt = now();
      workflow.updatedAt = now();
    }
  }

  static async createRun(payload) {
    if (state.isMongooseConnected) {
      const created = await PlaygroundWorkflowRun.create(payload);
      return created.toObject();
    }
    const run = { _id: randomUUID(), ...payload, createdAt: now(), updatedAt: now() };
    state.memoryDb.playgroundRuns.unshift(run);
    return run;
  }

  static async updateRun(id, payload) {
    if (state.isMongooseConnected) {
      const updated = await PlaygroundWorkflowRun.findByIdAndUpdate(id, { ...payload, updatedAt: new Date() }, { new: true }).lean();
      return updated;
    }
    const index = (state.memoryDb.playgroundRuns || []).findIndex((run) => String(run._id) === String(id));
    if (index === -1) return null;
    state.memoryDb.playgroundRuns[index] = { ...state.memoryDb.playgroundRuns[index], ...payload, updatedAt: now() };
    return state.memoryDb.playgroundRuns[index];
  }

  static async listRuns(workflowId) {
    if (state.isMongooseConnected) {
      return PlaygroundWorkflowRun.find({ workflowId: String(workflowId) }).sort({ startedAt: -1 }).lean();
    }
    return (state.memoryDb.playgroundRuns || [])
      .filter((run) => String(run.workflowId) === String(workflowId))
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  }

  static async getRun(runId) {
    if (state.isMongooseConnected) return PlaygroundWorkflowRun.findById(runId).lean();
    return (state.memoryDb.playgroundRuns || []).find((run) => String(run._id) === String(runId)) || null;
  }
}
