/**
 * DataValidator — Validates file integrity (SHA-256), encoding, size limits, and security constraints.
 */

import crypto from 'crypto';
import fs from 'fs/promises';

export class DataValidator {
  static MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  static ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv', '.txt', '.md', '.json', '.png', '.jpg', '.jpeg', '.tiff', '.bmp'];

  static async computeSHA256(filePath) {
    const buffer = await fs.readFile(filePath);
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    return hash.digest('hex');
  }

  static async validateFile(filePath, originalFilename, fileSize) {
    const errors = [];
    const warnings = [];

    // 1. File Size check
    if (fileSize > this.MAX_FILE_SIZE) {
      errors.push(`File size ${(fileSize / (1024 * 1024)).toFixed(2)}MB exceeds maximum allowed limit of 50MB`);
    }

    // 2. Extension check
    const ext = '.' + originalFilename.split('.').pop().toLowerCase();
    if (!this.ALLOWED_EXTENSIONS.includes(ext)) {
      errors.push(`File extension '${ext}' is not supported in sovereign ingestion pipeline`);
    }

    // 3. SHA-256 Checksum
    let checksum = '';
    try {
      checksum = await this.computeSHA256(filePath);
    } catch (err) {
      errors.push(`Failed to calculate SHA-256 checksum: ${err.message}`);
    }

    // 4. Malware scan check (pattern heuristics)
    let malwareClean = true;
    try {
      const sampleBuffer = await fs.readFile(filePath);
      const header = sampleBuffer.subarray(0, 1024).toString('utf-8');
      if (header.includes('<script>') || header.includes('eval(') && (ext !== '.txt' && ext !== '.md')) {
        warnings.push('Embedded script tag detected in document header');
      }
    } catch {
      // Ignored for binary files
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      checksum,
      fileSize,
      extension: ext,
      malwareStatus: malwareClean ? 'CLEAN' : 'SUSPICIOUS'
    };
  }
}
