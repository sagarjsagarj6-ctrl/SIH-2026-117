/**
 * Comprehensive Verification Tests for Category A: Data Foundation
 */

import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { TextParser } from '../services/ingestion/parsers/TextParser.js';
import { SpreadsheetParser } from '../services/ingestion/parsers/SpreadsheetParser.js';
import { ImageOCRParser } from '../services/ingestion/parsers/ImageOCRParser.js';
import { DataValidator } from '../services/validation/DataValidator.js';
import { DataCleaner } from '../services/validation/DataCleaner.js';
import { QualityScorer } from '../services/validation/QualityScorer.js';
import { SensitivityLabeler } from '../services/classification/SensitivityLabeler.js';
import { DepartmentTagger } from '../services/classification/DepartmentTagger.js';
import { DataClassifier } from '../services/classification/DataClassifier.js';
import { ChunkingStrategies } from '../services/knowledge/ChunkingStrategies.js';
import { ChunkingEngine } from '../services/knowledge/ChunkingEngine.js';
import { EmbeddingService } from '../services/knowledge/EmbeddingService.js';
import { VectorStore } from '../services/knowledge/VectorStore.js';
import { RetrievalService } from '../services/knowledge/RetrievalService.js';
import { DatabaseConnector } from '../services/ingestion/DatabaseConnector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testTmpDir = path.resolve(__dirname, '../data/test_tmp');

