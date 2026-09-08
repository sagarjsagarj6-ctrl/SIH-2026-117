# Category C Implementation Plan

Implementation plan for **Operations & Interface** in the Sovereign On-Premise Agentic AI Workbench. This plan is grounded in the current Category A/B code and maps each backend capability to a frontend surface.

## Delivery Strategy

Deliver the work in vertical slices so every security or operations capability is usable through the existing React shell:

1. **P0 security foundation**: RBAC, ABAC, unified policy evaluation, audit enrichment, auditor read/export access, and frontend route mapping.
2. **P0 data protection**: DLP scanning/masking, encrypted document primitives, local key rotation, and policy/audit integration.
3. **P0 operations UI**: role-specific dashboard widgets, auditor dashboard, reusable status/progress/table primitives, and employee chat state.
4. **P1 realtime**: Socket.io server/client contexts and event subscriptions for agent, model, ingestion, and security events.
5. **P1 deployment**: container images, Nginx reverse proxy, air-gap setup, health checks, and locked-down service networking.
6. **P2 observability**: metrics, threshold alerts, and scheduled health reporting.

## Current Baseline

- `client/src/App.jsx` already routes Category A and B dashboards through `activeTab`.
- `client/src/components/Sidebar.jsx` already filters navigation by role.
- `server/middleware/auth.js` already authenticates JWTs and writes basic denial events.
- `server/routes/auditRoutes.js` already scopes Admin and Manager audit reads.
- Client and server package roots build/parse successfully; the workspace root intentionally has no `package.json`.

## P0 Security Foundation

### Backend

- Add `server/services/security/RBACEngine.js` with the Category C permission matrix for Admin, Manager, Employee, Auditor, and Guest.
- Add `server/services/security/ABACEngine.js` for department isolation, sensitivity checks, after-hours employee denial, and LAN-only context checks.
- Add `server/services/security/PolicyEngine.js` to combine role and attribute decisions with explicit deny precedence and decision reasons.
- Add `server/middleware/rbacMiddleware.js` as the route adapter for policy checks and resource department resolution.
- Extend `server/models/AuditLog.js` with event/session/device/risk/metadata fields while preserving existing fields.
- Add `server/services/audit/AuditService.js` as the single structured logging entry point.
- Extend `server/routes/auditRoutes.js` for Auditor access and JSON export; keep Manager results department-scoped.

### Frontend mapping

- Add `client/src/components/dashboards/AuditorDashboard.jsx` for audit trail, status filters, risk visibility, and JSON export.
- Add the Auditor navigation item in `Sidebar.jsx` and the route in `App.jsx`.
- Keep authorization server-side; frontend role filtering is navigation ergonomics only.

### Acceptance checks

- Admin can read all audit events; Manager and Auditor cannot read another department through the API.
- Employee cannot manage models, users, policies, or audit logs.
- Cross-department and sensitivity denials return `403` and create structured audit events.
- Auditor can view and export the permitted audit trail.

## P0 Data Protection

- `DLPEngine.js` detects credit cards, SSNs, employee email patterns, and classified output.
- `DataMasker.js` redacts detected values while preserving useful context.
- `NetworkGuard.js` provides an explicit allowlist wrapper for outbound requests.
- `EncryptionService.js` uses Node AES-256-GCM with authenticated metadata.
- `KeyVault.js` stores versioned local keys, supports rotation, and requires an operator-provided vault secret in production.
- Integrate DLP and encryption outcomes with `AuditService`.

## P0 Operations UI

- Add widgets under `client/src/components/widgets/` for health, model status, activity, security alerts, department usage, and query timeline.
- Extend Admin, Manager, and Employee surfaces with role-appropriate widgets using existing API contracts.
- Add `ChatContext.jsx` and chat components under `client/src/components/chat/`; reuse the existing `/api/agents/query` contract before adding streaming.
- Add shared UI primitives under `client/src/components/ui/` and use them in new surfaces.

## P1 Realtime and Deployment

- Add Socket.io `WebSocketServer` and `EventBroadcaster` behind authenticated LAN connections.
- Add `WebSocketContext` and `useRealtimeEvents` on the client; fall back to current polling APIs when realtime is unavailable.
- Add `docker-compose.yml`, `Dockerfile.client`, `Dockerfile.server`, inference image configuration, Nginx security headers, and air-gap scripts.
- Do not publish MongoDB, vector DB, or inference ports outside the private Docker network.

## P2 Monitoring

- Add metrics collection around request latency, errors, inference throughput, resource pressure, and authentication failures.
- Add threshold-based alerts and daily/weekly reports; expose summaries to Admin and Auditor dashboards.

## Verification Sequence

1. `node --test server/services/security/__tests__/*.test.js server/services/audit/__tests__/*.test.js`
2. `npm run build` and `npm run lint` from `client/`.
3. `node --check` for changed server modules.
4. Start the backend with the configured memory fallback and verify `/api/health`.
5. Verify Admin, Manager, Employee, Auditor, and cross-department scenarios manually.
6. Run Docker and offline checks only after container assets are present.

## Requirement Traceability

| Category C scope | Implementation surface | Frontend surface | Status |
|---|---|---|---|
| C1.1 Authentication/RBAC/ABAC | `security/*`, `rbacMiddleware.js` | Sidebar/App role routing | P0 foundation |
| C1.2 Audit/compliance | `AuditService`, `AuditLog`, audit routes | Auditor dashboard | P0 foundation |
| C1.3 DLP | `DLPEngine`, `DataMasker`, `NetworkGuard` | Chat/export feedback | Planned P0 |
| C1.4 Encryption | `EncryptionService`, `KeyVault`, TLS config | Admin governance status | Planned P0 |
| C2.1 Dashboards | dashboard widgets and telemetry APIs | Admin/Manager/Employee/Auditor | Partially mapped |
| C2.2 Chat | chat context/components | Employee workspace | Planned P0 |
| C2.3 Realtime | websocket service/context | chat and dashboard feeds | Planned P1 |
| C2.4 Deployment | compose, Dockerfiles, Nginx, scripts | N/A | Planned P1 |
| C2.5 Monitoring | metrics, alerts, reports | Admin/Auditor widgets | Planned P2 |