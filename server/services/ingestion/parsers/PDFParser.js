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

      let pdfModule;
      try {
        pdfModule = await import('pdf-parse');
      } catch (importErr) {
        console.warn('[PDFParser] pdf-parse import warning:', importErr.message);
      }

      // 1. Try pdf-parse v2 class API
      if (pdfModule && pdfModule.PDFParse) {
        try {
          const parser = new pdfModule.PDFParse({ data: dataBuffer });
          const result = await parser.getText();
          const text = (result?.text || '').trim();
          const wordCount = text.split(/\s+/).filter(Boolean).length;
          let info = {};
          try {
            const infoRes = await parser.getInfo();
            info = infoRes?.info || {};
          } catch {
            // Non-critical info retrieval
          }

          if (text.length > 0) {
            return {
              success: true,
              text,
              metadata: {
                fileType: 'PDF',
                pageCount: result?.total || parser?.total || 1,
                info,
                wordCount,
                charCount: text.length
              }
            };
          }
        } catch (v2Err) {
          console.warn('[PDFParser] v2 extraction warning:', v2Err.message);
        }
      }

      // 2. Try pdf-parse v1 callable default export
      const defaultCallable = pdfModule?.default || (typeof pdfModule === 'function' ? pdfModule : null);
      if (typeof defaultCallable === 'function') {
        try {
          const data = await defaultCallable(dataBuffer);
          const text = (data.text || '').trim();
          const wordCount = text.split(/\s+/).filter(Boolean).length;

          if (text.length > 0) {
            return {
              success: true,
              text,
              metadata: {
                fileType: 'PDF',
                pageCount: data.numpages || 1,
                info: data.info || {},
                wordCount,
                charCount: text.length
              }
            };
          }
        } catch (v1Err) {
          console.warn('[PDFParser] v1 extraction warning:', v1Err.message);
        }
      }

      // 3. Resilient fallback: binary stream sanitization
      const rawString = dataBuffer.toString('utf-8');
      const cleanText = rawString.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
      const wordCount = cleanText.split(/\s+/).filter(Boolean).length;

      return {
        success: true,
        text: cleanText,
        metadata: {
          fileType: 'PDF',
          pageCount: 1,
          wordCount,
          charCount: cleanText.length,
          fallbackUsed: true
        }
      };
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
