/**
 * PDFParser — Extracts text and metadata from PDF files using pdf-parse with resilient fallback.
 */

import fs from 'fs/promises';

export class PDFParser {
  static get supportedExtensions() {
    return ['.pdf'];
  }

  static async parse(filePath, originalFilename = '') {
    try {
      const dataBuffer = await fs.readFile(filePath);
      
      let pdfParseModule;
      try {
        pdfParseModule = (await import('pdf-parse')).default;
      } catch (importErr) {
        console.warn('pdf-parse import warning:', importErr.message);
      }

      if (pdfParseModule && typeof pdfParseModule === 'function') {
        const data = await pdfParseModule(dataBuffer);
        const text = data.text || '';
        const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

        return {
          success: true,
          text: text.trim(),
          metadata: {
            fileType: 'PDF',
            pageCount: data.numpages || 1,
            info: data.info || {},
            wordCount,
            charCount: text.length
          }
        };
      } else {
        // Fallback text extraction for binary stream if module isn't callable
        const rawString = dataBuffer.toString('utf-8');
        const cleanText = rawString.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
        return {
          success: true,
          text: cleanText,
          metadata: {
            fileType: 'PDF',
            pageCount: 1,
            wordCount: cleanText.split(/\s+/).filter(Boolean).length,
            charCount: cleanText.length,
            fallbackUsed: true
          }
        };
      }
    } catch (err) {
      return {
        success: false,
        text: '',
        error: `PDFParser error: ${err.message}`,
        metadata: { fileType: 'PDF', wordCount: 0 }
      };
    }
  }
}
