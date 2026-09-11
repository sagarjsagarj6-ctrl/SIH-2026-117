# Sovereign AI Enterprise Workbench

## Platform, Git, and Local Setup Guide

This guide explains what the platform does, how its services work together, how to pull the project with Git, and how to run it on a local machine.

The repository contains two applications:

| Directory | Responsibility | Local URL |
| --- | --- | --- |
| `client/` | React + Vite web interface | `http://localhost:5173` |
| `server/` | Express API, authentication, agents, ingestion, and diagnostics | `http://localhost:5001` |

MongoDB and a local LLM runtime are supported but are not required for the first local run. The server has an in-memory database and deterministic air-gap inference fallbacks.

## 1. How the platform works

At a high level, the browser talks to the local Express API. The API authenticates the user, applies role and department rules, processes enterprise data, and routes AI requests to an available local model runtime.

```text
Browser (React/Vite)
        |
        | HTTP + JWT
        v
Express API (Node.js)
   |        |          |
   |        |          +--> Hardware, model, and environment diagnostics
   |        +-------------> MongoDB, or in-memory fallback
   +----------------------> Ollama / vLLM / llama.cpp, or air-gap fallback
        |
        +--> Documents -> validation/PII checks -> chunks -> local vector index
        |
        +--> RAG, Data Science, Vision, and Reporting agents
        |
        +--> Audit logs, notifications, and employee/manager workflows
```

### Main platform areas

- **Data Foundation:** Uploads and ingests PDF, DOCX, spreadsheets, CSV, Markdown, text, and image-oriented data. The pipeline validates data, scores quality, identifies sensitive information, chunks content, and updates the local vector index.
- **Intelligence Layer:** Provides specialist agents: `RAG`, `DATA_SCIENCE`, `VISION`, and `REPORTING`. The task decomposer and orchestrator can run a single agent, a sequential pipeline, parallel specialist work, or a supervisor loop.
- **Operations and Inference:** Detects CPU/RAM/GPU capabilities, tracks model health, counts and trims tokens, and chooses a local inference backend.
- **Security and Governance:** Uses JWT sessions, role-based permissions, department-aware access, audit records, private-LAN configuration, and air-gap-oriented fallbacks.
- **LAN and workflow features:** Admins can create a private LAN entry and invite managers/employees. Employee-to-manager workflow transitions create notifications and AI handoff records.

### Startup sequence

When the server starts, it:

1. Loads `server/.env`.
2. Attempts to connect to MongoDB.
3. Falls back to an in-memory database if MongoDB is not reachable.
4. Seeds demo users, departments, models, documents, and audit data when the database is empty.
5. Rebuilds the local vector indexes.
6. Profiles hardware and checks configured model backends.
7. Starts the API server.

If MongoDB or all three model backends are offline, the application still starts. Data stored only in memory is lost when the server stops.

## 2. Requirements

Install these tools before cloning the project:

- Git
- Node.js LTS and npm
- MongoDB Community Server, optional but recommended when data must persist
- Ollama, vLLM, or llama.cpp, optional when live local model inference is required

Check the installed Node.js and npm versions:

```powershell
node --version
npm --version
```

Use a current Node.js LTS release. The repository is an ES module project and uses the Node/npm lock files committed with the source.

## 3. Pull the project with Git

### First-time clone

```powershell
git clone https://github.com/sagarjsagarj6-ctrl/SIH-2026-117.git
cd SIH-2026-117
```

If the repository has been moved, replace the URL with the URL provided by your team.

### Update an existing local copy

```powershell
cd SIH-2026-117
git status
git switch main
git pull --ff-only origin main
```

`git pull --ff-only` stops instead of silently creating a merge commit. If `git status` shows uncommitted work, save or commit that work before pulling.

### Create a development branch

```powershell
git switch -c codex/my-change
```

Use a descriptive branch name, for example `codex/improve-ingestion-errors`.

### Share a completed change

```powershell
git status
git diff
git add client server PLATFORM_SETUP_AND_USAGE_GUIDE.md
git diff --cached
git commit -m "Document local platform setup"
git push -u origin codex/my-change
```

Never add `.env` files, private keys, model credentials, or other secrets to Git. They are excluded by `.gitignore`; only `.env.example` files belong in the repository.

## 4. Configure environment variables

Create one environment file for each application from the checked-in templates.

```powershell
Copy-Item server\.env.example server\.env
Copy-Item client\.env.example client\.env
```

Edit the files with any editor, for example:

```powershell
notepad server\.env
notepad client\.env
```

### Server variables: `server/.env`

