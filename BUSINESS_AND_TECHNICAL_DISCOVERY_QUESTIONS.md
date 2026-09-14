# Business and Technical Discovery Questions

This question set turns the current prototype into a focused production-planning conversation. Answering it prevents the team from making assumptions about data ownership, security, model quality, and business value.

## 1. Executive decisions

| Question | Decision owner | Why it matters |
|---|---|---|
| Which one business process is the first production target? | Sponsor / process owner | Prevents a broad platform from having no measurable first outcome. |
| What is the current baseline for time, cost, errors, and rework? | Process owner | Creates a before/after ROI comparison. |
| What decisions may the AI assist, and what decisions must remain human-only? | Risk owner | Defines the approval boundary. |
| What is the definition of a successful 90-day pilot? | Sponsor | Converts a demo into an accountable outcome. |
| Which departments and sites are included in phase one? | Sponsor / security | Defines the data and access boundary. |

## 2. Users and workflow

1. Who is the primary daily user: Employee, Engineer, Analyst, Manager, Admin, or Auditor?
2. Who reviews an AI answer before it can influence a business decision?
3. Does the user need chat, document search, structured forms, dashboards, or all of these?
4. Which tasks are repeated often enough to justify automation?
5. What does the user do when the system says “no evidence found”?
6. Should a user be allowed to correct a classification or citation?
7. What is the required employee-to-manager handoff sequence?
8. Which notifications are urgent, and which can be queued?
9. Which outputs must be exportable or attached to an existing ticket/work-order system?

## 3. Data ownership and quality

1. What repositories are authoritative for policies, manuals, inspection reports, and historical records?
2. Who is accountable for approving a document before it enters the vector index?
3. How are revisions and superseded documents identified?
4. What is the acceptable age of a source document for a current answer?
5. Which data sources are files, which are SQL, and which are MongoDB or other systems?
6. How often should each source be synchronized?
7. What fields are required for every document: owner, date, asset, site, department, sensitivity, and revision?
8. Which values must be redacted before indexing?
9. What is the expected behavior when a document contains conflicting instructions?
10. What is the deletion process when a source record is withdrawn?

## 4. Security and compliance

1. What identity system must integrate with the platform?
2. Are local accounts acceptable for a pilot?
3. What is the complete role matrix for Admin, Manager, Employee, Auditor, and any domain-specific roles?
4. Is department isolation enough, or are project, asset, location, row, or document ACLs required?
5. Which data classifications may be indexed, and which may never be processed by AI?
6. What network egress is allowed for updates, telemetry, package installation, and model retrieval?
7. How will the team prove no cloud endpoint is called?
8. What are the retention periods for prompts, documents, citations, model metadata, workflow events, and audit logs?
9. What events require a two-person approval?
10. What is the incident response if a user sees the wrong document or a model generates a harmful recommendation?

## 5. Model and AI governance

1. Which local models are approved for retrieval, report writing, numeric explanation, and vision?
2. What hardware is available at every deployment site?
3. What are the maximum acceptable response times for search, analytics, OCR, and reports?
4. What accuracy threshold is required for each task?
5. What citation correctness threshold is required for RAG?
6. What happens when the approved model is offline or too large for available memory?
7. How will prompts, models, embeddings, and workflow definitions be versioned?
8. What evaluation data can be kept private and rerun after every change?
9. How will uncertain answers be presented to the user?
10. How will a user challenge, correct, or escalate an answer?

## 6. Agent and tool design

1. Which agent capabilities are required for the pilot: retrieval, data science, vision, reporting, or all four?
2. Which tools may each role execute?
3. Which tools can read data, and which may write or export data?
4. Which operations are high risk and require recorded human approval?
5. What should happen if one stage of a multi-agent pipeline fails?
6. Should the orchestrator stop on weak evidence or continue with an explicit warning?
7. What should the supervisor verify before approving a draft?
8. Which agent actions must appear in the audit trail?
9. Do users need to see the full trace, a summary trace, or only final evidence?
10. Are there any tasks that must never be delegated to an agent?

## 7. Infrastructure and persistence

1. Is MongoDB mandatory in production?
2. Which records must survive a server restart?
3. What backup frequency and restore-time objective is required?
4. Where will the vector index be stored and backed up?
5. How are local model files distributed and updated in a restricted network?
6. How many concurrent users and model requests must be supported?
7. Is one local model server enough, or are multiple site-local model nodes needed?
8. What health signals should page an operator?
9. What is the rollback plan for a bad model, index rebuild, or policy change?
10. What logs must be immutable or exported to a central security system?

## 8. Vision and OCR

1. Are source images scanned documents, equipment photos, tables, drawings, or P&IDs?
2. Which image formats and maximum sizes must be supported?
3. What language, handwriting, or document quality challenges are expected?
4. Is OCR enough, or is spatial/visual reasoning required?
5. What is the reference dataset for measuring OCR and entity-extraction accuracy?
6. What should the system do when the image is unreadable?
7. Is a local vision model approved for the deployment hardware?
8. Must the original image be preserved alongside the extracted text and checksum?

## 9. Reporting and business integration

1. What report types are required first?
2. Which fields are mandatory in every report?
3. Which citations must include page, section, table, or record identifiers?
4. What file formats must be exported?
5. Where should approved reports be stored?
6. Does the report need a digital signature or approval timestamp?
7. Should reports be pushed into an ERP, CMMS, ticketing, document-management, or compliance system?
8. What language and terminology should the model use?

## 10. Adoption and measurement

1. How will users be trained to distinguish evidence, calculation, and model narrative?
2. Who owns the feedback queue for missing or incorrect knowledge?
3. How often will the team review low-confidence answers?
4. What percentage of users must adopt the system for the pilot to be considered useful?
5. How much manual work should be saved per workflow?
6. What is the target reduction in turnaround time?
7. What is the acceptable error rate?
8. How will user trust and satisfaction be measured?
9. What evidence is required before expanding to another department or site?
10. Who signs the go/no-go decision?

## 11. Recommended answer format

For each question, record:

```text
Decision:
Owner:
Due date:
Evidence or policy reference:
Affected feature or route:
Pilot acceptance test:
Open risk:
```

## 12. Immediate decisions to make first

If the team can only answer a few questions now, answer these first:

1. What is the first business workflow?
2. What data is authoritative for that workflow?
3. Which users may access it?
4. Which output requires human approval?
5. Which local model and hardware are approved?
6. What metric proves value?
7. What evidence proves no data leaves the private boundary?
8. What must persist after restart?
