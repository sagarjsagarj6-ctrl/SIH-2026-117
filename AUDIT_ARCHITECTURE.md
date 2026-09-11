# AUDIT_ARCHITECTURE.md

**Project:** SOVEREIGN.AI Enterprise Workbench  
**Audit date:** 2026-09-11  
**Method:** Static code inspection + live API probes + existing unit suites

---

## Stack Summary

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite 8 + Tailwind 4 (no react-router; tab state) |
| Backend | Node.js ESM + Express 4 |
| Primary DB | MongoDB (Mongoose 8) with in-memory fallback |
| Vector store | Custom JSON file `server/data/vectordb/vector_index.json` + in-memory ANN |
| Auth | JWT (24h) + bcrypt + role gates |
| Agents | Custom `AgentRegistry` + `AgentOrchestrator` (not LangChain/CrewAI) |
| LLM backends | Ollama / vLLM / llama.cpp via native `fetch` |
| Realtime | None (no WebSocket/SSE) |
| Uploads | Multer 50MB; pdf-parse, mammoth, xlsx, csv-parse |

**Ports:** Client `5173`, Server `5001` (proxy `/api` → 5001)

---

## Architecture Map

```
Browser (React SPA)
  └─ AuthContext → JWT Bearer
  └─ Tab dashboards → fetch(/api/*)
        │
Express (server/index.js)
  ├─ /api/auth          JWT login/register/me/profile
  ├─ /api/agents        query (stubs) | orchestrate (real) | registry | decompose
  ├─ /api/documents     CRUD + ingest hook
  ├─ /api/knowledge     hybrid search / stats / rebuild
  ├─ /api/ingest        upload jobs + DB connectors
  ├─ /api/inference     backends / generate / telemetry  ← ONLY path calling InferenceRouter
  ├─ /api/models        registry / benchmark (random) / fine-tune (simulated)
  ├─ /api/analytics     manager/admin dashboards
  ├─ /api/hardware      detect (+ simulated GPU extras)
  ├─ /api/audit         logs/export
  ├─ /api/quality       PII scan/reports
  ├─ /api/networks      in-memory LAN workspaces
  ├─ /api/notifications in-memory
  └─ /api/workflows     in-memory agent communication queue

AgentOrchestrator
  → TaskDecomposer (keyword heuristics)
  → AgentRegistry { RAG, DATA_SCIENCE, VISION, REPORTING }
  → BaseAgent.run: plan → execute → validate → report
  → AgentMemory / ExplainabilityEngine / AgentAuditLogger
```

---

## Data Layer

- **Mongo collections:** User, Department, KnowledgeDoc, Model, FineTuneJob, DataQualityReport, AuditLog
- **Memory-only:** networks, notifications, workflows, ingest jobs
- **Embeddings:** hash + concept-cluster projections (not neural NeMo); 768-dim cosine
- **Retrieval:** hybrid vector + simplified BM25 (`RetrievalService`)

---

## LLM Path Reality

| Path | Calls InferenceRouter? | Live model when Ollama down? |
|------|------------------------|------------------------------|
| `POST /api/inference/generate` | YES | Canned air-gap fallback text |
| Specialist agents (`execute`) | **NO** | N/A — templates / hardcoded |
| `POST /api/agents/query` | **NO** | Hardcoded JSON for DS/Vision/Reporting; RAG uses retrieval only |

**Runtime probe (2026-09-11):** Ollama `http://127.0.0.1:11434` **UNAVAILABLE**. MongoDB **CONNECTED**. Vector store **12–14 vectors HEALTHY**.

---

## Auth Flow

1. Login/register → JWT signed with `JWT_SECRET` (authRoutes has hardcoded fallback; middleware requires env)
2. `authenticateToken` loads user from Mongo/memory
3. `requireRole` for Admin/Manager/Auditor gates
4. Demo accounts seeded: admin / finance manager / R&D employee

---

## Critical Architecture Gap

The platform has a **real orchestration skeleton** and **real hybrid retrieval**, but advertised “AI agents” mostly **do not invoke the LLM router**. Employee Workspace `/agents/query` bypasses the registry and returns stubs for 3 of 4 agents.
