# Sovereign AI Enterprise Workbench

## Product, Feature, Architecture, and Business Guide

**Repository:** `SIH-2026-117-muilt-agent-AI-workbench`  
**Review date:** 13 September 2026  
**Audience:** product owners, business sponsors, security teams, engineering teams, data owners, auditors, and future operators

## 1. Executive summary

Sovereign AI Enterprise Workbench is a private, role-aware, multi-agent AI platform for working with confidential enterprise data inside an organization-controlled environment. Its purpose is to let employees ask questions, analyze data, inspect documents, generate reports, and coordinate approvals without making a cloud AI service the system of record for sensitive information.

The platform is not only a chatbot. It combines:

- authenticated workspaces for Employees, Managers, Admins, and Auditors;
- local document and database ingestion;
- PII detection and redaction;
- department-scoped knowledge retrieval with citations;
- specialist agents for retrieval, data science, vision/OCR, and reporting;
- single-agent and multi-agent orchestration;
- local model routing through Ollama, vLLM, or llama.cpp;
- model, hardware, LAN, audit, notification, and governance surfaces.

The current repository is a strong working prototype and an integration foundation. It is not yet a complete production platform. The most important operational distinction is:

> A feature is only “live” when the required local runtime, data source, authorization policy, persistence layer, and verification tests are present. A screen, card, or status badge by itself is not proof that the capability is operating.

The current local environment has a live Ollama daemon with `qwen2.5-coder:1.5b` configured. The inference router can now return genuine local-model text, and deterministic demo fallback is disabled by default. RAG was verified against local indexed evidence. Vision still requires a local OCR executable or a configured local multimodal model.

## 2. What problem the platform solves

Enterprise teams often have the information they need, but it is fragmented across manuals, policies, spreadsheets, reports, databases, and audit records. General cloud assistants create additional concerns: confidential data may leave the organization, answers may not be traceable, permissions may be lost, and operational recommendations may be difficult to review.

This workbench addresses that problem by putting the workflow inside a controlled boundary:

```text
Authorized user
    -> role and department checks
    -> approved local data source
    -> validation, PII handling, classification, and chunking
    -> local vector knowledge store
    -> retrieval with source evidence
    -> specialist agent or multi-agent workflow
    -> local model narrative when a model is available
    -> citations, audit trail, report, and human review
```

## 3. Feature catalogue

### 3.1 Identity and workspace access

**Implemented surfaces**

- Login, registration, session restoration, and logout.
- JWT-based authenticated API requests.
- Role concepts: `Admin`, `Manager`, `Employee`, `Auditor`, and `Guest`.
- Department identity carried through requests and displayed in the UI.
- Hardware profile selection before entering the main workbench.
- Role-oriented navigation and dashboards.

**Business purpose**

Users see the tools that match their responsibility, while the API can reject unauthenticated or unauthorized requests. This supports separation of duties and helps prevent accidental access to another department's information.

**Important control note**

The server is the real security boundary. UI visibility is a convenience, not authorization. Before production, every sensitive route should be tested with each role and department combination, including direct API calls that bypass the browser.

**Primary code**

- `client/src/context/AuthContext.jsx`
- `client/src/components/AuthModal.jsx`
- `server/routes/authRoutes.js`
- `server/middleware/auth.js`
- `server/middleware/rbacMiddleware.js`
- `server/services/security/RBACEngine.js`
- `server/services/security/ABACEngine.js`

### 3.2 Data foundation and ingestion

The Data Foundation area is the entry point for approved enterprise knowledge.

**Supported or planned input classes in the repository**

- PDF
- DOCX
- TXT and Markdown
- CSV and XLSX spreadsheets
- JSON
- Images and scanned material through the vision/OCR path
- Registered SQL and MongoDB data sources

**Ingestion pipeline**

1. Validate file type, size, checksum, and basic safety rules.
2. Parse the file using the matching local parser.
3. Clean and normalize the content.
4. Scan for PII and optionally redact it.
5. Classify department, category, and sensitivity.
6. Split the content into retrievable chunks.
7. Generate local embeddings or a deterministic local fallback embedding.
8. Write vectors and document metadata to local storage.
9. Store a quality report and audit event.
10. Expose job stages and status to the UI.

