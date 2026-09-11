# AI Agent Communication Workflow Implementation Plan

## Objective
Create an AI-first communication workflow where the employee AI agent analyzes confidential work files using models trained by admin, sends a report summary for employee approval, and then forwards the validated result to the manager AI agent for confirmation before final human manager approval.

## Business flow
1. Admin trains and deploys the employee AI and manager AI models for the company knowledge base.
2. Employee selects the appropriate admin-provided employee model and manager model.
3. Employee uploads a business file or document.
4. The employee AI agent extracts key takeaways, business issues, and proposed solutions.
5. The employee reviews the generated report summary and approves the content.
6. The approved summary is sent to the manager AI agent for validation.
7. The manager AI agent checks correctness, policy alignment, and business risk.
8. The manager human approves or rejects the final action.
9. Admin sees the complete state transition ledger for auditing and governance.

## Plan
1. Add a standalone workflow module in the main side navigation so it is not buried under the Intelligence Layer.
2. Present two AI agent cards: Employee AI Agent and Manager AI Agent.
3. Add admin-provided model selectors for employee AI and manager AI.
4. Add file upload and analysis to generate key takeaways and proposed solutions.
5. Create the AI report review lifecycle:
   - requested
   - employee-ai draft
   - awaiting employee approval
   - sent to manager-ai
   - manager-ai validation
   - awaiting manager approval
   - task completed
   - task rejected
6. Require human approval at the employee and manager steps before final action completion.
7. Keep admin in a read-only ledger role so they can audit the state trace but cannot submit or approve decisions.
8. Validate the app compiles successfully after integration.

## Execution status
- Phase 1: Completed
- Phase 2: Completed
- Phase 3: Completed
- Phase 4: Completed
- Phase 5: Completed
- Phase 6: Completed
- Phase 7: Completed
- Phase 8: Verified via production build

## Runtime enhancements implemented

- Workflow records now persist event timelines and human messages when MongoDB is available.
- Employees and managers can add context to a workflow and request agent re-analysis with that feedback.
- `GET /api/workflows/:workflowId/events` exposes the auditable timeline and messages.
- `GET /api/workflows/:workflowId/stream` provides live server-sent workflow updates for connected private-LAN clients.
- Every transition and AI re-analysis records actor, status, timestamp, message, and metadata.
- Admin access remains read-only for human messages and approvals.
