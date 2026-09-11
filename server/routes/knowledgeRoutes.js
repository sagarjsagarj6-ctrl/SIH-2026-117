/**
 * Knowledge Routes — Search, explore, inspect chunks, and manage vector indices.
 */

import express from 'express';
import { RetrievalService } from '../services/knowledge/RetrievalService.js';
import { VectorStore } from '../services/knowledge/VectorStore.js';
import { VectorIndexManager } from '../services/knowledge/VectorIndexManager.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { state } from '../config/db.js';
import KnowledgeDoc from '../models/KnowledgeDoc.js';

const router = express.Router();

// POST /api/knowledge/search — Hybrid vector + keyword search with RBAC
router.post('/search', authenticateToken, async (req, res) => {
  try {
    const { query, department, topK, minScore } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchResults = await RetrievalService.search({
      query,
      user: req.user,
      department: department || (req.user.role === 'Admin' ? null : req.user.department),
      topK: topK || 5,
      minScore: minScore || 0.15
    });

    res.json(searchResults);
  } catch (err) {
    res.status(500).json({ error: `Search retrieval error: ${err.message}` });
  }
});

// GET /api/knowledge/stats — Vector index statistics & health
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await VectorIndexManager.getIndexHealth();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vector statistics' });
  }
});

// GET /api/knowledge/chunks/:docId — Inspect semantic chunks for a document
router.get('/chunks/:docId', authenticateToken, async (req, res) => {
  try {
    await VectorStore.initialize();
    const docId = req.params.docId;
    const docChunks = VectorStore.chunks.filter(c => c.docId === docId);

    res.json({
      docId,
      chunkCount: docChunks.length,
      chunks: docChunks.map(c => ({
        chunkId: c.chunkId,
        chunkIndex: c.chunkIndex,
        totalChunks: c.totalChunks,
        sectionTitle: c.sectionTitle,
        tokenCount: c.tokenCount,
        text: c.text,
        metadata: c.metadata,
        embeddingSource: c.embeddingSource || 'deterministic-local-hash',
        hasVectorEmbedding: !!(c.embedding && c.embedding.length > 0)
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve document chunks' });
  }
});

// GET /api/knowledge/doc/:id — Fetch single document details
router.get('/doc/:id', authenticateToken, async (req, res) => {
  try {
    let doc = null;
    if (state.isMongooseConnected) {
      doc = await KnowledgeDoc.findById(req.params.id);
    } else {
      doc = state.memoryDb.knowledgeDocs.find(d => (d._id?.toString() === req.params.id || d.id === req.params.id));
    }

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ document: doc });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// POST /api/knowledge/rebuild — Rebuild all vector indices (Admin only)
router.post('/rebuild', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const result = await VectorIndexManager.rebuildAllIndices();
    res.json({ message: 'Vector indices successfully rebuilt', result });
  } catch (err) {
    res.status(500).json({ error: `Rebuild failure: ${err.message}` });
  }
});

export default router;
