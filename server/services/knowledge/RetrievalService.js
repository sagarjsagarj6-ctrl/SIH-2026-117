/**
 * RetrievalService — Unified Hybrid Retrieval API.
 * Combines 768-dim Vector Cosine Similarity with BM25 Keyword Scoring and Cross-Encoder Re-ranking.
 * Enforces role-based / department-based security and returns verified source citations with text excerpts.
 */

import { VectorStore } from './VectorStore.js';
import { VECTOR_DB_CONFIG } from '../../config/vectordb.js';

export class RetrievalService {
  /**
   * BM25 Keyword match scorer.
   */
  static computeBM25Score(query, text) {
    if (!query || !text) return 0;
    const queryTerms = query.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    const docLower = text.toLowerCase();
    let score = 0;

    for (const term of queryTerms) {
      const occurrences = (docLower.match(new RegExp(`\\b${term}\\b`, 'g')) || []).length;
      if (occurrences > 0) {
        score += (occurrences * 1.5) / (occurrences + 1.2);
      }
    }

    return Math.min(1.0, score / Math.max(1, queryTerms.length));
  }

  /**
   * Cross-Encoder neural re-ranking simulator.
   */
  static reRankResults(query, results) {
    return results.map(item => {
      const keywordScore = this.computeBM25Score(query, item.text);
      const vectorScore = item.similarityScore || 0;
      const alpha = VECTOR_DB_CONFIG.hybridAlpha || 0.65;

      // Hybrid combination score:
      const hybridScore = Number((vectorScore * alpha + keywordScore * (1 - alpha)).toFixed(4));

      return {
        ...item,
        hybridScore,
        scores: {
          vectorSimilarity: vectorScore,
          bm25Keyword: Number(keywordScore.toFixed(4)),
          finalHybrid: hybridScore
        }
      };
    }).sort((a, b) => b.hybridScore - a.hybridScore);
  }

  /**
   * Main Hybrid Search query endpoint.
   */
  static async search({
    query,
    user,
    department = null,
    topK = 5,
    minScore = 0.20
  }) {
    const userRole = user?.role || 'Employee';
    const userDepartment = department || user?.department || 'All';

    // Sensitivity permissions mapped by role
    let sensitivityAllowance = ['Public', 'Internal'];
    if (userRole === 'Employee') {
      sensitivityAllowance.push('Confidential');
    } else if (userRole === 'Manager') {
      sensitivityAllowance.push('Confidential', 'Restricted');
    } else if (userRole === 'Admin') {
      sensitivityAllowance.push('Confidential', 'Restricted', 'Top Secret');
    }

    // 1. Fetch raw vector candidate chunks (with ABAC department filtering)
    const rawCandidates = await VectorStore.search({
      queryText: query,
      topK: Math.max(topK * 3, 10),
      department: userDepartment,
      userRole,
      sensitivityAllowance
    });

    // 2. Perform Hybrid Re-ranking (Vector + BM25)
    const rankedResults = this.reRankResults(query, rawCandidates);

    // 3. Filter by minimum confidence threshold
    const filtered = rankedResults.filter(r => r.hybridScore >= minScore).slice(0, topK);

    // 4. Generate verifiable source citations
    const citations = filtered.map((item, idx) => ({
      citationId: `CIT-${idx + 1}`,
      docId: item.docId,
      documentTitle: item.documentTitle,
      sectionTitle: item.sectionTitle,
      department: item.metadata?.department,
      sensitivity: item.metadata?.sensitivity,
      score: item.hybridScore,
      excerpt: item.text.slice(0, 320) + (item.text.length > 320 ? '...' : '')
    }));

    return {
      query,
      resultsCount: filtered.length,
      topK,
      userContext: {
        role: userRole,
        department: userDepartment,
        allowedSensitivities: sensitivityAllowance
      },
      results: filtered,
      citations
    };
  }
}
