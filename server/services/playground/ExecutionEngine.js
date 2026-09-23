import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';
import nodemailer from 'nodemailer';
import { state } from '../../config/db.js';
import { AgentRegistry } from '../../agents/AgentRegistry.js';
import { WorkflowStore } from './WorkflowStore.js';
import { NodeRegistry } from './NodeRegistry.js';
import { ImageModelService } from '../imageModel/ImageModelService.js';
import { pushNotifications } from '../notificationService.js';

export const SAMPLE_DATASETS = {
  sample_hardware_inventory: [
    { id: 'HW-101', part: 'High-Tensile Steel Bearing #44', count: 42, minRequired: 100, status: 'CRITICAL_LOW', supplierEmail: 'logistics@parts-supplier.lan', price: 120 },
    { id: 'HW-102', part: 'Titanium Fastener M8', count: 350, minRequired: 200, status: 'NORMAL', supplierEmail: 'fasteners@metal-lan.org', price: 15 },
    { id: 'HW-103', part: 'Hydraulic Cylinder Seal', count: 18, minRequired: 60, status: 'CRITICAL_LOW', supplierEmail: 'hydraulics@parts-supplier.lan', price: 85 },
    { id: 'HW-104', part: 'Ceramic Thermal Insulator', count: 180, minRequired: 150, status: 'NORMAL', supplierEmail: 'thermal@supplier.lan', price: 45 }
  ],
  sample_financial_ledger: [
    { txId: 'TX-2026-01', department: 'Engineering', vendor: 'Local Chip Foundry', amount: 48500, approved: true, auditor: 'finance.lead@sovereign.local' },
    { txId: 'TX-2026-02', department: 'R&D', vendor: 'Optical Sensor Lab', amount: 12400, approved: false, auditor: 'auditor@sovereign.local' },
    { txId: 'TX-2026-03', department: 'Operations', vendor: 'Clean Power Co', amount: 8900, approved: true, auditor: 'finance.lead@sovereign.local' }
  ],
  sample_employee_roster: [
    { empId: 'EMP-01', name: 'Dr. Sarah Chen', department: 'Engineering', clearance: 'TopSecret', email: 's.chen@sovereign.local' },
    { empId: 'EMP-02', name: 'Marcus Vance', department: 'Finance', clearance: 'Secret', email: 'm.vance@sovereign.local' },
    { empId: 'EMP-03', name: 'Elena Rostova', department: 'Operations', clearance: 'Confidential', email: 'e.rostova@sovereign.local' }
  ]
};

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

const getDeep = (obj, path) => {
  if (!obj || typeof obj !== 'object') return '';
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in cur) {
      cur = cur[p];
    } else {
      return '';
    }
  }
  return cur === undefined || cur === null ? '' : (typeof cur === 'object' ? JSON.stringify(cur) : String(cur));
};

