/**
 * Category C Verification Suite — Operations, Inference, Hardware & Diagnostics
 * Tests: HardwareProfiler, TokenCounter, InferenceRouter, ModelRegistry,
 * ModelHealthChecker, and EnvChecker.
 */

import { HardwareProfiler } from '../services/hardware/HardwareProfiler.js';
import { TokenCounter } from '../services/inference/TokenCounter.js';
import { InferenceRouter } from '../services/inference/InferenceRouter.js';
import { ModelRegistry } from '../services/models/ModelRegistry.js';
import { ModelHealthChecker } from '../services/models/ModelHealthChecker.js';
import { EnvChecker } from '../services/config/EnvChecker.js';
import { seedInitialData } from '../seed.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  passed++;
}

async function runCategoryCTests() {
  console.log('--- STARTING CATEGORY C VERIFICATION SUITE ---');

  // Seed baseline data if in-memory
  await seedInitialData();

  // 1. HardwareProfiler
  console.log('[Test 1] Testing HardwareProfiler (Host Telemetry)...');
  const hw = await HardwareProfiler.detectHardware();
  assert(Boolean(hw.host), 'Host must be identified');
  assert(hw.cpuCores > 0, 'CPU cores must be greater than 0');
  assert(hw.ramTotalGB > 0, 'RAM total must be greater than 0');
  assert(Boolean(hw.gpu.name), 'GPU profile must be configured');
  assert(hw.gpu.vramTotalGB >= 8, 'VRAM total must be at least 8GB');
  console.log(`✓ HardwareProfiler PASSED (${hw.cpuCores} cores, ${hw.ramTotalGB}GB RAM, GPU: ${hw.gpu.name})`);

  // 2. TokenCounter
  console.log('[Test 2] Testing TokenCounter (Estimation & Bounds)...');
  const sampleText = 'The quick brown fox jumps over the lazy dog repeatedly for testing purposes.';
  const tokenCount = TokenCounter.countTokens(sampleText);
  assert(tokenCount > 5 && tokenCount < 30, 'Token count should be realistic approximation');

  const longContext = 'Context word '.repeat(1000);
  const trimmed = TokenCounter.trimContext(longContext, 50);
  assert(trimmed.includes('Context truncated to meet model token bounds'), 'Trimmer must append truncation disclaimer');
  assert(TokenCounter.countTokens(trimmed) < TokenCounter.countTokens(longContext), 'Trimmed context must be smaller');
  console.log('✓ TokenCounter PASSED');

  // 3. InferenceRouter — Backend Statuses
  console.log('[Test 3] Testing InferenceRouter (Air-Gap Backend Detection)...');
  const backendStatuses = await InferenceRouter.checkBackendStatuses();
  assert(Boolean(backendStatuses.ollama), 'Ollama status must be reported');
  assert(Boolean(backendStatuses.vllm), 'vLLM status must be reported');
  assert(Boolean(backendStatuses.llamacpp), 'llama.cpp status must be reported');
  assert(backendStatuses.sovereignEngine === 'ACTIVE_PRIMARY', 'Sovereign Engine must be active primary');
  console.log('✓ InferenceRouter Backend Statuses PASSED');

  // 4. InferenceRouter — Generation Execution
  console.log('[Test 4] Testing InferenceRouter: Local Air-Gap Fallback Inference...');
  const inferRes = await InferenceRouter.infer({
    model: 'Mistral-7B-v0.3-Enterprise',
    role: 'GENERAL',
    query: 'What is the sovereign airgap retention period?',
    context: 'Retention guidelines mandate 7 years of isolated storage.',
    preferredBackend: 'AUTO'
  });
  assert(Boolean(inferRes.response), 'Inference must return response text');
  assert(Boolean(inferRes.backendUsed), 'Inference must report backendUsed');
  assert(inferRes.metrics?.totalTokens > 0, 'Inference must track totalTokens');
  assert(inferRes.metrics?.latencyMs >= 0, 'Inference must measure latency');
  console.log(`✓ InferenceRouter Inference PASSED (Backend: ${inferRes.backendUsed}, Tokens: ${inferRes.metrics.totalTokens})`);

  // 5. ModelRegistry
  console.log('[Test 5] Testing ModelRegistry (Models Catalog)...');
  const allModels = await ModelRegistry.getAllModels();
  assert(allModels.length > 0, 'Model registry must contain registered models');
  const firstModel = allModels[0];
  const fetchedByName = await ModelRegistry.getModelByName(firstModel.name);
  assert(Boolean(fetchedByName), 'Lookup by model name must succeed');
  assert(fetchedByName.name === firstModel.name, 'Names must match exactly');
  console.log(`✓ ModelRegistry PASSED (${allModels.length} models verified)`);

  // 6. ModelHealthChecker
  console.log('[Test 6] Testing ModelHealthChecker (Health Sweep & Metric Update)...');
  const healthSweep = await ModelHealthChecker.checkAllModels();
  assert(healthSweep.totalModels > 0, 'Sweep must examine models');
  assert(healthSweep.healthyCount >= 0, 'Healthy count must be non-negative');
  assert(Boolean(healthSweep.checkedAt), 'Checked timestamp must be present');
  console.log(`✓ ModelHealthChecker PASSED (${healthSweep.healthyCount}/${healthSweep.totalModels} models healthy)`);

  // 7. EnvChecker — Variables Audit
  console.log('[Test 7] Testing EnvChecker: Variables Evaluation...');
  const variables = EnvChecker.evaluateVariables();
  assert(variables.length >= 10, 'EnvChecker must audit at least 10 environment variables');
  const portVar = variables.find(v => v.key === 'PORT');
  assert(Boolean(portVar), 'PORT variable must be audited');
  const jwtVar = variables.find(v => v.key === 'JWT_SECRET');
  assert(Boolean(jwtVar), 'JWT_SECRET variable must be audited');
  console.log(`✓ EnvChecker Variables Audit PASSED (${variables.length} variables verified)`);

  // 8. EnvChecker — Live Probes
  console.log('[Test 8] Testing EnvChecker: Live Probes...');
  const probes = await EnvChecker.probeAllServices();
  assert(Boolean(probes.database), 'Database probe must be present');
  assert(Boolean(probes.inferenceBackends.ollama), 'Ollama probe must be present');
  assert(Boolean(probes.inferenceBackends.vllm), 'vLLM probe must be present');
  assert(Boolean(probes.inferenceBackends.llamacpp), 'llama.cpp probe must be present');
  console.log('✓ EnvChecker Live Probes PASSED');

  // 9. EnvChecker — Diagnostic Capability Report
  console.log('[Test 9] Testing EnvChecker: Full Diagnostic Report...');
  const diagReport = await EnvChecker.getDiagnosticReport();
  assert(Boolean(diagReport.overallHealth), 'Report must evaluate overallHealth');
  assert(typeof diagReport.airgapEnforced === 'boolean', 'airgapEnforced must be boolean');
  assert(typeof diagReport.lanIsolation === 'boolean', 'lanIsolation must be boolean');
  assert(Array.isArray(diagReport.variables), 'variables must be an array');
  assert(Array.isArray(diagReport.recommendations), 'recommendations must be an array');
  console.log(`✓ EnvChecker Diagnostic Report PASSED (Health: ${diagReport.overallHealth})`);

  console.log('=======================================================');
  console.log(` ALL CATEGORY C TESTS COMPLETED SUCCESSFULLY! (${passed}/${total})`);
  console.log('=======================================================');
}

runCategoryCTests().catch(err => {
  console.error('Fatal test error in Category C:', err);
  process.exit(1);
});
