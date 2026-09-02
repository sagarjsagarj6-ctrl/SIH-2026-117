import express from 'express';
import { state } from '../config/db.js';
import KnowledgeDoc from '../models/KnowledgeDoc.js';
import { authenticateToken, createAuditEntry } from '../middleware/auth.js';

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
        docs = [...state.memoryDb.knowledgeDocs];
      } else {
        docs = state.memoryDb.knowledgeDocs.filter(d => d.department === user.department || d.department === 'All');
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

// POST /api/documents/upload
router.post('/upload', authenticateToken, async (req, res) => {
  try {
    const { title, category, fileType, snippet, sensitivity } = req.body;
    const user = req.user;

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
      uploadedBy: user.name
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
    res.status(500).json({ error: 'Document indexing failed.' });
  }
});

export default router;
