#!/usr/bin/env node
/**
 * Sovereign AI Enterprise Workbench — Environment & Capability Diagnostic CLI
 * Usage: node check-env.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { EnvChecker } from './services/config/EnvChecker.js';

async function runDiagnostics() {
  // The CLI runs outside the main server process, so establish the same
  // database connection before asking EnvChecker for database readiness.
  await connectDB();

  console.log('\n======================================================================');
  console.log('  SOVEREIGN AI ENTERPRISE WORKBENCH — ENVIRONMENT & CAPABILITY AUDIT  ');
  console.log('======================================================================\n');

  console.log('-> Auditing Environment Variables...');
  const variables = EnvChecker.evaluateVariables();

  console.log('\n--- Environment Variables Matrix ---');
  for (const v of variables) {
    const icon = v.status === 'OPTIMAL' || v.status === 'VALID' ? '[OK]' : '[WARN]';
    console.log(`  ${icon} ${v.key.padEnd(16)} = ${v.value.padEnd(45)} | ${v.description}`);
  }

  console.log('\n-> Probing Subsystem & Backend Connectivity...');
  const services = await EnvChecker.probeAllServices();

  console.log('\n--- Database Connection ---');
  console.log(`  Status: ${services.database.connected ? '[CONNECTED]' : '[FALLBACK IN-MEMORY]'}`);
  console.log(`  Engine: ${services.database.mode}`);

  console.log('\n--- Local Inference Daemons (Air-Gapped LLM Backends) ---');
  for (const [name, info] of Object.entries(services.inferenceBackends)) {
    const status = info.reachable ? `[ONLINE] (${info.latencyMs}ms)` : '[OFFLINE / AIR-GAP MOCK ACTIVE]';
    console.log(`  - ${name.toUpperCase().padEnd(10)}: ${info.endpoint.padEnd(28)} -> ${status}`);
  }

  const report = await EnvChecker.getDiagnosticReport();
  console.log('\n======================================================================');
  console.log(`  DIAGNOSTIC SUMMARY: ${report.overallHealth}`);
  console.log(`  Air-Gap Enforced   : ${report.airgapEnforced}`);
  console.log(`  LAN Subnet Only    : ${report.lanIsolation}`);
  console.log(`  Live LLM Daemons   : ${report.liveInferenceBackendsCount} / 3`);
  console.log('======================================================================');

  if (report.issues.length > 0) {
    console.log('\nNotices / Recommendations:');
    report.issues.forEach(issue => console.log(`  * ${issue}`));
  } else {
    console.log('\nAll core configuration checks passed with optimal settings.');
  }
  console.log('\nAudit complete.\n');
  await mongoose.disconnect();
}

runDiagnostics().catch(console.error);
