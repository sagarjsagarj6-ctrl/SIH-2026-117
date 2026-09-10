# Implementation Plan: System-Wide Technical Flaw Corrections, Environment Capability Diagnostics, and Verification Guide

Review and correct all technical flaws across the Sovereign AI Workbench (both backend and frontend), implement a real-time environment variable checking capability, build complete automated test suites, and produce a comprehensive markdown manual detailing how all functionalities connect with environment variables.

---

## 1. Identified Technical Flaws & Proposed Fixes

### 1.1 ESM Import Timing & Environment Variable Loading Flaw (Server)
- **Problem**: In [server/index.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/index.js), `dotenv.config()` was called on line 22, after all ES module `import` statements had already executed. Consequently, modules that read `process.env.*` at top-level (such as [authRoutes.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/routes/authRoutes.js) and inference backends [OllamaBackend.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/services/inference/backends/OllamaBackend.js), [LlamaCppBackend.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/services/inference/backends/LlamaCppBackend.js), [VLLMBackend.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/services/inference/backends/VLLMBackend.js)) evaluated before `.env` was loaded, causing them to fall back to hardcoded defaults even if custom environment variables were defined.
- **Fix**: 
  - Place `import 'dotenv/config';` as the very first line of [server/index.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/index.js).
  - Convert `static endpoint = process.env.XYZ || ...` in backend classes into dynamic getters `static get endpoint() { return process.env.XYZ || ...; }`.
  - Ensure JWT secret retrieval in [authRoutes.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/routes/authRoutes.js) and [auth.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/middleware/auth.js) dynamically resolves `process.env.JWT_SECRET`.

### 1.2 PDFParser Broken Integration with pdf-parse v2 (Server)
- **Problem**: [PDFParser.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/services/ingestion/parsers/PDFParser.js) assumed `(await import('pdf-parse')).default` was a callable function (the legacy v1 API). `pdf-parse` v2.4.5 exports a named class `{ PDFParse }` and has `default: undefined`. As a result, `pdfParseModule` was always undefined, failing all PDF extractions and falling back to a raw byte-to-string filter that produces corrupted output for binary PDFs.
- **Fix**: Update [PDFParser.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/services/ingestion/parsers/PDFParser.js) to support both `PDFParse` class (`new PDFParse({ data: dataBuffer }).getText()`) and legacy default exports with graceful fallback.

### 1.3 In-Memory DB State Omission & Seed Completeness (Server)
- **Problem**: In [server/config/db.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/config/db.js), `state.memoryDb` omitted `dataQualityReports: []`. In addition, [seed.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/seed.js) did not seed any initial data quality reports, causing the Data Quality dashboard to display empty tables until a user uploaded a new file.
- **Fix**: Add `dataQualityReports: []` to `state.memoryDb` in [db.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/config/db.js) and add initial seeded data quality reports in [seed.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/seed.js).

### 1.4 Hardcoded Client API URLs & Missing Client Environment Configuration (Client)
- **Problem**: 
  - [AuthContext.jsx](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/client/src/context/AuthContext.jsx) hardcoded `const API_URL = 'http://localhost:5000/api';`.
  - [ModelComparisonView.jsx](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/client/src/components/models/ModelComparisonView.jsx) and [FineTuneManager.jsx](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/client/src/components/models/FineTuneManager.jsx) hardcoded `const API = 'http://localhost:5000/api';`.
  - There was no `client/.env` or `client/.env.example`.
- **Fix**:
  - Update `AuthContext.jsx`, `ModelComparisonView.jsx`, and `FineTuneManager.jsx` to dynamically utilize `import.meta.env.VITE_API_URL || 'http://localhost:5000/api'`.
  - Create [client/.env](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/client/.env) and [client/.env.example](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/client/.env.example).

### 1.5 Incomplete Environment Variables Specification
- **Problem**: [server/.env](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/.env) and [server/.env.example](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/.env.example) lacked documentation for inference backend hosts (`OLLAMA_HOST`, `VLLM_HOST`, `LLAMACPP_HOST`), private LAN enforcement (`ALLOW_LAN_ONLY`), client origin (`CLIENT_ORIGIN`), and log levels.
- **Fix**: Update both files with full configuration options and defaults.

---

## 2. Environment Variable Checking Capability & Diagnostics System

### 2.1 Backend Environment Checking Service & Endpoint
- Create `server/services/config/EnvChecker.js`:
  - Validates syntax and presence of all required environment variables.
  - Tests connectivity to:
    - MongoDB (`MONGODB_URI`)
    - Ollama (`OLLAMA_HOST`)
    - vLLM (`VLLM_HOST`)
    - llama.cpp (`LLAMACPP_HOST`)
  - Evaluates JWT Secret strength and entropy.
  - Verifies air-gap LAN IP bindings and safety.
  - Returns a structured capability report (status: `OPTIMAL`, `DEGRADED`, or `OFFLINE_FALLBACK`).
- Add endpoint `GET /api/health/env-check` in [server/routes/hardwareRoutes.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/routes/hardwareRoutes.js) (or new dedicated route) allowing both authenticated and pre-flight health diagnostic calls.
- Create CLI tool `server/check-env.js` and add `"check:env": "node check-env.js"` in [server/package.json](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/package.json) for instantaneous terminal diagnostics.

### 2.2 Frontend Environment Diagnostics Viewer
- Add an Environment & Diagnostics status badge / modal in the header/admin view so administrators and operators can immediately test and confirm environment variable bindings directly from the UI.

---

## 3. Comprehensive Verification Test Suites (Categories A, B, C)

