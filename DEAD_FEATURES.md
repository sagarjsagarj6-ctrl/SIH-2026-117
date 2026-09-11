# DEAD_FEATURES.md

## Buttons / UI with no real backend effect

| Item | Issue |
|------|-------|
| Intelligence → Fine-Tuning Studio controls | Local simulation only; `API` constant unused |
| Intelligence → Model Benchmarks “Run” | `fakeResponse()` + `setTimeout`; no `/models/benchmark` or `/inference/generate` |
| Intelligence Layer header “INFERENCE ENGINE ONLINE” | Hardcoded badge; does not check Ollama |
| Agent Communication file analysis | Keyword heuristic `pickActionFromText`; no agent API |
| Header air-gap green status | Cosmetic |

## Backend endpoints with weak/no frontend consumer

| Endpoint | Notes |
|----------|-------|
| `POST /api/inference/generate` | Exists; Intelligence Fine-Tune/Benchmarks ignore it; body field is `query` not `prompt` |
| `POST /api/models/fine-tune` + deploy | Model Center partially uses list; FineTuneManager tab does not |
| `POST /api/knowledge/rebuild` | Admin capability; little UI surface |
| `GET /api/health/env-check` | Diagnostics underused in UI |

## Agents registered but not used by Employee Workspace path

| Agent class | Used by `/orchestrate` | Used by `/query` |
|-------------|------------------------|------------------|
| RAGAgent | YES | NO (inline RetrievalService + template) |
| DataScienceAgent | YES | NO (hardcoded stub) |
| VisionAgent | YES | NO (hardcoded stub) |
| ReportingAgent | YES | NO (hardcoded stub) |

## Disconnected components

- `PolicyEngine` / `rbacMiddleware.js` — present, not wired to most routes
- `AgentChannel` EventEmitter — in-process only; UI never subscribes via WS/SSE

## Persistence gaps (appear working until restart)

- Networks, notifications, workflows, ingest job list → **memory only**
