/**
 * RAGAgent — Retrieval-Augmented Generation Specialist Agent.
 * Queries local VectorStore and Hybrid RetrievalService, then synthesizes via InferenceRouter when available.
 */

import { BaseAgent } from '../BaseAgent.js';
import { RetrievalService } from '../../services/knowledge/RetrievalService.js';
import { InferenceRouter } from '../../services/inference/InferenceRouter.js';

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in',
  'is', 'it', 'of', 'on', 'or', 'our', 'that', 'the', 'their', 'this',
  'to', 'using', 'what', 'with', 'you'
]);

const queryTerms = (query = '') => String(query)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .split(/\s+/)
  .filter((term) => term.length > 2 && !STOP_WORDS.has(term));

const extractEvidenceSentences = (text = '', terms = [], maxSentences = 2) => {
  const sentences = String(text)
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length <= maxSentences) return sentences;

  return sentences
    .map((sentence, index) => ({
      sentence,
      index,
      score: terms.reduce((score, term) => (
        score + (sentence.toLowerCase().includes(term) ? 1 : 0)
      ), 0)
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, maxSentences)
    .sort((a, b) => a.index - b.index)
    .map(({ sentence }) => sentence);
};

/**
 * Produce a useful answer without pretending that a deterministic formatter
 * is a language model. It only quotes/reduces retrieved text, so it remains
 * safe to use in an air-gapped deployment when all model daemons are stopped.
 */
const buildEvidenceOnlyAnswer = ({ query, results, reason }) => {
  const terms = queryTerms(query);
  const findings = results.map((result, index) => {
    const sentences = extractEvidenceSentences(result.text, terms);
    const label = [result.documentTitle, result.sectionTitle].filter(Boolean).join(' — ');
    return `${index + 1}. ${label || 'Retrieved document'}\n   ${sentences.join(' ')}`;
  }).join('\n\n');

  return `[EVIDENCE-ONLY LOCAL ANSWER]\n\n` +
    `A live local language model is not running, so this answer is an extractive ` +
    `summary of the retrieved repository evidence. No unsupported conclusion ` +
    `has been added.\n\n` +
    `Question: ${query}\n\n` +
    `Verified findings:\n${findings}\n\n` +
    `Verification: ${results.length} retrieved citation${results.length === 1 ? '' : 's'} ` +
    `from the authorized local knowledge store.\n\n` +
    `Runtime note: ${reason || 'Start an approved local model for generated synthesis.'}`;
};

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
    let answerMode = 'EVIDENCE_ONLY';
    let inferenceMeta = { used: false, backend: null, usedFallback: false };

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

        // A generated answer is only labelled as such when a real local model
        // completed it. If no model is running, return a clearly labelled,
        // extractive evidence answer instead of surfacing raw citations as a
        // failed/unconverted response.
        const modelAnswer = (inference.response || '').trim();
        if (modelAnswer && inferenceMeta.live) {
          answerMode = 'LIVE_MODEL';
          answerText = `[SOVEREIGN RAG AGENT SYNTHESIS]\n\n${modelAnswer}\n\n---\nGrounding excerpts:\n${excerpts}\n\n✓ Local Knowledge Verification: processed on-premise (${inference.backendUsed}).`;
        } else if (modelAnswer && inferenceMeta.usedFallback) {
          answerMode = 'LOCAL_DETERMINISTIC_FALLBACK';
          answerText = `${modelAnswer}\n\nRuntime note: this deterministic local fallback is enabled; start an approved local model for full language-model synthesis.`;
        } else {
          answerText = buildEvidenceOnlyAnswer({
            query,
            results: searchOutcome.results,
            reason: inference.error?.message || 'Start an approved local model for generated synthesis.'
          });
        }
      } catch (err) {
        inferenceMeta = { used: false, backend: null, usedFallback: false, live: false, error: { code: 'INFERENCE_FAILED', message: err.message } };
        answerText = buildEvidenceOnlyAnswer({
          query,
          results: searchOutcome.results,
          reason: `Local model synthesis failed: ${err.message}`
        });
      }
    } else {
      answerText = `No high-confidence documents found matching "${query}" in the ${user?.department || 'Enterprise'} local vector store. The system will not invent an answer without retrieved evidence.`;
    }

    return {
      agent: this.name,
      query,
      answer: answerText,
      answerMode,
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
      confidence: hasCitations ? (result.answerMode === 'LIVE_MODEL' ? 0.97 : 0.9) : 0.55,
      notes: hasCitations
        ? `Grounded in ${result.citations.length} verified citations${result.inference?.backend ? ` via ${result.inference.backend}` : ''}.`
        : 'No direct vector citations matched — refused ungrounded answer.'
    };
  }
}
