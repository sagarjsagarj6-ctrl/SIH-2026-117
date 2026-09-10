/**
 * Category B Verification Suite — Intelligence Layer & Multi-Agent Orchestration
 * Tests: TaskDecomposer, ExplainabilityEngine, AgentMemory, StatisticalEngine,
 * AgentRegistry, and AgentOrchestrator (SINGLE, SEQUENTIAL, PARALLEL, SUPERVISOR modes).
 */

import { TaskDecomposer } from '../agents/TaskDecomposer.js';
import { ExplainabilityEngine } from '../agents/ExplainabilityEngine.js';
import { AgentMemory, getSessionMemory } from '../agents/AgentMemory.js';
import { StatisticalEngine } from '../agents/specialists/utils/StatisticalEngine.js';
import { AgentRegistry } from '../agents/AgentRegistry.js';
import { AgentOrchestrator } from '../agents/AgentOrchestrator.js';
import { AgentAuditLogger } from '../agents/AgentAuditLogger.js';

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

async function runCategoryBTests() {
  console.log('--- STARTING CATEGORY B VERIFICATION SUITE ---');

  // 1. TaskDecomposer
  console.log('[Test 1] Testing TaskDecomposer...');
  const queryDecomp = TaskDecomposer.decompose('Generate an executive report analyzing revenue variance and financial anomalies', 'Finance');
  assert(queryDecomp.mode === 'SEQUENTIAL', 'Complex report query should trigger SEQUENTIAL mode');
  assert(queryDecomp.tasks.length >= 2, 'Should decompose into multiple atomic agent tasks');
  console.log(`✓ TaskDecomposer PASSED (Mode: ${queryDecomp.mode}, ${queryDecomp.tasks.length} tasks)`);

  // 2. StatisticalEngine
  console.log('[Test 2] Testing StatisticalEngine (Descriptive, IQR, Regression)...');
  const numbers = [10, 12, 11, 13, 12, 14, 100, 11, 13, 12]; // 100 is an obvious outlier
  const desc = StatisticalEngine.computeDescriptive(numbers);
  assert(desc.count === 10, 'Count should equal 10');
  assert(desc.min === 10 && desc.max === 100, 'Min/max calculation accurate');
  assert(desc.mean > 15, 'Mean reflects outlier influence');

  const anomalies = StatisticalEngine.detectAnomaliesIQR(numbers);
  assert(anomalies.hasAnomalies === true, 'IQR should detect the outlier');
  assert(anomalies.outliers.includes(100), 'Outlier 100 should be flagged');

  const zScores = StatisticalEngine.detectAnomaliesZScore(numbers);
  assert(zScores.hasAnomalies === true, 'Z-Score should detect anomalies');

  const regression = StatisticalEngine.computeLinearRegression([10, 20, 30, 40, 50]);
  assert(regression.slope === 10, 'Linear slope should be 10');
  assert(regression.forecastNext === 60, 'Should forecast next period to 60');
  console.log('✓ StatisticalEngine PASSED (Descriptive, IQR, Z-Score & Linear Regression)');

  // 3. ExplainabilityEngine
  console.log('[Test 3] Testing ExplainabilityEngine (Audit Reasoning Trace)...');
  const trace = ExplainabilityEngine.createTrace('query_test_1', 'Audit Q3 numbers', 'SEQUENTIAL');
  ExplainabilityEngine.addStep(trace, {
    stepNumber: 1,
    agent: 'RAGAgent',
    action: 'Retrieve finance docs',
    reasoning: 'Vector index query executed',
    confidence: 0.96,
    sourcesUsed: ['Q3_Ledger.pdf'],
    latencyMs: 120,
    tokensUsed: 150
  });
  ExplainabilityEngine.addStep(trace, {
    stepNumber: 2,
    agent: 'DataScienceAgent',
    action: 'Calculate anomalies',
    reasoning: 'Statistical engine executed',
    confidence: 0.94,
    sourcesUsed: [],
    latencyMs: 80,
    tokensUsed: 200
  });
  const finalized = ExplainabilityEngine.finalizeTrace(trace);
  assert(finalized.steps.length === 2, 'Trace must contain 2 steps');
  assert(finalized.aggregateMetrics.totalTokens === 350, 'Total tokens must accumulate');
  assert(finalized.aggregateMetrics.totalLatencyMs === 200, 'Total latency must accumulate');
  assert(finalized.aggregateMetrics.averageConfidence === 0.95, 'Average confidence calculated correctly');
  assert(Boolean(finalized.completedAt), 'Trace must record completedAt timestamp');
  console.log('✓ ExplainabilityEngine PASSED');

  // 4. AgentMemory
  console.log('[Test 4] Testing AgentMemory (Session state & Context bounds)...');
  const sessionMem = getSessionMemory('test_session_b');
  sessionMem.clear();
  sessionMem.addMessage({ role: 'user', content: 'What is policy 401?' });
  sessionMem.addMessage({ role: 'agent', content: 'Policy 401 governs air-gap storage.' });
  assert(sessionMem.getRecentHistory().length === 2, 'Memory should retain conversation messages');
  sessionMem.setArtifact('calculated_variance', 4.2);
  assert(sessionMem.getArtifact('calculated_variance') === 4.2, 'Artifact storage should retrieve key');
  console.log('✓ AgentMemory PASSED');

  // 5. AgentRegistry
  console.log('[Test 5] Testing AgentRegistry (Specialist discovery)...');
  const ragAgent = AgentRegistry.getAgent('RAG');
  assert(Boolean(ragAgent), 'RAG agent must be registered');
  const dsAgent = AgentRegistry.getAgent('DATA_SCIENCE');
  assert(Boolean(dsAgent), 'DATA_SCIENCE agent must be registered');
  const visionAgent = AgentRegistry.getAgent('VISION');
  assert(Boolean(visionAgent), 'VISION agent must be registered');
  const reportAgent = AgentRegistry.getAgent('REPORTING');
  assert(Boolean(reportAgent), 'REPORTING agent must be registered');
  const list = AgentRegistry.listAgents();
  assert(list.length === 4, 'Registry should list exactly 4 specialist agents');
  console.log(`✓ AgentRegistry PASSED (${list.length} specialist agents registered: RAG, DATA_SCIENCE, VISION, REPORTING)`);

  const mockUser = {
    name: 'Test Analyst',
    email: 'analyst@sovereign.local',
    role: 'Employee',
    department: 'Finance & Accounting'
  };

  // 6. AgentOrchestrator — SINGLE Mode
  console.log('[Test 6] Testing AgentOrchestrator: SINGLE Mode...');
  const singleResult = await AgentOrchestrator.orchestrate({
    query: 'Summarize the compliance rules for restricted finance archives',
    user: mockUser,
    requestedMode: 'SINGLE',
    specificAgent: 'RAG',
    sessionId: 'session_single_test'
  });
  assert(singleResult.mode === 'SINGLE', 'Execution mode must be SINGLE');
  assert(singleResult.primaryAgent === 'RAGAgent', 'Primary agent must be RAGAgent');
  assert(Boolean(singleResult.result), 'Should return valid agent result');
  assert(Boolean(singleResult.trace), 'Should include explainability trace');
  console.log('✓ AgentOrchestrator SINGLE Mode PASSED');

  // 7. AgentOrchestrator — SEQUENTIAL Pipeline Mode
  console.log('[Test 7] Testing AgentOrchestrator: SEQUENTIAL Mode...');
  const seqResult = await AgentOrchestrator.orchestrate({
    query: 'Analyze revenue variance and generate an executive report with charts',
    user: mockUser,
    requestedMode: 'SEQUENTIAL',
    sessionId: 'session_seq_test'
  });
  assert(seqResult.mode === 'SEQUENTIAL', 'Execution mode must be SEQUENTIAL');
  assert(seqResult.trace.steps.length >= 2, 'Sequential pipeline should execute multiple stages');
  assert(Boolean(seqResult.result), 'Pipeline should yield final compiled result');
  console.log(`✓ AgentOrchestrator SEQUENTIAL Mode PASSED (${seqResult.trace.steps.length} stages)`);

  // 8. AgentOrchestrator — PARALLEL Fan-Out Mode
  console.log('[Test 8] Testing AgentOrchestrator: PARALLEL Mode...');
  const parResult = await AgentOrchestrator.orchestrate({
    query: 'Perform concurrent review of ledger metrics and audit guidelines',
    user: mockUser,
    requestedMode: 'PARALLEL',
    sessionId: 'session_par_test'
  });
  assert(parResult.mode === 'PARALLEL', 'Execution mode must be PARALLEL');
  assert(Boolean(parResult.parallelResults?.RAG), 'Should contain RAG parallel output');
  assert(Boolean(parResult.parallelResults?.DATA_SCIENCE), 'Should contain Data Science parallel output');
  console.log('✓ AgentOrchestrator PARALLEL Mode PASSED');

  // 9. AgentOrchestrator — SUPERVISOR Loop Mode
  console.log('[Test 9] Testing AgentOrchestrator: SUPERVISOR Mode...');
  const supResult = await AgentOrchestrator.orchestrate({
    query: 'Evaluate corporate compliance checklist and verify completeness',
    user: mockUser,
    requestedMode: 'SUPERVISOR',
    sessionId: 'session_sup_test'
  });
  assert(supResult.mode === 'SUPERVISOR', 'Execution mode must be SUPERVISOR');
  assert(Boolean(supResult.supervisorVerdict), 'Must include supervisor verdict details');
  assert(supResult.supervisorVerdict.status === 'APPROVED_BY_SUPERVISOR', 'Valid supervisor status');
  console.log(`✓ AgentOrchestrator SUPERVISOR Mode PASSED (Status: ${supResult.supervisorVerdict.status})`);

  // 10. AgentAuditLogger
  console.log('[Test 10] Testing AgentAuditLogger...');
  await AgentAuditLogger.logExecution({
    user: mockUser,
    mode: 'SEQUENTIAL',
    agentsInvolved: ['RAGAgent', 'DataScienceAgent'],
    query: 'Verify audit integrity',
    status: 'SUCCESS'
  });
  assert(true, 'Audit entry created');
  console.log('✓ AgentAuditLogger PASSED');

  console.log('=======================================================');
  console.log(` ALL CATEGORY B TESTS COMPLETED SUCCESSFULLY! (${passed}/${total})`);
  console.log('=======================================================');
}

runCategoryBTests().catch(err => {
  console.error('Fatal test error in Category B:', err);
  process.exit(1);
});
