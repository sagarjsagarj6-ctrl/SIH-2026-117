/**
 * TextParser — Parses plain text, Markdown, JSON, and source code files.
 */

import fs from 'fs/promises';

export class TextParser {
  static get supportedExtensions() {
    return ['.txt', '.md', '.json', '.log', '.csv', '.yaml', '.yml'];
  }

  static async parse(filePath, originalFilename = '') {
    try {
      const buffer = await fs.readFile(filePath);
      const rawText = buffer.toString('utf-8');

      let structuredData = null;
      if (originalFilename.endsWith('.json') || filePath.endsWith('.json')) {
        try {
          structuredData = JSON.parse(rawText);
        } catch {
          // Keep as raw text if JSON parsing fails
        }
      }

      const lines = rawText.split(/\r?\n/);
      const wordCount = rawText.trim().split(/\s+/).filter(Boolean).length;

      return {
        success: true,
        text: rawText,
        metadata: {
          fileType: originalFilename.split('.').pop()?.toUpperCase() || 'TXT',
          lineCount: lines.length,
          wordCount,
          charCount: rawText.length,
          hasStructuredJson: !!structuredData
        },
        structuredData
      };
    } catch (err) {
      return {
        success: false,
        text: '',
        error: `TextParser error: ${err.message}`,
        metadata: { fileType: 'TXT', wordCount: 0 }
      };
    }
  }
}
