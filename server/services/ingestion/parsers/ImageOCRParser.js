/**
 * ImageOCRParser — Extracts text from image files (.png, .jpg, .jpeg, .tiff) using OCR / visual inspection.
 */

import fs from 'fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export class ImageOCRParser {
  static get supportedExtensions() {
    return ['.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.webp'];
  }

  static async getCapabilities() {
    const command = process.env.TESSERACT_CMD || 'tesseract';
    try {
      const { stdout } = await execFileAsync(command, ['--version'], { timeout: 2000, windowsHide: true });
      return { available: true, engine: 'tesseract', command, version: String(stdout || '').split('\n')[0] };
    } catch {
      return { available: false, engine: 'metadata-fallback', command, version: null };
    }
  }

  static async parse(filePath, originalFilename = '') {
    try {
      const ext = originalFilename.split('.').pop()?.toUpperCase() || 'IMAGE';
      const stats = await fs.stat(filePath);
      const capabilities = await this.getCapabilities();

      if (capabilities.available) {
        try {
          const { stdout } = await execFileAsync(
            capabilities.command,
            [filePath, 'stdout', '--psm', process.env.TESSERACT_PSM || '6'],
            { timeout: 30000, maxBuffer: 10 * 1024 * 1024, windowsHide: true }
          );
          const text = String(stdout || '').trim();
          if (text) {
            return {
              success: true,
              text,
              metadata: {
                fileType: ext,
                wordCount: text.split(/\s+/).length,
                charCount: text.length,
                ocrConfidence: null,
                ocrEngine: 'tesseract',
                simulation: false,
                isImageOCR: true
              }
            };
          }
        } catch (error) {
          console.warn(`[ImageOCRParser] Tesseract failed; using metadata fallback: ${error.message}`);
        }
      }

      // In sovereign air-gapped environments without GPU OCR model sidecars,
      // return an authenticated metadata extract and explicitly label it as fallback.
      const fallbackOCRText = `[OCR FALLBACK RESULT: ${originalFilename}]\n` +
        `Document Type: Scanned Sovereign Enterprise Document Image (${ext})\n` +
        `File Size: ${(stats.size / 1024).toFixed(2)} KB\n` +
        `OCR Engine: ${capabilities.engine}\n` +
        `Extracted Data: Image metadata captured. Install Tesseract or a local vision sidecar for actual text extraction.`;

      return {
        success: true,
        text: fallbackOCRText,
        metadata: {
          fileType: ext,
          wordCount: fallbackOCRText.split(/\s+/).length,
          charCount: fallbackOCRText.length,
          ocrConfidence: null,
          ocrEngine: capabilities.engine,
          simulation: true,
          isImageOCR: true
        }
      };
    } catch (err) {
      return {
        success: false,
        text: '',
        error: `ImageOCRParser error: ${err.message}`,
        metadata: { fileType: 'IMAGE', wordCount: 0 }
      };
    }
  }
}
