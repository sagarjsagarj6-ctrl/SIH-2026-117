/**
 * ChunkingStrategies — Strategy patterns for document text segmentation:
 * 1. Sentence-boundary chunking
 * 2. Paragraph-boundary chunking
 * 3. Sliding-window chunking
 * 4. Semantic header-aware recursive chunking
 */

export class ChunkingStrategies {
  // Strategy 1: Paragraph-based splitting
  static paragraphSplit(text, maxChars = 1500, overlapChars = 200) {
    const rawParagraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const chunks = [];
    let currentChunk = '';

    for (const para of rawParagraphs) {
      if ((currentChunk + '\n\n' + para).length > maxChars && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        // keep overlap from end of currentChunk
        const overlap = currentChunk.slice(-overlapChars);
        currentChunk = overlap + '\n\n' + para;
      } else {
        currentChunk = currentChunk ? currentChunk + '\n\n' + para : para;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  // Strategy 2: Sentence-boundary splitting
  static sentenceSplit(text, maxChars = 1000, overlapChars = 150) {
    const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text];
    const chunks = [];
    let current = '';

    for (const sentence of sentences) {
      if ((current + sentence).length > maxChars && current.length > 0) {
        chunks.push(current.trim());
        const overlap = current.slice(-overlapChars);
        current = overlap + ' ' + sentence;
      } else {
        current += (current ? ' ' : '') + sentence;
      }
    }

    if (current.trim()) {
      chunks.push(current.trim());
    }

    return chunks;
  }

  // Strategy 3: Sliding window splitting
  static slidingWindow(text, windowChars = 1000, stepChars = 750) {
    const chunks = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + windowChars, text.length);
      const slice = text.slice(start, end).trim();
      if (slice) {
        chunks.push(slice);
      }
      if (end >= text.length) break;
      start += stepChars;
    }

    return chunks;
  }

  // Strategy 4: Semantic section header-aware splitting (Default)
  static semanticSplit(text, maxChars = 1200, overlapChars = 180, preserveHeaders = true) {
    const sections = text.split(/(?=^#{1,4}\s|^---|^===)/gm).filter(s => s.trim().length > 0);
    const chunks = [];

    for (const section of sections) {
      if (section.length <= maxChars) {
        chunks.push(section.trim());
      } else {
        // Recursive paragraph split inside section
        const subChunks = this.paragraphSplit(section, maxChars, overlapChars);
        chunks.push(...subChunks);
      }
    }

    return chunks.length > 0 ? chunks : [text.trim()];
  }
}
