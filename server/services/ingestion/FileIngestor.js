/**
 * FileIngestor — Master Ingestion Pipeline Orchestrator.
 * Accepts uploaded files, validates integrity, dispatches to appropriate parsers,
 * cleans/sanitizes text, computes data quality scores, classifies sensitivity and department,
 * splits into semantic chunks, generates vector embeddings, stores into vector DB and KnowledgeDoc DB,
 * and creates an immutable audit trail entry.
 */

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';

import { DataValidator } from '../validation/DataValidator.js';
import { DataCleaner } from '../validation/DataCleaner.js';
import { QualityScorer } from '../validation/QualityScorer.js';
import { DataClassifier } from '../classification/DataClassifier.js';
import { ChunkingEngine } from '../knowledge/ChunkingEngine.js';
import { EmbeddingService } from '../knowledge/EmbeddingService.js';
import { VectorStore } from '../knowledge/VectorStore.js';

import { TextParser } from './parsers/TextParser.js';
import { PDFParser } from './parsers/PDFParser.js';
import { DOCXParser } from './parsers/DOCXParser.js';
import { SpreadsheetParser } from './parsers/SpreadsheetParser.js';
import { ImageOCRParser } from './parsers/ImageOCRParser.js';

import { state } from '../../config/db.js';
import KnowledgeDoc from '../../models/KnowledgeDoc.js';
import DataQualityReport from '../../models/DataQualityReport.js';
import { createAuditEntry } from '../../middleware/auth.js';

export class FileIngestor {
  static activeJobs = new Map();

  /**
   * Dispatches file to appropriate parser based on file extension.
   */
  static async parseFileByExtension(filePath, originalFilename) {
    const ext = '.' + originalFilename.split('.').pop().toLowerCase();

    if (PDFParser.supportedExtensions.includes(ext)) {
      return PDFParser.parse(filePath, originalFilename);
    } else if (DOCXParser.supportedExtensions.includes(ext)) {
      return DOCXParser.parse(filePath, originalFilename);
    } else if (SpreadsheetParser.supportedExtensions.includes(ext)) {
      return SpreadsheetParser.parse(filePath, originalFilename);
    } else if (ImageOCRParser.supportedExtensions.includes(ext)) {
      return ImageOCRParser.parse(filePath, originalFilename);
    } else if (TextParser.supportedExtensions.includes(ext)) {
      return TextParser.parse(filePath, originalFilename);
    }

    // Default fallback to text parser
    return TextParser.parse(filePath, originalFilename);
  }