**Business purpose**

This turns scattered documents into a governed internal knowledge base. It reduces repeated manual searching, helps standardize document preparation, and creates evidence that an uploaded item was validated and indexed.

**Primary code**

- `server/services/ingestion/FileIngestor.js`
- `server/services/ingestion/parsers/`
- `server/services/validation/`
- `server/services/classification/`
- `server/services/knowledge/ChunkingEngine.js`
- `server/services/knowledge/EmbeddingService.js`
- `server/services/knowledge/VectorStore.js`
- `client/src/components/data/FileUploader.jsx`
- `client/src/components/data/IngestionDashboard.jsx`

### 3.3 Data quality and PII protection

The data-quality area provides local scanning and redaction for common sensitive values.

**Available profiles**

- `FULL`
- `GDPR`
- `HIPAA`
- `PCI-DSS`

**Detected categories include**

- SSN and patient identifiers
- credit-card numbers and CVV values
- email addresses and phone numbers
- addresses
- names when they appear in a relevant context
- medical-record and diagnosis-like values

The cleaner supports text, JSON, and log-shaped input, records findings, and can preserve a sanitized preview. This is useful for reducing accidental exposure before data reaches retrieval or analytics.

**Limitation**

Pattern-based redaction is useful but not equivalent to a legal compliance certification. False positives, false negatives, regional identifiers, images, and domain-specific secrets require additional detectors and human review.

### 3.4 Private knowledge search and RAG

The knowledge layer stores chunks with document metadata such as title, department, sensitivity, category, and source information. Retrieval applies authorization-aware filtering and returns evidence that can be cited by the answer.

**Current behavior**

- Hybrid local retrieval is available through the knowledge routes and `RetrievalService`.
- Department isolation is applied to normal user data-source access.
- RAG can return raw evidence and citations.
- When a live local model is available, `RAGAgent` uses it to synthesize an answer from the retrieved context.
- When no relevant evidence exists, the agent is designed to say so instead of inventing facts.

**Business purpose**

People can ask natural-language questions against internal manuals, policy documents, contracts, and reports without manually opening many files. Citations shorten review time because the user can trace the answer back to its source.

**Important runtime distinction**

The current deployment may use deterministic hash embeddings when `nomic-embed-text` or another neural embedding runtime is not installed. The language-model synthesis can still be live, but semantic retrieval quality should be validated against a representative document set before production use.

### 3.5 Specialist agents

The server registry currently contains four specialist agents.

| Agent | What it does | What makes the result trustworthy | Current dependency |
|---|---|---|---|
| RAG | Searches the local knowledge store and produces cited answers | Retrieved chunks, document metadata, citations, department filtering | Indexed documents plus local model for narrative synthesis |
| Data Science | Computes descriptive statistics, IQR and Z-score anomalies, regression, forecast values, and chart payloads | Deterministic calculations from supplied numeric input | Numeric dataset; local model only for business-language narrative |
| Vision | Validates image input, calculates a checksum, runs local OCR when available, and separates evidence from inference | Actual image bytes, OCR provenance, confidence, warnings | Tesseract or configured local vision model |
| Reporting | Combines upstream evidence into a structured, watermarked report | Upstream agent messages, citations, metrics, uncertainty-preserving prompt | Evidence plus local model for live narrative |

**Why specialist agents help**

Each agent has a narrower responsibility than a general chatbot. That makes it easier to test, authorize, audit, and improve one capability at a time. It also allows deterministic tools to handle numbers while a language model handles explanation and synthesis.

### 3.6 Orchestration and agent registry

The registry is the source of truth for available agents and their declared capabilities. The task decomposer selects work using intent keywords, and the orchestrator supports:

- **Single-agent mode:** one specialist answers a focused request.
- **Sequential pipeline:** retrieval feeds data science and/or reporting.
- **Parallel fan-out:** multiple specialists analyze the same request concurrently.
- **Supervisor loop:** a RAG draft is evaluated against a confidence gate.

The orchestrator also creates an explainability trace, records agent participation, passes upstream messages to downstream agents, and publishes audit events.

**Current limitation**

