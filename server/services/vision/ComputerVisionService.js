/**
 * ComputerVisionService
 *
 * Local, evidence-first image analysis for the Sovereign workbench. It reads
 * image metadata and checksum itself, uses Tesseract only when it is actually
 * available, and optionally calls a private-LAN Ollama vision model when one
 * has explicitly been configured. It never turns a metadata fallback into
 * fabricated OCR text or a fabricated confidence score.
 */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ImageOCRParser } from '../ingestion/parsers/ImageOCRParser.js';

const DEFAULT_MAX_FILE_BYTES = 20 * 1024 * 1024;
const JPEG_SOF_MARKERS = new Set([
  0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7,
  0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF
]);

const FORMAT_BY_EXTENSION = Object.freeze({
  '.png': 'PNG',
  '.jpg': 'JPEG',
  '.jpeg': 'JPEG',
  '.gif': 'GIF',
  '.bmp': 'BMP',
  '.tif': 'TIFF',
  '.tiff': 'TIFF',
  '.webp': 'WEBP'
});

const MIME_BY_FORMAT = Object.freeze({
  PNG: 'image/png',
  JPEG: 'image/jpeg',
  GIF: 'image/gif',
  BMP: 'image/bmp',
  TIFF: 'image/tiff',
  WEBP: 'image/webp'
});

const asNumber = (value) => (Number.isFinite(value) && value > 0 ? value : null);
const readUInt24LE = (buffer, offset) => buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);

export class ComputerVisionService {
  static get maxFileBytes() {
    const configured = Number(process.env.VISION_MAX_FILE_BYTES || DEFAULT_MAX_FILE_BYTES);
    return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_FILE_BYTES;
  }

  static safeFilename(value) {
    return path.basename(String(value || 'upload-image')).replace(/[\u0000-\u001F]/g, '') || 'upload-image';
  }

  static declaredFormat(originalFilename) {
    return FORMAT_BY_EXTENSION[path.extname(String(originalFilename || '')).toLowerCase()] || null;
  }

