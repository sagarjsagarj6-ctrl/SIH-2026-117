/** Category E — training, OCR, embedding, connector, and workflow runtime checks. */

import assert from 'node:assert/strict';
import fs from 'fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DatasetPreparer } from '../services/finetune/DatasetPreparer.js';
import { TrainingRuntime } from '../services/finetune/TrainingRuntime.js';
import { ImageOCRParser } from '../services/ingestion/parsers/ImageOCRParser.js';
import { EmbeddingService } from '../services/knowledge/EmbeddingService.js';
import { SQLConnector } from '../services/ingestion/connectors/SQLConnector.js';
import { WorkflowEventBus } from '../services/workflow/WorkflowEventBus.js';

const run = async () => {
  console.log('--- STARTING CATEGORY E RUNTIME CAPABILITY SUITE ---');

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sovereign-training-test-'));
  const datasetPath = path.join(tempDir, 'dataset.jsonl');
  await fs.writeFile(datasetPath, `${JSON.stringify({ instruction: 'Summarize the policy', input: 'Finance', output: 'Use the approved ledger.' })}\n`);
  const dataset = await DatasetPreparer.prepareUploadedDataset({ filePath: datasetPath, department: 'Finance' });
  assert.equal(dataset.totalSamples, 1);
  assert.equal(dataset.trainCount, 1);
  console.log('✓ Uploaded JSONL dataset preparation passed');

  const capabilities = await TrainingRuntime.getCapabilities();
  assert.equal(capabilities.simulationAvailable, true);
  assert.ok(['LIVE', 'SIMULATED_PROGRESS'].includes(capabilities.selectedMode));
  console.log(`✓ Training capability probe passed (${capabilities.selectedMode})`);

  const embedding = await EmbeddingService.generateEmbeddingAsync('finance ledger audit', { preferredSource: 'deterministic-local-hash' });
  assert.equal(embedding.source, 'deterministic-local-hash');
  assert.equal(embedding.usedFallback, true);
  console.log('✓ Embedding fallback labeling passed');

  const ocr = await ImageOCRParser.getCapabilities();
  assert.ok(typeof ocr.available === 'boolean');
  console.log(`✓ OCR capability probe passed (${ocr.engine})`);

  assert.equal(SQLConnector.validateReadOnly('SELECT * FROM ledger').allowed, true);
  assert.equal(SQLConnector.validateReadOnly('DELETE FROM ledger').allowed, false);
  console.log('✓ Read-only SQL policy passed');

  let emitted = '';
  const response = { write: (payload) => { emitted += payload; } };
  const unsubscribe = WorkflowEventBus.subscribe('workflow-test', response);
  WorkflowEventBus.publish('workflow-test', { type: 'TEST_EVENT' });
  unsubscribe();
  assert.match(emitted, /TEST_EVENT/);
  console.log('✓ Workflow live event bus passed');

  await fs.rm(tempDir, { recursive: true, force: true });
  console.log('=======================================================');
  console.log(' CATEGORY E RUNTIME CAPABILITY TESTS COMPLETED SUCCESSFULLY ');
  console.log('=======================================================');
};

run().catch(error => {
  console.error('Fatal Category E test error:', error);
  process.exit(1);
});