Task decomposition is heuristic and keyword-based rather than a separately validated planning model. Supervisor approval is still a governance prototype; a production supervisor must perform an evidence check and require human approval for consequential decisions.

### 3.7 Direct local model inference

`InferenceRouter` attempts local backends in priority order:

1. vLLM
2. Ollama
3. llama.cpp
4. explicitly enabled deterministic demo fallback only

The current configuration sets:

```text
OLLAMA_MODEL=qwen2.5-coder:1.5b
ALLOW_DETERMINISTIC_FALLBACK=false
```

When the local model responds, the result carries live-model metadata such as backend, model name, latency, and token counts. When all local backends fail, the response is empty and includes `LOCAL_MODEL_UNAVAILABLE` instead of pretending that a fixed answer was generated.

**Business purpose**

The organization can keep sensitive prompts and retrieved context inside its own infrastructure. This is especially useful where external AI processing is not allowed or where model behavior must be monitored locally.

**Operational reality**

Small local models are easier to run on constrained hardware but may be less capable or slower on complex tasks. Model choice must be based on accuracy, latency, memory, and business risk—not only on a model name shown in the interface.

### 3.8 Data science and analytics

The Data Science agent does not need a language model to calculate core statistics. It can consume a supplied array, numbers in a query, or numeric values from upstream context and calculate:

- count, mean, median, minimum, maximum, and standard deviation;
- IQR and Z-score outliers;
- linear regression and next-period forecast;
- chart-ready data for trend and anomaly views.

The local model is used only to explain the computed result in business language and is instructed not to invent values.

**Business purpose**

This reduces spreadsheet preparation time, makes basic analysis repeatable, and creates a consistent path from source data to a reviewable narrative.

**Limitation**

The current implementation is not a complete Pandas/SciPy/ML platform. Advanced forecasting, classification, clustering, model training, feature engineering, and safe code execution still need separate implementation and validation.

### 3.9 Vision and OCR

The vision pipeline now treats the image as evidence instead of generating a fake OCR table. It validates the payload, records image metadata and SHA-256 verification, runs a local OCR engine if available, extracts observed entities/tables, and returns warnings when the request contains no visual input.

**Current state**

- Image validation and evidence separation are implemented.
- OCR is conditional on a local OCR runtime such as Tesseract.
- A multimodal model must be explicitly configured and available before visual reasoning is live.
- The current compact Ollama model is text-oriented and should not be treated as a vision model.

**Business purpose**

Once the OCR/VLM runtime is installed and tested, teams can reduce manual transcription of scanned forms, inspection reports, and image-based records while preserving the original image and extraction provenance.

### 3.10 Reporting and approvals

The Reporting agent builds a structured, watermarked executive/audit dossier from upstream findings, metrics, and citations. If a local model is live, its generated narrative is presented first and the deterministic evidence sections remain available for traceability.

The workflow routes also support employee-to-manager messages, transitions, event history, re-analysis, notifications, and approval-oriented handoffs.

**Business purpose**

This shortens the path from analysis to a reviewable decision package. It also gives managers and auditors a consistent record of what was observed, what was calculated, what the model summarized, and what still requires human judgment.

**Safety principle**

The workbench should assist a qualified person; it should not autonomously approve maintenance, compliance, financial, or operational actions.

### 3.11 Private LAN and database connectors

Admins can configure private LAN entries and dispatch invitations. Employees and Managers can join using an access token. Database connectors can test a private host, inspect registered schemas, and synchronize approved tables into a structured local knowledge snapshot.

The connector layer validates private address ranges, checks department ownership, restricts table names, and limits sample extraction. This creates a controlled bridge between operational data and the knowledge layer.

**Limitation**

The current network, notification, and some job/workflow state is held in memory unless the persistence path is completed and verified. A restart can therefore lose state that appears to work during a demo.

### 3.12 Model management and fine-tuning

The model center exposes local model records, health fields, activation controls, hardware-aware allocation, model comparison, and fine-tuning routes.

**What is currently real**

- Local model registry records can be listed.
- Model activation and health metadata have API support.
- Hardware detection uses CPU/RAM and attempts `nvidia-smi` for GPU data.
- Allocation tiers can recommend a model based on available VRAM.
- The local inference router can use a configured Ollama model.

**What remains conditional or simulated**

