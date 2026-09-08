/**
 * Standardized Agent Message Format
 * Enforces structured communication across all specialist agents and the orchestrator.
 */

import { v4 as uuidv4 } from 'uuid';

export class AgentMessage {
  static create({
    fromAgent,
    toAgent,
    type = 'TASK_REQUEST', // 'TASK_REQUEST' | 'TASK_RESULT' | 'ERROR' | 'HANDOFF'
    priority = 'HIGH',
    query = '',
    context = [],
    result = {},
    confidence = 0.95,
    citations = [],
    metadata = {}
  }) {
    return {
      id: 'msg_' + uuidv4().substring(0, 8),
      fromAgent,
      toAgent,
      type,
      priority,
      payload: {
        query,
        context,
        result,
        confidence,
        citations,
        metadata: {
          tokensUsed: metadata.tokensUsed || 0,
          latencyMs: metadata.latencyMs || 0,
          modelUsed: metadata.modelUsed || 'Mistral-7B-v0.3-Enterprise',
          timestamp: new Date().toISOString(),
          ...metadata
        }
      },
      timestamp: new Date().toISOString()
    };
  }
}
