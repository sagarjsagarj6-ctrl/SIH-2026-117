# SOVEREIGN.AI Creation Playground — Implementation Plan

**Version:** 1.0  
**Date:** September 13, 2026  
**Author:** Mavis (MiniMax Code AI Agent)  
**Status:** Planning Document  

---

## 🎯 VISION

> **"n8n for Local LLMs"** — A visual workflow automation playground that enables non-technical users to create AI-powered automation pipelines using only local models and private enterprise data. No cloud. No external APIs. 100% on-premise.

### Core Philosophy
- **Privacy-First:** All data stays within the enterprise LAN
- **Visual-First:** Drag-and-drop workflow building (no code required)
- **Local-Only AI:** Powered exclusively by Ollama, vLLM, and llama.cpp
- **Extensible:** Plugin system for custom nodes and integrations

---

## 📊 PROJECT OVERVIEW

### What We're Building

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CREATION PLAYGROUND                                       │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                  │
│  │   TRIGGER   │───▶│    AGENT    │───▶│    AGENT    │───▶ OUTPUT       │
│  │   (Start)   │    │   (Node)    │    │   (Node)    │                  │
│  └─────────────┘    └──────┬──────┘    └─────────────┘                  │
│                             │                                               │
│                    ┌────────▼────────┐                                      │
│                    │     TOOL        │                                      │
│                    │  (Processing)  │                                      │
│                    └────────────────┘                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Comparison with n8n

| Feature | n8n | SOVEREIGN PLAYGROUND |
|---------|-----|----------------------|
| **AI Models** | External APIs (OpenAI, etc.) | Local LLMs only |
| **Data Privacy** | Cloud processing | 100% on-premise |
| **Setup Complexity** | Medium | Minimal |
| **Vector Search** | Via integrations | Native RAG |
| **Cost** | Usage-based | One-time hardware |
| **Multi-Agent** | Via code nodes | Native orchestration |

---

## 🏗️ ARCHITECTURE

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React)                                │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │  Workflow Canvas │  │  Node Palette    │  │  Properties Panel │         │
│  │  (React Flow)    │  │  (Drag & Drop)  │  │  (Config Editor)  │         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘         │
│                                    │                                          │
│                                    ▼                                          │
│                         ┌──────────────────┐                               │
│                         │  Workflow Engine  │                               │
│                         │  (State Manager)  │                               │
│                         └──────────────────┘                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ REST API + WebSocket
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (Node.js)                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │  Workflow Store  │  │  Execution Engine │  │  Trigger Manager │         │
│  │  (MongoDB)       │  │  (Async Workers)  │  │  (Cron/Events)   │         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘         │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────┐     │
│  │                    INFERENCE ROUTER                                │     │
│  │  Ollama ──▶ vLLM ──▶ LlamaCpp ──▶ Intelligent Fallback          │     │
│  └──────────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Creates Workflow
        │
        ▼
┌───────────────────┐
│  Canvas (Visual)  │  ←── Drag nodes, connect edges
└─────────┬─────────┘
          │ Save
          ▼
┌───────────────────┐
│  Workflow JSON    │  ←── Serialized workflow definition
│  { nodes, edges } │
└─────────┬─────────┘
          │ Execute
          ▼
┌───────────────────┐
│  Execution Engine │  ←── Topological sort, async execution
└─────────┬─────────┘
          │
          ▼
┌───────────────────────────────────────────────────────────────────┐
│  Node Execution Pipeline                                           │
│  1. Load node config                                              │
│  2. Fetch input data from previous nodes                          │
│  3. Execute node logic (agent call, tool, transform)             │
│  4. Store output for next node                                    │
│  5. Repeat until all nodes complete                               │
└───────────────────────────────────────────────────────────────────┘
```

---

## 📦 NODE TYPES & PLUGINS

### Core Node Categories

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              NODE PALETTE                                    │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────┬───────┤
│  TRIGGERS   │   AGENTS    │    TOOLS    │   OUTPUTS   │  LOGIC      │ DATA  │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼───────┤
│ • Manual    │ • RAG Agent │ • Calculator│ • File Save │ • IF/Else   │ • CSV │
│ • Schedule  │ • Data Sci  │ • JSON Trans│ • Database  │ • Switch    │ • JSON│
│ • Webhook   │ • Vision    │ • HTTP Req  │ • Email*    │ • Loop      │ • XML │
│ • Event     │ • Reporting │ • File Read │ • Webhook   │ • Wait      │ • PDF │
│ • LAN Peer  │ • Custom    │ • Vector Srch│ • LAN Broad │ • Code Eval │ • API │
│             │             │ • OCR       │             │ • Router    │       │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┴───────┘
* Email requires local SMTP server (no external)
```