- Model health latency values in the registry include prototype/demo behavior.
- Fine-tuning requires Python, model weights, scripts, and compatible packages; otherwise the runtime uses a labeled fallback/simulation path.
- Benchmark screens and some model-management UI still need to be connected to real inference measurements.

## 4. Role-based value map

| Role | Main tasks | Business value | Evidence of success |
|---|---|---|---|
| Employee / Engineer | Ask questions, upload documents, analyze assigned data, join LAN, submit work to a Manager | Less time searching and preparing first drafts; faster access to approved knowledge | Time to answer, citation correctness, rework reduction |
| Manager | Review employee outputs, use analytics, request reports, oversee departmental evidence | Faster review cycles and more consistent decisions | Approval turnaround, unresolved exceptions, audit completeness |
| Admin | Manage users, departments, models, LAN, data sources, policies, and demo data | Centralized control and safer rollout of local AI | Access violations blocked, model uptime, policy coverage |
| Auditor | Read audit events and export evidence | Faster reconstruction of who accessed what and which agents ran | Evidence retrieval time, log completeness, export accuracy |
| Data owner | Approve documents, classifications, retention, and source freshness | Better knowledge quality and fewer unsupported answers | Retrieval precision, stale-source rate, rejected documents |
| Security team | Validate air-gap, egress, RBAC/ABAC, PII, and high-risk approvals | Lower data-exposure risk and clearer control ownership | Zero unauthorized egress, redaction recall, access-test results |

## 5. Business benefits and how to measure them

The platform should be sold internally as a governed decision-support capability, not as an autonomous employee replacement. Expected benefits should be measured against a baseline.

### Faster knowledge work

Employees can search many approved documents with one query and receive citations. Measure median time from question to source-backed answer and the percentage of answers that need manual re-search.

### Lower exposure of confidential information

Local inference and local retrieval reduce dependence on public AI endpoints. Measure egress events, blocked external connections, sensitive-data findings, and the percentage of workflows completed entirely on private infrastructure.

### More consistent analysis

Deterministic statistics and controlled report structures reduce manual spreadsheet variation. Measure calculation agreement against an independent reference, report rework, and analyst preparation time.

### Better auditability

Agent traces, citations, model metadata, workflow events, and audit records help reconstruct a decision. Measure the time needed to answer: who acted, what evidence was used, which model ran, and what was approved.

### Safer departmental collaboration

Role and department boundaries let teams collaborate without making every document visible to everyone. Measure unauthorized-access denials, cross-department leakage tests, and successful manager review completion.

### More practical local AI operations

Hardware-aware allocation and multiple local backend options help an organization start with available infrastructure. Measure model latency, memory pressure, throughput, uptime, and user satisfaction by task type.

## 6. End-to-end business workflows

### Workflow A: Source-backed internal question

1. The user signs in and is identified by role and department.
2. The user asks a question in the workspace.
3. The server authorizes the agent tool and applies department scope.
4. Retrieval searches the local index.
5. The result includes source chunks and citations.
6. A live local model synthesizes the answer when configured.
7. The UI shows live-model status, evidence, warnings, and runtime errors.
8. The request and agent activity are logged.

### Workflow B: Upload and analyze a document

1. The user uploads a supported file.
2. The ingestion job validates and parses it.
3. PII is detected and optionally redacted.
4. Department, sensitivity, and category are assigned.
5. Chunks and embeddings are stored in the local index.
6. A quality report and audit entry are created.
7. The document becomes available to authorized retrieval queries.

### Workflow C: Numeric analysis and report

1. A user provides a CSV, spreadsheet, or approved numeric dataset.
2. The Data Science agent calculates statistics, anomalies, and a trend.
3. A local model explains the computed values without inventing new values.
4. The Reporting agent creates a watermarked report.
5. A Manager reviews and approves the business action separately.

### Workflow D: Multi-agent investigation

1. The task decomposer detects retrieval, numeric analysis, vision, or reporting intent.
2. The orchestrator selects single, sequential, parallel, or supervisor mode.
3. Upstream messages are passed to downstream agents.
4. Explainability and audit traces record the stages.
5. The final report preserves evidence and uncertainty.

### Workflow E: Private LAN data source

