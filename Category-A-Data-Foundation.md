# CATEGORY A — DATA FOUNDATION

## Implementation Plan for SIH26117 Sovereign On-Premise Agentic AI Workbench

> **Scope**: Data Engineering & Ingestion (A1) + Knowledge Management & Vector Store (A2)
> **Priority**: 🔴 CRITICAL — All intelligence features depend on this layer.

---

## A1. Data Engineering & Ingestion

### A1.1 File Ingestion Pipeline

**Objective**: Accept organizational files (PDF, DOCX, XLSX, CSV, TXT, Markdown, JSON, images) through a secure upload interface and convert them to processable text.

#### Backend Implementation

| File | Purpose | Status |
|------|---------|--------|
| `server/services/ingestion/FileIngestor.js` | **[NEW]** Core ingestion orchestrator — accepts multipart uploads, validates file type, routes to parser | 🔲 TODO |
| `server/services/ingestion/parsers/PDFParser.js` | **[NEW]** Extract text from PDF using `pdf-parse` or `pdfjs-dist` | 🔲 TODO |
| `server/services/ingestion/parsers/DOCXParser.js` | **[NEW]** Extract text from DOCX using `mammoth` | 🔲 TODO |
| `server/services/ingestion/parsers/SpreadsheetParser.js` | **[NEW]** Parse XLSX/CSV using `xlsx` or `csv-parse` | 🔲 TODO |
| `server/services/ingestion/parsers/ImageOCRParser.js` | **[NEW]** OCR extraction using Tesseract.js (air-gapped) or Qwen2-VL-7B model | 🔲 TODO |
| `server/services/ingestion/parsers/TextParser.js` | **[NEW]** Plain text / Markdown / JSON reader | 🔲 TODO |
| `server/routes/ingestRoutes.js` | **[NEW]** REST endpoints: `POST /api/ingest/upload`, `GET /api/ingest/status/:id` | 🔲 TODO |

#### File Upload Specifications

```
Max File Size:    50 MB per file (configurable via .env)
Batch Upload:     Up to 10 files simultaneously
Accepted Types:   .pdf, .docx, .xlsx, .csv, .txt, .md, .json, .png, .jpg, .tiff
Storage Mode:     Local filesystem (./data/uploads/) — NO cloud storage
Temp Processing:  ./data/temp/ — auto-purged after ingestion
```

#### Processing Pipeline Flow

```
User Upload → File Validation → Type Detection → Parser Selection →
Text Extraction → Data Cleaning → Chunking → Metadata Tagging →
Vector Embedding → Index Storage → Audit Log
```

---

### A1.2 Database Ingestion

**Objective**: Connect to local/on-premise databases to ingest structured data for AI analysis.

| File | Purpose | Status |
|------|---------|--------|
| `server/services/ingestion/DatabaseConnector.js` | **[NEW]** Connects to local PostgreSQL / MySQL / MongoDB instances within the LAN | 🔲 TODO |
| `server/services/ingestion/connectors/MongoConnector.js` | **[NEW]** MongoDB collection scanner & schema introspection | 🔲 TODO |
| `server/services/ingestion/connectors/SQLConnector.js` | **[NEW]** SQL query executor with read-only connection pooling | 🔲 TODO |
| `server/config/datasources.js` | **[NEW]** Data source configuration registry (connection strings, auth, schema maps) | 🔲 TODO |

#### Security Constraints
- ✅ **Read-only connections** — No write/delete permissions on source databases
- ✅ **LAN-only** — Connection strings must resolve to private IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
- ✅ **Credential vault** — Database passwords stored in encrypted `.env` or local vault, never in code
- ✅ **Query timeout** — Max 30 seconds per query to prevent long-running locks

---

### A1.3 Data Validation & Quality

**Objective**: Ensure all ingested data meets quality standards before entering the knowledge pipeline.

| File | Purpose | Status |
|------|---------|--------|
| `server/services/validation/DataValidator.js` | **[NEW]** Schema validation, type checking, completeness scoring | 🔲 TODO |
| `server/services/validation/DataCleaner.js` | **[NEW]** Remove PII markers, normalize encodings, strip malicious payloads | 🔲 TODO |
| `server/services/validation/QualityScorer.js` | **[NEW]** Compute data quality score (completeness, consistency, accuracy) | 🔲 TODO |
| `server/models/DataQualityReport.js` | **[NEW]** Mongoose/in-memory model for quality audit reports | 🔲 TODO |

#### Quality Metrics

| Metric | Threshold | Action on Failure |
|--------|-----------|-------------------|
| Completeness | > 85% fields populated | ⚠️ Warning + flag for review |
| Encoding | UTF-8 normalized | 🔄 Auto-convert |
| File Integrity | SHA-256 checksum match | 🚫 Reject upload |
| Malware Scan | Clean | 🚫 Quarantine file |
| PII Detection | Scan for SSN/Credit Card patterns | ⚠️ Flag + redact option |

---

### A1.4 Data Classification & Sensitivity Labeling

**Objective**: Automatically classify data by department, topic, and sensitivity level to enforce RBAC access control.

| File | Purpose | Status |
|------|---------|--------|
| `server/services/classification/DataClassifier.js` | **[NEW]** Rule-based + ML-assisted classification engine | 🔲 TODO |
| `server/services/classification/SensitivityLabeler.js` | **[NEW]** Assign sensitivity levels | 🔲 TODO |
| `server/services/classification/DepartmentTagger.js` | **[NEW]** Map documents to departments based on content analysis | 🔲 TODO |

