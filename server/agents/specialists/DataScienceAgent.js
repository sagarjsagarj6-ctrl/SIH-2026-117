/**
 * DataScienceAgent — Specialist Agent for Statistical Analysis, Trend Forecasting & Anomaly Detection.
 * Prefers numeric series extracted from the user query or upstream agent context.
 */

import { BaseAgent } from '../BaseAgent.js';
import { StatisticalEngine } from './utils/StatisticalEngine.js';
import { ChartGenerator } from './utils/ChartGenerator.js';
import { InferenceRouter } from '../../services/inference/InferenceRouter.js';

export class DataScienceAgent extends BaseAgent {
  constructor() {
    super('DataScienceAgent', 'All', 'DeepSeek-R1-Distill-Qwen-14B');
  }

  /**
   * Extract numeric series from free text (query or upstream RAG excerpts).
   */
  static extractSeriesFromText(text = '') {
    if (!text || typeof text !== 'string') return [];

    const currencyOrPlain = text.match(/(?:₹|\$|INR|USD)?\s*-?\d+(?:,\d{3})*(?:\.\d+)?/gi) || [];
    const numbers = currencyOrPlain
      .map((raw) => Number(String(raw).replace(/[₹$,\s]|INR|USD/gi, '')))
      .filter((n) => Number.isFinite(n) && Math.abs(n) < 1e12);

    // Prefer sequences of 3+ numbers when present
    if (numbers.length >= 3) return numbers;

    // Explicit "series: a, b, c" pattern
    const seriesMatch = text.match(/series[:\s]+([\d\s,.-]+)/i);
    if (seriesMatch) {
      return seriesMatch[1]
        .split(/[\s,]+/)
        .map((v) => Number(v))
        .filter((n) => Number.isFinite(n));
    }

    return numbers.length >= 2 ? numbers : [];
  }

  static extractFromUpstream(inputContext = []) {
    const blobs = [];
    for (const msg of inputContext) {
      const result = msg?.payload?.result;
      if (!result) continue;
      if (result.answer) blobs.push(result.answer);
      if (result.summary) blobs.push(result.summary);
      if (result.ocrResult?.extractedText) blobs.push(result.ocrResult.extractedText);
      if (Array.isArray(result.rawResults)) {
        blobs.push(result.rawResults.map((r) => r.text).join('\n'));
      }
    }
    return this.extractSeriesFromText(blobs.join('\n'));
  }

  async plan(context) {
    return [
      '1. Parse query numerical values and departmental operational indicators',
      '2. Compute descriptive statistics (mean, median, variance, std dev)',
      '3. Execute IQR and Z-score anomaly detection to identify statistical outliers',
      '4. Compute linear regression trajectory and forecast next interval',
      '5. Generate Chart.js compatible telemetry payloads'
    ];
  }

