# CATEGORY C — OPERATIONS & INTERFACE

## Implementation Plan for SIH26117 Sovereign On-Premise Agentic AI Workbench

> **Scope**: Security & Governance (C1) + Enterprise UI/UX & Deployment (C2)
> **Priority**: 🔴 CRITICAL — Enterprise-grade security and deployment readiness.

---

## C1. Security, Governance & Compliance

### C1.1 Authentication & Authorization

**Objective**: Implement enterprise-grade authentication with role-based (RBAC) and attribute-based (ABAC) access control.

> **Already Partially Built**: [authRoutes.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/routes/authRoutes.js), [User.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/models/User.js), and [AuthContext.jsx](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/client/src/context/AuthContext.jsx) exist.

| File | Purpose | Status |
|------|---------|--------|
| `server/services/security/RBACEngine.js` | **[NEW]** Role-Based Access Control engine — Admin, Manager, Employee permission matrices | 🔲 TODO |
| `server/services/security/ABACEngine.js` | **[NEW]** Attribute-Based Access Control — department, sensitivity, time-of-day, IP-based rules | 🔲 TODO |
| `server/services/security/PolicyEngine.js` | **[NEW]** Unified policy evaluator combining RBAC + ABAC rules | 🔲 TODO |
| `server/services/security/SessionManager.js` | **[NEW]** JWT session management with refresh tokens, concurrent session limits | 🔲 TODO |
| `server/middleware/rbacMiddleware.js` | **[NEW]** Express middleware for route-level permission checks | 🔲 TODO |
| `server/models/AccessPolicy.js` | **[NEW]** Mongoose model for custom access policies | 🔲 TODO |

#### RBAC Permission Matrix

```
┌───────────────┬─────────┬──────────┬─────────┬────────────┬───────────┐
│ Resource      │ Admin   │ Manager  │ Employee │ Auditor    │ Guest     │
├───────────────┼─────────┼──────────┼─────────┼────────────┼───────────┤
│ All Data      │ ✅ Full │ 🔒 Dept  │ 🔒 Dept │ 👁️ Read   │ ❌ None   │
│ Agent Execute │ ✅ All  │ ✅ Dept  │ ✅ Dept │ ❌ None    │ ❌ None   │
│ Model Manage  │ ✅ Full │ 👁️ View │ ❌ None │ 👁️ View   │ ❌ None   │
│ Fine-Tune     │ ✅ Full │ ✅ Dept  │ ❌ None │ ❌ None    │ ❌ None   │
│ User Manage   │ ✅ Full │ 🔒 Dept │ ❌ None │ ❌ None    │ ❌ None   │
│ Audit Logs    │ ✅ Full │ 🔒 Dept  │ ❌ None │ ✅ Full    │ ❌ None   │
│ System Config │ ✅ Full │ ❌ None  │ ❌ None │ ❌ None    │ ❌ None   │
└───────────────┴─────────┴──────────┴─────────┴────────────┴───────────┘
```

#### ABAC Policy Examples

```javascript
const abacPolicies = [
  {
    name: 'Department Data Isolation',
    condition: (user, resource) => user.department === resource.department,
    effect: 'ALLOW',
    priority: 10
  },
  {
    name: 'Top-Secret Access Restriction',
    condition: (user, resource) => 
      resource.sensitivity === 'Top-Secret' && 
      (user.role === 'Admin' || resource.whitelistedUsers?.includes(user.id)),
    effect: 'ALLOW',
    priority: 20
  },
  {
    name: 'Block After-Hours Access',
    condition: (user) => {
      const hour = new Date().getHours();
      return user.role === 'Employee' && (hour < 6 || hour > 22);
    },
    effect: 'DENY',
    priority: 5
  },
  {
    name: 'LAN-Only Enforcement',
    condition: (user, resource, context) => {
      const ip = context.ipAddress;
      return ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.');
    },
    effect: 'ALLOW',
    priority: 30
  }
];
```

---

### C1.2 Audit & Compliance System

**Objective**: Complete audit trail of every action — data access, agent execution, model operations, and security events.

> **Already Partially Built**: [AuditLog.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/models/AuditLog.js) and [auditRoutes.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/routes/auditRoutes.js) exist.

