/**
 * ToolPermissionService
 *
 * Canonical, server-side registry for sensitive AI tools.  It closes the gap
 * between a UI-level role check and an enforceable API/tool policy by keeping
 * a machine-readable contract for each tool and evaluating it before work is
 * dispatched.
 */

import { PolicyEngine } from './PolicyEngine.js';

const baseAgentInput = {
  type: 'object',
  required: ['prompt'],
  properties: {
    prompt: { type: 'string', maxLength: 10_000 },
    parameters: { type: 'object', required: false },
    imageText: { type: 'string', maxLength: 50_000, required: false },
    imageBase64: { type: 'string', maxLength: 2_000_000, required: false },
    dataset: { type: 'array', required: false }
  }
};

const toolDefinitions = [
  {
    id: 'agent.query.rag',
    name: 'Run knowledge retrieval agent',
    description: 'Searches only the caller-authorized local knowledge partition and returns cited evidence.',
    resourceType: 'agent',
    action: 'execute',
    requiredPermission: 'agent.execute',
    riskLevel: 'MEDIUM',
    allowedRoles: ['Admin', 'Manager', 'Employee'],
    inputSchema: baseAgentInput,
    outputSchema: { answer: 'string', citations: 'array', inference: 'object' },
    requiresHumanApproval: false
  },
  {
    id: 'agent.query.data-science',
    name: 'Run data-science agent',
    description: 'Performs bounded statistical analysis on caller-supplied or authorized departmental data.',
    resourceType: 'agent',
    action: 'execute',
    requiredPermission: 'agent.execute',
    riskLevel: 'MEDIUM',
    allowedRoles: ['Admin', 'Manager', 'Employee'],
    inputSchema: baseAgentInput,
    outputSchema: { summary: 'string', statistics: 'object', anomalies: 'object', charts: 'object' },
    requiresHumanApproval: false
  },
  {
    id: 'agent.query.vision',
    name: 'Run local vision and OCR agent',
    description: 'Inspects a supplied image using approved local OCR and optional local multimodal inference.',
    resourceType: 'agent',
    action: 'execute',
    requiredPermission: 'agent.execute',
    riskLevel: 'MEDIUM',
    allowedRoles: ['Admin', 'Manager', 'Employee'],
    inputSchema: baseAgentInput,
    outputSchema: { ocrResult: 'object', observations: 'array', inferences: 'array', verification: 'object' },
    requiresHumanApproval: false
  },
  {
    id: 'agent.query.reporting',
    name: 'Run reporting agent',
    description: 'Builds a report from already-authorized agent outputs and attached evidence.',
    resourceType: 'agent',
    action: 'execute',
    requiredPermission: 'agent.execute',
    riskLevel: 'MEDIUM',
    allowedRoles: ['Admin', 'Manager', 'Employee'],
    inputSchema: baseAgentInput,
    outputSchema: { reportTitle: 'string', sections: 'array', markdown: 'string' },
    requiresHumanApproval: false
  },
  {
    id: 'agent.orchestrate.execute',
    name: 'Run multi-agent orchestration',
    description: 'Coordinates approved specialist agents under the caller department scope.',
    resourceType: 'agent',
    action: 'execute',
    requiredPermission: 'agent.execute',
    riskLevel: 'MEDIUM',
    allowedRoles: ['Admin', 'Manager', 'Employee'],
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string', maxLength: 10_000 },
        mode: { type: 'string', required: false },
        specificAgent: { type: 'string', required: false }
      }
    },
    outputSchema: { result: 'object', citations: 'array', trace: 'object' },
    requiresHumanApproval: false
  },
  {
    id: 'model.finetune.execute',
    name: 'Start model fine-tuning',
    description: 'Creates a local fine-tuning job that can consume approved training data and deploy a model artifact.',
    resourceType: 'finetune',
    action: 'execute',
    requiredPermission: 'finetune.execute',
    riskLevel: 'HIGH',
    allowedRoles: ['Admin', 'Manager'],
    inputSchema: { type: 'object', required: ['baseModel', 'datasetId'], properties: {} },
    outputSchema: { jobId: 'string', status: 'string' },
    requiresHumanApproval: true
  }
];