  async execute(context) {
    const { query, user, inputContext = [], dataset } = context;
    const department = user?.department || 'Operations';

    let rawSeries = [];
    let dataSource = 'query';

    if (Array.isArray(dataset) && dataset.length >= 2) {
      rawSeries = dataset.map(Number).filter((n) => Number.isFinite(n));
      dataSource = 'dataset_parameter';
    }

    if (rawSeries.length < 2) {
      rawSeries = DataScienceAgent.extractSeriesFromText(query);
      dataSource = 'query_numbers';
    }

    if (rawSeries.length < 2) {
      rawSeries = DataScienceAgent.extractFromUpstream(inputContext);
      dataSource = 'upstream_context';
    }

    let labels;
    if (rawSeries.length < 2) {
      // Explicit fallback sample — labeled so callers know it is not user data
      dataSource = 'department_sample_fallback';
      if (department.includes('Finance')) {
        rawSeries = [840, 890, 860, 920, 915, 960, 1250, 980, 1020, 1050];
        labels = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10'];
      } else {
        rawSeries = [120, 142, 138, 155, 148, 162, 159, 210, 165, 172];
        labels = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10'];
      }
    } else {
      labels = rawSeries.map((_, i) => `P${i + 1}`);
    }

    const stats = StatisticalEngine.computeDescriptive(rawSeries);
    const iqrAnomalies = StatisticalEngine.detectAnomaliesIQR(rawSeries);
    const zScoreAnomalies = StatisticalEngine.detectAnomaliesZScore(rawSeries, 1.8);
    const regression = StatisticalEngine.computeLinearRegression(rawSeries);

    const lineChart = ChartGenerator.generateLineChart({
      title: `${department} Operational Trajectory & Forecast`,
      labels,
      seriesName: `${department} Metric Throughput`,
      data: rawSeries,
      forecastValue: regression.forecastNext
    });

    const anomalyChart = ChartGenerator.generateAnomalyChart({
      title: `${department} Anomaly Detection Distribution`,
      labels,
      values: rawSeries,
      outliers: iqrAnomalies.outliers
    });

    const sourceNote = dataSource === 'department_sample_fallback'
      ? `No numeric series found in query/context — using labeled ${department} sample series.`
      : `Series sourced from ${dataSource} (${rawSeries.length} points).`;

    const summary = `${sourceNote} Statistical analysis of ${stats.count} data points for ${department} completed. ` +
      `Mean: ${stats.mean}, StdDev: ${stats.stdDev}. Identified ${iqrAnomalies.outliers.length} statistical anomaly (values: ${iqrAnomalies.outliers.join(', ') || 'none'}). ` +
      `Estimated trajectory is ${regression.trendDirection} (R² = ${regression.r2}), with next period projection at ${regression.forecastNext}.`;

    const anomalyRatePct = stats.count
      ? Number(((iqrAnomalies.outliers.length / stats.count) * 100).toFixed(2))
      : 0;

    let inference = { used: false, usedFallback: true, backend: null };
    let modelNarrative = '';
    try {
      const inferenceResult = await InferenceRouter.infer({
        model: this.defaultModel,
        role: 'DATA_SCIENCE',
        query: 'Explain the computed statistics and anomalies in concise business language. Do not invent values.',
        context: JSON.stringify({ department, dataSource, series: rawSeries, statistics: stats, anomalies: iqrAnomalies, regression })
      });
      inference = {
        used: true,
        backend: inferenceResult.backendUsed,
        usedFallback: inferenceResult.usedFallback,
        metrics: inferenceResult.metrics
      };
      if (!inferenceResult.usedFallback) modelNarrative = inferenceResult.response;
    } catch (error) {
      inference = { used: false, usedFallback: true, backend: null, error: error.message };
    }

    return {
      agent: this.name,
      query,
      summary,
      dataSource,
      inference,
      modelNarrative,
      series: rawSeries,
      statistics: stats,
      anomalies: {
        iqr: iqrAnomalies,
        zScore: zScoreAnomalies
      },
      regression,
      charts: {
        trendLine: lineChart,
        anomalyBar: anomalyChart
      },
      // Compatibility fields for EmployeeWorkspace /query consumers
      metrics: {
        totalRecordsAnalyzed: stats.count,
        anomalyRatePct,
        confidenceScore: dataSource === 'department_sample_fallback' ? 0.72 : 0.96,
        meanResponseTimeMs: null,
        mean: stats.mean,
        stdDev: stats.stdDev
      },
      chartData: {
        title: lineChart.title,
        labels: labels.slice(0, Math.min(4, labels.length)),
        series: [
          { name: 'Observed', data: rawSeries.slice(0, Math.min(4, rawSeries.length)) }
        ]
      },
      insights: [
        sourceNote,
        `Mean=${stats.mean}, median=${stats.median}, max=${stats.max}.`,
        iqrAnomalies.outliers.length
          ? `Outliers detected: ${iqrAnomalies.outliers.join(', ')}.`
          : 'No IQR outliers detected in the analyzed series.'
      ],
      tokensUsed: 160 + rawSeries.length * 4
    };
  }

  async validate(result) {
    const hasStats = result.statistics && result.statistics.count > 0;
    return {
      isValid: hasStats,
      confidence: result.dataSource === 'department_sample_fallback' ? 0.72 : 0.95,
      notes: hasStats
        ? `Computed over ${result.statistics.count} points from ${result.dataSource}.`
        : 'No numeric series available.'
    };
  }
}
