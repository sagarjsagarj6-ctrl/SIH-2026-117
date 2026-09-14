import { BaseAgent } from '../BaseAgent.js';

export class HardwareManualAgent extends BaseAgent {
  constructor() {
    super('HardwareManualAgent', 'All', 'Hardware-Manual-Catalog');
  }

  async plan() {
    return [
      '1. Search the Admin-trained hardware manual and labeled-image catalog',
      '2. Rank parts by overlap with the user query and any observed image text',
      '3. Return only catalog-backed specifications (name, metal, lifespan, type)'
    ];
  }

  async execute(context) {
    const hits = Array.isArray(context.catalogHits) ? context.catalogHits : [];
    const matches = hits.map((hit) => ({
      title: hit.title,
      kind: hit.kind,
      similarityScore: hit.similarityScore,
      excerpt: String(hit.text || '').slice(0, 480),
      label: hit.label || null
    }));
    return {
      agent: this.name,
      query: context.query,
      matchCount: matches.length,
      matches,
      answer: matches.length
        ? `Catalog returned ${matches.length} hardware match${matches.length === 1 ? '' : 'es'} from trained manuals and labeled images.`
        : 'No catalog passage matched the query. Train additional manuals or labeled images, or refine the query.',
      tokensUsed: Math.max(1, Math.ceil(JSON.stringify(matches).length / 4))
    };
  }

  async validate(result) {
    return {
      isValid: true,
      confidence: result.matchCount ? Math.min(0.96, 0.4 + result.matches[0].similarityScore) : 0.2,
      notes: result.matchCount ? 'Catalog matches are evidence-backed.' : 'No catalog evidence was retrieved.'
    };
  }
}