### Plugin System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PLUGIN ARCHITECTURE                                │
│                                                                             │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │  Plugin.json    │     │  Plugin.json    │     │  Plugin.json    │       │
│  │  ┌───────────┐  │     │  ┌───────────┐  │     │  ┌───────────┐  │       │
│  │  │ manifest  │  │     │  │ manifest  │  │     │  │ manifest  │  │       │
│  │  │ nodes[]   │  │     │  │ nodes[]   │  │     │  │ nodes[]   │  │       │
│  │  │ triggers[]│  │     │  │ triggers[]│  │     │  │ triggers[]│  │       │
│  │  └───────────┘  │     │  └───────────┘  │     │  └───────────┘  │       │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│                                                                             │
│  Plugin Directory: /server/plugins/                                        │
│  User Plugins: /data/plugins/                                               │
└─────────────────────────────────────────────────────────────────────────────┘

Example Plugin Structure:
my-custom-plugin/
├── plugin.json
├── nodes/
│   ├── MyAgentNode.js
│   └── MyToolNode.js
├── triggers/
│   └── MyTrigger.js
├── static/
│   └── icon.svg
└── README.md
```

---

## 🔌 BUILT-IN NODES (Minimal Viable Set)

### 1. TRIGGER NODES

#### 1.1 Manual Trigger
```javascript
{
  type: 'trigger.manual',
  name: 'Manual Start',
  description: 'Start workflow with a button click',
  icon: '▶️',
  config: {
    // No config needed
  }
}
```

#### 1.2 Schedule Trigger
```javascript
{
  type: 'trigger.schedule',
  name: 'Scheduled Run',
  description: 'Run workflow on a cron schedule',
  icon: '⏰',
  config: {
    cronExpression: '0 9 * * *',  // Daily at 9 AM
    timezone: 'Asia/Kolkata'
  },
  // Available variables: {{now}}, {{timestamp}}, {{date}}
}
```

#### 1.3 Webhook Trigger
```javascript
{
  type: 'trigger.webhook',
  name: 'Webhook',
  description: 'Trigger via HTTP request',
  icon: '🪝',
  config: {
    path: '/webhook/custom-event',
    method: 'POST',
    auth: 'bearer_token'  // or 'none'
  },
  // Input: JSON body from webhook
  // Output: {{trigger.body}}, {{trigger.headers}}
}
```

#### 1.4 LAN Event Trigger
```javascript
{
  type: 'trigger.lan-event',
  name: 'LAN Peer Event',
  description: 'Triggered by another LAN peer',
  icon: '🌐',
  config: {
    peerId: 'optional-filter',
    eventType: ['workflow.complete', 'data.update']
  }
}
```

### 2. AGENT NODES

#### 2.1 RAG Query Node
```javascript
{
  type: 'agent.rag',
  name: 'Knowledge Search',
  description: 'Query enterprise knowledge base',
  icon: '📚',
  config: {
    model: 'Mistral-7B-v0.3-Enterprise',
    topK: 5,
    department: 'current',  // or specific
    similarityThreshold: 0.7
  },
  inputs: ['query'],         // From previous node or manual
  outputs: ['answer', 'citations', 'sources']
}
```

#### 2.2 Data Science Node
```javascript
{
  type: 'agent.data-science',
  name: 'Data Analysis',
  description: 'Statistical analysis and anomaly detection',
  icon: '📊',
  config: {
    model: 'DeepSeek-R1-Distill-Qwen-14B',
    analysisType: 'auto',  // or 'anomaly', 'regression', 'forecast'
    confidenceThreshold: 0.85
  },
  inputs: ['dataset'],      // Array of numbers or file reference
  outputs: ['summary', 'charts', 'insights', 'anomalies']
}
```

#### 2.3 Vision Agent Node
```javascript
{
  type: 'agent.vision',
  name: 'Image Analysis',
  description: 'Process and analyze images',
  icon: '👁️',
  config: {
    model: 'llama3.2-vision',  // Requires vision-capable model
    analysisType: 'general'     // or 'ocr', 'object-detect', 'document'
  },
  inputs: ['image'],           // Base64 or file path
  outputs: ['analysis', 'text', 'objects', 'confidence']
}
```

#### 2.4 Report Generator Node
```javascript
{
  type: 'agent.reporting',
  name: 'Generate Report',
  description: 'Create formatted reports from data',
  icon: '📝',
  config: {
    model: 'Mistral-7B-v0.3-Enterprise',
    format: 'markdown',         // or 'html', 'json'
    template: 'executive'       // or 'technical', 'custom'
  },
  inputs: ['data', 'title'],
  outputs: ['report', 'sections', 'wordCount']
}
```

### 3. TOOL NODES

#### 3.1 Calculator Node
```javascript
{
  type: 'tool.calculator',
  name: 'Calculator',
  description: 'Perform mathematical operations',
  icon: '🔢',
  config: {
    expression: '{{input.value}} * 1.18',  // Supports expressions
    precision: 2
  },
  inputs: ['value'],
  outputs: ['result']
}
```

#### 3.2 JSON Transform Node
```javascript
{
  type: 'tool.json-transform',
  name: 'JSON Transform',
  description: 'Transform and filter JSON data',
  icon: '🔄',
  config: {
    operation: 'filter',      // filter, map, reduce, pick, omit
    expression: 'data.items.filter(x => x.active)',
    outputFormat: 'array'     // or 'object', 'csv'
  },
  inputs: ['data'],
  outputs: ['result']
}
```

#### 3.3 Vector Search Node
```javascript
{
  type: 'tool.vector-search',
  name: 'Vector Search',
  description: 'Semantic search in knowledge base',
  icon: '🔍',
  config: {
    collection: 'documents',
    topK: 5,
    minScore: 0.7,
    includeMetadata: true
  },
  inputs: ['queryEmbedding'],  // Or raw query for auto-embed
  outputs: ['results', 'scores']
}
```

#### 3.4 File Operations Node
```javascript
{
  type: 'tool.file',
  name: 'File Operations',
  description: 'Read/write files from local storage',
  icon: '📁',
  config: {
    operation: 'read',          // read, write, append, delete
    path: '/data/uploads/{{filename}}',
    encoding: 'utf-8'
  },
  inputs: ['filename', 'content'],  // content for write
  outputs: ['content', 'fileInfo']
}
```

### 4. OUTPUT NODES

#### 4.1 Save to Database Node
```javascript
{
  type: 'output.database',
  name: 'Save to Database',
  description: 'Store results in MongoDB',
  icon: '💾',
  config: {
    collection: 'workflow_results',
    operation: 'insertOne',    // insertOne, insertMany, updateOne, upsert
    documentId: '{{workflow.id}}'
  },
  inputs: ['data'],
  outputs: ['insertedId', 'acknowledged']
}
```

#### 4.2 LAN Broadcast Node
```javascript
{
  type: 'output.lan-broadcast',
  name: 'Send to LAN Peers',
  description: 'Send data to connected LAN peers',
  icon: '📡',
  config: {
    peers: 'all',              // or ['peer1-id', 'peer2-id']
    channel: 'workflow-results',
    encrypted: true
  },
  inputs: ['data'],
  outputs: ['deliveredTo']
}
```

#### 4.3 Workflow Trigger Node
```javascript
{
  type: 'output.webhook',
  name: 'HTTP Request',
  description: 'Send data to external endpoint',
  icon: '🌐',
  config: {
    url: 'http://localhost:3001/api/receive',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{{node.output}}'
  },
  inputs: ['data'],
  outputs: ['status', 'response']
}
```

### 5. LOGIC NODES

#### 5.1 IF/ELSE Node
```javascript
{
  type: 'logic.if-else',
  name: 'Condition',
  description: 'Branch based on condition',
  icon: '🔀',
  config: {
    conditions: [
      {
        field: '{{input.value}}',
        operator: 'greaterThan',  // equals, notEquals, contains, etc.
        value: 100
      }
    ],
    logic: 'AND',               // AND, OR
    defaultPath: 'false'         // or 'true'
  },
  inputs: ['value'],
  outputs: ['true', 'false']
}
```

#### 5.2 Loop Node
```javascript
{
  type: 'logic.loop',
  name: 'For Each',
  description: 'Iterate over array items',
  icon: '🔁',
  config: {
    items: '{{input.array}}',
    concurrency: 1,             // Process N items in parallel
    maxIterations: 1000
  },
  inputs: ['array'],
  outputs: ['item', 'index', 'completed']
}
```

#### 5.3 Router Node
```javascript
{
  type: 'logic.router',
  name: 'Router',
  description: 'Route to multiple outputs',
  icon: '🔀',
  config: {
    branches: [
      { name: 'success', condition: '{{output.success}} == true' },
      { name: 'failure', condition: '{{output.success}} == false' },
      { name: 'default', condition: 'true' }
    ]
  },
  inputs: ['data'],
  outputs: ['success', 'failure', 'default']
}
```

---

## 🎨 UI DESIGN

### Main Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  HEADER: "Creation Playground" | [New] [Save] [Run] | Workflow: Untitled ▼   │
├────────────┬────────────────────────────────────────────┬───────────────────┤
│            │                                            │                   │
│  NODE      │                                            │  PROPERTIES       │
│  PALETTE   │           CANVAS                           │  PANEL            │
│            │                                            │                   │
│  ┌──────┐  │    ┌─────────┐      ┌─────────┐          │  Node: RAG Agent  │
│  │Trigger│  │    │TRIGGER │─────▶│  AGENT  │──────┐   │  ─────────────── │
│  └──────┘  │    └─────────┘      └─────────┘      │   │  Model: [Dropdown]│
│  ┌──────┐  │                            │          │   │  TopK: [5    ]   │
│  │Agent │  │                            ▼          │   │                   │
│  └──────┘  │                      ┌─────────┐      │   │  ─── INPUTS ───  │
│  ┌──────┐  │                      │  TOOL   │      │   │  Query: [....]   │
│  │ Tool │  │                      └─────────┘      │   │                   │
│  └──────┘  │                            │          │   │  ─── OUTPUTS ─── │
│  ┌──────┐  │                            ▼          │   │  ✓ Answer        │
│  │Output│  │                      ┌─────────┐      │   │  ✓ Citations     │
│  └──────┘  │                      │ OUTPUT  │◀─────┘   │                   │
│  ┌──────┐  │                      └─────────┘          │  [Apply Changes]  │
│  │ Logic│  │                                            │                   │
│  └──────┘  │                                            │                   │
├────────────┴────────────────────────────────────────────┴───────────────────┤
│  EXECUTION LOG                                                             │
│  [10:30:15] Trigger fired - Manual                                         │
│  [10:30:16] RAG Agent: Searching knowledge base...                         │
│  [10:30:18] RAG Agent: Found 5 results (0.82s)                             │
│  [10:30:18] Data Science: Analyzing 45 data points...                      │
│  [10:30:22] ✓ Workflow completed successfully                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Node Component

```
┌─────────────────────────────────┐
│  [Icon]  Node Name         [⋮] │  ← Node header with menu
├─────────────────────────────────┤
│  Status: ✓ Ready                │  ← Status indicator
│  Last run: 2 min ago            │
├─────────────────────────────────┤
│  Inputs:                        │  ← Input ports (left side)
│  ● query                        │
│  ○ optional                     │
├─────────────────────────────────┤
│  ── Configuration ──           │
│  Model: Mistral-7B              │
│  TopK: 5                       │
├─────────────────────────────────┤
│  Outputs:                       │  ← Output ports (right side)
│  ○ answer                      │
│  ● citations                   │
└─────────────────────────────────┘
        │
        ▼
   [Connection handle - draggable]
