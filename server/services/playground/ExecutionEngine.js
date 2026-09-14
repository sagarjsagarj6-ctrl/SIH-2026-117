import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { state } from '../../config/db.js';
import { AgentRegistry } from '../../agents/AgentRegistry.js';
import { WorkflowStore } from './WorkflowStore.js';
import { NodeRegistry } from './NodeRegistry.js';
import { ImageModelService } from '../imageModel/ImageModelService.js';

export const IMAGE_MODEL_RUNTIME_TYPES = new Set([
  'input.image',
  'agent.image-model',
  'agent.hardware-manual',
  'agent.image-analysis',
  'agent.image-compare'
]);

const compact = (value, limit = 12000) => {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
};

const resolveTemplate = (value, input) => {
  if (typeof value !== 'string') return value;
  return value.replace(/{{\s*([^}]+)\s*}}/g, (_match, path) => {
    const parts = path.trim().split('.');
    let cursor = input;
    for (const part of parts) cursor = cursor?.[part];
    return cursor === undefined || cursor === null ? '' : String(cursor);
  });
};

const inputForNode = (node, edges, outputs) => {
  const incoming = edges.filter((edge) => edge.target === node.id);
  if (incoming.length === 0) return {};
  const input = {};
  for (const edge of incoming) {
    const sourceOutput = outputs.get(edge.source);
    if (sourceOutput === undefined) continue;
    const key = edge.targetHandle || edge.sourceHandle || 'data';
    input[key] = sourceOutput;
    if (sourceOutput && typeof sourceOutput === 'object' && !Array.isArray(sourceOutput)) {
      Object.assign(input, sourceOutput);
    }
  }
  return input;
};

const topologicalOrder = (nodes, edges) => {
  const ids = new Set(nodes.map((node) => node.id));
  const indegree = new Map(nodes.map((node) => [node.id, 0]));
  const adjacency = new Map(nodes.map((node) => [node.id, []]));
  for (const edge of edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target) || edge.source === edge.target) continue;
    adjacency.get(edge.source).push(edge.target);
    indegree.set(edge.target, indegree.get(edge.target) + 1);
  }

  const queue = nodes.filter((node) => indegree.get(node.id) === 0).map((node) => node.id);
  const order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const target of adjacency.get(id)) {
      indegree.set(target, indegree.get(target) - 1);
      if (indegree.get(target) === 0) queue.push(target);
    }
  }
  if (order.length !== nodes.length) throw new Error('Workflow contains a cycle. Connect nodes in one-way order.');
  return order.map((id) => nodes.find((node) => node.id === id));
};

const safeCalculate = (expression) => {
  const normalized = String(expression || '').trim();
  if (!normalized || !/^[0-9+\-*/().%\s]+$/.test(normalized)) {
    throw new Error('Calculator expressions may contain only numbers and arithmetic operators.');
  }
  // The strict character allow-list above prevents identifiers, calls, and property access.
  const value = Function(`"use strict"; return (${normalized});`)();
  if (!Number.isFinite(value)) throw new Error('Calculator result is not finite.');
  return value;
};

