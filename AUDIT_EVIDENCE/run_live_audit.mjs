/**
 * Live API audit evidence collector — no secrets persisted.
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.AUDIT_API || 'http://localhost:5001/api';

async function save(rel, data) {
  const fp = path.join(__dirname, rel);
  await fs.mkdir(path.dirname(fp), { recursive: true });
  const scrubbed = JSON.parse(JSON.stringify(data, (k, v) => (k === 'token' || k === 'password' ? '[REDACTED]' : v)));
  await fs.writeFile(fp, JSON.stringify(scrubbed, null, 2));
  return scrubbed;
}

async function req(method, urlPath, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, ok: res.ok, json };
}

async function main() {
  const summary = { passed: [], failed: [], notes: [] };

  // Health
  const health = await req('GET', '/health');
  await save('api/health.json', health);
  summary[health.ok ? 'passed' : 'failed'].push(`GET /health → ${health.status}`);

  // Login
  const login = await req('POST', '/auth/login', {
    body: { email: 'admin@sovereign.local', password: 'Admin@123' }
  });
  await save('api/login.json', login);
  if (!login.ok || !login.json.token) {
    summary.failed.push('login failed');
    console.log(JSON.stringify(summary, null, 2));
    process.exit(1);
  }
  const token = login.json.token;
  summary.passed.push('POST /auth/login');

  const me = await req('GET', '/auth/me', { token });
  await save('api/auth_me.json', me);
  summary[me.ok ? 'passed' : 'failed'].push('GET /auth/me');

  // Unauth security
  const unauth = await req('GET', '/agents/registry');
  await save('security/unauth_registry.json', unauth);
  summary[unauth.status === 401 || unauth.status === 403 ? 'passed' : 'failed'].push(`unauth registry → ${unauth.status}`);

  // Registry
  const reg = await req('GET', '/agents/registry', { token });
  await save('agents/registry.json', reg);
  summary[reg.ok ? 'passed' : 'failed'].push('GET /agents/registry');

  // Agent query — anti-hardcode pair
  const ragA = await req('POST', '/agents/query', {
    token,
    body: { agentType: 'RAG', prompt: 'What is the budget of Project Alpha?' }
  });
  await save('agents/query_rag_alpha.json', ragA);
  const ragB = await req('POST', '/agents/query', {
    token,
    body: { agentType: 'RAG', prompt: 'What is the budget of Project Beta?' }
  });
  await save('agents/query_rag_beta.json', ragB);
  summary.notes.push({
    antiHardcodeRAG: {
      answersEqual: ragA.json?.answer === ragB.json?.answer,
      alphaCitations: ragA.json?.citations?.length ?? 0,
      betaCitations: ragB.json?.citations?.length ?? 0
    }
  });
  summary[ragA.ok ? 'passed' : 'failed'].push('POST /agents/query RAG');

  for (const agentType of ['DATA_SCIENCE', 'VISION', 'REPORTING']) {
    const r = await req('POST', '/agents/query', {
      token,
      body: { agentType, prompt: `Test unique ${agentType} query ${Date.now()}` }
    });
    await save(`agents/query_${agentType.toLowerCase()}.json`, r);
    summary[r.ok ? 'passed' : 'failed'].push(`POST /agents/query ${agentType}`);
  }

  // Empty prompt
  const empty = await req('POST', '/agents/query', {
    token,
    body: { agentType: 'RAG', prompt: '' }
  });
  await save('failures/empty_prompt.json', empty);
  summary[empty.status === 400 ? 'passed' : 'failed'].push(`empty prompt → ${empty.status}`);

  // Orchestration
  const orchAuto = await req('POST', '/agents/orchestrate', {
    token,
    body: { query: 'Analyze departmental trends and produce an executive report on revenue anomalies', mode: 'AUTO' }
  });
  await save('orchestration/auto.json', orchAuto);
  summary[orchAuto.ok ? 'passed' : 'failed'].push(`orchestrate AUTO → ${orchAuto.status}`);

  const orchSingle = await req('POST', '/agents/orchestrate', {
    token,
    body: { query: 'Find compliance policies in knowledge base', mode: 'SINGLE', specificAgent: 'RAG' }
  });
  await save('orchestration/single_rag.json', orchSingle);
  summary[orchSingle.ok ? 'passed' : 'failed'].push(`orchestrate SINGLE RAG → ${orchSingle.status}`);

  const orchSeq = await req('POST', '/agents/orchestrate', {
    token,
    body: { query: 'Retrieve knowledge then analyze statistics and write report', mode: 'SEQUENTIAL' }
  });
  await save('orchestration/sequential.json', orchSeq);
  summary[orchSeq.ok ? 'passed' : 'failed'].push(`orchestrate SEQUENTIAL → ${orchSeq.status}`);

  const orchPar = await req('POST', '/agents/orchestrate', {
    token,
    body: { query: 'Parallel knowledge and stats scan', mode: 'PARALLEL' }
  });
  await save('orchestration/parallel.json', orchPar);
  summary[orchPar.ok ? 'passed' : 'failed'].push(`orchestrate PARALLEL → ${orchPar.status}`);

  const decomp = await req('POST', '/agents/decompose', {
    token,
    body: { query: 'Analyze OCR document and report findings' }
  });
  await save('orchestration/decompose.json', decomp);
  summary[decomp.ok ? 'passed' : 'failed'].push('decompose');

  // RAG / knowledge
  const ksearch = await req('POST', '/knowledge/search', {
    token,
    body: { query: 'budget project', topK: 5 }
  });
  await save('rag/search.json', ksearch);
  summary[ksearch.ok ? 'passed' : 'failed'].push('knowledge search');

  const kstats = await req('GET', '/knowledge/stats', { token });
  await save('rag/stats.json', kstats);
  summary[kstats.ok ? 'passed' : 'failed'].push('knowledge stats');

  // Inference
  const backends = await req('GET', '/inference/backends', { token });
  await save('api/inference_backends.json', backends);
  summary[backends.ok ? 'passed' : 'failed'].push('inference backends');

  const igen = await req('POST', '/inference/generate', {
    token,
    body: { prompt: 'Say hello from sovereign in one sentence', model: 'Mistral-7B-v0.3-Enterprise' }
  });
  await save('api/inference_generate.json', igen);
  summary[igen.ok ? 'passed' : 'failed'].push(`inference generate → ${igen.status}`);

  // Models / analytics / docs
  const models = await req('GET', '/models', { token });
  await save('api/models.json', models);
  summary[models.ok ? 'passed' : 'failed'].push('models list');

  const admin = await req('GET', '/analytics/admin', { token });
  await save('database/analytics_admin.json', admin);
  summary[admin.ok ? 'passed' : 'failed'].push('analytics admin');

  const docs = await req('GET', '/documents', { token });
  await save('database/documents.json', docs);
  summary[docs.ok ? 'passed' : 'failed'].push('documents list');

  const hw = await req('GET', '/hardware/detect', { token });
  await save('api/hardware_detect.json', hw);
  summary[hw.ok ? 'passed' : 'failed'].push('hardware detect');

  // Different DS queries — detect hardcode via /orchestrate SINGLE DATA_SCIENCE
  const ds1 = await req('POST', '/agents/orchestrate', {
    token,
    body: { query: 'series 100 200 300 total', mode: 'SINGLE', specificAgent: 'DATA_SCIENCE' }
  });
  const ds2 = await req('POST', '/agents/orchestrate', {
    token,
    body: { query: 'series 10 20 30 total', mode: 'SINGLE', specificAgent: 'DATA_SCIENCE' }
  });
  await save('agents/ds_anti_hardcode_1.json', ds1);
  await save('agents/ds_anti_hardcode_2.json', ds2);
  const mean1 = ds1.json?.result?.statistics?.mean ?? ds1.json?.result?.result?.statistics?.mean;
  const mean2 = ds2.json?.result?.statistics?.mean ?? ds2.json?.result?.result?.statistics?.mean;
  summary.notes.push({
    dsAntiHardcode: { mean1, mean2, sameMeans: mean1 === mean2 },
    orchAutoMode: orchAuto.json?.mode || orchAuto.json?.result?.mode,
    orchSeqAgents: orchSeq.json?.agentsInvolved || orchSeq.json?.result?.agentsInvolved,
    inferenceBackend: igen.json?.backendUsed || igen.json?.backend,
    ollamaStatus: backends.json?.ollama
  });

  await save('SUMMARY.json', summary);
  console.log('=== LIVE AUDIT SUMMARY ===');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
