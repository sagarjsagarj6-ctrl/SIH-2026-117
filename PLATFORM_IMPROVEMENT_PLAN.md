# Sovereign AI Enterprise Workbench

## Platform Audit, Top 10 Improvements, and Implementation Plan

Date: 2026-09-11

This document records the end-to-end platform review and the improvements implemented in the current worktree. It covers the React client, Express API, authentication, ingestion, vector search, agents, inference backends, model management, LAN workflows, diagnostics, persistence, tests, and build tooling.

## Executive summary

The platform is a substantial local-first enterprise application with a working React client, Express API, JWT/RBAC, MongoDB fallback, document ingestion, local vector retrieval, agent orchestration, audit logging, and local inference adapters.

The audit also found an important product-truth issue: several features were presented as AI-powered even though they were template, deterministic, or simulated. The implementation therefore prioritizes both security/reliability and accurate runtime labeling. A feature is marked live only when the platform has evidence that the underlying dependency was called successfully.

The current audit addendum reports Category A/B/C/D tests passing and a 23/23 live API audit. The new implementation adds capability-gated live OCR, neural embedding, and LoRA paths. In this workstation, those paths remain optional because the local Tesseract/embedding/training dependencies are not installed; the platform now reports that state instead of presenting fallbacks as live.

## Platform flow

```text
Browser (React/Vite)
        |
        v
Express API (:5001)
  |-- JWT/RBAC + request IDs + CORS allowlist + rate limits
  |-- document/data ingestion -> validation -> vector index
  |-- AgentRegistry -> specialist agents -> InferenceRouter
  |-- MongoDB runtime persistence, with intentional memory fallback
  |-- liveness/readiness/diagnostic health endpoints
        |
        +--> Ollama / vLLM / llama.cpp when available
        +--> explicit sovereign fallback when local models are unavailable
```

## Top 10 recommendations

| Priority | Recommendation | Why it matters | Current status |
| --- | --- | --- | --- |
| P0 | Use one AgentRegistry execution path for every agent entry point. | Prevents the UI/API from bypassing the real orchestration and specialist implementations. | Implemented |
| P0 | Route specialist work through InferenceRouter and expose fallback state. | Makes model use observable and prevents template output from being mistaken for live inference. | Implemented for RAG, Data Science, and Reporting; Vision sidecar remains follow-up |
| P0 | Make agent outputs input-driven and remove hardcoded success metrics. | Different inputs must produce different, explainable outputs. | Implemented for RAG fixtures, Data Science, Vision extraction, and Reporting handoff |
| P0 | Lock down identity and the API perimeter. | Prevents privilege escalation, unwanted browser origins, oversized requests, and credential abuse. | Implemented |
| P1 | Enforce department/data-source authorization at every direct lookup. | List filtering alone is not sufficient when callers can request IDs directly. | Implemented |
| P1 | Harden file ingestion and vector-index persistence. | Limits parser abuse/path traversal and prevents corrupt concurrent index writes. | Implemented |
| P1 | Report truthful health and hardware telemetry. | Operators must distinguish process liveness, readiness, unavailable GPU data, and simulated fallback behavior. | Implemented |
| P1 | Persist runtime collaboration state. | Networks, notifications, workflows, and handoffs should survive restart when MongoDB is configured. | Implemented with Mongo-backed RuntimeRecord and memory fallback |
| P2 | Replace deterministic embeddings and simulated training with real local sidecars. | Hash embeddings and simulated loss curves are useful development fallbacks, not production AI. | Capability-gated live paths implemented; install local dependencies to activate |
| P2 | Maintain regression, live API, and frontend build coverage. | Protects security and product-truth fixes as routes and agents evolve. | Implemented for backend/API; client build passes; lint cleanup remains |

## Implementation plan and completed work

### Phase 1 — Truthful agent execution

Completed:

1. `/api/agents/query` delegates through the AgentRegistry instead of maintaining separate hardcoded Data Science, Vision, and Reporting stubs.
2. Data Science extracts numeric series from request data, query text, or upstream agent context and calculates statistics from that input.
3. Vision derives deterministic checksums, entities, table data, and source metadata from supplied text/image payloads, and can invoke a local Tesseract OCR executable when configured. The response includes an explicit `ocrSimulation` flag.
4. RAG uses controlled Alpha/Beta fixtures and routes its synthesis through the inference service when a local model is available.
5. Data Science and Reporting now call InferenceRouter and return `inference.usedFallback` plus backend metrics.
6. Agent token fallback counts are deterministic rather than random.
7. Supervisor output is `REVIEW_REQUIRED` when the confidence gate fails instead of always claiming approval.

Remaining implementation:

- Install/configure Tesseract or a local vision sidecar and add fixture-image quality tests.
- Add a second-pass LLM refinement for low-confidence supervisor results.
- Add end-to-end streaming for long-running multi-agent runs.

