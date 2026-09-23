# SOVEREIGN.AI — Enterprise Workbench

**Privacy-first, on-premise multi-agent AI orchestration platform for confidential enterprise workflows.** No external API calls. All inference runs locally.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 + Vite 8 + Tailwind CSS 4 |
| **Backend** | Node.js (ESM) + Express 4 |
| **Database** | MongoDB (Mongoose 8) — auto-falls back to in-memory DB if unavailable |
| **Vector Store** | Custom JSON + in-memory ANN index |
| **Auth** | JWT (24h expiry) + bcrypt password hashing |
| **AI Agents** | AgentRegistry + AgentOrchestrator + TaskDecomposer |
| **LLM Backends** | Ollama · vLLM · LlamaCpp (local only, no OpenAI) |
| **File Parsing** | pdf-parse · mammoth · xlsx · csv-parse |
| **Uploads** | Multer (50MB max) |
| **OCR / Vision** | Local ComputerVisionService with GPU model sidecar support |

**Default Ports:** `5173` (client) · `5001` (server)

---

## Entry Point

```
server/index.js    ← main server entry
client/src/        ← React frontend source
```

---

## Docker Deployment (Recommended)

Run the full Sovereign AI Enterprise stack (React frontend, Express backend, MongoDB 7.0 daemon, and local inference gateway) in isolated containers with a single command:

```bash
# 1. (Optional) Copy Docker environment template
cp .env.docker.example .env

# 2. Build and launch all services in detached mode
docker compose up --build -d

# 3. Access the workbench
# Frontend: http://localhost:3000
# Backend API & Health: http://localhost:5001/api/health
# MongoDB: mongodb://localhost:27017
```

For live hot-reloading development in Docker:
```bash
docker compose -f docker-compose.dev.yml up --build
```

📖 See **[DOCKER.md](DOCKER.md)** for architecture diagrams, host GPU Ollama setup, offline air-gapped image exports, and maintenance commands.

---

## Prerequisites (Manual / Host Setup)

### 1. Install dependencies

```powershell
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 2. Configure environment

Create `server/.env` (copy from `server/.env.example` if available):

```env
# Server
PORT=5001
CLIENT_ORIGIN=http://localhost:5173

# MongoDB (optional — works without it)
MONGODB_URI=mongodb://127.0.0.1:27017/sovereign_ai_db

# JWT Secret (change this in production!)
JWT_SECRET=your_secure_airgapped_jwt_secret_key_minimum_32_chars_long

# Air-Gap Mode (keep true for sovereign operation)
AIRGAP_MODE=true

# Deterministic fallback when no local LLM is running
ALLOW_DETERMINISTIC_FALLBACK=true

# Upload limits
JSON_BODY_LIMIT=1mb
FORM_BODY_LIMIT=1mb
MAX_UPLOAD_BYTES=52428800
```

### 3. Start the backend

```powershell
cd server
node index.js
```

Server starts on `http://localhost:5001`. On first run it auto-seeds demo users and builds the vector index.

**Default login accounts (auto-created on seed):**

| Email | Password | Role |
|---|---|---|
| `admin@sovereign.local` | `Admin@123` | Admin |
| `manager.finance@sovereign.local` | `Manager@123` | Manager |
| `employee.rd@sovereign.local` | `Emp@123` | Employee |

### 4. Start the frontend

```powershell
cd client
npm run dev
```

Frontend at `http://localhost:5173` proxies API calls to `localhost:5001`.

---

## Setting Up Local LLM Models

All inference is **local and air-gapped** — no external API keys needed.

### Option A — Ollama (recommended)

```powershell
# Install Ollama from https://ollama.com, then pull a model:
ollama pull llama3.2
ollama pull mistral-nemo

# Start the Ollama server (runs on localhost:11434):
ollama serve

# Verify it's running:
curl http://127.0.0.1:11434/api/tags
```

### Option B — vLLM

```powershell
# Start vLLM server (runs on localhost:8000):
python -m vllm.entrypoints.openai.api_server \
  --model mistralai/Mistral-7B-Instruct-v0.3 \
  --host 127.0.0.1 --port 8000
```

### Option C — LlamaCpp

```powershell
# Start llama.cpp HTTP server (runs on localhost:8080):
./server --port 8080 --model your-model.gguf
```

### Model priority order

`InferenceRouter.js` tries backends in this order:
1. **vLLM** (`localhost:8000`)
2. **Ollama** (`localhost:11434`)
3. **LlamaCpp** (`localhost:8080`)
4. **IntelligentFallback** (template-based, no daemon needed)

If no daemon is running, the system still works via `IntelligentFallback` — it provides contextual template responses using the retrieved document context.

---

## Key API Routes

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Login, returns JWT |
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/agents/query` | Multi-agent orchestration query |
| `POST` | `/api/documents/upload` | Upload file, auto-index to vector store |
| `POST` | `/api/knowledge/search` | Search local KB (hybrid vector + keyword) |
| `GET` | `/api/analytics/dashboard` | System health & air-gap stats |
| `GET` | `/api/knowledge/stats` | Vector index health |
| `GET` | `/api/models` | List registered local models |
| `POST` | `/api/workflows` | Create workflow run |
| `GET` | `/api/audit/logs` | Audit trail |
| `GET` | `/api/health` | Server health check |

Full API documentation at `/api/health/env-check` (Admin only).

---

## 10-Step Inspection Workflow

The system supports a full document → insight → report pipeline:

```
Scanned Inspection Report
  ↓ upload via /api/documents/upload