const executeNode = async ({ node, input, user }) => {
  const definition = NodeRegistry.get(node.type);
  if (!definition) throw new Error(`Unsupported node type: ${node.type}`);
  if (Array.isArray(definition.roles) && !definition.roles.includes(user?.role)) {
    throw new Error(`Role ${user?.role || 'Unknown'} cannot run node ${node.type}.`);
  }
  const config = node.data?.config || {};

  switch (node.type) {
    case 'trigger.manual':
    case 'trigger.schedule':
      return { input: config.input || input.input || input, triggeredAt: new Date().toISOString() };

    case 'agent.rag': {
      const query = resolveTemplate(config.query || input.query || input.text || 'Search the local knowledge base.', input);
      const message = await AgentRegistry.getAgent('RAG').run({
        query,
        user,
        inputContext: [],
        topK: Math.max(1, Math.min(10, Number(config.topK) || 4))
      });
      return message.payload?.result || {};
    }

    case 'agent.data-science': {
      const configured = String(config.dataset || '').split(/[,\s]+/).filter(Boolean).map(Number).filter(Number.isFinite);
      const dataset = Array.isArray(input.dataset) ? input.dataset : configured;
      const message = await AgentRegistry.getAgent('DATA_SCIENCE').run({ query: 'Analyze the workflow dataset.', user, dataset, inputContext: [] });
      return message.payload?.result || {};
    }

    case 'agent.reporting': {
      const message = await AgentRegistry.getAgent('REPORTING').run({
        query: config.title || 'Generate a workflow report.',
        user,
        inputContext: [{ fromAgent: 'RAGAgent', payload: { result: input } }]
      });
      return message.payload?.result || {};
    }

    case 'tool.calculator': {
      const expression = resolveTemplate(config.expression || '0', { input });
      const result = Number(safeCalculate(expression).toFixed(Math.max(0, Math.min(8, Number(config.precision) || 2))));
      return { result, expression };
    }

    case 'tool.json-transform': {
      const source = input.data ?? input;
      const operation = config.operation || 'passthrough';
      const fields = String(config.fields || '').split(',').map((field) => field.trim()).filter(Boolean);
      if (operation === 'pick' && source && typeof source === 'object') {
        return { result: Object.fromEntries(fields.map((field) => [field, source[field]]).filter(([, value]) => value !== undefined)) };
      }
      if (operation === 'omit' && source && typeof source === 'object') {
        return { result: Object.fromEntries(Object.entries(source).filter(([key]) => !fields.includes(key))) };
      }
      return { result: source };
    }

    case 'output.database': {
      const record = {
        _id: randomUUID(),
        collection: config.collection || 'workflow_results',
        workflowData: input,
        createdAt: new Date().toISOString()
      };
      state.memoryDb.workflowOutputs = state.memoryDb.workflowOutputs || [];
      state.memoryDb.workflowOutputs.unshift(record);
      return { acknowledged: true, recordId: record._id, collection: record.collection };
    }

    case 'input.image': {
      const imageUploadId = config.imageUploadId || input.imageUploadId || input.image?.imageUploadId || '';
      if (!imageUploadId) throw new Error('Add an image from camera or gallery on the Add Image node.');
      return { imageUploadId, fileName: config.fileName || input.fileName || 'capture.jpg' };
    }

    case 'train.image-model': {
      ImageModelService.assertCanTrain(user);
      const samples = [];
      if (config.imageUploadId || config.sampleName) {
        samples.push({
          uploadId: config.imageUploadId,
          name: config.sampleName,
          category: config.sampleCategory,
          metalType: config.sampleMetal,
          lifespan: config.sampleLifespan
        });
      }
      const job = await ImageModelService.train({
        user,
        jobName: config.jobName || 'Hardware Image Model',
        department: user.department,
        manuals: [],
        samples,
        manualText: config.manualText || input.manualText || ''
      });
      return { job: ImageModelService.publicJob(job), jobId: job._id };
    }

    case 'agent.image-model': {
      const query = resolveTemplate(config.query || input.query || input.text || 'Identify this hardware part.', input);
      const imageUploadId = config.imageUploadId || input.imageUploadId || input.image?.imageUploadId || '';
      return ImageModelService.analyze({ user, query, uploadId: imageUploadId });
    }

    case 'agent.hardware-manual': {
      const job = ImageModelService.getUsableJob(user);
      if (!job) throw new Error('Train an image model before running the Hardware Manual Agent.');
      const query = resolveTemplate(config.query || input.query || input.text || 'Find the matching hardware part.', input);
      const message = await AgentRegistry.getAgent('HARDWARE_MANUAL').run({
        query,
        user,
        catalogHits: ImageModelService.searchCatalog(job, query),
        job
      });
      return message.payload?.result || {};
    }

    case 'agent.image-analysis': {
      const imageUploadId = config.imageUploadId || input.imageUploadId || input.image?.imageUploadId || '';
      const inspected = await ImageModelService.inspectImage({
        user,
        query: config.query || input.query || '',
        uploadId: imageUploadId
      });
      try {
        const message = await AgentRegistry.getAgent('IMAGE_ANALYSIS').run({
          query: config.query || input.query || '',
          user,
          analysis: inspected.analysis,
          catalogHits: [],
          fileName: inspected.fileName
        });
        return message.payload?.result || {};
      } finally {
        if (inspected.cleanup) await unlink(inspected.filePath).catch(() => {});
      }
    }

    case 'agent.image-compare': {
      const query = resolveTemplate(config.query || input.query || input.text || 'Which catalog part best matches this image?', input);
      const job = ImageModelService.getUsableJob(user);
      if (!job) throw new Error('Train an image model before running the Comparison Prediction Agent.');
      const catalogHits = Array.isArray(input.matches) ? input.matches : ImageModelService.searchCatalog(job, query);
      const hardware = input.hardware || { matches: catalogHits };
      const analysisCard = input.features ? { features: input.features } : input.analysisCard;
      const message = await AgentRegistry.getAgent('IMAGE_COMPARE').run({ query, user, catalogHits, hardware, analysisCard, job });
      return message.payload?.result || {};
    }

    default:
      throw new Error(`Node type ${definition.type} is not implemented in the MVP execution engine.`);
  }
};