const toolsById = new Map(toolDefinitions.map((tool) => [tool.id, Object.freeze(tool)]));

const agentToolIds = Object.freeze({
  RAG: 'agent.query.rag',
  DATA_SCIENCE: 'agent.query.data-science',
  VISION: 'agent.query.vision',
  REPORTING: 'agent.query.reporting'
});

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);

/**
 * Enforces the tool contract before a backend executes an agent or other
 * privileged operation.  It deliberately does not trust a client-provided
 * role, department, or approval flag.
 */
export class ToolPermissionService {
  static listTools() {
    return toolDefinitions.map((tool) => ({ ...tool }));
  }

  static getTool(toolId) {
    return toolsById.get(String(toolId || '')) || null;
  }

  static toolIdForAgent(agentType) {
    return agentToolIds[String(agentType || '').trim().toUpperCase()] || null;
  }

  static validateInput(toolId, payload = {}) {
    const tool = this.getTool(toolId);
    if (!tool) return { valid: false, errors: ['Unknown tool.'] };

    const schema = tool.inputSchema || {};
    const properties = schema.properties || {};
    const errors = [];

    for (const requiredName of schema.required || []) {
      const value = payload[requiredName];
      if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
        errors.push(`Missing required input: ${requiredName}.`);
      }
    }

    for (const [name, definition] of Object.entries(properties)) {
      if (!hasOwn(payload, name) || payload[name] === undefined || payload[name] === null) continue;
      const value = payload[name];
      if (definition.type === 'array' && !Array.isArray(value)) {
        errors.push(`${name} must be an array.`);
      } else if (definition.type === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
        errors.push(`${name} must be an object.`);
      } else if (definition.type === 'string' && typeof value !== 'string') {
        errors.push(`${name} must be a string.`);
      }
      if (typeof value === 'string' && Number.isFinite(definition.maxLength) && value.length > definition.maxLength) {
        errors.push(`${name} exceeds the maximum length of ${definition.maxLength}.`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  static authorize({ toolId, user, resource = {}, context = {} } = {}) {
    const tool = this.getTool(toolId);
    if (!tool) {
      return {
        allowed: false,
        tool: null,
        approval: { required: false, satisfied: false },
        reasons: ['The requested tool is not registered.']
      };
    }

    if (!user?.role) {
      return {
        allowed: false,
        tool,
        approval: { required: tool.requiresHumanApproval, satisfied: false },
        reasons: ['An authenticated user role is required.']
      };
    }

    if (!tool.allowedRoles.includes(user.role)) {
      return {
        allowed: false,
        tool,
        approval: { required: tool.requiresHumanApproval, satisfied: false },
        reasons: [`Role ${user.role} is not allowed to run ${tool.name}.`]
      };
    }

    const policy = PolicyEngine.evaluate({
      user,
      resource: {
        type: tool.resourceType,
        department: resource.department || user.department,
        sensitivity: resource.sensitivity,
        whitelistedUsers: resource.whitelistedUsers
      },
      action: tool.action,
      context
    });

    const approval = {
      required: Boolean(tool.requiresHumanApproval),
      satisfied: Boolean(context.approval?.approved && context.approval?.approvedBy)
    };

    if (approval.required && !approval.satisfied) {
      return {
        allowed: false,
        tool,
        riskLevel: tool.riskLevel,
        approval,
        reasons: [...(policy.reasons || []), 'A recorded human approval is required before this high-risk tool can run.']
      };
    }

    return {
      allowed: Boolean(policy.allowed),
      tool,
      riskLevel: tool.riskLevel,
      approval,
      reasons: policy.reasons || []
    };
  }
}

export { agentToolIds as AGENT_TOOL_IDS, toolDefinitions as TOOL_DEFINITIONS };
