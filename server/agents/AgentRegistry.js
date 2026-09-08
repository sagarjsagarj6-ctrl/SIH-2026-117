/**
 * AgentRegistry — Centralized registry of all available specialist agents and their capabilities.
 */

import { RAGAgent } from './specialists/RAGAgent.js';
import { DataScienceAgent } from './specialists/DataScienceAgent.js';
import { VisionAgent } from './specialists/VisionAgent.js';
import { ReportingAgent } from './specialists/ReportingAgent.js';

class AgentRegistryService {
  constructor() {
    this.agents = new Map();
    this.metadata = new Map();
    this.initialize();
  }

  initialize() {
    // 1. RAG Agent
    const rag = new RAGAgent();
    this.register('RAG', rag, {
      id: 'RAG',
      name: 'RAG Knowledge & Search Agent',
      category: 'Knowledge Retrieval',
      defaultModel: rag.defaultModel,
      capabilities: [
        'Semantic search across local vector store',
        'Hybrid BM25 + Vector Cosine retrieval',
        'Inline source document citations',
        'Department-isolated ABAC data filtering'
      ],
      description: 'Specializes in extracting verified facts and citations from local enterprise documents.'
    });

    // 2. Data Science Agent
    const ds = new DataScienceAgent();
    this.register('DATA_SCIENCE', ds, {
      id: 'DATA_SCIENCE',
      name: 'Data Science & Anomaly Agent',
      category: 'Quantitative Analytics',
      defaultModel: ds.defaultModel,
      capabilities: [
        'Descriptive statistics & variance analysis',
        'IQR & Z-score statistical anomaly detection',
        'Linear trend regression and forecasting',
        'Chart.js compatible visualization data generation'
      ],
      description: 'Performs statistical computations, identifies data anomalies, and plots trend projections.'
    });

    // 3. Vision Agent
    const vision = new VisionAgent();
    this.register('VISION', vision, {
      id: 'VISION',
      name: 'Vision & Document OCR Agent',
      category: 'Visual Intelligence',
      defaultModel: vision.defaultModel,
      capabilities: [
        'Air-gapped OCR text extraction from document scans',
        'Structured tabular matrix parsing',
        'Technical schematic entity recognition',
        'Checksum verification and classification detection'
      ],
      description: 'Extracts text, tables, and entities from images, schematics, and scanned forms.'
    });

    // 4. Reporting Agent
    const reporting = new ReportingAgent();
    this.register('REPORTING', reporting, {
      id: 'REPORTING',
      name: 'Executive Reporting Agent',
      category: 'Synthesis & Document Generation',
      defaultModel: reporting.defaultModel,
      capabilities: [
        'Multi-agent output compilation',
        'Executive summary generation',
        'Compliance audit memo assembly',
        'Confidential watermark governance'
      ],
      description: 'Compiles multi-agent analytical outputs into structured, watermarked executive reports.'
    });
  }

  register(key, agentInstance, meta) {
    this.agents.set(key, agentInstance);
    this.metadata.set(key, meta);
  }

  getAgent(key) {
    return this.agents.get(key) || null;
  }

  listAgents() {
    return Array.from(this.metadata.values());
  }
}

export const AgentRegistry = new AgentRegistryService();
