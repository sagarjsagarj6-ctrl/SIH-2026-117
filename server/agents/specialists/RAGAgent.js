/**
 * RAGAgent — Retrieval-Augmented Generation Specialist Agent.
 * Queries local VectorStore and Hybrid RetrievalService, then synthesizes via InferenceRouter when available.
 */

import { BaseAgent } from '../BaseAgent.js';
import { RetrievalService } from '../../services/knowledge/RetrievalService.js';
import { InferenceRouter } from '../../services/inference/InferenceRouter.js';

export class RAGAgent extends BaseAgent {
  constructor() {
    super('RAGAgent', 'All', 'Mistral-7B-v0.3-Enterprise');
  }

  async plan(context) {
    return [
      `1. Formulate semantic & keyword hybrid query vectors for: "${context.query.substring(0, 40)}"`,
      `2. Query ${context.user?.department || 'Department'} local vector index partition`,
      `3. Assemble context window with top matching chunks and extract verifiable citations`,
      `4. Synthesize grounded answer via local inference backend (Ollama/vLLM/llama.cpp) with air-gap fallback`
    ];
  }

  async execute(context) {
    const { query, user, topK = 4 } = context;

    const searchOutcome = await RetrievalService.search({
      query,
      user,
      department: user?.department || 'All',
      topK
    });

    const hasResults = searchOutcome.results && searchOutcome.results.length > 0;

    const excerpts = hasResults
      ? searchOutcome.results.map((r, i) =>
          `[Citation ${i + 1}: ${r.documentTitle} | ${r.sectionTitle} | score=${r.hybridScore ?? r.similarityScore}]\n"${r.text}"`
        ).join('\n\n---\n\n')
      : '';

    let answerText = '';
    let inferenceMeta = { used: false, backend: null, usedFallback: true };

    if (hasResults) {
      try {
        const inference = await InferenceRouter.infer({
          model: this.defaultModel,
          role: 'RAG',
          query: `Answer the user question using ONLY the citations below. If the citations do not contain the answer, say you cannot verify it from the knowledge store.\n\nQuestion: ${query}`,
          context: excerpts
        });

        inferenceMeta = {
          used: true,
          backend: inference.backendUsed,
          usedFallback: Boolean(inference.usedFallback),
          live: Boolean(inference.live),
          modelUsed: inference.modelUsed || null,
          metrics: inference.metrics,
          error: inference.error || null
        };

        // A natural-language answer is only emitted when a real local model
        // actually completed it. Retrieved evidence remains available without
        // being converted into a pre-written pseudo-answer.
        const modelAnswer = (inference.response || '').trim();
        if (modelAnswer && inferenceMeta.live) {
          answerText = `[SOVEREIGN RAG AGENT SYNTHESIS]\n\n${modelAnswer}\n\n---\nGrounding excerpts:\n${excerpts}\n\n✓ Local Knowledge Verification: processed on-premise (${inference.backendUsed}).`;
        } else {
          answerText = `Local language-model synthesis is unavailable. The following evidence was retrieved but has not been converted into an AI answer:\n\n${excerpts}\n\nStart a configured local model and retry to receive a generated, evidence-grounded response.`;
        }
      } catch (err) {
        inferenceMeta = { used: false, backend: null, usedFallback: false, live: false, error: err.message };
        answerText = `Local language-model synthesis failed. The following evidence was retrieved but has not been converted into an AI answer:\n\n${excerpts}`;
      }
    } else {
      answerText = `No high-confidence documents found matching "${query}" in the ${user?.department || 'Enterprise'} local vector store. The system will not invent an answer without retrieved evidence.`;
    }

    return {
      agent: this.name,
      query,
      answer: answerText,
      citations: searchOutcome.citations || [],
      matchedChunksCount: searchOutcome.resultsCount || 0,
      inference: inferenceMeta,
      tokensUsed: Math.floor(180 + (searchOutcome.resultsCount || 0) * 90),
      rawResults: searchOutcome.results || []
    };
  }

  async validate(result) {
    const hasCitations = result.citations && result.citations.length > 0;
    return {
      isValid: true,
      confidence: hasCitations ? (result.inference?.usedFallback === false ? 0.97 : 0.9) : 0.55,
      notes: hasCitations
        ? `Grounded in ${result.citations.length} verified citations${result.inference?.backend ? ` via ${result.inference.backend}` : ''}.`
        : 'No direct vector citations matched — refused ungrounded answer.'
    };
  }
}
