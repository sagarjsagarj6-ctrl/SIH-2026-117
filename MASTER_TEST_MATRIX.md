# MASTER_TEST_MATRIX.md

| ID | Module | Feature | Test | Expected | Actual | Status | Evidence | Root Cause | Severity |
|----|--------|---------|------|----------|--------|--------|----------|------------|----------|
| T01 | API | Health | GET /api/health | 200 ONLINE | 200 ONLINE | PASS | api/health.json | — | INFO |
| T02 | Auth | Login | admin@sovereign.local | JWT + user | OK | PASS | api/login.json | — | INFO |
| T03 | Auth | /me | Valid token | User profile | OK | PASS | api/auth_me.json | — | INFO |
| T04 | Security | Unauth registry | 401 | 401 | PASS | security/unauth_registry.json | — | INFO |
| T05 | Agents | Empty prompt | 400 | 400 | PASS | failures/empty_prompt.json | — | INFO |
| T06 | Agents | RAG Alpha vs Beta | Different grounded answers | Same answer text | FAIL | notes.antiHardcodeRAG | Weak embeddings + no LLM synthesis; no Alpha/Beta docs | HIGH |
| T07 | Agents | DS query stub | Metrics from data | Fixed 14250 / 0.12% | FAIL | query_data_science.json | Hardcoded route stub | CRITICAL |
| T08 | Agents | Vision stub | OCR from image | Invented entities | FAIL | query_vision.json | Hardcoded stub | CRITICAL |
| T09 | Agents | Reporting stub | Dynamic report | Fixed sections | FAIL | query_reporting.json | Hardcoded stub | HIGH |
| T10 | Orchestration | AUTO | Mode + agents | SEQUENTIAL 200 | PASS | orchestration/auto.json | Pipeline real | INFO |
| T11 | Orchestration | SINGLE RAG | RAGAgent run | 200 | PASS | orchestration/single_rag.json | — | INFO |
| T12 | Orchestration | SEQUENTIAL | Multi-agent handoff | Agents chained | PARTIAL | sequential.json | Handoff works; DS data hardcoded; RAG sometimes absent from task list | HIGH |
| T13 | Orchestration | PARALLEL | Fan-out | 200 | PASS | parallel.json | — | INFO |
| T14 | Orchestration | DS anti-hardcode | Different means for 100,200,300 vs 10,20,30 | mean=157.1 both | FAIL | ds_anti_hardcode_*.json | Hardcoded series in DataScienceAgent | CRITICAL |
| T15 | RAG | Knowledge search | Results | results returned | PASS | rag/search.json | Retrieval works | INFO |
| T16 | RAG | Stats | Vectors healthy | 12 vectors HEALTHY | PASS | rag/stats.json | — | INFO |
| T17 | LLM | Backends | Reflect Ollama down | AIR_GAP_MODE | PASS | inference_backends.json | Correct offline signal | INFO |
| T18 | LLM | Generate with `prompt` | Should accept or document | 400 Query required | FAIL | inference_generate.json | Field name is `query`; client may send `prompt` | MEDIUM |
| T19 | LLM | Live Ollama | Inference with real model | UNAVAILABLE | UNTESTABLE | probe | Ollama not running | HIGH |
| T20 | DB | Mongo connect | Connected | Connected at boot | PASS | server log | — | INFO |
| T21 | DB | Documents list | Array | 200 | PASS | database/documents.json | — | INFO |
| T22 | Analytics | Admin | Metrics | 200 | PARTIAL | analytics_admin.json | Some padded agent % | MEDIUM |
| T23 | Unit | Category A/B/C | All pass | 11+36+34 pass | PASS | npm test | Tests assert simulated paths too | INFO |
| T24 | Frontend | FineTune tab | API jobs | Client mock | FAIL | code review | No fetch | HIGH |
| T25 | Frontend | Benchmarks tab | Real latency | fakeResponse | FAIL | code review | No fetch | HIGH |
| T26 | Security | JWT_SECRET | Consistent sign/verify | Env required on verify; fallback on sign | PARTIAL | auth.js vs authRoutes | Config smell | MEDIUM |

## Severity totals

| Severity | Count |
|----------|-------|
| CRITICAL | 3 |
| HIGH | 6 |
| MEDIUM | 3 |
| INFO | 14 |