| Variable | Local value / example | Purpose |
| --- | --- | --- |
| `PORT` | `5001` | Port used by the Express API. |
| `NODE_ENV` | `development` | Runtime mode for local development. |
| `ALLOW_SELF_REGISTRATION` | `true` in development | Set to `false` in production; public registration always creates Employee accounts. |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/sovereign_ai_db` | MongoDB connection. If unavailable, the server uses in-memory data. |
| `JWT_SECRET` | A private random string of at least 32 characters | Signs login tokens. Set this explicitly; protected API requests require it. |
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | Ollama HTTP endpoint. |
| `VLLM_HOST` | `http://127.0.0.1:8000` | vLLM OpenAI-compatible endpoint. |
| `LLAMACPP_HOST` | `http://127.0.0.1:8080` | llama.cpp HTTP endpoint. |
| `EMBEDDING_BACKEND` | `auto` | Uses Ollama embeddings when available; otherwise deterministic local hashes. Set `hash` to force offline mode. |
| `EMBEDDING_MODEL` | `nomic-embed-text` | Ollama embedding model name. |
| `TRAINING_MODE` | `auto` | Selects live LoRA only when Python, model weights, script, and packages are available; otherwise uses labeled simulation. |
| `TRAINING_PYTHON` | `python` | Python executable for the optional local trainer. |
| `TRAINING_MODEL_PATH` | blank | Local Hugging Face-compatible model directory required for live LoRA. |
| `LORA_TRAINER_SCRIPT` | blank | Optional path to a custom trainer; defaults to `server/services/finetune/train_lora.py`. |
| `TESSERACT_CMD` | `tesseract` | Optional local OCR executable. Image ingestion reports fallback mode when unavailable. |
| `ALLOW_LAN_ONLY` | `true` | Keeps the intended deployment limited to private LAN addresses. |
| `AIRGAP_MODE` | `true` | Keeps the intended deployment in air-gapped mode. |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Frontend origin used for deployment configuration. |
| `LOG_LEVEL` | `info` | Logging level: `debug`, `info`, `warn`, or `error`. |

Generate a strong local JWT secret with Node.js:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copy the output into `JWT_SECRET`. Do not publish that value.

For the easiest local setup, keep the server values from `server/.env.example`. MongoDB and model daemon variables may point to services on another private-LAN host when the deployment is distributed.

### Client variables: `client/.env`

| Variable | Local value / example | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `/api` | Base URL used by the browser; Vite proxies it to port `5001` during development. Use a full URL only for a separately hosted production client. |
| `VITE_APP_NAME` | `Sovereign AI Workbench` | Application name shown by the client. |
| `VITE_SECURITY_MODE` | `AIR_GAPPED_ENTERPRISE` | Security-mode label used by the client. |

Vite reads `VITE_*` variables when the dev server starts. Restart the client after changing `client/.env`.

Keep port `5001` for the standard local run. If you intentionally change it, update the Vite proxy in `client/vite.config.js` and restart both processes.

## 5. Install dependencies

Run these commands from the repository root in PowerShell:

```powershell
Set-Location server
npm ci

Set-Location ..\client
npm ci

Set-Location ..
```

`npm ci` uses the committed lock files and gives a repeatable installation. Use `npm install` only when you intentionally need to update dependency lock files.

## 6. Check the environment before starting

From the server directory:

```powershell
Set-Location server
npm run check:env
```

The diagnostic checks environment variables, MongoDB state, and reachability of Ollama, vLLM, and llama.cpp. An offline model daemon is expected during a basic setup because the server can use its built-in air-gap fallback.

The detailed environment report is available to authenticated Admin users at:

```text
GET http://localhost:5001/api/health/env-check
```

Public process and readiness endpoints are:

```text
GET http://localhost:5001/api/health
GET http://localhost:5001/api/health/live
GET http://localhost:5001/api/health/ready
```

## 7. Run the platform locally

Use two terminal windows.

### Terminal 1: backend

```powershell
Set-Location server
npm run dev
```

For a non-watch process, use `npm start` instead.

The API should be available at `http://localhost:5001`.

### Terminal 2: frontend

```powershell
Set-Location client
npm run dev
```

Open `http://localhost:5173` in a browser. The Vite development server proxies `/api` requests to port `5001`. If the backend is stopped, the login modal now reports the exact startup command instead of only showing `Failed to fetch`.

### First login

The server seeds these demo accounts when the database is empty:

| Role | Email | Password | Department |
| --- | --- | --- | --- |
| Admin | `admin@sovereign.local` | `Admin@123` | Executive & Strategy |
| Manager | `manager.finance@sovereign.local` | `Manager@123` | Finance & Accounting |
| Employee | `employee.rd@sovereign.local` | `Emp@123` | R&D / Engineering |
| Manager | `manager.legal@sovereign.local` | `Manager@123` | Legal & Compliance |

