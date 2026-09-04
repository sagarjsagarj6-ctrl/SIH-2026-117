# CATEGORY B — INTELLIGENCE LAYER

## Implementation Plan for SIH26117 Sovereign On-Premise Agentic AI Workbench

> **Scope**: Multi-Agent Orchestration (B1) + AI Model Management & Inference (B2)
> **Priority**: 🔴 CRITICAL — Core AI capabilities of the workbench.

---

## B1. Multi-Agent Orchestration System

### B1.1 Agent Architecture & Framework

**Objective**: Build a modular, multi-agent system where specialized AI agents collaborate to handle complex enterprise tasks — RAG retrieval, data science, vision analysis, and reporting.

#### Agent Registry & Orchestrator

| File | Purpose | Status |
|------|---------|--------|
| `server/agents/AgentOrchestrator.js` | **[NEW]** Master orchestrator — receives user queries, decomposes into sub-tasks, assigns to specialist agents, merges results | 🔲 TODO |
| `server/agents/AgentRegistry.js` | **[NEW]** Registry of all available agents with capabilities, required models, and department permissions | 🔲 TODO |
| `server/agents/BaseAgent.js` | **[NEW]** Abstract base class — defines agent lifecycle: `plan()`, `execute()`, `validate()`, `report()` | 🔲 TODO |
| `server/agents/AgentMemory.js` | **[NEW]** Short-term (conversation) and long-term (session) memory management per agent | 🔲 TODO |
| `server/agents/TaskDecomposer.js` | **[NEW]** Breaks complex queries into atomic sub-tasks using LLM reasoning | 🔲 TODO |

#### Agent Orchestration Flow

```
User Query → Intent Classification → Task Decomposition →
Agent Selection → Parallel/Sequential Execution →
Result Aggregation → Explanation Generation → Response
```

#### Orchestration Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| **Single-Agent** | One specialist agent handles the query | Simple lookups, Q&A |
| **Sequential Pipeline** | Agents execute in order, passing context | Data → Analysis → Report |
| **Parallel Fan-Out** | Multiple agents work simultaneously | Cross-department queries |
| **Supervisor Loop** | Orchestrator validates intermediate results | Complex multi-step reasoning |

---

### B1.2 Specialist Agents

**Objective**: Implement 4 core specialist agents, each with domain expertise.

#### Agent 1: RAG Agent (Retrieval-Augmented Generation)

| File | Purpose | Status |
|------|---------|--------|
| `server/agents/specialists/RAGAgent.js` | **[NEW]** Semantic search → context assembly → LLM generation with citations | 🔲 TODO |

**Capabilities**:
- Query the vector store for relevant document chunks
- Assemble context windows respecting token limits
- Generate answers with inline source citations
- Handle follow-up questions with conversation memory
- RBAC-enforced retrieval (users only see authorized content)

**Prompt Template**:
```
You are a Sovereign AI Knowledge Agent operating in an air-gapped enterprise environment.
You MUST only use the provided context to answer. Never fabricate information.
Always cite your sources using [Source: document_name, page X].
If the context doesn't contain enough information, say so explicitly.

CONTEXT:
{retrieved_chunks}

USER QUERY: {query}

Provide a detailed, accurate answer with citations.
```

#### Agent 2: Data Science Agent

| File | Purpose | Status |
|------|---------|--------|
| `server/agents/specialists/DataScienceAgent.js` | **[NEW]** Statistical analysis, trend detection, anomaly detection on tabular/numeric data | 🔲 TODO |
| `server/agents/specialists/utils/StatisticalEngine.js` | **[NEW]** Mean, median, std dev, correlation, regression, clustering computations | 🔲 TODO |
| `server/agents/specialists/utils/ChartGenerator.js` | **[NEW]** Generate chart configurations (Chart.js compatible) from analysis results | 🔲 TODO |

**Capabilities**:
- Load and analyze CSV/XLSX tabular data
- Compute descriptive statistics and correlations
- Detect anomalies using IQR and Z-score methods
- Generate trend forecasts using linear/polynomial regression
- Output chart-ready data payloads for frontend visualization

#### Agent 3: Vision Agent

