# Notification Bell and LAN-Aware AI Handoff Implementation Plan

## Request interpretation

The attached screenshot is a visual reference for the existing compact top banner. It is not treated as executable instructions. The requested behavior is to add a notification bell beside the signed-in user name and make workflow, LAN, and AI handoff events visible according to role.

## Objective

Create one cross-platform notification stream backed by the server so that:

- Admins see all LAN, employee proposal, manager feedback, acceptance, rejection, and AI handoff summaries.
- Managers see employee proposals and manager review work in their queue.
- Employees see manager acceptance, rejection, and feedback summaries.
- LAN invitations include a copy-ready token message.
- Employee-to-manager and manager-to-employee AI handoffs are delivered only when the target user is connected to the private LAN; otherwise they remain queued and are delivered immediately after that user joins.

## Implementation scope

1. **Top-banner notification bell**
   - Place a bell next to the signed-in user name.
   - Show unread count, compact 2–3 line summaries, timestamps, role-relevant event types, and copy actions for LAN messages.
   - Poll the server so separate browser sessions converge on the same state.

2. **Server workflow source of truth**
   - Add workflow request storage and APIs for create, list, and state transitions.
   - Persist employee proposals, manager AI validation, manager feedback, approval, rejection, transition trace, and selected AI models in the existing application state store.
   - Fan out notifications to the relevant manager, employee, and every admin.

3. **LAN-aware AI synchronization**
   - Track employee-AI and manager-AI handoff events with `delivered` or `queued_until_lan` status.
   - Deliver queued handoffs when a user joins a private LAN.
   - Include the LAN connection state in workflow responses and transition consistency checks.

4. **Workflow UI consistency**
   - Replace local-only workflow mutation with the server APIs.
   - Refresh the employee/manager queue after transitions so the bell and workflow page show the same status.
   - Add manager feedback input and employee resubmission handling.

## Acceptance criteria

- The bell appears beside the name in the top banner for Admin, Manager, and Employee roles.
- Admins receive all workflow and LAN notification records; managers and employees receive only records relevant to them.
- LAN invitation notifications expose a copy-ready message containing the token and Connect to LAN instruction.
- Employee proposals create manager/admin notifications; manager decisions create employee/admin notifications with concise feedback.
- Manager responses create an Employee AI handoff event and employee-approved proposals create a Manager AI handoff event.
- Handoffs are queued when the target is disconnected and delivered when the target joins the LAN.
- Workflow transitions return a passing consistency check covering participant identity, transition trace, notification fan-out, and LAN-aware handoff state.
- Client build, targeted lint, server syntax checks, and an isolated cross-role API smoke test pass.

## Execution status

- Completed server-backed notification storage, polling, read state, and copy-ready notification payloads.
- Completed top-banner bell placement beside the signed-in user name.
- Completed workflow create/list/transition APIs with manager feedback, approval, rejection, and employee resubmission.
- Completed Admin fan-out for LAN and workflow events plus role-targeted Manager/Employee notifications.
- Completed LAN-aware AI handoffs with immediate delivery and queued-until-LAN-join delivery.
- Completed workflow consistency checks for participant linkage, transition trace, notification fan-out, and AI handoff state.
- Verified with the client production build, targeted ESLint, server syntax checks, direct cross-role API smoke test, and queued-handoff-after-LAN-join smoke test.