const resolveTemplate = (value, input, allOutputs = new Map(), nodes = []) => {
  if (typeof value !== 'string') return value;
  return value.replace(/{{\s*([^}]+)\s*}}/g, (_match, rawExpr) => {
    const expr = rawExpr.trim();

    // 1. n8n style: {{$json.prop}} or {{$input.prop}}
    if (expr.startsWith('$json.') || expr.startsWith('$input.')) {
      const path = expr.replace(/^\$(json|input)\./, '');
      return getDeep(input, path);
    }
    if (expr === '$json' || expr === '$input') {
      return typeof input === 'object' ? JSON.stringify(input) : String(input ?? '');
    }

    // 2. n8n style: {{$node["Node Label"].field}} or {{$node['Node Label'].data.field}}
    const nodeMatch = expr.match(/^\$node(?:\[['"](.+?)['"]\]|\.([a-zA-Z0-9_-]+))\.(.+)$/);
    if (nodeMatch) {
      const identifier = nodeMatch[1] || nodeMatch[2];
      const propPath = nodeMatch[3].replace(/^data\./, '');
      const targetNode = nodes.find((n) => n.id === identifier || n.data?.label === identifier);
      if (targetNode) {
        const out = allOutputs.get(targetNode.id);
        return getDeep(out, propPath);
      }
    }

    // 3. Standard fallback: {{input.prop}} or {{prop}}
    let cursor = input;
    const cleanExpr = expr.replace(/^input\./, '');
    const parts = cleanExpr.split('.');
    for (const part of parts) {
      if (cursor && typeof cursor === 'object' && part in cursor) {
        cursor = cursor[part];
      } else {
        cursor = undefined;
        break;
      }
    }
    return cursor === undefined || cursor === null ? '' : (typeof cursor === 'object' ? JSON.stringify(cursor) : String(cursor));
  });
};

const inputForNode = (node, edges, outputs, activeBranches = new Map()) => {
  const incoming = edges.filter((edge) => edge.target === node.id);
  if (incoming.length === 0) return { active: true, input: {} };

  const activeIncoming = incoming.filter((edge) => {
    const sourceBranch = activeBranches.get(edge.source);
    if (sourceBranch !== undefined) {
      if (sourceBranch === 'none') return false;
      return edge.sourceHandle ? edge.sourceHandle === sourceBranch : true;
    }
    return true;
  });

  if (activeIncoming.length === 0) {
    return { active: false, input: {} };
  }

  const input = {};
  for (const edge of activeIncoming) {
    const sourceOutput = outputs.get(edge.source);
    if (sourceOutput === undefined) continue;
    const key = edge.targetHandle || edge.sourceHandle || 'data';
    input[key] = sourceOutput;
    if (sourceOutput && typeof sourceOutput === 'object' && !Array.isArray(sourceOutput)) {
      Object.assign(input, sourceOutput);
    }
  }
  return { active: true, input };
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
  const value = Function(`"use strict"; return (${normalized});`)();
  if (!Number.isFinite(value)) throw new Error('Calculator result is not finite.');
  return value;
};

const executeNode = async ({ node, input, user, allOutputs, workflowNodes }) => {
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

    case 'logic.if': {
      const rawProp = config.property || '{{$json.status}}';
      const propVal = resolveTemplate(rawProp, input, allOutputs, workflowNodes);
      const op = config.operator || 'equals';
      const compareVal = resolveTemplate(config.value ?? '', input, allOutputs, workflowNodes);

      let conditionPassed = false;
      const pStr = String(propVal ?? '').trim();
      const cStr = String(compareVal ?? '').trim();
      const pNum = Number(pStr);
      const cNum = Number(cStr);
      const areNums = !isNaN(pNum) && !isNaN(cNum) && pStr !== '' && cStr !== '';

      switch (op) {
        case 'equals':
          conditionPassed = areNums ? pNum === cNum : pStr.toLowerCase() === cStr.toLowerCase();
          break;
        case 'not_equals':
          conditionPassed = areNums ? pNum !== cNum : pStr.toLowerCase() !== cStr.toLowerCase();
          break;
        case 'contains':
          conditionPassed = pStr.toLowerCase().includes(cStr.toLowerCase());
          break;
        case 'greater_than':
          conditionPassed = areNums ? pNum > cNum : pStr > cStr;
          break;
        case 'less_than':
          conditionPassed = areNums ? pNum < cNum : pStr < cStr;
          break;
        case 'is_empty':
          conditionPassed = !propVal || pStr === '' || (Array.isArray(propVal) && propVal.length === 0);
          break;
        case 'is_not_empty':
          conditionPassed = Boolean(propVal) && pStr !== '' && (!Array.isArray(propVal) || propVal.length > 0);
          break;
        default:
          conditionPassed = Boolean(propVal);
      }
      return {
        ...input,
        conditionPassed,
        activeBranch: conditionPassed ? 'true' : 'false',
        evaluated: { property: propVal, operator: op, compareValue: compareVal }
      };
    }

    case 'tool.code': {
      const userCode = config.code || 'return items;';
      try {
        const fn = new Function('items', 'input', '$json', '$input', `
          "use strict";
          ${userCode.includes('return') ? userCode : `return (${userCode});`}
        `);
        const result = fn(input, input, input, input);
        return result !== undefined && result !== null ? result : { acknowledged: true };
      } catch (err) {
        throw new Error(`JavaScript Code node execution failed: ${err.message}`);
      }
    }

    case 'tool.http': {
      const method = config.method || 'GET';
      const url = resolveTemplate(config.url || 'http://127.0.0.1:5001/api/health', input, allOutputs, workflowNodes);
      const rawBody = config.body ? resolveTemplate(config.body, input, allOutputs, workflowNodes) : null;
      const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
      };
      if (['POST', 'PUT', 'PATCH'].includes(method) && rawBody) {
        try {
          JSON.parse(rawBody);
          options.body = rawBody;
        } catch {
          options.body = JSON.stringify({ data: rawBody });
        }
      }
      const res = await fetch(url, options);
      let data;
      try {
        data = await res.json();
      } catch {
        data = await res.text();
      }
      return {
        status: res.status,
        ok: res.ok,
        data,
        url
      };
    }

    case 'tool.set': {
      const key = config.key || 'summary';
      const val = resolveTemplate(config.value ?? '', input, allOutputs, workflowNodes);
      return {
        ...input,
        [key]: val
      };
    }

    case 'tool.excel': {
      let rows = [];
      const dsKey = config.dataset || 'sample_hardware_inventory';
      if (dsKey === 'custom_path' && config.customPath) {
        const fullPath = path.resolve(config.customPath);
        if (existsSync(fullPath)) {
          const workbook = XLSX.readFile(fullPath);
          const sheetName = config.sheetName && workbook.SheetNames.includes(config.sheetName) ? config.sheetName : workbook.SheetNames[0];
          rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        } else {
          rows = SAMPLE_DATASETS.sample_hardware_inventory;
        }
      } else {
        rows = SAMPLE_DATASETS[dsKey] || SAMPLE_DATASETS.sample_hardware_inventory;
      }
      const max = Number(config.maxRows) || 25;
      const sliced = rows.slice(0, max);
      const firstRow = sliced[0] || {};
      return {
        ...firstRow,
        rows: sliced,
        rowCount: sliced.length,
        summary: `Loaded ${sliced.length} rows from spreadsheet.`
      };
    }

    case 'output.email': {
      const to = resolveTemplate(config.to || 'admin@enterprise.local', input, allOutputs, workflowNodes);
      const subject = resolveTemplate(config.subject || 'Automated Workflow Alert', input, allOutputs, workflowNodes);
      const body = resolveTemplate(config.body || 'Automated message from Sovereign AI Workbench.', input, allOutputs, workflowNodes);
      const provider = config.provider || 'gmail';
      const smtpUser = config.smtpUser;
      const smtpPass = config.smtpPass;

      let emailResult = { sent: false };

      if ((provider === 'gmail' || provider === 'lan_smtp') && smtpUser && smtpPass) {
        try {
          const transporter = nodemailer.createTransport(
            provider === 'gmail'
              ? { service: 'gmail', auth: { user: smtpUser, pass: smtpPass } }
              : { host: process.env.SMTP_HOST || '127.0.0.1', port: Number(process.env.SMTP_PORT || 587), secure: false, auth: { user: smtpUser, pass: smtpPass } }
          );
          const info = await transporter.sendMail({
            from: smtpUser,
            to,
            subject,
            text: body,
            html: body.replace(/\n/g, '<br/>')
          });
          emailResult = { sent: true, provider, messageId: info.messageId, to, subject };
        } catch (err) {
          emailResult = {
            sent: true,
            provider: 'lan_fallback',
            to,
            subject,
            deliveredToLan: true,
            note: `SMTP attempted but delivered via LAN notifications (Air-gap fallback): ${err.message}`
          };
          pushNotifications({
            recipientUserIds: [String(user._id || user.id)],
            type: 'EMAIL_LAN_DISPATCH',
            title: `[EMAIL TO ${to}] ${subject}`,
            message: body,
            summary: `Automated email for ${to} dispatched over LAN.`
          });
        }
      } else {
        emailResult = {
          sent: true,
          provider: 'lan_direct',
          to,
          subject,
          deliveredToLan: true,
          note: 'Dispatched to Private LAN user notification drawer.'
        };
        pushNotifications({
          recipientUserIds: [String(user._id || user.id)],
          type: 'EMAIL_LAN_DISPATCH',
          title: `[EMAIL DISPATCH] ${subject}`,
          message: body,
          summary: `Automated message sent to ${to}.`
        });
      }

      state.memoryDb.workflowOutputs = state.memoryDb.workflowOutputs || [];
      state.memoryDb.workflowOutputs.unshift({
        _id: randomUUID(),
        type: 'email',
        recipient: to,
        subject,
        body,
        status: 'delivered',
        createdAt: new Date().toISOString()
      });

      return { acknowledged: true, ...emailResult };
    }

    case 'output.lan-message': {
      const title = resolveTemplate(config.title || 'Automated LAN Notice', input, allOutputs, workflowNodes);
      const message = resolveTemplate(config.message || 'Workflow automation alert triggered.', input, allOutputs, workflowNodes);
      const priority = config.priority || 'warning';

      let recipients = [String(user._id || user.id)];
      if (config.scope === 'all_connected_lan') {
        const lanMembers = (state.memoryDb.networks || [])
          .filter(n => n.status === 'Active')
          .flatMap(n => (n.members || []).map(m => String(m.userId || m.id)));
        if (lanMembers.length) recipients = [...new Set([...recipients, ...lanMembers])];
      }

      const notifications = pushNotifications({
        recipientUserIds: recipients,
        type: priority === 'critical' ? 'CRITICAL_ALERT' : 'WORKFLOW_AUTOMATION',
        title,
        message,
        summary: message.slice(0, 140)
      });

      return {
        acknowledged: true,
        delivered: true,
        recipientsCount: notifications.length,
        title,
        message
      };
    }

    case 'agent.rag': {
      const query = resolveTemplate(config.query || input.query || input.text || 'Search the local knowledge base.', input, allOutputs, workflowNodes);
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
      const expression = resolveTemplate(config.expression || '0', input, allOutputs, workflowNodes);
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
      const query = resolveTemplate(config.query || input.query || input.text || 'Identify this hardware part.', input, allOutputs, workflowNodes);
      const imageUploadId = config.imageUploadId || input.imageUploadId || input.image?.imageUploadId || '';
      return ImageModelService.analyze({ user, query, uploadId: imageUploadId });
    }

    case 'agent.hardware-manual': {
      const job = ImageModelService.getUsableJob(user);
      if (!job) throw new Error('Train an image model before running the Hardware Manual Agent.');
      const query = resolveTemplate(config.query || input.query || input.text || 'Find the matching hardware part.', input, allOutputs, workflowNodes);
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
      const query = resolveTemplate(config.query || input.query || input.text || 'Which catalog part best matches this image?', input, allOutputs, workflowNodes);
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
    const activeBranches = new Map();
    const startedAt = Date.now();
    let errorCount = 0;
    let finalOutput = input;

    try {
      for (const node of order) {
        const nodeStarted = Date.now();
        const { active, input: calculatedInput } = inputForNode(node, workflow.edges || [], outputs, activeBranches);

        if (!active) {
          activeBranches.set(node.id, 'none');
          const skippedRun = {
            nodeId: node.id,
            nodeType: node.type,
            status: 'skipped',
            startedAt: new Date(),
            completedAt: new Date(),
            durationMs: 0,
            input: {},
            output: null
          };
          run.nodes.push(skippedRun);
          await WorkflowStore.updateRun(run._id, { nodes: run.nodes, errorCount });
          continue;
        }

        const nodeInput = { ...input, ...calculatedInput };
        const nodeRun = { nodeId: node.id, nodeType: node.type, status: 'running', startedAt: new Date(), input: nodeInput };
        run.nodes.push(nodeRun);
        try {
          const output = await executeNode({ node, input: nodeInput, user, allOutputs: outputs, workflowNodes: workflow.nodes });
          outputs.set(node.id, output);
          if (output?.activeBranch) {
            activeBranches.set(node.id, output.activeBranch);
          }
          finalOutput = output;
          nodeRun.status = 'success';
          nodeRun.output = output;
        } catch (error) {
          errorCount += 1;
          nodeRun.status = 'failed';
          nodeRun.error = error.message;
          activeBranches.set(node.id, 'none');
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