| File | Purpose | Status |
|------|---------|--------|
| `server/agents/specialists/VisionAgent.js` | **[NEW]** Image/document analysis using local Qwen2-VL-7B model | 🔲 TODO |

**Capabilities**:
- OCR text extraction from scanned documents
- Table detection and extraction from images
- Diagram/flowchart interpretation
- Handwriting recognition (enterprise forms)
- Image-based Q&A with the vision model

#### Agent 4: Reporting Agent

| File | Purpose | Status |
|------|---------|--------|
| `server/agents/specialists/ReportingAgent.js` | **[NEW]** Generate structured reports (markdown, PDF) from agent outputs | 🔲 TODO |
| `server/agents/specialists/utils/ReportTemplates.js` | **[NEW]** Pre-built report templates (executive summary, audit, analysis) | 🔲 TODO |

**Capabilities**:
- Compile multi-agent results into formatted reports
- Generate executive summaries with key findings
- Export as Markdown, HTML, or PDF
- Include charts, tables, and citations
- Add watermark: "CONFIDENTIAL — Generated by Sovereign AI"

---

### B1.3 Agent Communication Protocol

**Objective**: Define how agents communicate with each other and the orchestrator.

| File | Purpose | Status |
|------|---------|--------|
| `server/agents/protocol/AgentMessage.js` | **[NEW]** Standardized message format between agents | 🔲 TODO |
| `server/agents/protocol/AgentChannel.js` | **[NEW]** In-memory event bus for agent-to-agent communication | 🔲 TODO |

#### Message Schema

```javascript
const AgentMessage = {
  id: 'msg_uuid',
  fromAgent: 'RAGAgent',
  toAgent: 'ReportingAgent',
  type: 'TASK_RESULT',         // TASK_REQUEST | TASK_RESULT | ERROR | HANDOFF
  priority: 'HIGH',
  payload: {
    query: 'original user query',
    context: [],               // retrieved chunks or prior results
    result: {},                // agent output
    confidence: 0.92,
    citations: [],
    metadata: {
      tokensUsed: 1240,
      latencyMs: 890,
      modelUsed: 'Llama-3-8B'
    }
  },
  timestamp: '2026-09-02T21:00:00Z'
};
```

---

### B1.4 Explainability & Audit Trail

**Objective**: Every agent decision must be traceable and explainable for enterprise governance.

| File | Purpose | Status |
|------|---------|--------|
| `server/agents/ExplainabilityEngine.js` | **[NEW]** Records reasoning chain: what the agent retrieved, why it chose specific chunks, confidence scores | 🔲 TODO |
| `server/agents/AgentAuditLogger.js` | **[NEW]** Logs every agent execution to audit trail | 🔲 TODO |

#### Explainability Output Format

```javascript
const ExplanationTrace = {
  queryId: 'q_uuid',
  agentChain: ['RAGAgent', 'DataScienceAgent', 'ReportingAgent'],
  reasoning: [
    { step: 1, agent: 'RAGAgent', action: 'Retrieved 5 chunks from Finance KB', confidence: 0.94 },
    { step: 2, agent: 'DataScienceAgent', action: 'Computed Q3 revenue trend (+12.4%)', confidence: 0.88 },
    { step: 3, agent: 'ReportingAgent', action: 'Generated executive summary', confidence: 0.91 }
  ],
  sourcesUsed: ['Q3_audit.pdf:p3', 'revenue_data.xlsx:sheet1'],
  totalLatencyMs: 2340,
  totalTokensUsed: 3800
};
```

---

## B2. AI Model Management & Inference

### B2.1 Local Model Registry

**Objective**: Manage multiple local LLM/embedding/vision models with lifecycle tracking.

> **Already Partially Built**: [Model.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/models/Model.js) and [modelRoutes.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/routes/modelRoutes.js) exist.

| File | Purpose | Status |
|------|---------|--------|
| `server/services/models/ModelRegistry.js` | **[NEW]** Enhanced model registry with health checks, warm/cold states, auto-rotation | 🔲 TODO |
| `server/services/models/ModelHealthChecker.js` | **[NEW]** Periodic health pings to loaded models, auto-restart on failure | 🔲 TODO |
| `server/models/Model.js` | **[MODIFY]** Add fields: `healthStatus`, `lastHealthCheck`, `loadedAt`, `avgLatency`, `errorRate` | 🔲 TODO |

