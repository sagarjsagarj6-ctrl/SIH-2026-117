/**
 * VectorIndexManager — Manages the lifecycle of vector indices (create, rebuild, stats, prune).
 */

import { VectorStore } from './VectorStore.js';
import { ChunkingEngine } from './ChunkingEngine.js';
import { EmbeddingService } from './EmbeddingService.js';
import { state } from '../../config/db.js';
import KnowledgeDoc from '../../models/KnowledgeDoc.js';

export class VectorIndexManager {
  static async rebuildAllIndices() {
    await VectorStore.initialize();

    let docs = [];
    if (state.isMongooseConnected) {
      docs = await KnowledgeDoc.find({});
    } else {
      docs = state.memoryDb.knowledgeDocs || [];
    }

    let rebuiltCount = 0;
    const allChunks = [];

    for (const doc of docs) {
      const textToChunk = doc.snippet || doc.title;
      const chunks = ChunkingEngine.chunkDocument({
        docId: doc._id?.toString() || doc.id,
        title: doc.title,
        text: textToChunk,
        department: doc.department,
        sensitivity: doc.sensitivity,
        category: doc.category,
        strategy: 'semantic'
      });

      for (const chunk of chunks) {
        chunk.embedding = EmbeddingService.generateEmbedding(chunk.text);
        allChunks.push(chunk);
      }
      rebuiltCount++;
    }

    VectorStore.chunks = allChunks;
    await VectorStore.persist();

    return {
      success: true,
      documentsProcessed: rebuiltCount,
      totalVectorsIndexed: allChunks.length,
      timestamp: new Date().toISOString()
    };
  }

  static async getIndexHealth() {
    const stats = await VectorStore.getStats();
    return {
      status: 'HEALTHY',
      ...stats,
      annEngine: 'Local Sovereign Cosine ANN',
      lastChecked: new Date().toISOString()
    };
  }
}
