import assert from 'node:assert/strict';
import { state } from '../config/db.js';
import { AgentRegistry } from '../agents/AgentRegistry.js';
import { VectorIndexManager } from '../services/knowledge/VectorIndexManager.js';
import { ensureRAGFixtures } from '../services/knowledge/ensureRAGFixtures.js';
import { loadDemoDocuments } from '../services/knowledge/demoDocuments.js';
import { InferenceRouter } from '../services/inference/InferenceRouter.js';

const user = {
  name: 'Demo Verification Admin',
  role: 'Admin',
  department: 'Executive & Strategy'
};

const resultOf = (message) => message?.payload?.result;

async function run() {
  console.log('--- STARTING DEMO DOCUMENT & AGENT VERIFICATION ---');

  const documents = await loadDemoDocuments();
  assert.equal(documents.length, 7, 'All seven demo documents must be present');
  assert.equal(new Set(documents.map((doc) => doc.title)).size, 7, 'Demo document titles must be unique');
  assert(documents.every((doc) => doc.snippet.length > 100), 'Every demo document must have source content');
  console.log(`✓ Loaded ${documents.length} canonical demo documents`);

  // Use the deterministic in-memory path so this verification does not depend
  // on a local MongoDB daemon.
  state.isMongooseConnected = false;
  state.memoryDb.knowledgeDocs = [];
  await ensureRAGFixtures();
  assert.equal(state.memoryDb.knowledgeDocs.length, 7, 'All demo documents must be seeded');

  const index = await VectorIndexManager.rebuildAllIndices();
  assert.equal(index.documentsProcessed, 7, 'All demo documents must be indexed');
  assert(index.totalVectorsIndexed >= 7, 'Vector index must contain demo document chunks');
  console.log(`✓ Seeded and indexed ${index.documentsProcessed} demo documents (${index.totalVectorsIndexed} chunks)`);

  assert.equal(AgentRegistry.listAgents().length, 7, 'All specialist agents must be registered');
  // This test verifies specialist lifecycle execution without depending on a
  // separately running Ollama/vLLM/llama.cpp process. Live model execution is
  // covered by the API audit when a local model daemon is available.
  InferenceRouter.infer = async () => ({
    live: false,
    usedFallback: false,
    backendUsed: 'Test local model stub',
    response: '',
    error: { code: 'TEST_LOCAL_MODEL_UNAVAILABLE' },
    metrics: { inputTokens: 0, tokensGenerated: 0, totalTokens: 0, latencyMs: 0, tokensPerSecond: 0 }
  });
  const rag = await AgentRegistry.getAgent('RAG').run({
    query: 'What is the budget of Project Alpha?',
    user
  });
  assert(resultOf(rag).citations?.some((citation) => citation.documentTitle === 'Project Alpha Budget Charter'));
  assert(resultOf(rag).answer.includes('₹50 lakh') || resultOf(rag).answer.includes('50 lakh'));

  const dataScience = await AgentRegistry.getAgent('DATA_SCIENCE').run({
    query: 'series 10 20 30',
    user
  });
  assert.equal(resultOf(dataScience).statistics.mean, 20);

  const vision = await AgentRegistry.getAgent('VISION').run({
    query: 'Read this demo label',
    user,
    imageText: 'Stainless steel bearing, expected lifespan 8 years',
    fileName: 'demo-bearing.txt'
  });
  assert.equal(resultOf(vision).ocrResult.sourceType, 'caller_supplied_text');

  const reporting = await AgentRegistry.getAgent('REPORTING').run({
    query: 'Create a demo executive report',
    user,
    inputContext: [rag, dataScience, vision]
  });
  assert(resultOf(reporting).sections?.length > 0, 'Reporting agent must produce structured sections');
  assert(resultOf(reporting).watermark, 'Reporting agent must include a confidentiality watermark');

  const catalogHits = [{
    title: 'Demo Bearing Manual',
    kind: 'labeled-image',
    similarityScore: 0.88,
    text: 'Stainless steel bearing with an expected lifespan of 8 years.',
    label: { name: 'HX Bearing', category: 'bearing', metalType: 'stainless steel', lifespan: '8 years', partType: 'bearing' }
  }];
  const hardware = await AgentRegistry.getAgent('HARDWARE_MANUAL').run({ query: 'bearing', user, catalogHits });
  assert.equal(resultOf(hardware).matchCount, 1);

  const imageAnalysis = await AgentRegistry.getAgent('IMAGE_ANALYSIS').run({
    query: 'Identify this bearing',
    user,
    analysis: { ocr: { text: 'Stainless steel bearing, 8 years' }, entities: [], warnings: [] },
    catalogHits
  });
  assert.equal(resultOf(imageAnalysis).features.metalType, 'stainless steel');

  const comparison = await AgentRegistry.getAgent('IMAGE_COMPARE').run({
    query: 'What metal is this part?',
    user,
    analysisCard: resultOf(imageAnalysis),
    hardware: resultOf(hardware)
  });
  assert.equal(resultOf(comparison).prediction.metalType, 'stainless steel');

  console.log('✓ Executed all 7 registered specialist agents with evidence-backed outputs');
  console.log('=======================================================');
  console.log(' DEMO DOCUMENT & AGENT VERIFICATION PASSED ');
  console.log('=======================================================');
}

run().catch((error) => {
  console.error('Demo verification failed:', error);
  process.exit(1);
});
