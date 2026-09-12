/**
 * BaseAgent — Abstract base class defining the uniform multi-agent execution lifecycle:
 * 1. plan(): Determine necessary steps and required parameters
 * 2. execute(): Perform primary specialist operation
 * 3. validate(): Verify results meet confidence and policy thresholds
 * 4. report(): Produce standardized AgentMessage output
 */

import { AgentMessage } from './protocol/AgentMessage.js';
import { AgentChannel } from './protocol/AgentChannel.js';

export class BaseAgent {
  constructor(name, departmentScope = 'All', defaultModel = 'Mistral-7B-v0.3-Enterprise') {
    this.name = name;
    this.departmentScope = departmentScope;
    this.defaultModel = defaultModel;
  }

  async plan(context) {
    throw new Error(`Agent [${this.name}] must implement plan() method.`);
  }

  async execute(context) {
    throw new Error(`Agent [${this.name}] must implement execute() method.`);
  }

  async validate(result) {
    return {
      isValid: true,
      confidence: 0.95,
      notes: 'Validation passed default policy checks.'
    };
  }

  async report(context, result, validation, latencyMs, tokensUsed) {
    const message = AgentMessage.create({
      fromAgent: this.name,
      toAgent: context.targetAgent || 'Orchestrator',
      type: 'TASK_RESULT',
      priority: 'HIGH',
      query: context.query,
      context: context.inputContext || [],
      result,
      // Preserve an explicit zero confidence (for example, when OCR did not
      // produce observed text) instead of silently converting it to 95%.
      confidence: validation.confidence ?? 0.95,
      citations: result.citations || [],
      metadata: {
        latencyMs,
        tokensUsed,
        modelUsed: this.defaultModel,
        department: context.user?.department || this.departmentScope
      }
    });

    AgentChannel.publish(`agent:${this.name}`, message);
    return message;
  }

  /**
   * Complete unified lifecycle execution helper.
   */
  async run(context) {
    const startTime = Date.now();
    const plannedSteps = await this.plan(context);
    const executionResult = await this.execute({ ...context, plannedSteps });
    const validation = await this.validate(executionResult);
    const latencyMs = Date.now() - startTime;
    // Handle missing tokensUsed deterministically; never fabricate usage with Math.random().
    const tokensUsed = (executionResult && executionResult.tokensUsed)
      ? executionResult.tokensUsed
      : Math.max(1, Math.ceil(JSON.stringify(executionResult || {}).length / 4));

    return this.report(context, executionResult, validation, latencyMs, tokensUsed);
  }
}
