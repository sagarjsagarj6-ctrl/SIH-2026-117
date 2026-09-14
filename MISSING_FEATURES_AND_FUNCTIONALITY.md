# Missing Features and Functionality Audit

Audit date: 2026-09-13  
Baseline: `specification.txt` compared with the runnable React/Express project.

## What is already real

- JWT login/session recovery, document upload/list/delete, ingestion, basic local vector search, PII redaction, audit records, role-specific UI, and LAN/workflow flows are present.
- The current backend can use local Ollama/vLLM/llama.cpp endpoints when they are available; it does not call a cloud model.
- `server/services/security/ToolPermissionService.js` now provides a server-side tool registry and is enforced for agent query/orchestration routes.
- `server/services/vision/ComputerVisionService.js` now verifies image signatures/dimensions/checksums, uses local OCR only when available, and separates observed evidence from model inference.

These are foundations, not a claim that every item in the specification is complete.

## P0 — required before calling the product enterprise-ready

| Missing capability | Current evidence | Required implementation / acceptance test |
|---|---|---|
| Production foundation specified as FastAPI + PostgreSQL + Keycloak + Qdrant + Docker | Current runtime is Node/Express + MongoDB with an in-memory fallback; no Docker, PostgreSQL, Keycloak, or Qdrant deployment artifacts exist. | Decide whether to migrate or formally revise the architecture. Supply repeatable offline Docker deployment, PostgreSQL migrations, Keycloak realm/role setup, Qdrant collection setup, backups, and health checks. |
| Enforced authorization at API, agent, tool, and data layers | `PolicyEngine` and RBAC/ABAC exist, but most routes do not invoke them. The new tool registry protects agent query/orchestration only. | Apply `authorize(...)`/tool checks to document, dataset, model, report, network, and export actions. Add denied-access integration tests for every protected resource. |
| Human approval workflow for high-risk actions | The tool registry marks fine-tuning as high risk, but no durable approval request, approve/reject endpoint, or approver UI exists. | Create approval request model/API/UI; bind an immutable approval ID to the action; reject expired, self-approved, or altered requests; audit every decision. |
| Genuine local inference runtime | The router now returns `LOCAL_MODEL_UNAVAILABLE` by default instead of presenting a deterministic fallback as model output. This host currently has no reachable local runtime. | Install/configure an approved local model, validate a live completion, and retain the explicit unavailable state for outages. Test with all local runtimes stopped. |
| Real embeddings and scalable vector database | `EmbeddingService` defaults to a deterministic hash projection when no Ollama embedding model is running; `VectorStore` is a JSON file, not Qdrant. | Require an installed local embedding model for semantic search in production; re-index with versioned embeddings; store vectors/metadata in Qdrant; enforce department/classification filters in every query. |
| Local vision runtime installation and lifecycle | The new vision service is truthful, but this host has no `tesseract` command and no configured `VISION_MODEL`. | Bundle/install Tesseract or an approved offline OCR sidecar and an approved local VLM. Add readiness probe, model version logging, image fixtures, and a no-engine user-facing unavailable state. |
| Real LAN security rather than application-level membership only | `networkRoutes.js` records a LAN configuration and member list; it does not configure network hardware, firewall policy, device attestation, or encrypted transport. | Integrate with approved local network/controller APIs or clearly label it as an application access group. Verify device identity, token rotation/revocation, TLS/mTLS, and private-network enforcement. |

## P1 — core workbench functions that are partial or demo-only

