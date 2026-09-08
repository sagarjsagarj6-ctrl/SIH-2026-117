/**
 * ChunkingEngine — Segmenting documents into token-optimized chunks with metadata headers and source tagging.
 */

import { ChunkingStrategies } from './ChunkingStrategies.js';
import { VECTOR_DB_CONFIG } from '../../config/vectordb.js';

export class ChunkingEngine {
  static estimateTokenCount(text) {
    if (!text) return 0;
    // Standard rule-of-thumb: 1 token ~= 4 characters / 0.75 words
    return Math.ceil(text.length / 4);
  }

  static chunkDocument({
    docId,
    title,
    text,
    department,
    sensitivity,
    category,
    strategy = 'semantic',
    chunkSize = 512, // approx tokens
    overlapSize = 64
  }) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const maxChars = chunkSize * 4;
    const overlapChars = overlapSize * 4;

    let textSlices = [];

    switch (strategy) {
      case 'sentence':
        textSlices = ChunkingStrategies.sentenceSplit(text, maxChars, overlapChars);
        break;
      case 'paragraph':
        textSlices = ChunkingStrategies.paragraphSplit(text, maxChars, overlapChars);
        break;
      case 'sliding_window':
        textSlices = ChunkingStrategies.slidingWindow(text, maxChars, maxChars - overlapChars);
        break;
      case 'semantic':
      default:
        textSlices = ChunkingStrategies.semanticSplit(text, maxChars, overlapChars, true);
        break;
    }

    const totalChunks = textSlices.length;

    return textSlices.map((chunkText, index) => {
      // Extract first line or header for section title
      const firstLine = chunkText.split('\n')[0].replace(/^[#\-=\s]+/, '').slice(0, 80);
      const tokenCount = this.estimateTokenCount(chunkText);

      return {
        chunkId: `${docId}_chunk_${index + 1}`,
        docId,
        documentTitle: title,
        chunkIndex: index + 1,
        totalChunks,
        sectionTitle: firstLine || `Section ${index + 1}`,
        text: chunkText,
        tokenCount,
        metadata: {
          department,
          sensitivity,
          category,
          strategy,
          indexedAt: new Date().toISOString()
        }
      };
    });
  }
}