export class ExecutionEngine {
  static async run({ workflow, user, input = {}, trigger = 'manual' }) {
    if (!workflow.nodes?.length) throw new Error('Add at least one node before running the workflow.');
    if (workflow.nodes.length > 30) throw new Error('Workflow exceeds the 30-node MVP safety limit.');
    const usesImageRuntime = (workflow.nodes || []).some((node) => IMAGE_MODEL_RUNTIME_TYPES.has(node.type));
    if (usesImageRuntime) {
      ImageModelService.assertLanForUse(user);
    }

    const order = topologicalOrder(workflow.nodes, workflow.edges || []);
    const run = await WorkflowStore.createRun({
      workflowId: String(workflow._id),
      userId: String(user._id || user.id),
      status: 'running',
      trigger,
      startedAt: new Date(),
      nodes: [],
      finalOutput: null
    });
    const outputs = new Map();
    const startedAt = Date.now();
    let errorCount = 0;
    let finalOutput = input;

    try {
      for (const node of order) {
        const nodeStarted = Date.now();
        const nodeInput = { ...input, ...inputForNode(node, workflow.edges || [], outputs) };
        const nodeRun = { nodeId: node.id, nodeType: node.type, status: 'running', startedAt: new Date(), input: compact(nodeInput) };
        run.nodes.push(nodeRun);
        try {
          const output = await executeNode({ node, input: nodeInput, user });
          outputs.set(node.id, output);
          finalOutput = output;
          nodeRun.status = 'success';
          nodeRun.output = output;
        } catch (error) {
          errorCount += 1;
          nodeRun.status = 'failed';
          nodeRun.error = error.message;
          if (workflow.settings?.errorHandling !== 'continue') throw error;
        }
        nodeRun.completedAt = new Date();
        nodeRun.durationMs = Date.now() - nodeStarted;
        await WorkflowStore.updateRun(run._id, { nodes: run.nodes, errorCount });
      }

      const completed = await WorkflowStore.updateRun(run._id, {
        status: errorCount ? 'failed' : 'success',
        completedAt: new Date(),
        totalDuration: Date.now() - startedAt,
        errorCount,
        finalOutput
      });
      await WorkflowStore.incrementRunCount(workflow._id);
      return completed;
    } catch (error) {
      const failed = await WorkflowStore.updateRun(run._id, {
        status: 'failed',
        completedAt: new Date(),
        totalDuration: Date.now() - startedAt,
        errorCount: errorCount + 1,
        finalOutput,
        error: error.message
      });
      await WorkflowStore.incrementRunCount(workflow._id);
      throw Object.assign(new Error(error.message), { run: failed });
    }
  }
}
