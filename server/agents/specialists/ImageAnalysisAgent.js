import { BaseAgent } from '../BaseAgent.js';

const METAL_TERMS = ['steel', 'stainless', 'aluminum', 'aluminium', 'copper', 'brass', 'bronze', 'titanium', 'iron', 'alloy', 'zinc', 'nickel'];
const CATEGORY_TERMS = ['bearing', 'motor', 'pump', 'valve', 'gear', 'fastener', 'bolt', 'sensor', 'cable', 'housing', 'blade', 'filter', 'connector', 'panel'];

const firstMatch = (text, terms) => {
  const lower = String(text || '').toLowerCase();
  return terms.find((term) => lower.includes(term)) || '';
};

const lifespanFrom = (text) => {
  const match = String(text || '').match(/(\d+(?:\.\d+)?)\s*(years?|yrs?|months?|hours?|hrs?)/i);
  return match ? `${match[1]} ${match[2].toLowerCase()}` : '';
};

export class ImageAnalysisAgent extends BaseAgent {
  constructor() {
    super('ImageAnalysisAgent', 'All', 'Qwen2-VL-7B-Instruct');
  }

  async plan() {
    return [
      '1. Read verified image metadata and local OCR/VLM observations',
      '2. Extract structured features: category, name, metal, lifespan, markings',
      '3. Leave unknown fields empty instead of inventing specifications'
    ];
  }

  async execute(context) {
    const analysis = context.analysis || {};
    const catalogHits = Array.isArray(context.catalogHits) ? context.catalogHits : [];
    const topLabel = catalogHits.find((hit) => hit.kind === 'labeled-image')?.label || {};
    const observedText = [
      analysis.ocr?.text || '',
      (analysis.inferences || []).map((item) => item.value).join(' ')
    ].join(' ');
    const features = {
      category: topLabel.category || firstMatch(observedText, CATEGORY_TERMS),
      name: topLabel.name || firstMatch(observedText, CATEGORY_TERMS) || (observedText ? observedText.split(/[\n,.]/)[0].slice(0, 80) : ''),
      partType: topLabel.partType || firstMatch(observedText, CATEGORY_TERMS),
      metalType: topLabel.metalType || firstMatch(observedText, METAL_TERMS),
      lifespan: topLabel.lifespan || lifespanFrom(observedText),
      manufacturer: '',
      modelNumber: '',
      condition: analysis.ocr?.text ? 'Observed from image evidence' : 'Image metadata only — no OCR text',
      markings: analysis.entities || [],
      dimensions: analysis.image?.width && analysis.image?.height ? `${analysis.image.width} × ${analysis.image.height}` : '',
      fileName: context.fileName || analysis.source?.fileName || '',
      imageFormat: analysis.image?.format || '',
      confidence: catalogHits[0]?.similarityScore || (analysis.ocr?.text ? 0.45 : 0.2),
      warnings: analysis.warnings || []
    };

    const keyFindings = Object.entries(features)
      .filter(([, value]) => value && value !== '[]' && !(Array.isArray(value) && !value.length))
      .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);

    return {
      agent: this.name,
      query: context.query,
      features,
      keyFindings,
      ocrStatus: analysis.ocr?.status || 'NOT_RUN',
      observations: analysis.observations || [],
      inferences: analysis.inferences || [],
      verification: analysis.verification || {},
      answer: keyFindings.length
        ? `Image findings:\n${keyFindings.join('\n')}`
        : 'The image was inspected but no structured hardware features could be confirmed from local evidence.',
      tokensUsed: Math.max(1, Math.ceil(JSON.stringify(features).length / 4))
    };
  }

  async validate(result) {
    const filled = ['name', 'category', 'metalType', 'lifespan'].filter((key) => result.features?.[key]).length;
    return {
      isValid: true,
      confidence: Math.min(0.95, 0.25 + filled * 0.15),
      notes: filled ? 'Structured features extracted from observed image evidence and labeled catalog evidence.' : 'Limited visual evidence; unspecified fields were left empty.'
    };
  }
}