| File | Purpose | Status |
|------|---------|--------|
| `server/services/audit/AuditService.js` | **[NEW]** Central audit logging service — structured event recording | 🔲 TODO |
| `server/services/audit/ComplianceReporter.js` | **[NEW]** Generate compliance reports (SOC2, ISO 27001, GDPR-style summaries) | 🔲 TODO |
| `server/services/audit/AnomalyDetector.js` | **[NEW]** Detect suspicious patterns: brute-force, unauthorized access attempts, data exfiltration | 🔲 TODO |
| `server/services/audit/AuditExporter.js` | **[NEW]** Export audit logs to CSV/JSON for external review | 🔲 TODO |
| `server/models/AuditLog.js` | **[MODIFY]** Add fields: `geoLocation`, `deviceFingerprint`, `riskScore`, `sessionId` | 🔲 TODO |

#### Audit Event Categories

| Category | Events Logged |
|----------|--------------|
| **Authentication** | Login, logout, failed attempts, password changes, session expiry |
| **Data Access** | Document views, searches, downloads, cross-department access attempts |
| **Agent Execution** | Query submitted, agents invoked, results returned, confidence scores |
| **Model Operations** | Model loaded/unloaded, inference calls, fine-tune jobs, health checks |
| **Admin Actions** | User CRUD, policy changes, system configuration, model deployment |
| **Security Events** | RBAC denials, ABAC blocks, suspicious activity, rate-limit triggers |

#### Audit Log Schema (Enhanced)

```javascript
const AuditLogSchema = {
  eventId: 'UUID',
  timestamp: 'ISO-8601',
  sessionId: 'session_uuid',
  user: {
    id: 'user_id',
    name: 'string',
    role: 'Admin|Manager|Employee',
    department: 'string',
    ipAddress: '10.0.4.xxx',
    deviceFingerprint: 'hash'
  },
  action: 'AGENT_EXECUTION_RAG | DATA_ACCESS | LOGIN | ...',
  resource: 'string',
  status: 'SUCCESS | DENIED | ERROR',
  riskScore: 0.0,        // 0-1 scale, higher = more suspicious
  details: 'string',
  metadata: {
    tokensUsed: 0,
    latencyMs: 0,
    modelUsed: 'string',
    agentsInvolved: []
  }
};
```

---

### C1.3 Data Loss Prevention (DLP)

**Objective**: Prevent confidential data from leaving the air-gapped environment.

| File | Purpose | Status |
|------|---------|--------|
| `server/services/security/DLPEngine.js` | **[NEW]** Scan outbound traffic and AI outputs for sensitive data patterns | 🔲 TODO |
| `server/services/security/DataMasker.js` | **[NEW]** Mask/redact PII, financial data, and classified content in outputs | 🔲 TODO |
| `server/services/security/NetworkGuard.js` | **[NEW]** Block any outbound network requests from the server process | 🔲 TODO |

#### DLP Rules

```
1. Block external HTTP/HTTPS requests from server process
2. Scan AI outputs for credit card numbers (regex: \d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})
3. Scan AI outputs for SSN patterns (regex: \d{3}-\d{2}-\d{4})
4. Scan AI outputs for email addresses of real employees
5. Block copy/paste of Top-Secret classified content
6. Rate-limit document downloads per user per hour
7. Watermark all exported files with user identity and timestamp
```

---

### C1.4 Encryption & Key Management

**Objective**: Encrypt data at rest and in transit within the air-gapped LAN.

| File | Purpose | Status |
|------|---------|--------|
| `server/services/security/EncryptionService.js` | **[NEW]** AES-256-GCM encryption for stored documents | 🔲 TODO |
| `server/services/security/KeyVault.js` | **[NEW]** Local key management — generate, rotate, and store encryption keys | 🔲 TODO |
| `server/config/tls.js` | **[NEW]** TLS certificate configuration for HTTPS within LAN | 🔲 TODO |

#### Encryption Specifications

| Layer | Algorithm | Key Length |
|-------|-----------|------------|
| Data at Rest | AES-256-GCM | 256-bit |
| Data in Transit | TLS 1.3 | 256-bit ECDHE |
| Password Hashing | bcrypt | 10+ rounds (✅ already implemented) |
| JWT Signing | RS256 | 2048-bit RSA |
| File Checksums | SHA-256 | 256-bit |

---

## C2. Enterprise UI/UX & Deployment

### C2.1 Dashboard System

**Objective**: Role-specific dashboards that surface the right information to the right users.

