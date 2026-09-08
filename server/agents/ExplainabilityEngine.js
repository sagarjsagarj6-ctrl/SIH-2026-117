/**
 * ExplainabilityEngine — Records and structures the full step-by-step reasoning trace
 * of multi-agent operations for transparent enterprise governance and audit compliance.
 */

import { v4 as uuidv4 } from 'uuid';

export class ExplainabilityEngine {
  static createTrace(queryId, userQuery, mode = 'SINGLE') {
    return {
      traceId: 'trace_' + uuidv4().substring(0, 8),
      queryId: queryId || 'qid_' + Date.now(),
      userQuery,
      orchestrationMode: mode,
      agentChain: [],
      steps: [], // { stepNumber, agent, action, reasoning, confidence, sourcesUsed, latencyMs }
      aggregateMetrics: {
        totalTokens: 0,
        totalLatencyMs: 0,
        averageConfidence: 0
      },
      completedAt: null
    };
  }

  static addStep(trace, { stepNumber, agent, action, reasoning, confidence, sourcesUsed = [], latencyMs = 0, tokensUsed = 0 }) {
    if (!trace.agentChain.includes(agent)) {
      trace.agentChain.push(agent);
    }

    trace.steps.push({
      stepNumber,
      agent,
      action,
      reasoning,
      confidence: Number((confidence || 0.95).toFixed(3)),
      sourcesUsed,
      latencyMs,
      tokensUsed,
      timestamp: new Date().toISOString()
    });

    trace.aggregateMetrics.totalTokens += (tokensUsed || 0);
    trace.aggregateMetrics.totalLatencyMs += (latencyMs || 0);

    const totalConf = trace.steps.reduce((acc, s) => acc + s.confidence, 0);
    trace.aggregateMetrics.averageConfidence = Number((totalConf / trace.steps.length).toFixed(3));
  }

  static finalizeTrace(trace) {
    trace.completedAt = new Date().toISOString();
    return trace;
  }
}
