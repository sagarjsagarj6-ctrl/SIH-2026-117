# AGENT_REALITY_MATRIX.md

| Agent | UI Exists | Backend Exists | Execution Exists | Model Exists (catalog) | Model Actually Called | Tools Actually Called | Data Source Real | Dynamic Output | Multi-Agent Connected | Error Handling | Status | Evidence |
|-------|-----------|----------------|------------------|------------------------|----------------------|----------------------|------------------|----------------|----------------------|----------------|--------|----------|
| RAG (Employee `/query`) | YES | YES | YES | YES (Mistral name) | NO | RetrievalService YES | Vector JSON YES | PARTIAL (retrieval varies weakly) | NO (bypass registry) | YES 400/500 | PARTIAL | `AUDIT_EVIDENCE/agents/query_rag_*.json` — Alpha/Beta answersIdentical=true |
| RAG (Orchestrator) | YES | YES class | YES | YES | NO | RetrievalService YES | Vector YES | PARTIAL | YES sequential/parallel | YES | PARTIAL | `orchestration/single_rag.json` |
| DATA_SCIENCE (`/query`) | YES | stub route | YES stub | YES DeepSeek name | NO | NO | HARDCODED metrics | NO (fixed 14250 records) | NO | YES | MOCKED | `query_data_science.json` |
| DATA_SCIENCE (class) | YES | YES | YES | YES | NO | StatisticalEngine YES | HARDCODED series `[120..172]` | Math dynamic on fixed series | YES | YES | MOCKED | anti-hardcode mean1=mean2=157.1 |
| VISION (`/query`) | YES | stub | YES stub | YES Qwen2-VL | NO | NO | Invented REF | Random REF only | NO | YES | MOCKED | `query_vision.json` |
| VISION (class) | YES | YES | YES | YES | NO | NO image I/O | Invented OCR table | Random REF | YES | YES | MOCKED | VisionAgent.js:25-59 |
| REPORTING (`/query`) | YES | stub | YES stub | YES Llama-3 | NO | NO | Template sections | Dept name only | NO | YES | MOCKED | `query_reporting.json` |
| REPORTING (class) | YES | YES | YES | YES | NO | ReportTemplates | Upstream context OR defaults | PARTIAL | YES sequential | YES | PARTIAL | Uses inputContext when present |
| Supervisor | Label only | Orchestrator case | YES gate | NO | NO | Confidence threshold | RAG draft | Always APPROVED | YES | Weak | PARTIAL | Always confidence 0.98; no refine LLM |
| TaskDecomposer | Studio UI | YES | YES | N/A | N/A | Keyword rules | Query text | Mode changes by keywords | Feeds orchestrator | N/A | PARTIAL | Heuristic not ML |
| Orchestrator | Multi-Agent Studio | YES | YES | N/A | N/A | Registry agents | Agents | Mode switching real | YES | YES | PARTIAL | Modes work; bodies mocked |

## Summary

| Classification | Count |
|----------------|-------|
| REAL (full LLM + tools + data) | **0** |
| PARTIAL | 5 |
| MOCKED | 5 |

**REAL AGENT %:** 0%  
**PARTIAL AGENT %:** ~50% of surfaced agent paths  
**MOCKED AGENT %:** ~50%