> **Already Partially Built**: [AdminDashboard.jsx](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/client/src/components/dashboards/AdminDashboard.jsx), [ManagerDashboard.jsx](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/client/src/components/dashboards/ManagerDashboard.jsx), [EmployeeWorkspace.jsx](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/client/src/components/dashboards/EmployeeWorkspace.jsx) exist.

| File | Purpose | Status |
|------|---------|--------|
| `client/src/components/dashboards/AdminDashboard.jsx` | **[MODIFY]** Add: system health, model status, user activity heatmap, security alerts, resource utilization | 🔲 TODO |
| `client/src/components/dashboards/ManagerDashboard.jsx` | **[MODIFY]** Add: department analytics, team AI usage, knowledge base stats, pending approvals | 🔲 TODO |
| `client/src/components/dashboards/EmployeeWorkspace.jsx` | **[MODIFY]** Add: AI agent chat, document search, personal query history, saved reports | 🔲 TODO |
| `client/src/components/dashboards/AuditorDashboard.jsx` | **[NEW]** Full audit trail viewer, compliance status, anomaly alerts, exportable reports | 🔲 TODO |

#### Dashboard Widget Components

| File | Purpose | Status |
|------|---------|--------|
| `client/src/components/widgets/SystemHealthGauge.jsx` | **[NEW]** CPU/GPU/RAM real-time gauges with animated SVG dials | 🔲 TODO |
| `client/src/components/widgets/ModelStatusCard.jsx` | **[NEW]** Model health, TPS, latency, active/idle status | 🔲 TODO |
| `client/src/components/widgets/ActivityHeatmap.jsx` | **[NEW]** User activity heatmap (queries by hour/day) | 🔲 TODO |
| `client/src/components/widgets/SecurityAlertFeed.jsx` | **[NEW]** Real-time security event ticker | 🔲 TODO |
| `client/src/components/widgets/DepartmentUsageChart.jsx` | **[NEW]** Bar/pie charts of AI usage per department | 🔲 TODO |
| `client/src/components/widgets/QueryTimeline.jsx` | **[NEW]** Timeline view of agent queries and responses | 🔲 TODO |

### C2.2 Conversational AI Interface

**Objective**: Premium enterprise chat interface with multi-modal input and rich output rendering.

| File | Purpose | Status |
|------|---------|--------|
| `client/src/components/chat/ChatInterface.jsx` | **[NEW]** Main chat UI — message bubbles, streaming responses, agent indicators | 🔲 TODO |
| `client/src/components/chat/MessageBubble.jsx` | **[NEW]** Rich message rendering: markdown, code blocks, tables, charts, citations | 🔲 TODO |
| `client/src/components/chat/FileAttachment.jsx` | **[NEW]** Attach files/images to chat queries | 🔲 TODO |
| `client/src/components/chat/StreamingIndicator.jsx` | **[NEW]** Animated typing/thinking indicator during agent processing | 🔲 TODO |
| `client/src/components/chat/CitationPanel.jsx` | **[NEW]** Expandable source citation sidebar | 🔲 TODO |
| `client/src/context/ChatContext.jsx` | **[NEW]** Chat state management — conversation history, active session, pending queries | 🔲 TODO |

#### Chat Interface Features

