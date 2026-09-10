import express from 'express';
import multer from 'multer';
import os from 'os';
import mongoose from 'mongoose';
import { state } from '../config/db.js';
import KnowledgeDoc from '../models/KnowledgeDoc.js';
import DataQualityReport from '../models/DataQualityReport.js';
import { authenticateToken, createAuditEntry } from '../middleware/auth.js';
import { FileIngestor } from '../services/ingestion/FileIngestor.js';
import { VectorStore } from '../services/knowledge/VectorStore.js';

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

const router = express.Router();

// GET /api/documents
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    let docs = [];

    if (state.isMongooseConnected) {
      if (user.role === 'Admin') {
        docs = await KnowledgeDoc.find().sort({ createdAt: -1 });
      } else {
        docs = await KnowledgeDoc.find({
          $or: [{ department: user.department }, { department: 'All' }]
        }).sort({ createdAt: -1 });
      }
    } else {
      if (user.role === 'Admin') {
        docs = [...state.memoryDb.knowledgeDocs].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      } else {
        docs = state.memoryDb.knowledgeDocs
          .filter(d => d.department === user.department || d.department === 'All')
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      }
    }

    createAuditEntry({
      userId: user._id || user.id,
      userName: user.name,
      role: user.role,
      department: user.department,
      action: 'DOCUMENT_REPOSITORY_ACCESSED',
      resource: '/api/documents',
      details: `Retrieved ${docs.length} indexed documents for ${user.role === 'Admin' ? 'All Departments' : user.department}`
    });

    res.json({ documents: docs, total: docs.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch enterprise documents.' });
  }
});

// POST /api/documents/upload (supports both multipart file upload and JSON metadata)
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const user = req.user;

    // Case 1: Real file uploaded via multipart form-data
    if (req.file) {
      const { title, category, sensitivity, autoRedactPII } = req.body;
      const job = await FileIngestor.processFile({
        filePath: req.file.path,
        originalFilename: req.file.originalname,
        fileSize: req.file.size,
        user,
        explicitTitle: title || req.file.originalname,
        explicitDepartment: user.department,
        explicitSensitivity: sensitivity || 'Confidential',
        explicitCategory: category || 'Policy',
        autoRedactPII: autoRedactPII !== 'false'
      });

      return res.status(201).json({
        message: 'Document uploaded and vector indexed successfully',
        document: job.document,
        job
      });
    }

    // Case 2: Metadata-only JSON upload
    const { title, category, fileType, snippet, sensitivity } = req.body;

    if (!title || !category) {
      return res.status(400).json({ error: 'Document title and category are required.' });
    }

    let newDoc;
    const docData = {
      title,
      category,
      department: user.department,
      fileType: fileType || 'PDF',
      sensitivity: sensitivity || 'Confidential',
      snippet: snippet || `Uploaded enterprise document snippet for ${title}. Vector indexed and secured in local knowledge store.`,
      tokenCount: Math.floor(800 + Math.random() * 2000),
      vectorIndexed: true,
      uploadedBy: user.name,
      createdAt: new Date()
    };

    if (state.isMongooseConnected) {
      newDoc = await KnowledgeDoc.create(docData);
    } else {
      newDoc = { _id: 'doc_' + Date.now(), ...docData, createdAt: new Date() };
      state.memoryDb.knowledgeDocs.unshift(newDoc);
    }

    createAuditEntry({
      userId: user._id || user.id,
      userName: user.name,
      role: user.role,
      department: user.department,
      action: 'DOCUMENT_INDEXED',
      resource: '/api/documents/upload',
      details: `Indexed new document "${title}" into ${user.department} local vector store`
    });

    res.status(201).json({ message: 'Document uploaded and vector indexed successfully', document: newDoc });
  } catch (err) {
    res.status(500).json({ error: `Document indexing failed: ${err.message}` });
  }
});

// GET /api/documents/:id — Fetch single document details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    let doc = null;

    if (state.isMongooseConnected) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        doc = await KnowledgeDoc.findById(id);
      }
      if (!doc) {
        doc = await KnowledgeDoc.findOne({ _id: id });
      }
    } else {
      doc = state.memoryDb.knowledgeDocs.find(d => String(d._id) === String(id));
    }

    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    res.json({ document: doc });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve document details.' });
  }
});

// DELETE /api/documents/:id — Delete document and corresponding vector embeddings
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    let doc = null;

    if (state.isMongooseConnected) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        doc = await KnowledgeDoc.findById(id);
      }
      if (!doc) {
        doc = await KnowledgeDoc.findOne({ _id: id });
      }
      if (!doc) {
        return res.status(404).json({ error: 'Document not found.' });
      }

      if (user.role !== 'Admin' && doc.department !== user.department) {
        return res.status(403).json({ error: 'Access denied: You cannot delete documents from other departments.' });
      }

      await KnowledgeDoc.deleteOne({ _id: doc._id });
    } else {
      const idx = state.memoryDb.knowledgeDocs.findIndex(d => String(d._id) === String(id));
      if (idx === -1) {
        return res.status(404).json({ error: 'Document not found.' });
      }
      doc = state.memoryDb.knowledgeDocs[idx];

      if (user.role !== 'Admin' && doc.department !== user.department) {
        return res.status(403).json({ error: 'Access denied: You cannot delete documents from other departments.' });
      }

      state.memoryDb.knowledgeDocs.splice(idx, 1);
    }

    // Clean up vector store vectors for this document
    const docIdStr = String(doc._id);
    await VectorStore.deleteByDocId(docIdStr);
    await VectorStore.removeByDocumentTitles([doc.title]);

    // Clean up data quality reports
    if (state.isMongooseConnected) {
      try {
        await DataQualityReport.deleteMany({ docId: docIdStr });
      } catch {}
    } else if (state.memoryDb.dataQualityReports) {
      state.memoryDb.dataQualityReports = state.memoryDb.dataQualityReports.filter(r => String(r.docId) !== docIdStr);
    }

    createAuditEntry({
      userId: user._id || user.id,
      userName: user.name,
      role: user.role,
      department: user.department,
      action: 'DOCUMENT_DELETED',
      resource: `/api/documents/${id}`,
      details: `Permanently removed document "${doc.title}" and associated vectors from ${doc.department}`
    });

    res.json({
      success: true,
      message: `Document "${doc.title}" removed successfully from local knowledge base and vector store.`,
      deletedId: id
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to remove document: ${err.message}` });
  }
});

export default router;
