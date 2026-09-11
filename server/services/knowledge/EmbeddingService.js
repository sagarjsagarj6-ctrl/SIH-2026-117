/**
 * EmbeddingService — High-performance Local Vector Embedding Generator.
 * Produces 768-dimensional normalized embedding vectors for text chunks and queries.
 * Designed for air-gapped sovereign execution without external API dependencies.
 */

import crypto from 'crypto';
import { VECTOR_DB_CONFIG } from '../../config/vectordb.js';

export class EmbeddingService {
  static DIMENSION = VECTOR_DB_CONFIG.dimension || 768;
  static embeddingBackendAvailable = null;
  static embeddingProbeUntil = 0;

  static get configuredBackend() {
    return String(process.env.EMBEDDING_BACKEND || 'auto').toLowerCase();
  }

  static get embeddingModel() {
    return process.env.EMBEDDING_MODEL || 'nomic-embed-text';
  }

  static async generateEmbeddingAsync(text, { preferredSource = '' } = {}) {
    if (preferredSource === 'deterministic-local-hash' || this.configuredBackend === 'hash') {
      return { embedding: this.generateEmbedding(text), source: 'deterministic-local-hash', usedFallback: true };
    }

    const backend = this.configuredBackend;
    if (backend === 'auto' || backend === 'ollama') {
      if (this.embeddingBackendAvailable === false && Date.now() < this.embeddingProbeUntil) {
        return { embedding: this.generateEmbedding(text), source: 'deterministic-local-hash', usedFallback: true };
      }
      const host = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), Number(process.env.EMBEDDING_TIMEOUT_MS || 2500));
      try {
        let response = await fetch(`${host}/api/embeddings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: this.embeddingModel, prompt: String(text || '') }),
          signal: controller.signal
        });
        if (!response.ok) {
          response = await fetch(`${host}/api/embed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: this.embeddingModel, input: String(text || '') }),
            signal: controller.signal
          });
        }
        const data = await response.json();
        const embedding = data.embedding || data.embeddings?.[0] || data.data?.[0]?.embedding;
        if (Array.isArray(embedding) && embedding.length > 0) {
          this.embeddingBackendAvailable = true;
          this.embeddingProbeUntil = Date.now() + 60_000;
          clearTimeout(timeout);
          return { embedding, source: `ollama:${this.embeddingModel}`, usedFallback: false };
        }
      } catch {
        // Fall through to deterministic local embeddings in offline mode.
        this.embeddingBackendAvailable = false;
        this.embeddingProbeUntil = Date.now() + 30_000;
      } finally {
        clearTimeout(timeout);
      }
    }

    return {
      embedding: this.generateEmbedding(text),
      source: 'deterministic-local-hash',
      usedFallback: true
    };
  }

  static async getRuntimeInfo() {
    const configured = this.configuredBackend;
    if (configured === 'hash') {
      return { configuredBackend: configured, activeBackend: 'deterministic-local-hash', model: null, live: false };
    }
    const result = await this.generateEmbeddingAsync('embedding capability probe');
    return {
      configuredBackend: configured,
      activeBackend: result.source,
      model: result.source.startsWith('ollama:') ? this.embeddingModel : null,
      live: !result.usedFallback
    };
  }

  // Semantic concept seeds for high-accuracy local semantic matching
  static CONCEPT_CLUSTERS = {
    finance: ['revenue', 'balance', 'ledger', 'profit', 'tax', 'ebitda', 'invoice', 'expense', 'fiscal', 'audit', 'cash', 'budget', 'treasury', 'p&l'],
    legal: ['contract', 'agreement', 'clause', 'liability', 'nda', 'indemnity', 'statute', 'compliance', 'gdpr', 'intellectual', 'patent', 'dispute'],
    operations: ['warehouse', 'supply', 'logistics', 'inventory', 'procurement', 'shipping', 'fleet', 'node', 'sla', 'facility', 'capacity'],
    engineering: ['architecture', 'api', 'docker', 'kubernetes', 'server', 'database', 'firmware', 'deploy', 'codebase', 'bugfix', 'telemetry', 'metric', 'network'],
    security: ['air-gap', 'sovereign', 'encryption', 'hash', 'sha-256', 'rbac', 'abac', 'firewall', 'quarantine', 'audit', 'token', 'vault', 'zero-trust'],
    hr: ['employee', 'payroll', 'benefits', 'onboarding', 'recruiting', 'leave', 'policy', 'handbook', 'performance', 'compensation']
  };

  /**
   * Generates a 768-dimensional normalized embedding vector from text.
   */
  static generateEmbedding(text) {
    if (!text || typeof text !== 'string') {
      return new Array(this.DIMENSION).fill(0);
    }

    const vector = new Float32Array(this.DIMENSION);
    const cleanText = text.toLowerCase();
    const words = cleanText.split(/\W+/).filter(w => w.length > 2);

    // 1. Concept Cluster Projections (Semantic Alignment)
    let clusterIdx = 0;
    for (const [clusterName, keywords] of Object.entries(this.CONCEPT_CLUSTERS)) {
      let clusterWeight = 0;
      for (const kw of keywords) {
        if (cleanText.includes(kw)) {
          clusterWeight += 1.5;
        }
      }

      if (clusterWeight > 0) {
        // Project across dedicated dimensional segment
        const segmentStart = (clusterIdx * 64) % this.DIMENSION;
        for (let i = 0; i < 64; i++) {
          const dim = (segmentStart + i) % this.DIMENSION;
          vector[dim] += clusterWeight * Math.sin((i + 1) * 0.785);
        }
      }
      clusterIdx++;
    }

    // 2. Fast N-Gram Hash Projection (Lexical Alignment)
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const hash1 = this._hashString(word, 1337);
      const hash2 = this._hashString(word, 7331);

      const dim1 = Math.abs(hash1) % this.DIMENSION;
      const dim2 = Math.abs(hash2) % this.DIMENSION;

      vector[dim1] += 1.0;
      vector[dim2] += 0.8;

      // Bigram projection
      if (i < words.length - 1) {
        const bigram = word + '_' + words[i + 1];
        const biHash = this._hashString(bigram, 9999);
        const biDim = Math.abs(biHash) % this.DIMENSION;
        vector[biDim] += 1.2;
      }
    }

    // 3. L2 Unit Normalization (for exact cosine similarity dot products)
    let norm = 0;
    for (let i = 0; i < this.DIMENSION; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);

    if (norm > 0) {
      for (let i = 0; i < this.DIMENSION; i++) {
        vector[i] = Number((vector[i] / norm).toFixed(6));
      }
    }

    return Array.from(vector);
  }

  static _hashString(str, seed = 0) {
    let h = seed;
    for (let i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return h;
  }

  /**
   * Computes exact cosine similarity between two unit vectors.
   */
  static cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
    }
    return Math.max(0, Math.min(1, dot));
  }
}