### B2.2 Inference Engine

**Objective**: Provide a unified inference interface that abstracts over different model backends (Ollama, vLLM, llama.cpp, text-generation-webui).

| File | Purpose | Status |
|------|---------|--------|
| `server/services/inference/InferenceRouter.js` | **[NEW]** Routes inference requests to the appropriate backend based on model type and hardware availability | 🔲 TODO |
| `server/services/inference/backends/OllamaBackend.js` | **[NEW]** Integration with Ollama API (localhost:11434) | 🔲 TODO |
| `server/services/inference/backends/VLLMBackend.js` | **[NEW]** Integration with vLLM OpenAI-compatible API | 🔲 TODO |
| `server/services/inference/backends/LlamaCppBackend.js` | **[NEW]** Direct llama.cpp server integration | 🔲 TODO |
| `server/services/inference/PromptManager.js` | **[NEW]** Prompt template management, system prompts, and context window optimization | 🔲 TODO |
| `server/services/inference/TokenCounter.js` | **[NEW]** Token counting and context window management per model | 🔲 TODO |

#### Inference Request Flow

```
Agent Request → InferenceRouter →
  ├── Check model availability & health
  ├── Select optimal backend (Ollama/vLLM/llama.cpp)
  ├── Assemble prompt with system prompt + context + query
  ├── Count tokens, trim if exceeding context window
  ├── Send to inference backend
  ├── Stream response tokens back
  └── Log usage metrics + audit
```

#### Supported Backends

| Backend | Protocol | GPU Support | Streaming | Use Case |
|---------|----------|-------------|-----------|----------|
| **Ollama** | REST API (`:11434`) | CUDA, ROCm, Metal | ✅ Yes | General-purpose, easy setup |
| **vLLM** | OpenAI-compatible API | CUDA | ✅ Yes | High-throughput production |
| **llama.cpp** | HTTP server API | CUDA, Metal, CPU | ✅ Yes | Low-VRAM, CPU fallback |

### B2.3 Hardware-Aware Model Allocation

**Objective**: Automatically assign models to hardware based on available GPU VRAM, CPU cores, and RAM.

> **Already Partially Built**: [HardwareContext.jsx](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/client/src/context/HardwareContext.jsx) and [hardwareRoutes.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/routes/hardwareRoutes.js) exist.

| File | Purpose | Status |
|------|---------|--------|
| `server/services/hardware/HardwareProfiler.js` | **[NEW]** Detect GPU (NVIDIA via `nvidia-smi`), CPU, RAM at startup | 🔲 TODO |
| `server/services/hardware/ModelAllocator.js` | **[NEW]** Match models to available VRAM; auto-select quantization level | 🔲 TODO |
| `server/services/hardware/ResourceMonitor.js` | **[NEW]** Real-time GPU/CPU/RAM utilization monitoring | 🔲 TODO |

#### Allocation Logic

```javascript
const allocationRules = {
  // If VRAM >= 20GB → load 70B Q4 model
  tier1: { minVRAM: 20, model: 'Llama-3.3-70B', quantization: 'Q4_K_M' },
  // If VRAM >= 10GB → load 14B model
  tier2: { minVRAM: 10, model: 'DeepSeek-R1-14B', quantization: 'Q4_K_S' },
  // If VRAM >= 6GB → load 7-8B model
  tier3: { minVRAM: 6,  model: 'Llama-3-8B', quantization: 'Q4_K_M' },
  // If VRAM < 6GB → CPU-only mode with smallest model
  fallback: { minVRAM: 0, model: 'Llama-3-8B', quantization: 'Q2_K', device: 'CPU' }
};
```

### B2.4 Fine-Tuning Pipeline

**Objective**: Enable department-specific model fine-tuning using QLoRA/LoRA on local hardware.