```
┌─────────────────────────────────────────────────────────────┐
│ 🔒 Sovereign AI Workbench — Secure Chat                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🤖 RAG Agent                                              │
│  Based on your Q3 financial audit report [Source: Q3_audit  │
│  .pdf, p.3], the revenue variance was +12.4% compared to   │
│  Q2. Key drivers include:                                  │
│  • Enterprise licensing +18.2% [Source: revenue.xlsx]       │
│  • Hardware sales -3.1% [Source: Q3_audit.pdf, p.7]        │
│                                                             │
│  📊 [Interactive Chart: Revenue Trend Q1-Q3]               │
│                                                             │
│  Confidence: 94% | Sources: 3 | Tokens: 1240               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  📎 [Attach File]  🎤 [Voice]  📷 [Image]                  │
│  ┌──────────────────────────────────────────┐  [Send ▶]    │
│  │ Ask your sovereign AI agent...           │              │
│  └──────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

---

### C2.3 Real-Time Notifications & WebSocket Layer

**Objective**: Real-time updates for long-running operations (agent processing, fine-tuning, ingestion).

| File | Purpose | Status |
|------|---------|--------|
| `server/services/realtime/WebSocketServer.js` | **[NEW]** Socket.io server for real-time event broadcasting | 🔲 TODO |
| `server/services/realtime/EventBroadcaster.js` | **[NEW]** Publish events: agent progress, model status, security alerts | 🔲 TODO |
| `client/src/context/WebSocketContext.jsx` | **[NEW]** Client-side WebSocket connection manager | 🔲 TODO |
| `client/src/hooks/useRealtimeEvents.js` | **[NEW]** React hook for subscribing to real-time event streams | 🔲 TODO |

#### Real-Time Events

| Event | Payload | Consumer |
|-------|---------|----------|
| `agent:thinking` | `{ agentName, step, progress }` | Chat interface |
| `agent:response` | `{ tokens, isComplete }` | Chat interface (streaming) |
| `model:health` | `{ modelId, status, latency }` | Admin dashboard |
| `finetune:progress` | `{ jobId, epoch, loss }` | Model management |
| `ingestion:status` | `{ fileId, stage, percent }` | Data dashboard |
| `security:alert` | `{ type, severity, details }` | Admin/Auditor dashboard |

---

### C2.4 Deployment & Infrastructure

**Objective**: Deploy the workbench on air-gapped LAN/MAN infrastructure with Docker containerization.

| File | Purpose | Status |
|------|---------|--------|
| `docker-compose.yml` | **[NEW]** Multi-service orchestration: frontend, backend, MongoDB, vector DB, inference server | 🔲 TODO |
| `Dockerfile.client` | **[NEW]** Client container (Nginx + built Vite assets) | 🔲 TODO |
| `Dockerfile.server` | **[NEW]** Server container (Node.js + dependencies) | 🔲 TODO |
| `Dockerfile.inference` | **[NEW]** Inference container (Ollama/vLLM with CUDA support) | 🔲 TODO |
| `nginx/nginx.conf` | **[NEW]** Reverse proxy config — route API and frontend, add security headers | 🔲 TODO |
| `scripts/setup-airgap.sh` | **[NEW]** Offline installation script — pre-bundle all deps for air-gapped deploy | 🔲 TODO |
| `scripts/health-check.sh` | **[NEW]** System health verification script | 🔲 TODO |

#### Docker Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Docker Network (LAN)                  │
│                                                          │
│  ┌───────────┐  ┌───────────┐  ┌────────────────────┐   │
│  │  Nginx    │  │  Node.js  │  │  MongoDB            │   │
│  │  :80/:443 │→ │  :5000    │→ │  :27017             │   │
│  │  (Client) │  │  (API)    │  │  (Persistent Store)  │   │
│  └───────────┘  └───────────┘  └────────────────────┘   │
│                       ↓                                  │
│  ┌────────────────────────┐  ┌─────────────────────┐    │
│  │  Ollama / vLLM         │  │  ChromaDB            │    │
│  │  :11434                │  │  :8000               │    │
│  │  (GPU Inference)       │  │  (Vector Store)      │    │
│  └────────────────────────┘  └─────────────────────┘    │
│                                                          │
│  ❌ NO outbound internet access                          │
└──────────────────────────────────────────────────────────┘
```

#### docker-compose.yml Structure

```yaml
version: '3.9'
services:
  nginx:
    build: ./nginx
    ports: ['443:443', '80:80']
    depends_on: [client, server]
    
  client:
    build:
      context: ./client
      dockerfile: Dockerfile.client
    
  server:
    build:
      context: ./server
      dockerfile: Dockerfile.server
    environment:
      - MONGO_URI=mongodb://mongodb:27017/sovereign_ai
      - OLLAMA_URL=http://inference:11434
      - CHROMA_URL=http://chromadb:8000
    depends_on: [mongodb, inference, chromadb]
    
  mongodb:
    image: mongo:7
    volumes: ['mongo_data:/data/db']
    
  inference:
    image: ollama/ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    volumes: ['ollama_models:/root/.ollama']
    
  chromadb:
    image: chromadb/chroma
    volumes: ['chroma_data:/chroma/chroma']

volumes:
  mongo_data:
  ollama_models:
  chroma_data:
```

---

### C2.5 Monitoring & Observability

**Objective**: System monitoring for performance, errors, and capacity planning.

| File | Purpose | Status |
|------|---------|--------|
| `server/services/monitoring/MetricsCollector.js` | **[NEW]** Collect API response times, error rates, throughput metrics | 🔲 TODO |
| `server/services/monitoring/AlertManager.js` | **[NEW]** Trigger alerts on thresholds: high latency, GPU OOM, disk full | 🔲 TODO |
| `server/services/monitoring/SystemReporter.js` | **[NEW]** Generate daily/weekly system health reports | 🔲 TODO |

