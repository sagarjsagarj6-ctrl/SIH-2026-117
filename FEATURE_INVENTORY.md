# FEATURE_INVENTORY.md

Statuses: PASS | PARTIAL | FAIL | MOCKED | STATIC | NOT IMPLEMENTED | UNTESTABLE | BROKEN

| Feature ID | Feature name | Location | Frontend | Backend | Dependencies | Expected | Actual | Status |
|------------|--------------|----------|----------|---------|--------------|----------|--------|--------|
| F01 | Landing / marketing | LandingPage | tab gate | none | — | Brand entry | Static marketing | STATIC |
| F02 | Login / Register | AuthModal | — | POST /auth/login, /register | Mongo/JWT | Real auth | Works with seeded users | PASS |
| F03 | Session restore | AuthContext | GET /auth/me | JWT | Token persist works | PASS |
| F04 | Hardware profile select | HardwareSelector | /hardware/detect, /auth/profile-select | HardwareProfiler | Detects CPU/RAM; GPU simulated | PARTIAL |
| F05 | Employee Workspace query | EmployeeWorkspace | POST /agents/query | RetrievalService (RAG only) | RAG real retrieval; DS/Vision/Report hardcoded | PARTIAL |
| F06 | Document upload/list/delete | EmployeeWorkspace / FileUploader | /documents*, /ingest/upload | Multer + ingest | Works end-to-end | PASS |
| F07 | Data Foundation — ingest monitor | IngestionDashboard | /ingest/jobs | memory jobs | Real job list | PASS |
| F08 | Knowledge explorer / search | KnowledgeExplorer | /knowledge/search, /stats | VectorStore | Real hybrid search | PARTIAL |
| F09 | Data quality / PII | DataQualityView | /quality/* | DataCleaner | Real PII regex redaction | PASS |
| F10 | DB connectors | DatabaseConnectorUI | /ingest/database/* | SQL/Mongo connectors | Often CONNECTED_SIMULATED | MOCKED |
| F11 | Multi-Agent Studio | AgentWorkspace | /agents/orchestrate, /decompose | AgentOrchestrator | Orchestration real; agent bodies partial/mocked | PARTIAL |
| F12 | Inference Monitor | InferenceMonitor | /inference/telemetry, backends | ResourceMonitor | Backends probed; GPU metrics random | PARTIAL |
| F13 | Fine-Tuning Studio (Intel tab) | FineTuneManager | **none used** | — | Client Math.random simulation | MOCKED |
| F14 | Model Benchmarks (Intel tab) | ModelComparisonView | **none used** | — | fakeResponse + random latency | MOCKED |
| F15 | Agent Communication Workflow | AgentCommunicationWorkflow | /workflows* | memoryDb | Queue real; file “AI” analysis keyword mock | PARTIAL |
| F16 | Model Management Center | ModelManagementCenter | /models* | ModelRegistry | List/toggle real; benchmark random; fine-tune simulated | PARTIAL |
| F17 | Manager analytics | ManagerDashboard | /analytics/manager | aggregates + padding | Mixed real counts + invented % | PARTIAL |
| F18 | Admin governance | AdminDashboard | /analytics/admin, users, demo wipe | Mongo | User CRUD works; some padded metrics | PARTIAL |
| F19 | Auditor evidence | AuditorDashboard | /audit, /export | AuditLog | Real audit entries | PASS |
| F20 | LAN setup / join | LanNetworkSetup, LanConnectionPanel | /networks* | memory only | Works until restart | PARTIAL |
| F21 | Notifications | NotificationBell | /notifications* | memory | Works until restart | PARTIAL |
| F22 | Theme switcher | ThemeContext | none | — | Local UI only | PASS |
| F23 | Direct LLM generate | (API only / Inference) | POST /inference/generate | InferenceRouter | Works with `query` field; Ollama offline → canned | PARTIAL |
| F24 | Vision OCR on images | Vision agent UI | agents | VisionAgent | Invented OCR tables; no image bytes consumed | MOCKED |
| F25 | True multi-agent LLM handoff | Orchestrator | orchestrate | specialists | Agents run & pass context; no LLM synthesis | PARTIAL |
| F26 | Neural embeddings | EmbeddingService | knowledge | hash projections | Deterministic pseudo-embeddings | MOCKED |
| F27 | Live GPU telemetry | ResourceMonitor | inference/telemetry | os + random | CPU/RAM real-ish; GPU util random | MOCKED |
| F28 | Model LoRA training | FineTuneOrchestrator | /models/fine-tune | simulateTrainingProgress | Simulated loss curves | MOCKED |

## Counts

| Status | Count |
|--------|-------|
| PASS | 6 |
| PARTIAL | 12 |
| MOCKED | 8 |
| STATIC | 1 |
| FAIL/BROKEN/NOT IMPLEMENTED | 0 (as distinct from mocked) |

**Working (PASS):** 6/28 ≈ 21%  
**Partial:** 12/28 ≈ 43%  
**Mocked/Static:** 9/28 ≈ 32%