| Missing capability | Current evidence | Required implementation / acceptance test |
|---|---|---|
| Dataset workbench | `DataScienceAgent` can compute statistics but often extracts numbers from text or uses a labeled sample fallback. | Persist datasets/versions, schema/profile/cleaning results, interactive charts, forecasts, trained-model artifacts, and reproducible analysis runs. No fallback sample may be presented as user data. |
| End-to-end multi-agent reasoning | Orchestration passes messages between specialist classes, but planning is keyword/task-decomposition driven and supervisor review uses fixed logic. | Persist agent runs, tool calls, state, evidence, failure/retry decisions, and approval pauses. Make every answer traceable to actual tool output. |
| Report artifacts | Reporting creates structured text, but there is no durable report versioning/export pipeline with sources, methods, and limitations consistently enforced. | Add report model/version, PDF/HTML export, source manifest, methodology/limitations section, access control, and audit trail. |
| Model Center lifecycle | Models can be listed/toggled, but offline model package installation, integrity verification, resource admission, unload/recovery, and real benchmarking are incomplete. | Support signed/offline packages, checksums, capability registry, VRAM admission, live health checks, timed benchmark prompts, and install/rollback tests. |
| Fine-tuning and evaluation | `FineTuneOrchestrator`/`LoRATrainer` deliberately simulate progress and loss curves when a local trainer is unavailable. | Keep simulation labelled as demo-only or implement a local trainer worker, held-out evaluation, safety checks, artifact registry, review gate, and deployment rollback. |
| Database connectors | Connector UI can display simulated or configuration-only states; no complete production connection secret lifecycle exists. | Add encrypted secrets, connection validation, schema discovery, strict read-only query proxy, query limits/timeouts, row-level authorization, and source-to-report lineage. |
| Observability | CPU/RAM and `nvidia-smi` are probed, but platform-wide metrics, durable history, alerts, Prometheus/Grafana, and accurate model benchmarks are absent. | Emit structured metrics for inference, retrieval, agents, tools, model load, disk, GPU/VRAM, errors, and queue latency; provide dashboards and alerts. |
| Real-time client progress | Agent/workflow state uses server-side event patterns, but no unified SSE/WebSocket progress API drives the full workbench. | Add authenticated streaming run events with reconnect/resume semantics and a UI timeline for plan, tool, evidence, approval, failure, and completion. |

## P2 — hardening, reliability, and product completeness

| Missing capability | Current evidence | Required implementation / acceptance test |
|---|---|---|
| Durable data model | Some runtime state can persist through `RuntimeStateStore` when MongoDB is online; in-memory mode remains ephemeral and key entities from the specification are absent. | Add durable entities for document versions/access, datasets, conversations, agent runs, tool executions, reports, approvals, model runs, and system configuration. |
| Security operations | Secrets/config checks exist, but key rotation, encryption-at-rest design, retention policy, device management, and incident controls are not complete. | Add secret rotation, encrypted storage/key-management plan, retention/deletion workflows, tamper-evident audit exports, and security regression tests. |
| Backup and recovery | No deployment/backup/recovery artifact was found. | Add encrypted offline backup, restore drill, index rebuild procedure, model cache recovery, and documented RPO/RTO. |
| Accessibility and responsive QA | The compact dashboard UI has been improved, but no automated accessibility or cross-resolution tests were found. | Add keyboard, focus, contrast, screen-reader, 1280×720, and mobile/responsive test coverage. |
| Test coverage and CI | Targeted category tests exist, but no complete API/security/e2e/vision model deployment suite or CI pipeline was found. | Add CI that runs lint, unit, API, authorization, ingestion, retrieval, model-runtime, and browser e2e tests using offline fixtures. |

## New implementation files in this change

1. `server/services/security/ToolPermissionService.js` — canonical tool metadata, input contracts, allowed roles, risk level, RBAC/ABAC evaluation, and approval requirements. Agent query/orchestration routes now consume it.
2. `server/services/vision/ComputerVisionService.js` — evidence-first local computer vision/OCR service. It validates actual image bytes, reads dimensions, produces SHA-256 integrity evidence, calls local OCR only when available, and permits an explicitly configured private-LAN Ollama VLM.

## Recommended delivery order

1. Finish P0 authorization, approval, local-runtime availability states, embeddings/Qdrant, and deployment foundation.
2. Complete reproducible data science, agent state, report artifacts, and genuine model lifecycle functions.
3. Add observability, durability, recovery, accessibility, and CI/e2e hardening.

## Definition of done for a feature

A feature is complete only when it has an API contract, authorization policy, persistent state where needed, real execution or an explicit unavailable result, audit trail, user-visible error state, unit/API tests, and an end-to-end acceptance test using offline fixtures.

## Verification snapshot for this audit

- Focused checks passed for PNG signature/dimension inspection, tool authorization, required approval on high-risk fine-tuning, and the vision agent's no-fabricated-OCR fallback.
- Existing Category D security and Category E runtime capability suites passed.
- The pre-existing full suite does not currently pass: Category A stops at an address-redaction assertion in `DataCleaner`; Category B assumes every supervisor review is approved even when retrieval returns insufficient evidence; Category C expects a stale `sovereignEngine === 'ACTIVE_PRIMARY'` status that the current `InferenceRouter` does not expose. These failures should be resolved as part of the P0/P2 test-hardening work rather than masked.
