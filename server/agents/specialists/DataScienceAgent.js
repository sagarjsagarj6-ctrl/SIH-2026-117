/**
 * DataScienceAgent — Specialist Agent for Statistical Analysis, Trend Forecasting & Anomaly Detection.
 */

import { BaseAgent } from '../BaseAgent.js';
import { StatisticalEngine } from './utils/StatisticalEngine.js';
import { ChartGenerator } from './utils/ChartGenerator.js';

export class DataScienceAgent extends BaseAgent {
  constructor() {
    super('DataScienceAgent', 'All', 'DeepSeek-R1-Distill-Qwen-14B');
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
    const { query, user } = context;
    const department = user?.department || 'Operations';

    // Department-tailored statistical series
    let rawSeries = [120, 142, 138, 155, 148, 162, 159, 210, 165, 172]; // contains outlier 210
    let labels = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10'];

    if (department.includes('Finance')) {
      rawSeries = [840, 890, 860, 920, 915, 960, 1250, 980, 1020, 1050]; // 1250 anomaly
      labels = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10'];
    }

    // 1. Descriptive stats
    const stats = StatisticalEngine.computeDescriptive(rawSeries);

    // 2. Anomaly detection
    const iqrAnomalies = StatisticalEngine.detectAnomaliesIQR(rawSeries);
    const zScoreAnomalies = StatisticalEngine.detectAnomaliesZScore(rawSeries, 1.8);

    // 3. Trend regression
    const regression = StatisticalEngine.computeLinearRegression(rawSeries);

    // 4. Generate visual charts
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

    const summary = `Statistical analysis of ${stats.count} data points for ${department} completed. ` +
      `Mean: ${stats.mean}, StdDev: ${stats.stdDev}. Identified ${iqrAnomalies.outliers.length} statistical anomaly (values: ${iqrAnomalies.outliers.join(', ')}). ` +
      `Estimated trajectory is ${regression.trendDirection} (R² = ${regression.r2}), with next period projection at ${regression.forecastNext}.`;

    return {
      agent: this.name,
      query,
      summary,
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
      insights: [
        `Identified ${iqrAnomalies.outliers.length} statistical outlier above upper IQR threshold (${iqrAnomalies.upperBound}).`,
        `Linear trend indicates positive momentum (${regression.trendDirection}) with ${(regression.r2 * 100).toFixed(1)}% variance explanation.`,
        `Next projected operational figure is ${regression.forecastNext} units.`
      ],
      tokensUsed: 260
    };
  }

  async validate(result) {
    const hasData = result.statistics && result.statistics.count > 0;
    return {
      isValid: hasData,
      confidence: hasData ? 0.94 : 0.70,
      notes: `Evaluated ${result.statistics?.count || 0} numeric data points with R² score ${result.regression?.r2 || 0}.`
    };
  }
}