```

---

## 📁 FILE STRUCTURE

```
sovereign-ai/
├── client/src/
│   └── components/
│       └── playground/
│           ├── CreationPlayground.jsx      # Main container
│           ├── Canvas.jsx                   # React Flow canvas
│           ├── NodePalette.jsx              # Draggable node list
│           ├── PropertiesPanel.jsx          # Node configuration
│           ├── nodes/
│           │   ├── BaseNode.jsx            # Abstract node component
│           │   ├── TriggerNode.jsx         # Trigger node renderer
│           │   ├── AgentNode.jsx            # Agent node renderer
│           │   ├── ToolNode.jsx             # Tool node renderer
│           │   ├── OutputNode.jsx           # Output node renderer
│           │   └── LogicNode.jsx            # Logic node renderer
│           ├── PropertiesEditor/
│           │   ├── RAGProperties.jsx        # RAG config form
│           │   ├── DataScienceProperties.jsx
│           │   ├── TriggerProperties.jsx
│           │   └── ...
│           └── ExecutionLog.jsx             # Run history
│
├── server/
│   ├── services/
│   │   └── playground/
│   │       ├── WorkflowStore.js             # CRUD for workflows
│   │       ├── ExecutionEngine.js           # Run workflows
│   │       ├── TriggerManager.js            # Handle triggers
│   │       └── NodeRegistry.js             # Node definitions
│   ├── routes/
│   │   └── playgroundRoutes.js              # API endpoints
│   ├── models/
│   │   └── Workflow.js                      # MongoDB schema
│   └── plugins/                             # Plugin system
│       └── index.js                         # Built-in nodes
│
└── shared/
    └── nodeDefinitions.js                   # Shared node schemas