  static detectFormat(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 2) return null;
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) return 'PNG';
    if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'JPEG';
    if (buffer.length >= 6 && (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a')) return 'GIF';
    if (buffer.length >= 2 && buffer.subarray(0, 2).toString('ascii') === 'BM') return 'BMP';
    if (buffer.length >= 4 && (buffer.subarray(0, 4).toString('ascii') === 'II*\u0000' || buffer.subarray(0, 4).toString('ascii') === 'MM\u0000*')) return 'TIFF';
    if (buffer.length >= 16 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'WEBP';
    return null;
  }

  static parseDimensions(buffer, format) {
    try {
      switch (format) {
        case 'PNG':
          if (buffer.length >= 24 && buffer.subarray(12, 16).toString('ascii') === 'IHDR') {
            return { width: asNumber(buffer.readUInt32BE(16)), height: asNumber(buffer.readUInt32BE(20)) };
          }
          break;
        case 'GIF':
          if (buffer.length >= 10) return { width: asNumber(buffer.readUInt16LE(6)), height: asNumber(buffer.readUInt16LE(8)) };
          break;
        case 'BMP':
          if (buffer.length >= 26) {
            return {
              width: asNumber(Math.abs(buffer.readInt32LE(18))),
              height: asNumber(Math.abs(buffer.readInt32LE(22)))
            };
          }
          break;
        case 'JPEG':
          return this.parseJpegDimensions(buffer);
        case 'WEBP':
          return this.parseWebpDimensions(buffer);
        case 'TIFF':
          return this.parseTiffDimensions(buffer);
        default:
          break;
      }
    } catch {
      // Malformed image dimensions are represented as unavailable, not guessed.
    }
    return { width: null, height: null };
  }

  static parseJpegDimensions(buffer) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xFF) {
        offset += 1;
        continue;
      }
      while (buffer[offset] === 0xFF) offset += 1;
      const marker = buffer[offset];
      offset += 1;
      if (marker === 0xD8 || marker === 0xD9) continue;
      if (marker === 0xDA || offset + 2 > buffer.length) break;
      const segmentLength = buffer.readUInt16BE(offset);
      if (segmentLength < 2 || offset + segmentLength > buffer.length) break;
      if (JPEG_SOF_MARKERS.has(marker) && offset + 8 <= buffer.length) {
        return {
          width: asNumber(buffer.readUInt16BE(offset + 5)),
          height: asNumber(buffer.readUInt16BE(offset + 3))
        };
      }
      offset += segmentLength;
    }
    return { width: null, height: null };
  }

  static parseWebpDimensions(buffer) {
    if (buffer.length < 25) return { width: null, height: null };
    const chunkType = buffer.subarray(12, 16).toString('ascii');
    if (chunkType === 'VP8X' && buffer.length >= 30) {
      return {
        width: readUInt24LE(buffer, 24) + 1,
        height: readUInt24LE(buffer, 27) + 1
      };
    }
    if (chunkType === 'VP8 ' && buffer.length >= 30 && buffer[23] === 0x9D && buffer[24] === 0x01 && buffer[25] === 0x2A) {
      return {
        width: buffer.readUInt16LE(26) & 0x3FFF,
        height: buffer.readUInt16LE(28) & 0x3FFF
      };
    }
    if (chunkType === 'VP8L' && buffer.length >= 25 && buffer[20] === 0x2F) {
      return {
        width: 1 + buffer[21] + ((buffer[22] & 0x3F) << 8),
        height: 1 + ((buffer[22] & 0xC0) >> 6) + (buffer[23] << 2) + ((buffer[24] & 0x0F) << 10)
      };
    }
    return { width: null, height: null };
  }

  static parseTiffDimensions(buffer) {
    if (buffer.length < 10) return { width: null, height: null };
    const byteOrder = buffer.subarray(0, 2).toString('ascii');
    if (!['II', 'MM'].includes(byteOrder)) return { width: null, height: null };
    const littleEndian = byteOrder === 'II';
    const read16 = (offset) => littleEndian ? buffer.readUInt16LE(offset) : buffer.readUInt16BE(offset);
    const read32 = (offset) => littleEndian ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);
    const ifdOffset = read32(4);
    if (ifdOffset + 2 > buffer.length) return { width: null, height: null };
    const entryCount = read16(ifdOffset);
    let width = null;
    let height = null;
    for (let index = 0; index < entryCount; index += 1) {
      const entryOffset = ifdOffset + 2 + index * 12;
      if (entryOffset + 12 > buffer.length) break;
      const tag = read16(entryOffset);
      if (tag !== 256 && tag !== 257) continue;
      const type = read16(entryOffset + 2);
      const count = read32(entryOffset + 4);
      if (count !== 1) continue;
      const value = type === 3 ? read16(entryOffset + 8) : type === 4 ? read32(entryOffset + 8) : null;
      if (tag === 256) width = asNumber(value);
      if (tag === 257) height = asNumber(value);
    }
    return { width, height };
  }

  /**
   * Pure buffer inspection used by the service and suitable for unit tests.
   */
  static inspectImage(buffer) {
    const format = this.detectFormat(buffer);
    const dimensions = this.parseDimensions(buffer, format);
    return {
      supported: Boolean(format),
      format: format || 'UNKNOWN',
      mimeType: format ? MIME_BY_FORMAT[format] : 'application/octet-stream',
      byteLength: Buffer.isBuffer(buffer) ? buffer.length : 0,
      width: dimensions.width,
      height: dimensions.height,
      aspectRatio: dimensions.width && dimensions.height
        ? Number((dimensions.width / dimensions.height).toFixed(4))
        : null
    };
  }

  static extractObservedTables(text = '') {
    const rows = [];
    const rowPattern = /^\s*\|?\s*([^|\n]+)\s*\|\s*([^|\n]+)\s*\|\s*([^|\n]+)\s*\|\s*([^|\n]+)\s*\|?\s*$/gm;
    let match;
    while ((match = rowPattern.exec(text)) !== null) {
      const cells = match.slice(1).map((cell) => cell.trim());
      if (cells.some((cell) => /^-+$/.test(cell)) || /parameter/i.test(cells[0])) continue;
      rows.push({ Parameter: cells[0], Nominal: cells[1], Measured: cells[2], Status: cells[3], provenance: 'observed_ocr' });
    }
    return rows;
  }

  static extractObservedEntities(text = '') {
    const patterns = [
      [/classification[:\s]+([^\n.]+)/i, 'Security Classification'],
      [/department[:\s]+([^\n.]+)/i, 'Department'],
      [/reference(?:\s*(?:id|number))?[:\s]+([A-Z0-9_-]+)/i, 'Document Reference'],
      [/invoice(?:\s*(?:id|number))?[:\s]+([A-Z0-9_-]+)/i, 'Invoice Reference'],
      [/status[:\s]+([^\n.]+)/i, 'Status']
    ];
    const seen = new Set();
    const entities = [];
    for (const [pattern, label] of patterns) {
      const match = String(text || '').match(pattern);
      if (!match) continue;
      const value = match[1].trim();
      const identity = `${label}:${value.toLowerCase()}`;
      if (!value || seen.has(identity)) continue;
      seen.add(identity);
      entities.push({ label, value, provenance: 'observed_ocr' });
    }
    return entities;
  }

  static isPrivateOrLoopbackUrl(rawUrl) {
    try {
      const hostname = new URL(rawUrl).hostname.toLowerCase();
      if (hostname === 'localhost' || hostname === '::1' || hostname === '0.0.0.0' || hostname.startsWith('127.')) return true;
      if (hostname.startsWith('10.') || hostname.startsWith('192.168.')) return true;
      const match = hostname.match(/^172\.(\d{1,3})\./);
      return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
    } catch {
      return false;
    }
  }

  static async runConfiguredVisionModel({ imageBase64, query, fileName }) {
    const model = String(process.env.VISION_MODEL || '').trim();
    const host = String(process.env.VISION_OLLAMA_HOST || process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/+$/, '');
    if (!model) {
      return { configured: false, ran: false, engine: null, status: 'NOT_CONFIGURED', text: '' };
    }
    if (!this.isPrivateOrLoopbackUrl(host)) {
      return {
        configured: true,
        ran: false,
        engine: `ollama:${model}`,
        status: 'BLOCKED_NON_PRIVATE_ENDPOINT',
        text: '',
        error: 'The configured vision endpoint is not loopback or a private-LAN address.'
      };
    }

    const controller = new AbortController();
    const timeoutMs = Math.max(1_000, Number(process.env.VISION_MODEL_TIMEOUT_MS || 45_000));
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const prompt = [
        'Analyze this image only from visible content. Return a concise result with two labeled sections:',
        'OBSERVED: visible layout, objects, diagrams, and clearly readable labels.',
        'INFERRED: tentative interpretation, if any. Do not claim inferred content is verified.',
        query ? `User task: ${String(query).slice(0, 4_000)}` : '',
        `File: ${fileName}`
      ].filter(Boolean).join('\n');
      const response = await fetch(`${host}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, images: [imageBase64], stream: false, options: { temperature: 0 } }),
        signal: controller.signal
      });
      if (!response.ok) {
        return {
          configured: true,
          ran: false,
          engine: `ollama:${model}`,
          status: `HTTP_${response.status}`,
          text: '',
          error: `Local vision backend returned HTTP ${response.status}.`
        };
      }
      const payload = await response.json();
      const text = String(payload?.response || '').trim().slice(0, 12_000);
      return {
        configured: true,
        ran: true,
        engine: `ollama:${model}`,
        status: text ? 'COMPLETED' : 'NO_RESPONSE_TEXT',
        text
      };
    } catch (error) {
      return {
        configured: true,
        ran: false,
        engine: `ollama:${model}`,
        status: error.name === 'AbortError' ? 'TIMED_OUT' : 'UNAVAILABLE',
        text: '',
        error: error.message
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  static async analyzeFile(filePath, originalFilename = '', { query = '' } = {}) {
    const fileName = this.safeFilename(originalFilename || filePath);
    try {
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        return { success: false, error: { code: 'NOT_A_FILE', message: 'The supplied vision input is not a regular file.' } };
      }
      if (stats.size <= 0) {
        return { success: false, error: { code: 'EMPTY_FILE', message: 'The supplied image is empty.' } };
      }
      if (stats.size > this.maxFileBytes) {
        return {
          success: false,
          error: { code: 'FILE_TOO_LARGE', message: `The image exceeds the local ${Math.floor(this.maxFileBytes / (1024 * 1024))} MB analysis limit.` }
        };
      }

      const buffer = await fs.readFile(filePath);
      const image = this.inspectImage(buffer);
      if (!image.supported) {
        return {
          success: false,
          error: { code: 'UNSUPPORTED_IMAGE', message: 'The file signature is not a supported PNG, JPEG, GIF, BMP, TIFF, or WebP image.' },
          image
        };
      }

      const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
      const declared = this.declaredFormat(fileName);
      const warnings = [];
      if (declared && declared !== image.format) {
        warnings.push(`The filename extension declares ${declared}, but the verified file signature is ${image.format}.`);
      }
      if (!image.width || !image.height) {
        warnings.push('Image dimensions could not be read from the verified file structure.');
      }

      const ocrCapabilities = await ImageOCRParser.getCapabilities();
      const parserResult = await ImageOCRParser.parse(filePath, fileName);
      const isFallback = parserResult?.metadata?.simulation === true || !ocrCapabilities.available;
      const observedText = !isFallback && parserResult?.success
        ? String(parserResult.text || '').trim()
        : '';
      const ocrStatus = observedText
        ? 'TEXT_EXTRACTED'
        : ocrCapabilities.available
          ? 'NO_TEXT_DETECTED'
          : 'ENGINE_UNAVAILABLE';

      if (!observedText) {
        warnings.push(
          ocrCapabilities.available
            ? 'The local OCR engine returned no observed text. Metadata fallback text is intentionally excluded from the evidence.'
            : 'No local OCR engine is installed. Metadata fallback text is intentionally excluded from the evidence.'
        );
      }

      const modelResult = await this.runConfiguredVisionModel({
        imageBase64: buffer.toString('base64'),
        query,
        fileName
      });
      if (modelResult.configured && !modelResult.ran) {
        warnings.push(`Local vision-model inference did not run (${modelResult.status}).${modelResult.error ? ` ${modelResult.error}` : ''}`);
      }

      const tables = this.extractObservedTables(observedText);
      const entities = this.extractObservedEntities(observedText);
      const observations = [
        { label: 'Verified image format', value: image.format, provenance: 'observed_file_signature' },
        { label: 'Image dimensions', value: image.width && image.height ? `${image.width} × ${image.height}` : 'Unavailable', provenance: 'observed_file_structure' },
        { label: 'File size', value: `${image.byteLength} bytes`, provenance: 'observed_file_metadata' },
        { label: 'OCR status', value: ocrStatus, provenance: 'local_ocr_runtime' }
      ];

      return {
        success: true,
        source: { type: 'local_file', fileName },
        image: { ...image, sha256: checksum },
        ocr: {
          status: ocrStatus,
          engine: parserResult?.metadata?.ocrEngine || ocrCapabilities.engine,
          available: Boolean(ocrCapabilities.available),
          isSimulated: isFallback,
          confidence: parserResult?.metadata?.ocrConfidence ?? null,
          text: observedText
        },
        observations,
        inferences: modelResult.text
          ? [{ label: 'Local multimodal model analysis', value: modelResult.text, provenance: 'inferred_local_model', engine: modelResult.engine }]
          : [],
        entities,
        tables,
        verification: {
          sha256: checksum,
          fileSignatureVerified: true,
          imageFormat: image.format
        },
        capabilities: {
          ocr: { available: Boolean(ocrCapabilities.available), engine: ocrCapabilities.engine },
          localVisionModel: {
            configured: modelResult.configured,
            engine: modelResult.engine,
            status: modelResult.status,
            ran: modelResult.ran
          }
        },
        warnings
      };
    } catch (error) {
      return {
        success: false,
        error: { code: 'VISION_ANALYSIS_FAILED', message: `Local image analysis failed: ${error.message}` }
      };
    }
  }
}