- Maintain and verify `server/test/categoryA.test.js` (Data Foundation: Parsers, Validator, PII Cleaner, Quality Scorer, Classification, VectorStore, DatabaseConnector).
- Create `server/test/categoryB.test.js` (Intelligence Layer: TaskDecomposer, ExplainabilityEngine, AgentMemory, Specialist Agents, AgentOrchestrator modes: SINGLE, SEQUENTIAL, PARALLEL, SUPERVISOR, StatisticalEngine).
- Create `server/test/categoryC.test.js` (Operations & Inference: InferenceRouter, ModelAllocator, HardwareProfiler, TokenCounter, ModelHealthChecker, EnvChecker diagnostics).
- Add `"test": "node test/categoryA.test.js && node test/categoryB.test.js && node test/categoryC.test.js"` in [server/package.json](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/package.json).

---

## 4. Documentation: Master Environment & Functionality Manual

Create `SYSTEM_CAPABILITY_AND_ENV_GUIDE.md` in the workspace root detailing:
1. **Architecture & Subsystems Overview**:
   - Category A: Data Engineering, Ingestion, Parsing, PII Redaction, Vector Database
   - Category B: Multi-Agent Orchestration (4 modes), Specialist Agents, Explainability Traces
   - Category C: Operations, Hardware Awareness, Model Registry, Model Health, Fine-Tuning Studio
2. **Comprehensive Environment Variables Matrix**:
   - Every variable (`PORT`, `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV`, `OLLAMA_HOST`, `VLLM_HOST`, `LLAMACPP_HOST`, `VITE_API_URL`, etc.), expected values, fallback behaviors.
3. **Environment Variable Checking Capabilities**:
   - How to use `npm run check:env` CLI script.
   - How to invoke `GET /api/health/env-check` API.
   - How to verify live vs fallback connections.
4. **Step-by-Step Functionality Verification Checklist**:
   - Verification procedures for all 20+ features of the platform.
5. **Air-Gapped & LAN Deployment Guide**:
   - Network subnet guidelines, hardware recommendations, low-resource profile switching.

---

## Proposed Changes

### Server

#### [MODIFY] [server/index.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/index.js)
- Import `'dotenv/config'` as the first line.
- Integrate env checker bootstrap logging.

#### [MODIFY] [server/config/db.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/config/db.js)
- Add `dataQualityReports: []` to `state.memoryDb`.

#### [MODIFY] [server/seed.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/seed.js)
- Add seed data for `DataQualityReport` in both MongoDB and in-memory modes.

#### [MODIFY] [server/services/ingestion/parsers/PDFParser.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/services/ingestion/parsers/PDFParser.js)
- Fix `pdf-parse` v2 integration (`PDFParse` class constructor and `getText()` method).

#### [MODIFY] [server/services/inference/backends/OllamaBackend.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/services/inference/backends/OllamaBackend.js)
- Convert `static endpoint` to dynamic getter.

#### [MODIFY] [server/services/inference/backends/LlamaCppBackend.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/services/inference/backends/LlamaCppBackend.js)
- Convert `static endpoint` to dynamic getter.

#### [MODIFY] [server/services/inference/backends/VLLMBackend.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/services/inference/backends/VLLMBackend.js)
- Convert `static endpoint` to dynamic getter.

#### [MODIFY] [server/routes/authRoutes.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/routes/authRoutes.js)
- Ensure dynamic resolution of JWT secret.

#### [MODIFY] [server/routes/hardwareRoutes.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/routes/hardwareRoutes.js)
- Expose `/api/hardware/env-check` or `/api/hardware/system-diagnostics`.

#### [NEW] [server/services/config/EnvChecker.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/services/config/EnvChecker.js)
- Environment variable validation, live connection probes, and security audit.

#### [NEW] [server/check-env.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/check-env.js)
- CLI diagnostic script for environment validation.

#### [MODIFY] [server/.env](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/.env) & [server/.env.example](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/.env.example)
- Complete variable matrix.

#### [MODIFY] [server/package.json](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/package.json)
- Add `"test"` and `"check:env"` scripts.

#### [NEW] [server/test/categoryB.test.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/test/categoryB.test.js)
- Category B verification suite.

#### [NEW] [server/test/categoryC.test.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/test/categoryC.test.js)
- Category C verification suite.

---

### Client

#### [MODIFY] [client/src/context/AuthContext.jsx](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/client/src/context/AuthContext.jsx)
- Use `import.meta.env.VITE_API_URL || 'http://localhost:5000/api'`.

#### [MODIFY] [client/src/components/models/ModelComparisonView.jsx](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/client/src/components/models/ModelComparisonView.jsx)
- Use `API_URL` from context / `import.meta.env.VITE_API_URL`.

#### [MODIFY] [client/src/components/models/FineTuneManager.jsx](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/client/src/components/models/FineTuneManager.jsx)
- Use `API_URL` from context / `import.meta.env.VITE_API_URL`.

#### [NEW] [client/.env](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/client/.env) & [client/.env.example](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/client/.env.example)
- Provide Vite environment configurations.

---

### Root Documentation

#### [NEW] [SYSTEM_CAPABILITY_AND_ENV_GUIDE.md](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/SYSTEM_CAPABILITY_AND_ENV_GUIDE.md)
- Complete functionality verification and environment capability guide.

---

## Verification Plan

### Automated Tests
1. Run `node test/categoryA.test.js` to ensure Data Foundation passes all 11 tests.
2. Run `node test/categoryB.test.js` to verify all 4 multi-agent modes, explainability traces, memory, and statistical engine.
3. Run `node test/categoryC.test.js` to verify hardware profiler, inference backends, model allocator, and env checker.
4. Run `npm run check:env` to verify environment diagnostics.
5. Run `npm run build` in `client` to guarantee clean Vite bundling.

### Manual Verification
- Test PDF upload with the updated PDF parser.
- Verify that `GET /api/hardware/env-check` returns full diagnostic report.