```

---

## 🔌 API ENDPOINTS

### Workflow Management

```
POST   /api/playground/workflows           # Create workflow
GET    /api/playground/workflows           # List workflows
GET    /api/playground/workflows/:id       # Get workflow
PUT    /api/playground/workflows/:id       # Update workflow
DELETE /api/playground/workflows/:id       # Delete workflow
POST   /api/playground/workflows/:id/clone # Clone workflow
```

### Workflow Execution

```
POST   /api/playground/workflows/:id/run          # Execute workflow
GET    /api/playground/workflows/:id/runs          # List runs
GET    /api/playground/workflows/:id/runs/:runId  # Get run details
POST   /api/playground/workflows/:id/stop           # Stop execution
```

### Nodes

```
GET    /api/playground/nodes              # List available nodes
GET    /api/playground/nodes/:type        # Get node schema
GET    /api/playground/plugins            # List plugins
POST   /api/playground/plugins             # Install plugin
```

### Triggers

```
POST   /api/playground/webhooks/:workflowId  # Webhook endpoint
GET    /api/playground/triggers/active      # Active scheduled triggers
```

---

## 🗄️ DATABASE SCHEMA

### Workflow Schema (MongoDB)

```javascript
const workflowSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department: { type: String, required: true },
  
  // Workflow definition
  nodes: [{
    id: String,
    type: String,                    // 'agent.rag', 'tool.calculator', etc.
    position: { x: Number, y: Number },
    data: mongoose.Schema.Types.Mixed, // Node-specific config
    inputs: [String],                // Connection IDs
    outputs: [String]
  }],
  
  edges: [{
    id: String,
    source: String,                  // Node ID
    sourceHandle: String,            // Output port
    target: String,                  // Node ID
    targetHandle: String             // Input port
  }],
  
  // Settings
  settings: {
    concurrency: { type: Number, default: 1 },
    errorHandling: { type: String, enum: ['stop', 'continue', 'retry'] },
    timeout: { type: Number, default: 300000 }  // 5 minutes
  },
  
  // Status
  isActive: { type: Boolean, default: false },
  lastRunAt: Date,
  runCount: { type: Number, default: 0 }
}, { timestamps: true });
```

### Workflow Run Schema

```javascript
const workflowRunSchema = new mongoose.Schema({
  workflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['running', 'success', 'failed', 'stopped'],
    default: 'running'
  },
  trigger: { type: String },              // 'manual', 'schedule', 'webhook'
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
  
  // Execution details
  nodes: [{
    nodeId: String,
    status: String,
    startedAt: Date,
    completedAt: Date,
    input: mongoose.Schema.Types.Mixed,
    output: mongoose.Schema.Types.Mixed,
    error: String
  }],
  
  // Summary
  totalDuration: Number,                 // milliseconds
  tokensUsed: Number,
  errorCount: Number
}, { timestamps: true });
```

---

## 🚀 IMPLEMENTATION ROADMAP

### Phase 1: Core Foundation (Week 1)
**Estimated Time:** 16 hours

| # | Task | Hours | Files |
|---|------|-------|-------|
| 1.1 | Create workflow database model | 2h | `models/Workflow.js`, `models/WorkflowRun.js` |
| 1.2 | Build WorkflowStore service | 2h | `services/playground/WorkflowStore.js` |
| 1.3 | Create base node components | 3h | `Canvas.jsx`, `NodePalette.jsx`, `BaseNode.jsx` |
| 1.4 | Implement drag-and-drop canvas | 3h | Using React Flow library |
| 1.5 | Build PropertiesPanel | 2h | `PropertiesPanel.jsx` |
| 1.6 | Create REST API routes | 2h | `routes/playgroundRoutes.js` |
| 1.7 | Wire frontend to backend | 2h | API integration |

### Phase 2: Built-in Nodes (Week 2)
**Estimated Time:** 20 hours

| # | Task | Hours | Priority |
|---|------|-------|----------|
| 2.1 | Manual & Schedule triggers | 3h | P0 |
| 2.2 | RAG Agent node | 4h | P0 |
| 2.3 | Data Science node | 3h | P1 |
| 2.4 | Calculator & JSON Transform tools | 2h | P1 |
| 2.5 | IF/ELSE & Router logic nodes | 3h | P1 |
| 2.6 | Database output node | 2h | P1 |
| 2.7 | LAN Broadcast output node | 3h | P2 |

### Phase 3: Execution Engine (Week 3)
**Estimated Time:** 16 hours

| # | Task | Hours | Priority |
|---|------|-------|----------|
| 3.1 | ExecutionEngine core | 4h | P0 |
| 3.2 | Topological sort for node order | 2h | P0 |
| 3.3 | Node execution pipeline | 4h | P0 |
| 3.4 | Error handling & retry logic | 3h | P1 |
| 3.5 | Execution log viewer | 3h | P1 |

### Phase 4: Advanced Features (Week 4)
**Estimated Time:** 20 hours

| # | Task | Hours | Priority |
|---|------|-------|----------|
| 4.1 | Webhook trigger | 3h | P1 |
| 4.2 | Vision Agent node | 4h | P2 |
| 4.3 | Report Generator node | 3h | P2 |
| 4.4 | Plugin system foundation | 4h | P2 |
| 4.5 | Workflow templates | 2h | P2 |
| 4.6 | Execution history & replay | 4h | P3 |

### Phase 5: Polish & Testing (Week 5)
**Estimated Time:** 12 hours

| # | Task | Hours | Priority |
|---|------|-------|----------|
| 5.1 | UI/UX refinements | 4h | P1 |
| 5.2 | Performance optimization | 3h | P2 |
| 5.3 | Error handling edge cases | 3h | P2 |
| 5.4 | Documentation | 2h | P2 |

---

## 📊 EFFORT SUMMARY

| Phase | Hours | Deliverable |
|-------|-------|-------------|
| Phase 1: Core Foundation | 16h | Canvas, palette, CRUD |
| Phase 2: Built-in Nodes | 20h | All core nodes |
| Phase 3: Execution Engine | 16h | Workflow runner |
| Phase 4: Advanced Features | 20h | Webhooks, plugins |
| Phase 5: Polish & Testing | 12h | Production-ready |
| **Total** | **84h** | **MVP in 5 weeks** |

---

## 🔧 TECHNICAL DECISIONS

### Frontend Canvas Library

**Choice:** React Flow (xyflow)
- Pros: Mature, well-documented, custom node support
- Cons: Some learning curve
- Alternative: GoJS, D3.js (more complex)

### State Management

**Choice:** Zustand
```javascript
const useWorkflowStore = create((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  
  addNode: (node) => set(state => ({
    nodes: [...state.nodes, node]
  })),
  
  updateNode: (id, data) => set(state => ({
    nodes: state.nodes.map(n => 
      n.id === id ? { ...n, data: { ...n.data, ...data } } : n
    )
  })),
  
  // ...
}));
```

### Backend Execution

**Choice:** Async worker with Bull queue
```javascript
// For scheduled triggers
cron.schedule('0 9 * * *', async () => {
  const workflows = await WorkflowStore.getScheduled();
  for (const wf of workflows) {
    await WorkflowQueue.add('execute', { workflowId: wf._id });
  }
});
```

---

## 🎯 USE CASES

### 1. Automated Daily Report
```
Trigger (Schedule: 9 AM)
    │
    ▼