> **Already Partially Built**: [FineTuneJob.js](file:///c:/Users/sagar/OneDrive/SIH-2026-117-muilt-agent-AI-workbench/server/models/FineTuneJob.js) model exists.

| File | Purpose | Status |
|------|---------|--------|
| `server/services/finetune/FineTuneOrchestrator.js` | **[NEW]** Manages fine-tune job lifecycle: queue → train → validate → deploy | 🔲 TODO |
| `server/services/finetune/DatasetPreparer.js` | **[NEW]** Convert departmental documents into instruction-tuning JSONL format | 🔲 TODO |
| `server/services/finetune/LoRATrainer.js` | **[NEW]** Launch QLoRA/LoRA training via Python subprocess (Hugging Face PEFT) | 🔲 TODO |
| `server/services/finetune/ModelValidator.js` | **[NEW]** Evaluate fine-tuned model on held-out test set, compare metrics | 🔲 TODO |

#### Fine-Tune Job Flow

```
Dataset Upload → Format Validation → JSONL Conversion →
Train/Test Split (90/10) → QLoRA Training →
Loss Monitoring → Validation Eval → Adapter Merge →
Deploy to Inference Backend → Audit Log
```

---

## Frontend Components (Category B)

| File | Purpose | Status |
|------|---------|--------|
| `client/src/components/agents/AgentWorkspace.jsx` | **[NEW]** Interactive chat interface for multi-agent queries | 🔲 TODO |
| `client/src/components/agents/AgentSelector.jsx` | **[NEW]** Choose specific agent or let orchestrator auto-select | 🔲 TODO |
| `client/src/components/agents/AgentTraceViewer.jsx` | **[NEW]** Visualize agent reasoning chain and execution trace | 🔲 TODO |
| `client/src/components/agents/ResponseRenderer.jsx` | **[NEW]** Render agent responses: text, tables, charts, citations | 🔲 TODO |
| `client/src/components/models/InferenceMonitor.jsx` | **[NEW]** Real-time tokens/sec, latency, GPU utilization gauges | 🔲 TODO |
| `client/src/components/models/FineTuneManager.jsx` | **[NEW]** Create, monitor, and manage fine-tune training jobs | 🔲 TODO |
| `client/src/components/models/ModelComparisonView.jsx` | **[NEW]** Side-by-side comparison of model responses and metrics | 🔲 TODO |

---

## Dependencies to Install

```bash
# Server-side (run in /server)
npm install eventsource-parser uuid node-fetch

# Python sidecar for fine-tuning (optional — when fine-tuning is needed)
pip install torch transformers peft datasets accelerate bitsandbytes
```

---

## Verification Plan

### Automated Tests
```bash
# Agent orchestration tests
node --test server/agents/__tests__/AgentOrchestrator.test.js
node --test server/agents/__tests__/RAGAgent.test.js
node --test server/agents/__tests__/DataScienceAgent.test.js

# Inference routing tests
node --test server/services/inference/__tests__/InferenceRouter.test.js
node --test server/services/inference/__tests__/OllamaBackend.test.js
```

### Manual Verification
1. Send a RAG query → verify agent retrieves correct chunks and generates cited answer
2. Send a multi-agent query → verify orchestrator decomposes, dispatches, and aggregates
3. View explanation trace → verify reasoning chain is complete and accurate
4. Check model health endpoint → verify all loaded models report healthy
5. Start a fine-tune job → verify training progress is tracked and audited
6. Test hardware profiler → verify correct GPU/VRAM detection

---

## Estimated Effort

| Sub-component | Effort | Priority |
|--------------|--------|----------|
| Agent Orchestrator (B1.1) | 4-5 days | P0 |
| Specialist Agents — RAG (B1.2) | 3-4 days | P0 |
| Specialist Agents — Data Science (B1.2) | 3-4 days | P1 |
| Specialist Agents — Vision (B1.2) | 2-3 days | P1 |
| Specialist Agents — Reporting (B1.2) | 2-3 days | P1 |
| Agent Communication (B1.3) | 1-2 days | P0 |
| Explainability Engine (B1.4) | 2 days | P0 |
| Inference Engine (B2.2) | 4-5 days | P0 |
| Hardware-Aware Allocation (B2.3) | 2-3 days | P0 |
| Fine-Tuning Pipeline (B2.4) | 4-5 days | P2 |
| Frontend Components | 4-5 days | P1 |
| **Total** | **~30-38 days** | — |
