/**
 * DOCXParser — Extracts text and structure from Word (.docx) files using mammoth.
 */

import fs from 'fs/promises';

export class DOCXParser {
  static get supportedExtensions() {
    return ['.docx', '.doc'];
  }

  static async parse(filePath, originalFilename = '') {
    try {
      let mammoth;
      try {
        mammoth = await import('mammoth');
      } catch (e) {
        console.warn('mammoth import warning:', e.message);
      }

      if (mammoth && mammoth.extractRawText) {
        const result = await mammoth.extractRawText({ path: filePath });
        const text = result.value || '';
        const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

        return {
          success: true,
          text: text.trim(),
          metadata: {
            fileType: 'DOCX',
            wordCount,
            charCount: text.length,
            messages: result.messages || []
          }
        };
      } else {
        const buffer = await fs.readFile(filePath);
        const rawString = buffer.toString('utf-8');
        const cleanText = rawString.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
        return {
          success: true,
          text: cleanText,
          metadata: {
            fileType: 'DOCX',
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
        error: `DOCXParser error: ${err.message}`,
        metadata: { fileType: 'DOCX', wordCount: 0 }
      };
    }
  }
}
