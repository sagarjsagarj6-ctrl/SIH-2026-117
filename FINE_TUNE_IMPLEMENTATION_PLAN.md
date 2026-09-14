# Fine-tuning and private-LAN delivery implementation plan

## Goal

Make the Intelligence Layer a truthful fine-tuning control plane:

- Admins create training jobs, upload confidential datasets, evaluate results, and deploy approved models.
- Managers and Employees only see/use models that an Admin has deployed to an active private LAN.
- Deployment is blocked until the job is complete, has a held-out evaluation marked `PASSED`, and is attached to an active LAN.
- Every deployment sends an in-app notification to the target roles in the target department/network.
- The UI explains whether training is live or simulated; simulated progress is never presented as model quality.

## Existing implementation found

The repository already contains a useful foundation:

- `FineTuneJob`, `FineTuneOrchestrator`, protected upload staging, and the optional local `train_lora.py` runtime.
- `ModelValidator`, but it currently reports `SIMULATION_ONLY` or `PENDING_REAL_EVALUATION`; it does not fabricate quality scores.
- In-memory/private-LAN membership, notification delivery, audit logging, and role-aware dashboards.
- `FineTuneManager` and the Intelligence Layer tab shell.

The main gaps were permissive fine-tune routes, deployment without validation/LAN checks, no deployment notification, and a UI that implied every role could train.

## Role matrix

| Capability | Admin | Manager | Employee |
| --- | --- | --- | --- |
| View deployed models for own department/LAN | Yes | Yes | Yes |
| Create job / upload confidential data | Yes | No | No |
| Start, cancel, validate, remove job | Yes | No | No |
| Deploy to private LAN | Yes | No | No |
| Use deployed model through agent workflows | Yes | Yes | Yes |

## Training contract

1. The preferred dataset is local JSON/JSONL/NDJSON with `instruction`, `input`/`context`, and `output`/`response` fields.
2. A test/held-out split is required for a quality claim. The preparer must not invent a department sample when no confidential source exists.
3. Enabled LLM methods are LoRA, QLoRA, and Full Parameter. Classical ML methods are represented in the plan/UI as a future runtime family until dedicated trainers and evaluators are available.
4. `LIVE` requires the local Python runtime, model path, Torch, Transformers, PEFT, and Datasets. `AUTO` may fall back to a clearly labelled progress simulation.
5. A completed simulation or a live run without held-out evaluation cannot be deployed.

## Implemented in this change

- Admin-only dataset staging and job creation.
- Admin-only cancel, validation, deletion, and deployment routes.
- Training family/method metadata in the job model and job creation flow.
- Empty-corpus protection so a job cannot train on fabricated fallback text.
- Visibility rules for Manager/Employee so they see deployed models only when department and LAN access match.
- Deployment gates for completed status, `validation.status === 'PASSED'`, and an active private LAN.
- LAN metadata is resolved server-side instead of trusting a client-supplied token/name.
- `MODEL_DEPLOYED` notifications are sent to matching Manager/Employee users and recorded in the audit trail.
- Intelligence Layer opens on an Admin Training Panel and the fine-tune UI clearly separates Admin controls from role-based model use.

## Remaining product work

### Phase 2 — real evaluation and classical trainers

- Add a held-out evaluator that loads the trained adapter and reports reproducible loss/perplexity/accuracy metrics.
- Add dataset schema and feature/label support for KNN, SVM, Decision Tree, Random Forest, and XGBoost.
- Persist model artifacts, checksums, approval history, and rollback versions.

### Phase 3 — agent selection

- Add a deployed-model selector to each Employee/Manager agent surface.
- Pass the selected deployed model through the orchestrator into every specialist's `InferenceRouter` request.
- Add model rollback/un-deploy and notification acknowledgement.

## Verification checklist

- Run `node server/test/categoryE.test.js`.
- Run `npm run build` from `client`.
- Verify a Manager/Employee receives `403` on dataset upload and job creation.
- Verify an Admin cannot deploy a queued, failed, simulated-only, or LAN-less job.
- Verify a passed job deployed to an active LAN appears for matching roles and emits `MODEL_DEPLOYED` notifications.
- Verify a different department or a user outside the LAN cannot see the deployed job.