#### Classification Levels (Aligned with existing `KnowledgeDoc` model)

```
┌──────────────┬───────────────────────────────────────────────┐
│ Level        │ Access Rule                                   │
├──────────────┼───────────────────────────────────────────────┤
│ Public       │ All authenticated users                       │
│ Internal     │ All employees within organization             │
│ Restricted   │ Department members + Managers only             │
│ Confidential │ Department leads + Admin only                  │
│ Top-Secret   │ Admin + explicitly whitelisted users only      │
└──────────────┴───────────────────────────────────────────────┘
```

---

## A2. Knowledge Management & Vector Store

### A2.1 Document Chunking Engine

**Objective**: Split large documents into semantically meaningful chunks optimized for RAG retrieval.

| File | Purpose | Status |
|------|---------|--------|
| `server/services/knowledge/ChunkingEngine.js` | **[NEW]** Recursive text splitter with overlap | 🔲 TODO |
| `server/services/knowledge/ChunkingStrategies.js` | **[NEW]** Strategy patterns: sentence-boundary, paragraph, sliding-window, semantic | 🔲 TODO |

#### Chunking Parameters

```javascript
const CHUNK_CONFIG = {
  defaultChunkSize: 512,       // tokens
  overlapSize: 64,             // token overlap between chunks
  maxChunkSize: 1024,          // hard limit
  strategy: 'semantic',        // sentence | paragraph | sliding_window | semantic
  preserveHeaders: true,       // keep section headers with chunks
  metadataPerChunk: {
    source_file: true,
    page_number: true,
    section_title: true,
    chunk_index: true,
    total_chunks: true
  }
};
```

### A2.2 Vector Embedding & Indexing

**Objective**: Generate vector embeddings using the local `NVIDIA-NeMo-Embed-Enterprise` model and store them in a local vector database.

| File | Purpose | Status |
|------|---------|--------|
| `server/services/knowledge/EmbeddingService.js` | **[NEW]** Interface to local embedding model (NeMo or sentence-transformers) | 🔲 TODO |
| `server/services/knowledge/VectorStore.js` | **[NEW]** ChromaDB / Qdrant / FAISS local vector store wrapper | 🔲 TODO |
| `server/services/knowledge/VectorIndexManager.js` | **[NEW]** Index lifecycle: create, update, delete, rebuild | 🔲 TODO |
| `server/config/vectordb.js` | **[NEW]** Vector DB connection config (local ChromaDB or FAISS path) | 🔲 TODO |

#### Embedding Pipeline

```
Chunk Text → Tokenize → Embedding Model (local) → 768/1024-dim vector →
Normalize → Store in VectorDB with metadata → Index for ANN search
```

#### Vector Store Requirements
- **Local-only** — No cloud vector DB services
- **Recommended**: ChromaDB (Python sidecar) or FAISS (Node.js bindings)
- **Metadata filtering** — Filter by department, sensitivity, date, file type
- **ANN search** — Approximate Nearest Neighbor with cosine similarity

### A2.3 Knowledge Retrieval API

**Objective**: Provide a unified retrieval API that agents can query to find relevant knowledge.

| File | Purpose | Status |
|------|---------|--------|
| `server/services/knowledge/RetrievalService.js` | **[NEW]** Semantic search + keyword hybrid retrieval | 🔲 TODO |
| `server/routes/knowledgeRoutes.js` | **[NEW]** `POST /api/knowledge/search`, `GET /api/knowledge/doc/:id` | 🔲 TODO |

#### Retrieval Features
- **Hybrid search** — Combine vector similarity (semantic) + BM25 (keyword) scoring
- **Re-ranking** — Optional cross-encoder re-ranker for top-K results
- **Access filtering** — Results filtered by user's RBAC permissions before return
- **Citation tracking** — Every retrieval result includes source document reference

---

## Frontend Components (Category A)

| File | Purpose | Status |
|------|---------|--------|
| `client/src/components/data/FileUploader.jsx` | **[NEW]** Drag-and-drop file upload with progress bars | 🔲 TODO |
| `client/src/components/data/IngestionDashboard.jsx` | **[NEW]** Real-time ingestion pipeline status monitor | 🔲 TODO |
| `client/src/components/data/DataQualityView.jsx` | **[NEW]** Quality scores, validation reports, error logs | 🔲 TODO |
| `client/src/components/data/KnowledgeExplorer.jsx` | **[NEW]** Browse indexed documents, view chunks, search knowledge base | 🔲 TODO |
| `client/src/components/data/DatabaseConnectorUI.jsx` | **[NEW]** Configure and test local database connections | 🔲 TODO |

---

## Dependencies to Install

```bash
# Server-side (run in /server)
npm install pdf-parse mammoth xlsx csv-parse multer tesseract.js chromadb uuid
```

---

## Verification Plan

### Automated Tests
```bash
node --test server/services/ingestion/__tests__/PDFParser.test.js
node --test server/services/ingestion/__tests__/DOCXParser.test.js
node --test server/services/ingestion/__tests__/pipeline.integration.test.js
node --test server/services/knowledge/__tests__/VectorStore.test.js
```

### Manual Verification
1. Upload a sample PDF → verify text extraction + chunking + vector indexing
2. Upload a CSV → verify tabular data parsing and metadata tagging
3. Query the knowledge base → verify relevant chunks are returned with citations
4. Attempt cross-department access → verify RBAC enforcement on search results
5. Check audit logs → verify every ingestion action is logged

---
