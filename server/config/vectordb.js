/**
 * Local Vector Database Configuration
 * Configures local vector embedding dimensions, storage paths, and ANN indexing.
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const VECTOR_DB_CONFIG = {
  dimension: 768, // Default NVIDIA NeMo / BERT embedding vector dimensions
  similarityMetric: 'cosine', // cosine | euclidean | dot
  storagePath: path.resolve(__dirname, '../data/vectordb'),
  defaultTopK: 5,
  maxTopK: 25,
  minSimilarityThreshold: 0.25,
  hybridAlpha: 0.65, // 0.65 vector similarity weight + 0.35 BM25 keyword weight
  chunking: {
    defaultChunkSize: 512,
    overlapSize: 64,
    maxChunkSize: 1024,
    strategy: 'semantic',
    preserveHeaders: true
  }
};
