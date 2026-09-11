/**
 * ModelValidator — Evaluates fine-tuned adapter performance against base models.
 */

export class ModelValidator {
  static evaluate({ baseModel, adapterName, department, simulation = true, executionMode = 'SIMULATED_PROGRESS' }) {
    return {
      baseModel,
      adapterName,
      department,
      executionMode,
      simulation,
      validationLoss: simulation ? null : null,
      perplexity: simulation ? null : null,
      baseModelPerplexity: simulation ? null : null,
      accuracyImprovementPct: simulation ? null : null,
      status: simulation ? 'SIMULATION_ONLY' : 'PENDING_REAL_EVALUATION',
      message: simulation
        ? 'Training progress is simulated. Install the local trainer and run a held-out evaluation before claiming adapter quality.'
        : 'Live adapter training completed. Run the held-out evaluation suite to populate quality metrics.',
      testedAt: new Date().toISOString()
    };
  }
}
