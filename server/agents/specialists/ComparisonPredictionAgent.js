import { BaseAgent } from '../BaseAgent.js';

export class ComparisonPredictionAgent extends BaseAgent {
  constructor() {
    super('ComparisonPredictionAgent', 'All', 'Hardware-Compare-Ranker');
  }

  async plan() {
    return [
      '1. Compare image features against trained hardware catalog matches',
      '2. Rank the most likely part for the user query',
      '3. Surface disagreements and empty fields instead of fabricating specs'
    ];
  }

  async execute(context) {
    const query = context.query || '';
    const features = context.analysisCard?.features || {};
    const matches = context.hardware?.matches || [];
    const top = matches[0] || null;
    const label = top?.label || {};
    const agreements = [];
    const disagreements = [];

    const compareField = (field, observed, catalogValue) => {
      if (!observed && !catalogValue) return;
      if (observed && catalogValue && String(observed).toLowerCase() === String(catalogValue).toLowerCase()) {
        agreements.push({ field, value: observed });
      } else if (observed && catalogValue) {
        disagreements.push({ field, image: observed, catalog: catalogValue });
      }
    };

    compareField('name', features.name, label.name);
    compareField('category', features.category, label.category);
    compareField('metalType', features.metalType, label.metalType);
    compareField('lifespan', features.lifespan, label.lifespan);

    const prediction = {
      name: label.name || features.name || '',
      category: label.category || features.category || '',
      metalType: label.metalType || features.metalType || '',
      lifespan: label.lifespan || features.lifespan || '',
      partType: label.partType || features.partType || '',
      confidence: top ? Math.min(0.97, 0.35 + Number(top.similarityScore || 0) + agreements.length * 0.08) : (features.confidence || 0.2),
      source: top ? 'catalog+image' : 'image-only'
    };

    const queryLower = String(query).toLowerCase();
    const queryAnswer = queryLower.includes('metal')
      ? (prediction.metalType || 'Metal type was not confirmed from catalog or image evidence.')
      : queryLower.includes('life')
        ? (prediction.lifespan || 'Service life was not confirmed from catalog or image evidence.')
        : queryLower.includes('categor')
          ? (prediction.category || 'Category was not confirmed from catalog or image evidence.')
          : prediction.name
            ? `Most likely match: ${prediction.name}${prediction.category ? ` (${prediction.category})` : ''}.`
          : 'No confident hardware match yet. Add a clearer photo or ask Admin to train more labeled images.';
    const nextAction = top && prediction.confidence >= 0.65
      ? 'Verify the catalog match against the hardware manual and any serial/marking evidence before servicing.'
      : 'Add a clearer photo with visible markings or ask Admin to train another labeled hardware image.';

    return {
      agent: this.name,
      query,
      prediction,
      agreements,
      disagreements,
      mismatches: disagreements,
      nextAction,
      rankedMatches: matches.slice(0, 5).map((match, index) => ({
        rank: index + 1,
        title: match.title,
        score: match.similarityScore,
        kind: match.kind
      })),
      answer: query
        ? `User query: ${query}\nPrediction: ${queryAnswer}\nConfidence: ${Number(prediction.confidence).toFixed(2)}`
        : queryAnswer,
      tokensUsed: Math.max(1, Math.ceil((query.length + JSON.stringify(prediction).length) / 4))
    };
  }

  async validate(result) {
    return {
      isValid: Boolean(result.prediction),
      confidence: result.prediction?.confidence || 0.2,
      notes: result.disagreements?.length
        ? 'Prediction includes disagreements between image findings and catalog labels.'
        : 'Prediction aligned with available catalog and image evidence.'
    };
  }
}
