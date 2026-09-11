# Private LAN Management Implementation Plan

## Request interpretation

The attached screenshot is treated as a visual reference for the existing Sovereign AI admin shell: compact navigation, glass panels, cyan/indigo accents, and an air-gapped security context. It is not treated as a source of executable instructions. The implementation below follows the user request for a LAN setup module and role-specific connection flow.

## Objective

Give administrators a dedicated LAN Setup navigation entry where they can configure and create a private LAN. Once created, the admin can see the generated connection token, connected-device count, setup summary, and invitation delivery status. Existing managers and employees receive an in-app notification containing the token and can join from a dedicated Connect to LAN navigation entry.

## Scope

1. **Admin navigation and setup workspace**
   - Add a LAN Setup entry visible only to Admin users.
   - Collect the network name, description, private IPv4 subnet, gateway, DNS, maximum devices, encryption, authentication, lease duration, and isolation mode.
   - Validate required values before creation and show the generated token only after a successful create operation.

2. **LAN lifecycle API**
   - Extend the existing `/api/networks` create flow with the setup details, generated access token, device limit, and notification dispatch metadata.
   - Fan out in-app invitations to all existing Manager and Employee accounts.
   - Return connected-device metrics and a summary suitable for the admin dashboard.
   - Keep join behavior idempotent and enforce the configured device limit.

3. **Manager and employee connection flow**
   - Add a Connect to LAN entry for Manager and Employee roles.
   - Read pending invitations from the notification API.
   - Accept a token or network ID, join the network, and show the resulting connected state.

4. **Admin monitoring**
   - Display active LANs, connected devices, capacity, status, token, and recent invite status.
   - Provide refresh behavior so the dashboard reflects new joins.

## Implementation order

1. Add notification state and API support to the server.
2. Extend network creation and join endpoints with validation, capacity checks, metrics, and invite fan-out.
3. Create reusable LAN admin and connection UI components using the existing design system.
4. Add role-aware navigation and route rendering in the client shell.
5. Build the client and run targeted server tests/syntax checks.

## Acceptance criteria

- Admins can open **LAN Setup** from the navigation and create a private LAN with all required setup details.
- A successful create response includes a non-empty access token and connected-device dashboard data.
- Managers and employees receive an in-app invitation for the created LAN and can use its token to connect.
- A connected user appears in the admin device count without duplicate membership entries.
- The configured maximum-device limit is enforced.
- Non-admin users cannot create LANs or access admin-only network details.
- `npm run build` succeeds for the client and the server remains syntactically valid.

## Execution status

- Completed the admin LAN Setup & Devices navigation module.
- Completed private LAN creation with addressing, routing, security, lease, isolation, and device-capacity fields.
- Completed access-token generation and in-app notification fan-out to existing Manager and Employee accounts.
- Completed Manager/Employee Connect to LAN panel with invitation tokens, join state, and connected-device visibility.
- Completed idempotent membership handling and maximum-device enforcement.
- Verified with `npm run build`, targeted ESLint on new LAN files, `node --check`, and an isolated API smoke test covering create, notify, join, and duplicate join.