async function runTests() {
  console.log('--- STARTING CATEGORY A VERIFICATION SUITE ---');
  await fs.mkdir(testTmpDir, { recursive: true });

  // 1. Text Parser Test
  console.log('[Test 1] Testing TextParser...');
  const sampleTxtPath = path.join(testTmpDir, 'sample_sop.txt');
  await fs.writeFile(sampleTxtPath, '# Operational SOP\nStep 1: Check server air-gap status.\nStep 2: Authenticate zero trust token.');
  const textResult = await TextParser.parse(sampleTxtPath, 'sample_sop.txt');
  assert.strictEqual(textResult.success, true);
  assert.strictEqual(textResult.metadata.fileType, 'TXT');
  assert(textResult.text.includes('Operational SOP'));
  console.log('✓ TextParser PASSED');

  // 2. Spreadsheet Parser Test
  console.log('[Test 2] Testing SpreadsheetParser (CSV)...');
  const sampleCsvPath = path.join(testTmpDir, 'ledger.csv');
  await fs.writeFile(sampleCsvPath, 'account_code,amount,currency\n4100-REV,850000,INR\n5200-OPEX,120000,INR');
  const csvResult = await SpreadsheetParser.parse(sampleCsvPath, 'ledger.csv');
  assert.strictEqual(csvResult.success, true);
  assert(csvResult.text.includes('4100-REV'));
  console.log('✓ SpreadsheetParser PASSED');

  // 3. Image OCR Parser Test
  console.log('[Test 3] Testing ImageOCRParser...');
  const sampleImgPath = path.join(testTmpDir, 'blueprint.png');
  await fs.writeFile(sampleImgPath, Buffer.from('FAKE_PNG_HEADER_DATA'));
  const ocrResult = await ImageOCRParser.parse(sampleImgPath, 'blueprint.png');
  assert.strictEqual(ocrResult.success, true);
  assert.strictEqual(ocrResult.metadata.fileType, 'PNG');
  console.log('✓ ImageOCRParser PASSED');

  // 4. Data Validator Test (SHA-256)
  console.log('[Test 4] Testing DataValidator & Checksum...');
  const validation = await DataValidator.validateFile(sampleTxtPath, 'sample_sop.txt', 120);
  assert.strictEqual(validation.isValid, true);
  assert.strictEqual(validation.checksum.length, 64);
  console.log('✓ DataValidator PASSED (SHA-256: ' + validation.checksum.substring(0, 16) + '...)');

  // 5. Data Cleaner & PII Scanner
  console.log('[Test 5] Testing DataCleaner & PII Redaction...');
  const sensitiveText = 'Customer SSN is 000-12-3456 and email is contact@enterprise.com with card 1234-5678-9012-3456.';
  const piiScan = DataCleaner.scanPII(sensitiveText);
  assert.strictEqual(piiScan.piiDetected, true);
  assert.strictEqual(piiScan.matches.length, 3);
  const redacted = DataCleaner.cleanAndRedact(sensitiveText, true);
  assert(!redacted.includes('000-12-3456'));
  assert(redacted.includes('[REDACTED_SSN]'));
  assert(redacted.includes('[REDACTED_CARD]'));
  console.log('✓ DataCleaner & PII Redaction PASSED');

  // 6. Quality Scorer Test
  console.log('[Test 6] Testing QualityScorer...');
  const quality = QualityScorer.evaluateQuality({
    text: redacted,
    fileValidation: validation,
    piiScan,
    fileType: '.txt'
  });
  assert(quality.overallScore > 0 && quality.overallScore <= 100);
  console.log(`✓ QualityScorer PASSED (Score: ${quality.overallScore}/100, Status: ${quality.status})`);

  // 7. Sensitivity Labeler & Department Tagger
  console.log('[Test 7] Testing SensitivityLabeler & DepartmentTagger...');
  const finText = 'Quarterly balance sheet and tax revenue ledger for fiscal 2026 confidential audit.';
  const sens = SensitivityLabeler.classify(finText);
  const dept = DepartmentTagger.tag(finText);
  assert.strictEqual(dept.department, 'Finance');
  assert.strictEqual(sens.level, 'Confidential');
  console.log(`✓ Classification PASSED (Dept: ${dept.department}, Sensitivity: ${sens.level})`);

  // 8. Chunking Strategies & ChunkingEngine
  console.log('[Test 8] Testing ChunkingEngine...');
  const longDoc = '# Section 1: Financial Audit 2026\n' + 'Quarterly financial revenue audit ledger report with compliance metrics. '.repeat(20) + '\n\n# Section 2: Balance Sheet Analysis\n' + 'Cash flow balance treasury and expense ledger verification. '.repeat(20);
  const chunks = ChunkingEngine.chunkDocument({
    docId: 'doc_test_1',
    title: 'Enterprise Financial Audit 2026',
    text: longDoc,
    department: 'Finance',
    sensitivity: 'Confidential',
    category: 'Financial Ledger',
    strategy: 'semantic'
  });
  assert(chunks.length >= 2);
  assert.strictEqual(chunks[0].docId, 'doc_test_1');
  console.log(`✓ ChunkingEngine PASSED (${chunks.length} semantic chunks generated)`);

  // 9. Embedding Generator (768-dim) & Cosine Similarity
  console.log('[Test 9] Testing EmbeddingService...');
  const vec1 = EmbeddingService.generateEmbedding('Quarterly financial revenue report and audit balance');
  const vec2 = EmbeddingService.generateEmbedding('Financial ledger tax and revenue balance sheet');
  const vec3 = EmbeddingService.generateEmbedding('Kubernetes cluster docker container deployment pipeline');
  assert.strictEqual(vec1.length, 768);
  assert.strictEqual(vec2.length, 768);
  const sim12 = EmbeddingService.cosineSimilarity(vec1, vec2);
  const sim13 = EmbeddingService.cosineSimilarity(vec1, vec3);
  assert(sim12 > sim13, `Semantic similarity (${sim12}) should be higher than unrelated topic (${sim13})`);
  console.log(`✓ EmbeddingService PASSED (Related sim: ${sim12.toFixed(3)} > Unrelated sim: ${sim13.toFixed(3)})`);

  // 10. VectorStore & Hybrid Retrieval with RBAC/ABAC
  console.log('[Test 10] Testing VectorStore & Hybrid Retrieval...');
  await VectorStore.addChunks(chunks);
  const searchRes = await RetrievalService.search({
    query: 'financial revenue audit',
    user: { role: 'Employee', department: 'Finance' },
    topK: 3
  });
  assert(searchRes.results.length > 0);
  assert(searchRes.citations.length > 0);
  assert(searchRes.citations[0].docId, 'Top citation must have a valid docId');
  assert(searchRes.citations[0].documentTitle, 'Top citation must have a document title');
  console.log(`✓ VectorStore & RetrievalService PASSED (${searchRes.results.length} results, Top citation: ${searchRes.citations[0].documentTitle})`);

  // 11. Database Connector & LAN Subnet Validation
  console.log('[Test 11] Testing DatabaseConnector & Air-Gap LAN subnets...');
  const validLanTest = await DatabaseConnector.testConnection({
    type: 'postgres',
    host: '192.168.1.120',
    port: 5432,
    database: 'enterprise_ledger'
  });
  assert.strictEqual(validLanTest.success, true);

  // Attempt external cloud IP (should be rejected by air-gap policy)
  let rejected = false;
  try {
    await DatabaseConnector.testConnection({
      type: 'postgres',
      host: '8.8.8.8',
      port: 5432,
      database: 'cloud_db'
    });
  } catch (err) {
    rejected = true;
    assert(err.message.includes('Air-gap security policy violation'));
  }
  assert.strictEqual(rejected, true);
  console.log('✓ DatabaseConnector Air-Gap LAN Enforcement PASSED');

  // Cleanup test files
  try {
    await fs.rm(testTmpDir, { recursive: true, force: true });
  } catch {}

  console.log('=======================================================');
  console.log(' ALL CATEGORY A TESTS COMPLETED SUCCESSFULLY! (11/11)');
  console.log('=======================================================');
}

runTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