1. An Admin registers or selects an approved private data source.
2. The server checks the host is within an allowed private address range.
3. The connector tests access and introspects a registered schema.
4. The Admin selects an approved table.
5. A bounded local snapshot is converted into knowledge text.
6. The snapshot is subject to the same classification, redaction, indexing, and audit expectations as a file.

## 7. Architecture and code map

### Frontend

- `client/src/App.jsx` — authenticated shell, dashboard routing, scrollable work areas.
- `client/src/components/Sidebar.jsx` — role-oriented navigation and security scope display.
- `client/src/components/dashboards/` — workspace, data foundation, intelligence, manager, admin, LAN, auditor, and model-management screens.
- `client/src/components/agents/` — agent workspace, selection, communication workflow, trace, and response rendering.
- `client/src/components/data/` — upload, ingestion monitor, knowledge explorer, quality, and database connectors.
- `client/src/context/` — authentication, theme, and hardware state.
- `client/src/lib/api.js` — frontend API helpers.

### Backend

- `server/index.js` — Express bootstrap, security middleware, route mounting, startup health state.
- `server/routes/` — authentication, agents, documents, ingestion, knowledge, quality, models, inference, networks, workflows, notifications, audit, analytics, and hardware APIs.
- `server/agents/` — registry, lifecycle base class, orchestration, decomposition, memory, explainability, audit, and specialist agents.
- `server/services/knowledge/` — chunking, embeddings, retrieval, vector storage, and fixture/index maintenance.
- `server/services/ingestion/` — file pipeline, database connectors, parsers, and upload policy.
- `server/services/security/` — RBAC, ABAC, policy evaluation, and tool permission contracts.
- `server/services/inference/` — model routing, prompt construction, token counting, and local backends.
- `server/services/hardware/` — host detection, resource metrics, and model allocation.
- `server/services/finetune/` — training dataset preparation, runtime checks, LoRA orchestration, and validation.
- `server/models/` — MongoDB schemas for users, documents, models, audit records, jobs, departments, quality, and runtime records.

### API groups

The server mounts `/api/auth`, `/api/hardware`, `/api/agents`, `/api/documents`, `/api/analytics`, `/api/models`, `/api/audit`, `/api/ingest`, `/api/knowledge`, `/api/quality`, `/api/inference`, `/api/networks`, `/api/notifications`, and `/api/workflows`.

## 8. Current truth: live, conditional, and incomplete

### Verified in the current local environment

- Frontend production build completes successfully with `npm run build`.
- Backend readiness reports `READY`.
- The running backend reports a live MongoDB daemon.
- Ollama is reachable on the local host.
- `qwen2.5-coder:1.5b` responds to local generation requests.
- The inference router reports live backend and model metadata.
- RAG can retrieve indexed local evidence and use the local model for synthesis.
- Deterministic fallback is disabled by default.

### Conditional on local setup

- Neural embeddings depend on an installed embedding model such as `nomic-embed-text`; otherwise local hash embeddings are used.
- OCR depends on a local Tesseract executable or another approved OCR engine.
- Multimodal vision depends on a compatible local vision model.
- Fine-tuning depends on Python, model weights, trainer packages, and enough hardware.
- GPU telemetry and allocation quality depend on `nvidia-smi` and the host configuration.

### Still requiring production hardening

- Replace or remove simulated benchmark, model-health, fine-tuning, and demo telemetry paths.
- Move in-memory networks, notifications, workflow records, and ingestion job state to durable storage where required.
- Apply `PolicyEngine` consistently to every sensitive route and tool.
- Add document-level ACLs, source versioning, retention, deletion propagation, and stale-document handling.
- Add real semantic embedding and retrieval evaluation on representative enterprise data.
- Add a real supervisor verification stage and explicit human approval for consequential recommendations.
- Add secure sandboxing for any future generated-code execution.
- Add continuous egress monitoring and deployment-level network deny rules.
- Refresh old audit reports after runtime changes; older artifacts may describe the pre-live-model state.

## 9. FAQ

### Is this the same as ChatGPT?

No. It is an enterprise workbench with local data controls, specialist agents, citations, departmental access, and operational auditability. A local model provides language generation, but the surrounding platform determines what data the model can see and what actions the system may take.