RAG Query ("Yesterday's sales metrics")
    │
    ▼
Data Science (Calculate trends)
    │
    ▼
Report Generator (Create summary)
    │
    ▼
Save to Database
    │
    ▼
Send to LAN Peers
```

### 2. Document Processing Pipeline
```
Trigger (Webhook: PDF upload)
    │
    ▼
Vision Agent (Extract text via OCR)
    │
    ▼
RAG Query (Classify document type)
    │
    ▼
IF/ELSE (Is invoice?)
    ├── TRUE → Save to invoices collection
    └── FALSE → Save to general documents
```

### 3. Anomaly Alert System
```
Trigger (Schedule: Every 15 min)
    │
    ▼
Database Query (Get recent metrics)
    │
    ▼
Data Science (Anomaly detection)
    │
    ▼
IF/ELSE (Anomaly detected?)
    ├── TRUE → 
    │       LAN Broadcast (Alert all peers)
    │       Report Generator (Create alert report)
    └── FALSE → End
```

---

## 📝 PLUGIN DEVELOPMENT GUIDE

### Creating a Custom Agent Node

```javascript
// server/plugins/my-agent/plugin.json
{
  "name": "my-custom-agent",
  "version": "1.0.0",
  "nodes": [{
    "name": "My Custom Agent",
    "type": "agent.my-custom",
    "icon": "🤖",
    "category": "AI Agents",
    "outputs": ["result"],
    "config": [
      { "name": "model", "type": "select", "options": ["model1", "model2"] },
      { "name": "temperature", "type": "number", "default": 0.7 }
    ]
  }]
}