#### Key Monitoring Metrics

| Metric | Threshold | Alert |
|--------|-----------|-------|
| API Response Time (p95) | > 2000ms | ⚠️ Warning |
| GPU VRAM Usage | > 90% | 🔴 Critical |
| Disk Usage | > 85% | ⚠️ Warning |
| Failed Auth Attempts | > 5/min from same IP | 🔴 Critical (potential brute-force) |
| Inference Errors | > 5% error rate | ⚠️ Warning |
| Memory (RAM) Usage | > 90% | 🔴 Critical |

---

## Frontend — Design System & Theming

> **Already Built**: Theme system with 3 flashy themes (Dark Cyber Neon, Bright Electric Pop, Lighter Neon Pastel) in [index.css](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/client/src/index.css) and [FloatingThemeSelector.jsx](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/client/src/components/FloatingThemeSelector.jsx).

| File | Purpose | Status |
|------|---------|--------|
| `client/src/components/ui/LoadingSpinner.jsx` | **[NEW]** Neon-glow animated loader | 🔲 TODO |
| `client/src/components/ui/ToastNotification.jsx` | **[NEW]** Slide-in toast notifications for success/error/warning | 🔲 TODO |
| `client/src/components/ui/ConfirmDialog.jsx` | **[NEW]** Modal confirmation dialogs for destructive actions | 🔲 TODO |
| `client/src/components/ui/ProgressBar.jsx` | **[NEW]** Animated gradient progress bars | 🔲 TODO |
| `client/src/components/ui/DataTable.jsx` | **[NEW]** Sortable, filterable, paginated data tables | 🔲 TODO |
| `client/src/components/ui/Badge.jsx` | **[NEW]** Reusable status badges (Active, Error, Training, etc.) | 🔲 TODO |

---

## Dependencies to Install

```bash
# Server-side
npm install socket.io jsonwebtoken helmet rate-limiter-flexible crypto-js

# Client-side
npm install socket.io-client chart.js react-chartjs-2 react-markdown
npm install @heroicons/react framer-motion
```

---

## Verification Plan

### Automated Tests
```bash
# Security tests
node --test server/services/security/__tests__/RBACEngine.test.js
node --test server/services/security/__tests__/ABACEngine.test.js
node --test server/services/security/__tests__/DLPEngine.test.js

# Audit tests
node --test server/services/audit/__tests__/AuditService.test.js

# WebSocket tests
node --test server/services/realtime/__tests__/WebSocketServer.test.js
```

### Manual Verification
1. Login as Employee → verify can only access own department's data
2. Login as Manager → verify can see department analytics but not system config
3. Login as Admin → verify full access to all resources
4. Attempt cross-department access → verify RBAC denial + audit log entry
5. Run compliance report → verify all events are captured
6. Test DLP → verify PII is masked in AI outputs
7. Run `docker-compose up` → verify all services start and communicate
8. Disconnect internet → verify system operates fully offline (air-gapped)
9. Trigger security alert → verify real-time notification appears in admin dashboard

---

## Estimated Effort

| Sub-component | Effort | Priority |
|--------------|--------|----------|
| RBAC/ABAC Engine (C1.1) | 4-5 days | P0 |
| Audit & Compliance (C1.2) | 3-4 days | P0 |
| Data Loss Prevention (C1.3) | 2-3 days | P1 |
| Encryption & Keys (C1.4) | 2-3 days | P0 |
| Dashboard Enhancements (C2.1) | 4-5 days | P0 |
| Chat Interface (C2.2) | 5-6 days | P0 |
| WebSocket Real-time (C2.3) | 2-3 days | P1 |
| Docker Deployment (C2.4) | 3-4 days | P1 |
| Monitoring (C2.5) | 2-3 days | P2 |
| UI Components (Design System) | 3-4 days | P1 |
| **Total** | **~30-40 days** | — |

---

## Grand Total (All 3 Categories)

| Category | Estimated Effort |
|----------|-----------------|
| **A — Data Foundation** | 18-22 days |
| **B — Intelligence Layer** | 30-38 days |
| **C — Operations & Interface** | 30-40 days |
| **Overall Total** | **~78-100 days** (~3.5-4.5 months with 1 developer) |

> [!TIP]
> With a team of 3-4 developers working in parallel on each category, this can be compressed to **6-8 weeks**.