  /**
   * Processes a single uploaded file through the entire end-to-end sovereign ingestion pipeline.
   */
  static async processFile({
    filePath,
    originalFilename,
    fileSize,
    user,
    explicitTitle = null,
    explicitDepartment = null,
    explicitSensitivity = null,
    explicitCategory = null,
    autoRedactPII = true
  }) {
    const jobId = 'job_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const stages = [];
    let docId = null;

    const recordStage = (name, status, details = '') => {
      stages.push({ stage: name, status, details, timestamp: new Date().toISOString() });
    };

    try {
      // Stage 1: Validation & Checksum
      recordStage('FILE_VALIDATION', 'RUNNING', 'Verifying SHA-256 and air-gap file integrity');
      const validation = await DataValidator.validateFile(filePath, originalFilename, fileSize);
      if (!validation.isValid) {
        recordStage('FILE_VALIDATION', 'FAILED', validation.errors.join('; '));
        throw new Error(`File Validation Failed: ${validation.errors.join('; ')}`);
      }
      recordStage('FILE_VALIDATION', 'SUCCESS', `Checksum verified: ${validation.checksum.substring(0, 12)}...`);

      // Stage 2: Format Parsing & Text Extraction
      recordStage('PARSING_EXTRACTION', 'RUNNING', `Extracting content using sovereign parser for ${validation.extension}`);
      const parseResult = await this.parseFileByExtension(filePath, originalFilename);
      if (!parseResult.success || !parseResult.text) {
        recordStage('PARSING_EXTRACTION', 'FAILED', parseResult.error || 'No readable text extracted');
        throw new Error(`Text Extraction Failed: ${parseResult.error || 'Empty document'}`);
      }
      recordStage('PARSING_EXTRACTION', 'SUCCESS', `Extracted ${parseResult.metadata.wordCount || 0} words`);

      // Stage 3: PII Scanning & Cleaning
      recordStage('PII_CLEANING', 'RUNNING', 'Scanning for PII tokens (SSN, credit cards, phones)');
      const piiScan = DataCleaner.scanPII(parseResult.text);
      const cleanedText = DataCleaner.cleanAndRedact(parseResult.text, autoRedactPII);
      recordStage('PII_CLEANING', 'SUCCESS', piiScan.piiDetected ? `Detected & redacted ${piiScan.matches.length} PII categories` : 'No PII detected');

      // Stage 4: Data Quality Scoring
      recordStage('QUALITY_SCORING', 'RUNNING', 'Computing completeness, consistency, and validity scores');
      const qualityScore = QualityScorer.evaluateQuality({
        text: cleanedText,
        fileValidation: validation,
        piiScan,
        fileType: validation.extension
      });
      recordStage('QUALITY_SCORING', 'SUCCESS', `Score: ${qualityScore.overallScore}/100 (${qualityScore.status})`);

      // Stage 5: Classification & Sensitivity Labeling
      recordStage('CLASSIFICATION', 'RUNNING', 'Classifying security level and department ownership');
      const classification = DataClassifier.classifyDocument({
        text: cleanedText,
        filename: originalFilename,
        userDepartment: explicitDepartment || user.department,
        explicitSensitivity,
        explicitCategory
      });
      recordStage('CLASSIFICATION', 'SUCCESS', `Tagged as ${classification.department} / ${classification.sensitivity}`);

      // Stage 6: Chunking
      recordStage('CHUNKING', 'RUNNING', 'Segmenting into semantic chunks with header preservation');
      const docObjectId = new mongoose.Types.ObjectId();
      docId = docObjectId.toString();
      const chunks = ChunkingEngine.chunkDocument({
        docId,
        title: originalFilename,
        text: cleanedText,
        department: classification.department,
        sensitivity: classification.sensitivity,
        category: classification.category,
        strategy: 'semantic'
      });
      recordStage('CHUNKING', 'SUCCESS', `Generated ${chunks.length} semantic chunks`);

      // Stage 7: Vector Embeddings & Storage
      recordStage('VECTOR_EMBEDDING', 'RUNNING', 'Generating 768-dim vector embeddings and updating index');
      for (const chunk of chunks) {
        chunk.embedding = EmbeddingService.generateEmbedding(chunk.text);
      }
      await VectorStore.addChunks(chunks);
      recordStage('VECTOR_EMBEDDING', 'SUCCESS', `Stored ${chunks.length} vectors in local VectorDB`);

      // Stage 8: Document Entity & Quality Report Persistence
      recordStage('PERSISTENCE', 'RUNNING', 'Writing document metadata and quality audit record');
      const docRecord = {
        _id: docObjectId,          // Use ObjectId object, not string — prevents BSSONError
        title: explicitTitle || originalFilename,
        category: explicitCategory || classification.category,
        department: explicitDepartment || user.department || classification.department,
        fileType: validation.extension.replace('.', '').toUpperCase(),
        sensitivity: explicitSensitivity || classification.sensitivity,
        snippet: cleanedText.slice(0, 400) + (cleanedText.length > 400 ? '...' : ''),
        tokenCount: chunks.reduce((acc, c) => acc + (c.tokenCount || 0), 0),
        vectorIndexed: true,
        uploadedBy: user.name || 'User',
        createdAt: new Date()
      };

      if (state.isMongooseConnected) {
        await KnowledgeDoc.create(docRecord);
      } else {
        state.memoryDb.knowledgeDocs.unshift(docRecord);
      }

      // Save Data Quality Report
      const qualityReportData = {
        docId,
        fileName: originalFilename,
        fileType: validation.extension.replace('.', '').toUpperCase(),
        fileSize,
        checksum: validation.checksum,
        department: classification.department,
        overallScore: qualityScore.overallScore,
        metrics: qualityScore.metrics,
        piiDetected: piiScan.piiDetected,
        piiDetails: piiScan.matches.map(m => ({ type: m.type, count: m.count, redacted: autoRedactPII })),
        malwareStatus: validation.malwareStatus,
        status: qualityScore.status,
        flags: qualityScore.flags,
        uploadedBy: user.name || 'User'
      };

      if (state.isMongooseConnected) {
        await DataQualityReport.create(qualityReportData);
      } else {
        qualityReportData._id = 'qr_' + Date.now();
        qualityReportData.createdAt = new Date();
        state.memoryDb.dataQualityReports = state.memoryDb.dataQualityReports || [];
        state.memoryDb.dataQualityReports.unshift(qualityReportData);
      }

      recordStage('PERSISTENCE', 'SUCCESS', 'Persisted to repository');

      // Stage 9: Audit Log
      await createAuditEntry({
        userId: user._id || user.id,
        userName: user.name,
        role: user.role,
        department: user.department,
        action: 'FILE_INGESTED_AND_VECTORIZED',
        resource: `/api/ingest/upload/${originalFilename}`,
        status: 'SUCCESS',
        details: `Ingested ${originalFilename} (${validation.fileSize}B) into ${classification.department} vector store with quality score ${qualityScore.overallScore}%`
      });

      const finalJob = {
        jobId,
        status: 'COMPLETED',
        document: docRecord,
        qualityReport: qualityReportData,
        stages,
        chunksGenerated: chunks.length,
        timestamp: new Date().toISOString()
      };

      this.activeJobs.set(jobId, finalJob);
      return finalJob;

    } catch (err) {
      if (docId) {
        try {
          await VectorStore.deleteByDocId(docId);
        } catch {
          // ignore rollback error
        }
      }
      recordStage('PIPELINE_ERROR', 'FAILED', err.message);
      const failedJob = {
        jobId,
        status: 'FAILED',
        error: err.message,
        stages,
        timestamp: new Date().toISOString()
      };
      this.activeJobs.set(jobId, failedJob);
      throw err;
    } finally {
      // Auto-purge temporary processing file if present
      try {
        await fs.unlink(filePath);
      } catch {
        // file might have already been moved or deleted
      }
    }
  }

  static getJobStatus(jobId) {
    return this.activeJobs.get(jobId) || null;
  }

  static listRecentJobs(limit = 15) {
    return Array.from(this.activeJobs.values()).slice(-limit).reverse();
  }

  static clearJobs() {
    this.activeJobs.clear();
  }
}