These are development/demo credentials. Change or remove them before any real deployment.

After login, the client shows a hardware confirmation step and then displays navigation based on the user role. Admins see governance and LAN setup; managers see analytics; employees and managers can use the workspace and connect to a LAN; all standard roles can access the data, intelligence, workflow, and model areas allowed by the client and API.

## 8. Inference backend behavior

The inference router checks local backends in this order when `AUTO` is selected:

1. vLLM at `VLLM_HOST`
2. Ollama at `OLLAMA_HOST`
3. llama.cpp at `LLAMACPP_HOST`
4. Built-in air-gap fallback when no live daemon responds

You do not need to install a model runtime to start the UI, run the server tests, or explore the seeded dashboards. Install and configure a local runtime when you need responses from real local model weights.

## 9. Useful verification commands

### Backend tests

```powershell
Set-Location server
npm test
```

Run one category when debugging:

```powershell
npm run test:a   # data foundation and ingestion
npm run test:b   # multi-agent intelligence
npm run test:c   # hardware, inference, and diagnostics
```

### Frontend lint and production build

```powershell
Set-Location client
npm run lint
npm run build
```

The production build is written to `client/dist/`, which is ignored by Git.

## 10. Common problems

### The browser cannot connect to the API

Confirm the backend terminal is running and open `http://localhost:5001/api/health`. Start it with `Set-Location server; npm run dev`. Do not run two backend processes on the same port.

### MongoDB connection warning

This is not fatal for local development. The server switches to its in-memory database. Start MongoDB and verify `MONGODB_URI` when persistence across restarts is required.

### Ollama, vLLM, or llama.cpp is offline

This is expected unless a local inference daemon is installed and running. The environment report will show the daemon as offline and inference will use the built-in air-gap fallback.

### Login or protected API requests fail

Check that `JWT_SECRET` is set in `server/.env`, restart the backend, and log in again. Existing browser sessions may contain an old token; log out, clear the site session, or use a private browser window.

### Port or CORS mismatch

Keep these values aligned during local development:

```text
Backend:  PORT=5001
Frontend: VITE_API_URL=/api
Browser:  http://localhost:5173
```

If any value changes, update the related `.env` file and restart the affected process.

### Live training setup

The Fine-Tuning Studio now stages uploaded JSON/JSONL datasets, reports server-owned progress and loss history, supports cancellation, and exposes the selected runtime. The default `AUTO` mode remains simulation until all live dependencies are available.

To activate the included local LoRA runner, install `torch`, `transformers`, `datasets`, and `peft` in the isolated Python environment, place compatible model weights on disk, then set `TRAINING_MODEL_PATH`. The API endpoint `GET /api/models/training/capabilities` shows exactly what is missing.

### Live OCR and embeddings

Install Tesseract and set `TESSERACT_CMD` to enable image OCR. Set `EMBEDDING_BACKEND=ollama`, install the configured embedding model, and rebuild the knowledge index from the Admin knowledge tools to use neural embeddings. Both features return explicit fallback metadata when unavailable.

### Live database connectors

The database connector no longer fabricates successful SQL/Mongo connections. Install the optional `pg`, `mysql2`, `better-sqlite3`, or MongoDB runtime dependencies in the air-gapped server image, then test each registered source from the Data Foundation screen.

## 11. Important project files

| File | Why it matters |
| --- | --- |
| `server/index.js` | Express startup, route registration, health endpoints, and bootstrap sequence. |
| `server/.env.example` | Authoritative server configuration template. |
| `client/.env.example` | Authoritative client configuration template. |
| `server/services/config/EnvChecker.js` | Environment and service diagnostics. |
| `server/seed.js` | Development seed users and demo records. |
| `server/services/knowledge/` | Parsing, chunking, embeddings, vector storage, and retrieval. |
| `server/agents/` | Agent registry, orchestration, memory, and specialist agents. |
| `server/routes/` | REST API route groups. |
| `client/src/App.jsx` | Client authentication flow and role-aware dashboard rendering. |
| `SYSTEM_CAPABILITY_AND_ENV_GUIDE.md` | Detailed capability and diagnostic reference. |

## 12. Safe local-development checklist

- Keep `server/.env` and `client/.env` local; never commit them.
- Set a unique `JWT_SECRET` before sharing a deployment.
- Keep `AIRGAP_MODE=true` and `ALLOW_LAN_ONLY=true` for the intended private deployment model.
- Use MongoDB when data must survive backend restarts.
- Run `npm test`, `npm run lint`, and `npm run build` before pushing changes.
- Check `git diff` before committing so secrets and generated files are not included.