### Does the system send confidential data to the cloud?

The default inference router is designed for local backends only. Production deployment must still enforce firewall and egress controls, inspect dependencies, and verify network traffic because a UI label is not a security proof.

### Why can the screen say an agent is available but return no answer?

The user may have no relevant indexed evidence, the model daemon may be offline, the requested model may not fit available memory, or the input may fail validation. The current configuration is designed to expose `LOCAL_MODEL_UNAVAILABLE` instead of returning a prewritten answer.

### What is actually generated by the language model?

RAG answer synthesis, data-science explanation, and report narrative can be generated by the live local model. Numeric statistics, redaction, retrieval metadata, checksums, and other deterministic fields are computed by code. Structured report sections may be deterministic even when the narrative is live.

### Why does RAG sometimes say there is no answer?

That is expected when the authorized department has no relevant documents or the retrieved evidence is too weak. Upload and index approved source material before expecting a grounded answer.

### Is computer vision live now?

The image validation and evidence pipeline is real. OCR and multimodal reasoning are runtime-dependent. Without a local OCR executable or a configured vision model, the system must report that visual analysis did not run.

### Is the data permanently stored?

MongoDB and local vector storage are supported. Some operational features currently use in-memory state when their persistent backing is not available. Production owners must decide which records require durable storage, backup, retention, and disaster recovery.

### Can the system make maintenance or compliance decisions automatically?

It should not. It can prepare evidence, calculations, and drafts. A qualified human should approve consequential decisions, and the approval must be logged.

### Can a smaller machine run the platform?

Yes, with a smaller quantized local model and lower throughput. The trade-off is answer quality, context length, latency, concurrency, and multimodal capability. Hardware measurements should drive the model choice.

## 10. Questions the business should answer next

### Business priorities

1. What are the first three workflows that justify production adoption?
2. Which users will use the platform every day, and which users only review outputs?
3. What manual process is being replaced or accelerated today?
4. What is the current baseline time, error rate, and rework rate for that process?
5. Which decision must remain human-approved even after the platform is deployed?
6. Which result would prove the first release is valuable after 30, 60, and 90 days?

### Data and knowledge

1. Which repositories are the authoritative sources of truth?
2. Who owns each document collection and approves it for indexing?
3. How are document versions, superseded policies, and deletions handled?
4. What metadata is mandatory: asset, site, department, effective date, sensitivity, owner, revision?
5. How often should databases be synchronized, and what is the allowed freshness delay?
6. Which identifiers, financial values, health records, or operational secrets must always be redacted?
7. How will retrieval quality be measured against known questions and expected sources?

### Security and compliance

1. Which identity provider must be used in production: local accounts, LDAP, Active Directory, or SSO?
2. Which roles and department boundaries are mandatory?
3. Are permissions needed at document, folder, project, asset, or row level?
4. What network segments may host models, databases, vector stores, and browser clients?
5. What is the formal policy for outbound network access and package updates?
6. How long must prompts, retrieved evidence, agent traces, and audit records be retained?
7. Which actions require a named approver and a two-person rule?
8. What is the incident process if a document is misclassified or a response is wrong?

### AI and model governance

1. Which models are approved for which task types?
2. What minimum accuracy, citation, and latency thresholds must each agent meet?
3. How will prompt, model, embedding, and workflow versions be tracked?
4. Which evaluation set will be kept private and rerun after every model change?
5. What is the fallback behavior when the model is offline or overloaded?
6. How will hallucination, unsupported recommendations, and low-confidence answers be escalated?
7. How will model updates be signed, tested, approved, rolled back, and audited?

### Operations and deployment

1. What hardware is available at each site, including CPU, RAM, GPU VRAM, and storage?
2. What is the target concurrent-user count and peak request rate?
3. What response time is acceptable for search, analysis, report generation, and OCR?
4. Is MongoDB required for production, and what backup/restore objective applies?
5. Which data must survive a restart or site outage?
6. How will logs, metrics, model daemons, and storage be monitored?
7. Who owns local model installation and patching in an air-gapped environment?
8. What is the rollback plan when a model or index rebuild causes degraded answers?

### Adoption and change management