Local OCR + Vision Model
  ↓ ComputerVisionService.analyzeFile()
Agent Extracts Findings
  ↓ VisionAgent → structured entities
Local Knowledge Base Searches SOP/manual
  ↓ /api/knowledge/search (vector + keyword)
Agent Compares Findings
  ↓ AgentOrchestrator SEQUENTIAL mode chains RAG → Vision
Agent Reasons + Validates
  ↓ SUPERVISOR mode, 0.85 confidence gate
Approval Note Generated
  ↓ ReportingAgent → structured Markdown report
Audit/Log Records Every Step
  ↓ AgentAuditLogger + ExplainabilityEngine
Network Monitor = ZERO External Calls
  ↓ InferenceRouter: VLLM → Ollama → LlamaCpp → Fallback (local only)
```

---

## Project Structure

```
SOVEREIGN.AI/
├── server/
│   ├── index.js                  ← Server entry point
│   ├── seed.js                   ← Auto-creates demo users & KB fixtures
│   ├── check-env.js              ← Env diagnostic tool
│   ├── config/
│   │   ├── db.js                 ← MongoDB + in-memory fallback
│   │   ├── datasources.js        ← DB connection rules (LAN only)
│   │   └── vectordb.js
│   ├── agents/
│   │   ├── AgentOrchestrator.js  ← Chains: Vision → RAG → Report
│   │   ├── TaskDecomposer.js     ← Intent classification → routing
│   │   ├── AgentAuditLogger.js   ← Every step logged
│   │   ├── ExplainabilityEngine.js ← Per-step reasoning trace
│   │   ├── AgentRegistry.js      ← Agent registration
│   │   ├── AgentMemory.js        ← Session memory
│   │   └── specialists/
│   │       ├── RAGAgent.js          ← Knowledge retrieval
│   │       ├── VisionAgent.js       ← OCR + document vision
│   │       ├── DataScienceAgent.js  ← Stats, anomaly, charts
│   │       ├── ReportingAgent.js    ← Report generation
│   │       └── ImageAnalysisAgent.js
│   ├── routes/                   ← 16 API route modules
│   ├── services/
│   │   ├── inference/
│   │   │   ├── InferenceRouter.js   ← Routes to local backends only
│   │   │   └── backends/
│   │   │       ├── OllamaBackend.js
│   │   │       ├── VLLMBackend.js
│   │   │       ├── LlamaCppBackend.js
│   │   │       └── IntelligentFallback.js
│   │   ├── knowledge/            ← Vector store, retrieval, chunking
│   │   ├── ingestion/            ← File parsing, upload policy
│   │   └── ...
│   ├── middleware/
│   │   ├── auth.js               ← JWT validation
│   │   ├── rbacMiddleware.js     ← Role-based access control
│   │   └── security.js           ← Rate limiting, security headers
│   ├── models/                   ← Mongoose schemas
│   ├── test/                     ← Category A–E tests
│   └── data/demo-documents/      ← Seeded demo KB documents
│
├── client/
│   ├── src/
│   │   ├── App.jsx               ← Main React app
│   │   ├── pages/                ← Page components
│   │   └── components/            ← Reusable UI components
│   └── package.json
│
└── README.md                     ← This file
```

---

## Testing

```powershell
cd server

# Run all tests
npm test

# Run individual test suites
npm run test:a    # Database, FileIngestor, RBAC
npm run test:b    # AgentOrchestrator, AgentMemory
npm run test:c    # InferenceRouter, Local LLM Backends
npm run test:d    # VectorStore, RetrievalService
npm run test:e    # WorkflowEventBus, WorkflowOrchestration
npm run test:demo # Demo documents loading
npm run test:image-model  # ImageModelService

# Quick env check
npm run check:env
```

---

## Air-Gap Security

- `InferenceRouter` routes **only** to `localhost` backends — zero external API calls
- `DatabaseConnector` enforces LAN-only subnets (10.x.x.x, 172.16–31.x.x, 192.168.x.x)
- JWT auth with role-based access control on every route
- Every agent execution is logged to the audit trail with full reasoning trace
- File uploads validated with SHA-256 integrity checks
- Rate limiting on auth endpoints (10 req / 15 min)

---

## Troubleshooting

**Server won't start (port in use):**
```powershell
Stop-Process -Id (Get-NetTCPConnection -LocalPort 5001).OwningProcess -Force
```

**No local LLM running — responses look generic:**
This is expected. Start Ollama (`ollama serve`) or vLLM to get full model responses. The system works without them via `IntelligentFallback`.

**MongoDB not available:**
The server auto-detects and falls back to an in-memory database. No action needed.

**Vector search returns no results:**
Run `node server/seed.js` to re-populate demo documents into the vector index.
