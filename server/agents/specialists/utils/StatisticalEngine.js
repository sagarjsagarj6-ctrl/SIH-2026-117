/**
 * StatisticalEngine — High-performance local statistical computations:
 * - Descriptive statistics (mean, median, variance, std dev)
 * - IQR (Interquartile Range) anomaly detection
 * - Z-Score anomaly detection
 * - Linear regression trend projection & R-squared correlation
 */

export class StatisticalEngine {
  static computeDescriptive(numbers) {
    if (!Array.isArray(numbers) || numbers.length === 0) {
      return { count: 0, mean: 0, median: 0, min: 0, max: 0, stdDev: 0, variance: 0 };
    }

    const sorted = [...numbers].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);
    const mean = sum / count;

    // Median
    const mid = Math.floor(count / 2);
    const median = count % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    // Variance & StdDev
    const squareDiffs = sorted.map(v => Math.pow(v - mean, 2));
    const variance = squareDiffs.reduce((a, b) => a + b, 0) / count;
    const stdDev = Math.sqrt(variance);

    return {
      count,
      sum: Number(sum.toFixed(2)),
      mean: Number(mean.toFixed(2)),
      median: Number(median.toFixed(2)),
      min: sorted[0],
      max: sorted[count - 1],
      variance: Number(variance.toFixed(2)),
      stdDev: Number(stdDev.toFixed(2))
    };
  }

  static detectAnomaliesIQR(numbers) {
    if (!Array.isArray(numbers) || numbers.length < 4) {
      return { outliers: [], lowerBound: 0, upperBound: 0, hasAnomalies: false };
    }

    const sorted = [...numbers].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const outliers = numbers.filter(n => n < lowerBound || n > upperBound);

    return {
      q1: Number(q1.toFixed(2)),
      q3: Number(q3.toFixed(2)),
      iqr: Number(iqr.toFixed(2)),
      lowerBound: Number(lowerBound.toFixed(2)),
      upperBound: Number(upperBound.toFixed(2)),
      outliers,
      hasAnomalies: outliers.length > 0
    };
  }

  static detectAnomaliesZScore(numbers, threshold = 2.0) {
    const { mean, stdDev } = this.computeDescriptive(numbers);
    if (stdDev === 0) return { outliers: [], hasAnomalies: false };

    const outliers = [];
    numbers.forEach((val, idx) => {
      const zScore = (val - mean) / stdDev;
      if (Math.abs(zScore) >= threshold) {
        outliers.push({
          index: idx,
          value: val,
          zScore: Number(zScore.toFixed(2))
        });
      }
    });

    return {
      threshold,
      outliers,
      hasAnomalies: outliers.length > 0
    };
  }

  static computeLinearRegression(series) {
    if (!Array.isArray(series) || series.length < 2) {
      return { slope: 0, intercept: 0, r2: 0, forecastNext: 0 };
    }

    const n = series.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    for (let i = 0; i < n; i++) {
      const x = i + 1;
      const y = series[i];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // R2 Calculation
    const yMean = sumY / n;
    let ssTot = 0, ssRes = 0;
    for (let i = 0; i < n; i++) {
      const y = series[i];
      const yPred = slope * (i + 1) + intercept;
      ssTot += Math.pow(y - yMean, 2);
      ssRes += Math.pow(y - yPred, 2);
    }
    const r2 = ssTot !== 0 ? Math.max(0, 1 - (ssRes / ssTot)) : 1.0;
    const forecastNext = Number((slope * (n + 1) + intercept).toFixed(2));

    return {
      slope: Number(slope.toFixed(2)),
      intercept: Number(intercept.toFixed(2)),
      r2: Number(r2.toFixed(3)),
      trendDirection: slope > 0 ? 'UPWARD' : slope < 0 ? 'DOWNWARD' : 'FLAT',
      forecastNext
    };
  }
}
