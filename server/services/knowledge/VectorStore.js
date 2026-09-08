/**
 * VectorStore — Local In-Memory & Persistent Vector Database.
 * Stores vector embeddings alongside chunk metadata, supports Approximate Nearest Neighbor (ANN) search,
 * cosine distance ranking, and strict multi-tenant department & ABAC sensitivity filtering.
 */

import fs from 'fs/promises';
import path from 'path';
import { VECTOR_DB_CONFIG } from '../../config/vectordb.js';
import { EmbeddingService } from './EmbeddingService.js';

export class VectorStore {
  static chunks = []; // In-memory vector index items: { chunkId, docId, documentTitle, sectionTitle, text, tokenCount, metadata, embedding }
  static isInitialized = false;

  static async initialize() {
    if (this.isInitialized) return;
    try {
      await fs.mkdir(VECTOR_DB_CONFIG.storagePath, { recursive: true });
      const indexPath = path.join(VECTOR_DB_CONFIG.storagePath, 'vector_index.json');
      try {
        const data = await fs.readFile(indexPath, 'utf-8');
        this.chunks = JSON.parse(data);
        console.log(`[VectorStore] Loaded ${this.chunks.length} vectors from local persistent store.`);
      } catch {
        // First run or file doesn't exist yet
        this.chunks = [];
      }
    } catch (err) {
      console.warn('[VectorStore] Storage init notice:', err.message);
    }
    this.isInitialized = true;
  }

  static async persist() {
    try {
      await fs.mkdir(VECTOR_DB_CONFIG.storagePath, { recursive: true });
      const indexPath = path.join(VECTOR_DB_CONFIG.storagePath, 'vector_index.json');
      await fs.writeFile(indexPath, JSON.stringify(this.chunks, null, 2), 'utf-8');
    } catch (err) {
      console.error('[VectorStore] Persist error:', err.message);
    }
  }

  /**
   * Adds an array of chunk objects into the vector database.
   */
  static async addChunks(chunksWithEmbeddings) {
    await this.initialize();
    
    // Remove existing chunks for this docId to avoid duplication on re-indexing
    const incomingDocIds = new Set(chunksWithEmbeddings.map(c => c.docId));
    this.chunks = this.chunks.filter(c => !incomingDocIds.has(c.docId));

    // Append new vectors
    for (const chunk of chunksWithEmbeddings) {
      if (!chunk.embedding || chunk.embedding.length === 0) {
        chunk.embedding = EmbeddingService.generateEmbedding(chunk.text);
      }
      this.chunks.push(chunk);
    }

    await this.persist();
    return { added: chunksWithEmbeddings.length, totalVectors: this.chunks.length };
  }

  /**
   * Deletes all vector chunks associated with a document ID.
   */
  static async deleteByDocId(docId) {
    await this.initialize();
    const initialLen = this.chunks.length;
    this.chunks = this.chunks.filter(c => c.docId !== docId);
    await this.persist();
    return { deletedCount: initialLen - this.chunks.length };
  }

  /**
   * Performs vector ANN search with cosine similarity and metadata filtering.
   */
  static async search({
    queryText,
    queryEmbedding,
    topK = VECTOR_DB_CONFIG.defaultTopK,
    department = null,
    userRole = 'Employee',
    sensitivityAllowance = ['Public', 'Internal', 'Confidential']
  }) {
    await this.initialize();

    const searchVec = queryEmbedding || EmbeddingService.generateEmbedding(queryText);
    const results = [];

    for (const chunk of this.chunks) {
      const chunkDept = chunk.metadata?.department || 'All';
      const chunkSensitivity = chunk.metadata?.sensitivity || 'Confidential';

      // 1. Department ABAC Filter (Admin bypasses, 'All' is accessible)
      if (userRole !== 'Admin' && department && department !== 'All') {
        if (chunkDept !== department && chunkDept !== 'All') {
          continue;
        }
      }

      // 2. Sensitivity Filter
      if (userRole !== 'Admin') {
        if (!sensitivityAllowance.includes(chunkSensitivity)) {
          continue;
        }
      }

      // 3. Cosine Similarity Calculation
      const similarity = EmbeddingService.cosineSimilarity(searchVec, chunk.embedding);

      results.push({
        chunkId: chunk.chunkId,
        docId: chunk.docId,
        documentTitle: chunk.documentTitle,
        sectionTitle: chunk.sectionTitle,
        text: chunk.text,
        tokenCount: chunk.tokenCount,
        metadata: chunk.metadata,
        similarityScore: Number(similarity.toFixed(4))
      });
    }

    // Sort descending by similarity
    results.sort((a, b) => b.similarityScore - a.similarityScore);

    return results.slice(0, Math.min(topK, VECTOR_DB_CONFIG.maxTopK));
  }

  /**
   * Returns statistics about the vector store.
   */
  static async getStats() {
    await this.initialize();
    const deptCounts = {};
    const categoryCounts = {};
    let totalTokens = 0;

    for (const c of this.chunks) {
      const dept = c.metadata?.department || 'Unassigned';
      const cat = c.metadata?.category || 'General';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      totalTokens += c.tokenCount || 0;
    }

    return {
      totalVectors: this.chunks.length,
      totalIndexedTokens: totalTokens,
      dimension: VECTOR_DB_CONFIG.dimension,
      storageMode: 'Air-Gapped Local JSON/ANN',
      departmentDistribution: deptCounts,
      categoryDistribution: categoryCounts
    };
  }
}
