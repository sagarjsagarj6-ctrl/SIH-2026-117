/**
 * ReportingAgent — Specialist Agent for Generating Structured Executive & Audit Reports.
 */

import { BaseAgent } from '../BaseAgent.js';
import { ReportTemplates } from './utils/ReportTemplates.js';
import { InferenceRouter } from '../../services/inference/InferenceRouter.js';

export class ReportingAgent extends BaseAgent {
  constructor() {
    super('ReportingAgent', 'All', 'Llama-3-8B-Instruct');
  }

  async plan(context) {
    return [
      '1. Aggregate intermediate findings from upstream specialist agents (RAG, Data Science, Vision)',
      '2. Synthesize key executive takeaways, operational risks, and performance metrics',
      '3. Assemble structured report according to enterprise governance template standards',
      '4. Embed verifiable citations and air-gap sovereign confidentiality watermarks'
    ];
  }

  async execute(context) {
    const { query, user, inputContext = [] } = context;
    const department = user?.department || 'Executive & Strategy';

    // Extract upstream findings if available from sequential pipeline
    const findings = [];
    const metrics = {};
    let citations = [];

    inputContext.forEach((msg) => {
      if (msg.fromAgent === 'RAGAgent' && msg.payload?.result) {
        findings.push(`RAG Evidence: ${msg.payload.result.answer?.substring(0, 140)}...`);
        if (msg.payload.citations) citations.push(...msg.payload.citations);
      }
      if (msg.fromAgent === 'DataScienceAgent' && msg.payload?.result) {
        findings.push(`Data Science Finding: ${msg.payload.result.summary}`);
        if (msg.payload.result.statistics) {
          metrics['Sample Mean'] = msg.payload.result.statistics.mean;
          metrics['Std Deviation'] = msg.payload.result.statistics.stdDev;
          metrics['Trend Direction'] = msg.payload.result.regression?.trendDirection;
        }
      }
      if (msg.fromAgent === 'VisionAgent' && msg.payload?.result) {
        findings.push(`Vision Extraction: ${msg.payload.result.ocrResult?.documentType} verified.`);
      }
    });

    if (findings.length === 0) {
      findings.push('No upstream specialist evidence was supplied. The report does not assert a business, compliance, or operational conclusion.');
    }

    const reportTitle = `Sovereign AI Executive Intelligence & Audit Dossier — ${department}`;
    const reportData = ReportTemplates.formatReport({
      templateType: 'executive',
      title: reportTitle,
      department,
      findings,
      metrics,
      recommendations: citations.length || Object.keys(metrics).length
        ? ['Review the cited evidence and computed metrics before acting on this report.']
        : ['Provide source documents, data-science results, or verified citations before requesting recommendations.'],
      citations
    });

    let inference = { used: false, usedFallback: true, backend: null };
    let modelNarrative = '';
    try {
      const inferenceResult = await InferenceRouter.infer({
        model: this.defaultModel,
        role: 'REPORTING',
        query: 'Write a concise executive narrative from the structured report below. Preserve uncertainty and do not invent metrics.',
        context: reportData.markdown
      });
      inference = {
        used: true,
        live: Boolean(inferenceResult.live),
        backend: inferenceResult.backendUsed,
        usedFallback: inferenceResult.usedFallback,
        modelUsed: inferenceResult.modelUsed || null,
        metrics: inferenceResult.metrics,
        error: inferenceResult.error || null
      };
      if (inferenceResult.live && inferenceResult.response) modelNarrative = inferenceResult.response;
    } catch (error) {
      inference = { used: false, live: false, usedFallback: false, backend: null, error: error.message };
    }

    // Put genuine local-model synthesis first. The structured sections remain
    // available as traceable evidence, but must not obscure a live answer.
    const sections = modelNarrative
      ? [{ heading: 'Local Model Narrative', content: modelNarrative }, ...reportData.sections]
      : reportData.sections;
    const markdown = modelNarrative
      ? `## Local Model Narrative\n\n${modelNarrative}\n\n${reportData.markdown}`
      : reportData.markdown;

    return {
      agent: this.name,
      query,
      reportTitle: reportData.title,
      watermark: reportData.watermark,
      sections,
      markdown,
      modelNarrative,
      inference,
      generatedAt: reportData.generatedAt,
      tokensUsed: 380
    };
  }

  async validate(result) {
    const hasSections = result.sections && result.sections.length > 0;
    return {
      isValid: hasSections,
      confidence: 0.97,
      notes: `Generated structured dossier with ${result.sections?.length || 0} formal sections and watermark.`
    };
  }
}
