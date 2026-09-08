/**
 * AgentAuditLogger — Dedicated audit logger for multi-agent executions and explainability traces.
 */

import { createAuditEntry } from '../middleware/auth.js';

export class AgentAuditLogger {
  static async logExecution({ user, mode, agentsInvolved, query, trace, status = 'SUCCESS', details = '' }) {
    try {
      await createAuditEntry({
        userId: user._id || user.id || 'system',
        userName: user.name || 'System User',
        role: user.role || 'Employee',
        department: user.department || 'All',
        action: `MULTI_AGENT_${mode}_EXECUTION`,
        resource: `/api/agents/orchestrate`,
        status,
        details: details || `Orchestrated [${agentsInvolved.join(' -> ')}] under ${mode} mode for query: "${query.substring(0, 50)}...". Avg Confidence: ${(trace?.aggregateMetrics?.averageConfidence * 100 || 95).toFixed(1)}%`
      });
    } catch (err) {
      console.warn('[AgentAuditLogger] Failed to write audit:', err.message);
    }
  }
}