// server/plugins/my-agent/nodes/MyAgentNode.js
export const MyAgentNode = {
  async execute({ config, inputs, context }) {
    const { model, temperature } = config;
    const query = inputs.query;
    
    const result = await InferenceRouter.infer({
      model,
      query,
      temperature,
      role: 'CUSTOM'
    });
    
    return { result: result.response };
  }
};
```

---

## ✅ ACCEPTANCE CRITERIA

### Must Have (MVP)
- [ ] Visual workflow canvas with drag-and-drop
- [ ] At least 3 node types: Trigger, Agent, Output
- [ ] Manual workflow execution
- [ ] Scheduled workflow execution
- [ ] Workflow save/load
- [ ] Basic execution log
- [ ] Connect to existing RAG Agent
- [ ] Connect to Data Science Agent
- [ ] All data stays local

### Should Have
- [ ] Webhook trigger
- [ ] IF/ELSE logic node
- [ ] LAN Broadcast output
- [ ] Workflow cloning
- [ ] Error handling

### Nice to Have
- [ ] Plugin system
- [ ] Workflow templates
- [ ] Execution replay
- [ ] Custom node creation UI

---

## 🚨 KNOWN LIMITATIONS

1. **No Code Nodes (MVP):** Keep it visual-only for simplicity
2. **No Subworkflows (MVP):** One workflow per canvas
3. **No Version Control:** Single version per workflow
4. **Limited Debugging:** Basic execution log only
5. **No Built-in Scheduler UI:** Cron expression editor needed

---

**Document Status:** Complete  
**Next Action:** Review and approve implementation plan
