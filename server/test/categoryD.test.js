/**
 * Category D Verification Suite — Security, policy, and reliability hardening.
 */

import assert from 'node:assert/strict';
import { createRateLimiter, isAllowedOrigin, parseAllowedOrigins } from '../middleware/security.js';
import { isKnownDepartment, isKnownRole } from '../config/identity.js';
import { DatabaseConnector } from '../services/ingestion/DatabaseConnector.js';
import { isAllowedUpload, safeUploadFilename } from '../services/ingestion/uploadPolicy.js';
import { DataValidator } from '../services/validation/DataValidator.js';

const run = async () => {
  console.log('--- STARTING CATEGORY D VERIFICATION SUITE ---');

  assert.equal(isKnownRole('Admin'), true);
  assert.equal(isKnownRole('Root'), false);
  assert.equal(isKnownDepartment('Finance & Accounting'), true);
  assert.equal(isKnownDepartment('External Internet'), false);
  console.log('✓ Identity policy allowlists passed');

  const origins = parseAllowedOrigins('http://localhost:5173, http://127.0.0.1:5173');
  assert.equal(isAllowedOrigin('http://localhost:5173', origins), true);
  assert.equal(isAllowedOrigin('https://untrusted.example', origins), false);
  assert.equal(isAllowedOrigin(undefined, origins), true);
  console.log('✓ CORS origin policy passed');

  let calls = 0;
  let blocked = false;
  const limiter = createRateLimiter({ name: 'test', windowMs: 60_000, max: 2 });
  const makeResponse = () => ({
    headers: {},
    setHeader(key, value) { this.headers[key] = value; },
    status(code) {
      this.statusCode = code;
      return { json: () => { blocked = true; } };
    }
  });
  const request = { ip: '127.0.0.1' };
  limiter(request, makeResponse(), () => { calls += 1; });
  limiter(request, makeResponse(), () => { calls += 1; });
  limiter(request, makeResponse(), () => { calls += 1; });
  assert.equal(calls, 2);
  assert.equal(blocked, true);
  console.log('✓ Authentication rate-limit policy passed');

  assert.equal(isAllowedUpload({ originalname: 'report.pdf', mimetype: 'application/pdf' }), true);
  assert.equal(isAllowedUpload({ originalname: 'script.exe', mimetype: 'application/octet-stream' }), false);
  assert.equal(safeUploadFilename('../../secret.txt').includes('..'), false);
  assert.equal(DataValidator.ALLOWED_EXTENSIONS.includes('.webp'), true);
  console.log('✓ Upload policy passed');

  const financeUser = { role: 'Employee', department: 'Finance & Accounting' };
  assert.equal(DatabaseConnector.getAuthorizedDataSource('ds-postgres-fin', financeUser).id, 'ds-postgres-fin');
  assert.throws(
    () => DatabaseConnector.getAuthorizedDataSource('ds-mysql-legal', financeUser),
    /belongs to another department/
  );
  await assert.rejects(
    () => DatabaseConnector.syncTableToKnowledge({
      dataSourceId: 'ds-postgres-fin',
      tableName: 'financial_ledgers;DROP',
      user: financeUser
    }),
    /letters, numbers, and underscores/
  );
  console.log('✓ Department data-source and table-name policy passed');

  console.log('=======================================================');
  console.log(' CATEGORY D SECURITY TESTS COMPLETED SUCCESSFULLY ');
  console.log('=======================================================');
};

run().catch(error => {
  console.error('Fatal test error in Category D:', error);
  process.exit(1);
});