### Phase 2 — Identity, security, and authorization

Completed:

1. Public registration can no longer select `Admin`, `Manager`, or another privileged role; new self-registered users are `Employee`.
2. Production self-registration is disabled unless explicitly enabled with `ALLOW_SELF_REGISTRATION=true`.
3. Password length, department, role, status, and admin user-update inputs are validated.
4. CORS uses an allowlist from `CLIENT_ORIGIN`; request IDs and baseline security headers are added.
5. Login and registration are rate-limited; JSON and URL-encoded request bodies default to 1 MB.
6. Direct document, quality-report, database-source, and table-sync requests enforce department and registered-resource authorization.

### Phase 3 — Ingestion and persistence reliability

Completed:

1. Upload extensions and MIME types are allowlisted, filenames are sanitized, and the 50 MB upload limit is shared across ingestion routes.
2. Vector-index writes are serialized and atomically renamed into place.
3. MongoDB-backed `RuntimeRecord` persistence covers networks, notifications, workflows, and AI handoffs.
4. Offline memory fallback remains available and is intentionally ephemeral.
5. Fine-tune jobs now stage JSON/JSONL datasets, expose server-owned progress/loss history, support cancellation and validation, and use `TrainingRuntime` for optional live Python/Transformers/PEFT execution. Simulation is marked with `executionMode: SIMULATED_PROGRESS` and `simulation: true`.
6. Vector statistics expose embedding sources. Ollama `/api/embeddings` is used when configured and available; deterministic local hashes remain the explicit fallback.
7. Database connectors now use optional real PostgreSQL/MySQL/SQLite drivers and live MongoDB access. Missing drivers or unreachable LAN databases return truthful failure states instead of simulated connections.

### Phase 4 — Operations and client resilience

Completed:

1. `GET /api/health/live` reports process liveness.
2. `GET /api/health/ready` reports bootstrap/dependency readiness.
3. `GET /api/health` includes database mode and startup subsystem state.
4. Detailed environment diagnostics are Admin-only.
5. Hardware and GPU metrics use real OS/`nvidia-smi` data when available and return `unavailable` instead of fabricated GPU values.
6. The client API helper adds timeouts, safe JSON parsing, request IDs, and actionable errors for authentication and hardware calls.
7. Model benchmarks call the inference router and report whether a fallback backend was used.
8. Fine-tune and intelligence UI status paths are connected to their APIs; simulated server progress is labeled.

## Verification commands

Run from `server/`:

```powershell
npm run check:env
npm test
npm run test:d
```

Run from `client/`:

```powershell
npm run build
npm run lint
```

The backend suites, Category D security tests, environment checker, and production client build are the required completion checks. The client lint command currently contains a broad pre-existing baseline of unused imports and hook-rule violations; keep that cleanup separate from security and runtime changes.

## Local setup

Use [PLATFORM_SETUP_AND_USAGE_GUIDE.md](PLATFORM_SETUP_AND_USAGE_GUIDE.md) for the complete clone, environment-variable, database, model-backend, run, and troubleshooting instructions.

Important environment policy:

- Copy `server/.env.example` to `server/.env` and generate a unique `JWT_SECRET` of at least 32 characters.
- Set `CLIENT_ORIGIN` to the actual Vite origin when it is not `http://localhost:5173`.
- Set `ALLOW_SELF_REGISTRATION=false` for production deployments.
- Treat `OLLAMA`, GPU, embedding, and fine-tune status as live only when the corresponding runtime reports success.

## Follow-up roadmap

1. Install and verify a local Ollama/vLLM/llama.cpp model for live specialist synthesis.
2. Install an Ollama embedding model and rebuild the index to activate neural embeddings.
3. Install/configure Tesseract or a local vision model and test fixture-image OCR quality.
4. Install torch, transformers, datasets, and peft plus a local model path to activate the live LoRA worker.
5. Add optional `pg`, `mysql2`, and `better-sqlite3` dependencies in the air-gapped server image and test each read-only connector.
6. Add API contract tests, CI, frontend lint cleanup, and Playwright critical-path tests.
7. Replace padded analytics with measured metrics only, with a visible `dataSource` for every dashboard statistic.

## Evidence files

The audit artifacts are kept in the repository for reproducibility:

- `SOVEREIGN_AI_AUDIT_REPORT.md` — detailed findings and post-fix addendum.
- `FEATURE_INVENTORY.md` — feature-by-feature reality matrix.
- `AGENT_REALITY_MATRIX.md` — agent execution and model-use matrix.
- `STATIC_VS_DYNAMIC_REPORT.md` — remaining static, deterministic, and simulated behavior.
- `MASTER_TEST_MATRIX.md` — test cases and evidence paths.
- `AUDIT_EVIDENCE/` — live API outputs and the reproducible audit script.
