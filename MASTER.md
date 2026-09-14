# SOVEREIGN.AI Enterprise Workbench - MASTER DOCUMENTATION

> **Version:** 1.0  
> **Last Updated:** 2026-09-13  
> **Status:** PARTIALLY FUNCTIONAL PROTOTYPE (Score: ~68/100)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Quick Start Guide](#3-quick-start-guide)
4. [Git & Development Workflow](#4-git--development-workflow)
5. [Environment Configuration](#5-environment-configuration)
6. [Features & Capabilities](#6-features--capabilities)
7. [AI Agents](#7-ai-agents)
8. [API Reference](#8-api-reference)
9. [Testing Procedures](#9-testing-procedures)
10. [Security Considerations](#10-security-considerations)
11. [Known Issues & Limitations](#11-known-issues--limitations)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Project Overview

**SOVEREIGN.AI Enterprise Workbench** is a privacy-first, on-premise multi-agent orchestration platform designed for confidential enterprise workflows.

### Core Principles
- **Privacy-First**: No external API calls - all inference stays on-premise
- **Air-Gapped Operation**: Works without internet or external AI dependencies
- **Local LLM Only**: Supports Ollama, vLLM, and LlamaCpp backends

### Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite 8 + Tailwind 4 |
| Backend | Node.js ESM + Express 4 |
| Primary DB | MongoDB (Mongoose 8) with in-memory fallback |
| Vector Store | Custom JSON file + in-memory ANN |
| Auth | JWT (24h) + bcrypt + role gates |
| Agents | Custom AgentRegistry + AgentOrchestrator |
| LLM Backends | Ollama / vLLM / llama.cpp |
| Uploads | Multer 50MB; pdf-parse, mammoth, xlsx, csv-parse |

**Ports:** Client `5173`, Server `5001`

---

## 2. System Architecture

```
Browser (React SPA)
  └─ AuthContext → JWT Bearer
  └─ Tab dashboards → fetch(/api/*)
        │
Express (server/index.js)
  ├─ /api/auth          JWT login/register/me/profile
  ├─ /api/agents        query | orchestrate | registry | decompose
  ├─ /api/documents     CRUD + ingest hook
  ├─ /api/knowledge     hybrid search / stats / rebuild
  ├─ /api/inference     backends / generate / telemetry
  ├─ /api/models        registry / benchmark / fine-tune
  ├─ /api/analytics     manager/admin dashboards
  ├─ /api/hardware      detect
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

## 3. Quick Start Guide

### Prerequisites
- Node.js 18+ 
- MongoDB (local or cloud)
- (Optional) Ollama, vLLM, or LlamaCpp for local inference

### Installation

```powershell
# 1. Clone the repository
git clone <repository-url>
cd <project-directory>

# 2. Install backend dependencies
cd server
npm install

# 3. Install frontend dependencies
cd ../client
npm install

# 4. Configure environment
cd ../server
copy .env.example .env
# Edit .env with your configuration (see Section 5)
```

### Running the Application

```powershell
# Terminal 1: Start backend
cd server
npm run dev

# Terminal 2: Start frontend
cd client
npm run dev
```

### Access Points
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5001/api

### Default Demo Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@sovereign.local | admin123 |
| Manager | manager@sovereign.local | manager123 |
| Employee | employee@sovereign.local | employee123 |

> ⚠️ **Security Note:** Change these passwords immediately in production!

---

## 4. Git & Development Workflow

### Essential Git Commands

```powershell
# Clone repository
git clone <repository-url>
git clone -b <branch-name> <repository-url>

# Check status
git status

# Create/checkout branch
git checkout -b feature/your-feature-name
git checkout -b bugfix/issue-description

# Stage and commit
git add .
git commit -m "feat: add new feature"
git commit -m "fix: resolve authentication issue"
git commit -m "docs: update README"

# Push to remote
git push origin feature/your-feature-name

# Pull latest changes
git pull origin main
git pull --rebase origin main

# Fetch and merge
git fetch origin
git merge origin/main

# View history
git log --oneline -10
git log --graph --oneline --all

# Create and switch to remote branch
git fetch origin
git checkout -b local-branch-name origin/remote-branch-name

# Stash changes (temporary save)
git stash
git stash pop

# Reset to clean state
git reset --hard origin/main
```

### Pull Request Workflow

```powershell
# 1. Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/my-feature

# 2. Make changes and commit
git add .
git commit -m "feat: description"

# 3. Push and create PR
git push -u origin feature/my-feature
# Then create PR via GitHub/GitLab UI

# 4. After review, merge and cleanup
git checkout main
git pull origin main
git branch -d feature/my-feature
```

### Branch Naming Conventions
```
feature/description
bugfix/issue-description  
hotfix/critical-fix
docs/documentation
refactor/code-improvement
test/testing-feature
```

---

## 5. Environment Configuration

### Backend (.env) - `server/.env`

```env
# Server Configuration
PORT=5001
NODE_ENV=development

# JWT Authentication
JWT_SECRET=your-super-secret-key-at-least-32-chars
JWT_EXPIRES_IN=24h

# CORS (adjust for production)
CLIENT_ORIGIN=http://localhost:5173

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/sovereign_ai
# OR use cloud: mongodb+srv://user:pass@cluster.mongodb.net/sovereign_ai

# Self-Registration (disable in production!)
ALLOW_SELF_REGISTRATION=false

# Ollama Configuration (optional)
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# vLLM Configuration (optional)
VLLM_BASE_URL=http://localhost:8000
VLLM_MODEL=meta-llama/Llama-3.2-3B-Instruct

# LlamaCpp Configuration (optional)
LLAMACPP_MODEL_PATH=./models/llama-3.2.gguf
LLAMACPP_N_ctx=4096

# File Upload Limits
MAX_FILE_SIZE_MB=50

# Logging
LOG_LEVEL=info
```

### Token Configuration Reference

| Token | Description | Required | Default |
|-------|-------------|----------|---------|
| `JWT_SECRET` | Secret key for JWT signing | Yes | - |
| `CLIENT_ORIGIN` | Frontend URL for CORS | Yes | http://localhost:5173 |
| `MONGODB_URI` | MongoDB connection string | Yes | mongodb://localhost:27017/sovereign_ai |
| `ALLOW_SELF_REGISTRATION` | Allow public sign-up | No | false |
| `OLLAMA_BASE_URL` | Ollama server URL | No | http://127.0.0.1:11434 |
| `OLLAMA_MODEL` | Default Ollama model | No | llama3.2 |
| `VLLM_BASE_URL` | vLLM server URL | No | http://localhost:8000 |
| `VLLM_MODEL` | Default vLLM model | No | - |

---

## 6. Features & Capabilities

### Feature Status Overview

| Feature | Status | Notes |
|---------|--------|-------|
| JWT Authentication | ✅ PASS | Login, register, session recovery |
| Document Upload | ✅ PASS | PDF, DOCX, CSV, XLSX support |
| RAG/Knowledge Search | ⚠️ PARTIAL | Hybrid vector + BM25 search |
| Agent Orchestration | ⚠️ PARTIAL | 4 modes: AUTO, SINGLE, SEQUENTIAL, PARALLEL |
| Data Science Agent | ⚠️ PARTIAL | Statistical analysis on input data |
| Vision Agent | ⚠️ PARTIAL | Image analysis with OCR fallback |
| Report Generation | ⚠️ PARTIAL | Template-based synthesis |
| Fine-Tuning Studio | 🔶 MOCKED | UI wired, backend simulated |
| Model Benchmarks | 🔶 MOCKED | UI wired, backend simulated |
| GPU Telemetry | 🔶 MOCKED | Simulated GPU metrics |
| Neural Embeddings | 🔶 MOCKED | Hash projections (not neural) |
| Live Ollama Inference | ⚠️ PARTIAL | Works when Ollama is running |
| LAN Workflows | ✅ PASS | In-memory queue with MongoDB fallback |
| Audit Logging | ✅ PASS | Full audit trail |
| PII Detection | ✅ PASS | Automatic redaction |

### Implementation Status Breakdown

| Classification | Count | Percentage |
|----------------|-------|------------|
| PASS (Fully Working) | 6 | ~21% |
| PARTIAL (Working with Limitations) | 12 | ~43% |
| MOCKED (UI Works, Backend Simulated) | 8 | ~29% |
| NOT IMPLEMENTED | 3 | ~7% |

### Agent Reality Matrix

| Agent | UI | Backend | Execution | Model Called | Tools | Status |
|-------|-----|---------|-----------|--------------|-------|--------|
| RAG | ✅ | ✅ | ✅ | ❌ | ✅ Retrieval | PARTIAL |
| Data Science | ✅ | ✅ | ✅ | ❌ | ✅ Stats | PARTIAL |
| Vision | ✅ | ✅ | ✅ | ❌ | ❌ | MOCKED |
| Reporting | ✅ | ✅ | ✅ | ❌ | ✅ Templates | PARTIAL |
| Supervisor | ✅ | ✅ | ✅ | ❌ | ❌ | PARTIAL |

---

## 7. AI Agents

### Available Agents

#### 1. RAG Agent (Research & Knowledge)
- **Purpose:** Query enterprise knowledge base
- **Input:** Natural language query
- **Output:** Grounded answers with citations
- **Data Source:** Vector database with hybrid search

#### 2. Data Science Agent
- **Purpose:** Statistical analysis and calculations
- **Input:** Data series + analysis request
- **Output:** Statistics, metrics, trends
- **Note:** Extracts numbers from query text or upstream context

#### 3. Vision Agent
- **Purpose:** Image analysis and OCR
- **Input:** Image file (PNG, JPG, PDF)
- **Output:** Extracted text, entities, tables
- **Note:** Uses Tesseract when available; deterministic fallback otherwise

#### 4. Reporting Agent
- **Purpose:** Generate structured reports
- **Input:** Analysis results + template
- **Output:** Formatted report sections
- **Note:** Uses upstream agent context when available

### Orchestration Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| SINGLE | Single agent execution | Simple queries |
| SEQUENTIAL | Chained agent execution | Complex multi-step analysis |
| PARALLEL | Concurrent agent execution | Independent parallel tasks |
| SUPERVISOR | Supervised orchestration | Quality-controlled workflows |

### Agent Communication Workflow

```
Employee uploads file
        ↓
Employee AI analyzes → Extracts key takeaways
        ↓
Employee reviews & approves
        ↓
Manager AI validates → Policy check
        ↓
Manager approves/rejects
        ↓
Admin audits (read-only)
```

---

## 8. API Reference

### Authentication Endpoints

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@company.com",
  "password": "securePassword123",
  "name": "John Doe",
  "department": "Engineering",
  "role": "Employee"
}

POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@sovereign.local",
  "password": "admin123"
}

GET /api/auth/me
Authorization: Bearer <jwt-token>
```

### Agent Endpoints

```http
POST /api/agents/query
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "query": "Analyze the Q3 financial report",
  "agentType": "RAG|DATA_SCIENCE|VISION|REPORTING",
  "context": {}
}

POST /api/agents/orchestrate
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "query": "Comprehensive market analysis",
  "mode": "AUTO|SINGLE|SEQUENTIAL|PARALLEL|SUPERVISOR",
  "selectedAgents": ["RAG", "DATA_SCIENCE", "REPORTING"]
}

GET /api/agents/registry
Authorization: Bearer <jwt-token>
```

### Knowledge Endpoints

```http
GET /api/knowledge/search?q=<query>
Authorization: Bearer <jwt-token>

GET /api/knowledge/stats
Authorization: Bearer <jwt-token>

POST /api/knowledge/rebuild
Authorization: Bearer <jwt-token>
```

### Inference Endpoints

```http
GET /api/inference/backends
Authorization: Bearer <jwt-token>

POST /api/inference/generate
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "query": "Explain quantum computing",
  "backend": "ollama|vllm|llamacpp"
}
```

### Document Endpoints

```http
POST /api/documents/upload
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data
file: <file>

GET /api/documents
Authorization: Bearer <jwt-token>

DELETE /api/documents/:id
Authorization: Bearer <jwt-token>
```

### Workflow Endpoints

```http
POST /api/workflows
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "title": "Q3 Analysis",
  "description": "Financial review workflow"
}

GET /api/workflows
Authorization: Bearer <jwt-token>

GET /api/workflows/:workflowId/events
Authorization: Bearer <jwt-token>

PATCH /api/workflows/:workflowId/transition
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "action": "approve|reject|submit",
  "comment": "Approved for Q3"
}
```

### Health Endpoints

```http
GET /api/health              # Full health check
GET /api/health/live         # Liveness probe
GET /api/health/ready        # Readiness probe
GET /api/health/env-check    # Environment diagnostics (Admin only)
```

---

## 9. Testing Procedures

### Backend Tests

```powershell
cd server

# Run all tests
npm test

# Run with coverage
npm run test:cov

# Run specific test suite
npm test -- --grep "auth"

# Check environment
npm run check:env

# Run debug tests
npm run test:d
```

### Frontend Tests

```powershell
cd client

# Production build
npm run build

# Development server
npm run dev

# Lint check
npm run lint

# Preview production build
npm run preview
```

### Integration Testing

```powershell
# 1. Start MongoDB
mongod --dbpath ./data/db

# 2. Start Ollama (optional)
ollama serve
ollama pull llama3.2

# 3. Start backend
cd server && npm run dev

# 4. Start frontend
cd client && npm run dev

# 5. Open browser
# http://localhost:5173

# 6. Run API tests
cd server
node AUDIT_EVIDENCE/run_live_audit.mjs
```

### Test Categories

| Category | Tests | Status |
|----------|-------|--------|
| Category A | Core functionality | ✅ PASS |
| Category B | Agent functionality | ✅ PASS |
| Category C | Integration | ✅ PASS |
| Category D | Security | ✅ PASS |
| Live API | Runtime audit | 23/23 ✅ |

---

## 10. Security Considerations

### Implemented Security Measures

1. **JWT Authentication**
   - 24-hour token expiry
   - bcrypt password hashing
   - Role-based access control (RBAC)

2. **API Security**
   - CORS allowlist from `CLIENT_ORIGIN`
   - Request ID tracking
   - Rate limiting on auth endpoints
   - Input validation and sanitization

3. **File Upload Security**
   - Extension allowlist (pdf, docx, csv, xlsx, txt, md, png, jpg, jpeg, gif)
   - MIME type validation
   - 50MB size limit
   - Filename sanitization

4. **Authorization**
   - Department-level access control
   - Resource-level authorization
   - Tool permission service for agents

### Security Best Practices

```powershell
# 1. Generate strong JWT secret (32+ characters)
openssl rand -base64 32

# 2. Use environment variables, never hardcode secrets
# BAD: JWT_SECRET=mysecret
# GOOD: JWT_SECRET=${JWT_SECRET}

# 3. Disable self-registration in production
ALLOW_SELF_REGISTRATION=false

# 4. Use HTTPS in production
# Set NODE_ENV=production
# Configure reverse proxy (nginx) with SSL
```

### Security Checklist

- [ ] Change default passwords
- [ ] Set strong `JWT_SECRET`
- [ ] Configure `CLIENT_ORIGIN` for production domain
- [ ] Disable `ALLOW_SELF_REGISTRATION`
- [ ] Enable HTTPS with valid certificates
- [ ] Set up MongoDB authentication
- [ ] Configure firewall rules
- [ ] Enable audit logging monitoring
- [ ] Regular security updates

---

## 11. Known Issues & Limitations

### Critical Issues

| Issue | Impact | Workaround |
|-------|--------|------------|
| Agents don't call InferenceRouter | No live LLM inference | Install and configure Ollama |
| Data Science uses hardcoded series | Incorrect calculations | Provide explicit numeric data in query |
| Vision OCR not connected | No image processing | Wait for Tesseract integration |

### High Priority Issues

| Issue | Status | Notes |
|-------|--------|-------|
| No live Ollama integration by default | Needs setup | Install Ollama and pull models |
| Fine-tuning is simulated | Demo only | Not for production use |
| Neural embeddings not implemented | Hash fallback | Documented as lexical search |

### Medium Priority Issues

| Issue | Status | Notes |
|-------|--------|-------|
| GPU telemetry is simulated | Demo only | Label as simulated |
| Model benchmarks are random | Demo only | Not for production evaluation |
| Workflows are memory-only | Data loss on restart | Enable MongoDB persistence |

### Missing Features (Roadmap)

1. **End-to-end LLM agent loop** - Requires Ollama setup
2. **Real vision model path** - Requires Tesseract/local VLM
3. **Real fine-tune/benchmark** - Requires training infrastructure
4. **WebSocket/SSE live streams** - REST queue only currently
5. **Durable workflows** - MongoDB models needed

---

## 12. Troubleshooting

### Common Issues

#### MongoDB Connection Failed
```powershell
# Check MongoDB is running
mongod --dbpath ./data/db

# Verify connection string in .env
MONGODB_URI=mongodb://localhost:27017/sovereign_ai

# Test connection
mongosh mongodb://localhost:27017/sovereign_ai
```

#### Ollama Not Available
```powershell
# Install Ollama (macOS/Linux)
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama service
ollama serve

# Pull a model
ollama pull llama3.2

# Verify
ollama list
```

#### Frontend Build Failed
```powershell
cd client

# Clear cache
rm -rf node_modules package-lock.json
npm cache clean --force

# Reinstall
npm install
npm run build
```

#### CORS Errors
```powershell
# Verify CLIENT_ORIGIN in server/.env
CLIENT_ORIGIN=http://localhost:5173

# For production, set actual domain
CLIENT_ORIGIN=https://your-domain.com
```

### Diagnostic Commands

```powershell
# Backend environment check
cd server
npm run check:env

# Backend health check
curl http://localhost:5001/api/health

# Backend readiness
curl http://localhost:5001/api/health/ready

# Backend liveness
curl http://localhost:5001/api/health/live

# Inference backends status
curl -H "Authorization: Bearer <token>" http://localhost:5001/api/inference/backends

# Agent registry
curl -H "Authorization: Bearer <token>" http://localhost:5001/api/agents/registry
```

### Log Locations

| Component | Log Location |
|-----------|--------------|
| Backend | Console output (npm run dev) |
| MongoDB | ./data/db/*.log |
| Ollama | Console output (ollama serve) |

### Getting Help

1. Check `SOVEREIGN_AI_AUDIT_REPORT.md` for detailed findings
2. Review `FEATURE_INVENTORY.md` for feature status
3. Run `npm run check:env` for environment diagnostics
4. Check server console for error messages

---

## Appendix: File Structure

```
project-root/
├── MASTER.md                 # This file
├── server/
│   ├── .env.example          # Environment template
│   ├── index.js              # Express entry point
│   ├── package.json
│   ├── routes/               # API routes
│   │   ├── authRoutes.js
│   │   ├── agentRoutes.js
│   │   ├── documentRoutes.js
│   │   ├── inferenceRoutes.js
│   │   └── ...
│   ├── agents/               # AI agents
│   │   ├── AgentOrchestrator.js
│   │   ├── AgentRegistry.js
│   │   ├── BaseAgent.js
│   │   └── specialists/
│   │       ├── RAGAgent.js
│   │       ├── DataScienceAgent.js
│   │       ├── VisionAgent.js
│   │       └── ReportingAgent.js
│   ├── services/
│   │   ├── inference/        # LLM backends
│   │   ├── knowledge/        # RAG services
│   │   ├── security/         # Auth & permissions
│   │   └── ...
│   └── data/
│       └── vectordb/         # Vector database
│           └── vector_index.json
├── client/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── context/
│       │   └── AuthContext.jsx
│       ├── components/
│       │   ├── Sidebar.jsx
│       │   ├── Header.jsx
│       │   └── dashboards/
│       │       ├── EmployeeWorkspace.jsx
│       │       ├── AdminDashboard.jsx
│       │       └── ...
│       └── services/
│           └── api.js
└── AUDIT_EVIDENCE/          # Audit artifacts
    └── run_live_audit.mjs
```

---

## Appendix: Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-09-11 | 1.0 | Initial audit and documentation |
| 2026-09-13 | 1.0 | Consolidated into MASTER.md |

---

**End of Document**