1. What training will Employees, Managers, Admins, Auditors, and data owners receive?
2. How will users be taught to read citations and challenge uncertain answers?
3. Who is responsible for approving newly indexed knowledge?
4. What feedback mechanism will capture bad retrievals and missing documents?
5. How will the organization prevent users from treating a draft report as an approved decision?

## 11. Recommended next releases

### P0: production trust

- Complete end-to-end role and department authorization tests.
- Persist network, workflow, notification, and ingestion-job state.
- Add document ACLs, versioning, retention, and deletion propagation.
- Add live backend status to every relevant UI instead of static “online” labels.
- Add model and retrieval evaluation suites with known-answer datasets.
- Add approval gates for high-risk reports and actions.

### P1: operational usefulness

- Install and validate a small embedding model; rebuild the index and measure retrieval quality.
- Add real OCR and a memory-appropriate local vision model.
- Connect benchmark and fine-tuning screens to real APIs or mark them clearly as unavailable.
- Add CSV/XLSX ingestion into the Data Science path with schema validation.
- Add source freshness indicators and document version comparison.
- Add export formats required by the business: PDF, DOCX, CSV, or signed audit bundle.

### P2: scale and intelligence

- Replace keyword decomposition with a validated planner or structured intent classifier.
- Add more rigorous supervisor verification and human approval workflows.
- Add safe, isolated code execution only if the business needs it.
- Add site-level model routing, queues, concurrency limits, and failure recovery.
- Add multilingual support and domain-specific evaluation datasets.

## 12. Suggested acceptance criteria for a production pilot

The pilot should not be declared successful because the UI loads. It should pass evidence-based checks:

- Every test user can access only the intended role and department scope.
- A representative document set can be ingested, redacted, indexed, searched, and deleted.
- At least 90% of sampled answers cite the correct source, or the agreed business threshold is documented.
- Numeric results match an independent reference implementation.
- No external AI endpoint is contacted during a complete workflow.
- Model offline behavior is visible and does not present deterministic text as generated text.
- Every high-risk report has an identifiable reviewer and decision record.
- Restart and backup/restore tests meet the agreed persistence objective.
- OCR and vision accuracy are measured against a representative image set.
- A security reviewer signs off on egress, authentication, authorization, secrets, and logging.

## 13. Source-of-truth documents

This guide is a business-facing synthesis of the current codebase. The following files provide deeper implementation detail:

- `README.md` and `PLATFORM_SETUP_AND_USAGE_GUIDE.md` — local setup and operating instructions.
- `MISSING_FEATURES_AND_FUNCTIONALITY.md` — known gaps and missing capabilities.
- `FEATURE_INVENTORY.md` — earlier feature-by-feature status matrix; refresh when runtime changes.
- `REQUIREMENT_TRACEABILITY.md` — requirement-to-code/test mapping.
- `AUDIT_ARCHITECTURE.md` and `SOVEREIGN_AI_AUDIT_REPORT.md` — audit and architecture context.
- `STATIC_VS_DYNAMIC_REPORT.md` and `DEAD_FEATURES.md` — areas that still contain simulation, static UI, or weak wiring.
- `AUDIT_EVIDENCE/SUMMARY.json` — automated evidence snapshot.

When these documents disagree, prefer the current source code, current runtime checks, and a repeatable test result over a historic report.

## 14. Glossary

- **ABAC:** Attribute-Based Access Control. Decisions use attributes such as role, department, sensitivity, time, and network location.
- **Air-gapped:** Operated without a required public internet or cloud AI connection.
- **Agent:** A specialist software component with a defined task, inputs, outputs, and validation.
- **Citation:** A traceable reference to retrieved source evidence.
- **Embedding:** A numeric representation used for similarity retrieval. This project can use an Ollama model or a deterministic local fallback.
- **Grounded answer:** An answer tied to retrieved evidence instead of unsupported model memory.
- **Human-in-the-loop:** A qualified person reviews or approves an output before a consequential action.
- **RAG:** Retrieval-Augmented Generation; retrieve local evidence first, then synthesize a response.
- **RBAC:** Role-Based Access Control. Permissions are assigned to roles such as Admin or Employee.
- **Sovereign processing:** Data and model execution remain within the organization's controlled infrastructure.
