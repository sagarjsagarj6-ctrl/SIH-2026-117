/**
 * ChartGenerator — Formats statistical outputs into chart-ready structures for the frontend.
 */

export class ChartGenerator {
  static generateLineChart({ title, labels, seriesName, data, forecastValue = null }) {
    const finalLabels = [...labels];
    const finalData = [...data];

    if (forecastValue !== null) {
      finalLabels.push('Next (Est.)');
      finalData.push(forecastValue);
    }

    return {
      type: 'line',
      title: title || 'Operational Trend Analysis',
      labels: finalLabels,
      datasets: [
        {
          label: seriesName || 'Measured Values',
          data: finalData,
          borderColor: '#00fff2',
          backgroundColor: 'rgba(0, 255, 242, 0.15)',
          fill: true
        }
      ]
    };
  }

  static generateBarChart({ title, categories, values, seriesName = 'Metrics' }) {
    return {
      type: 'bar',
      title: title || 'Distribution Comparison',
      labels: categories,
      datasets: [
        {
          label: seriesName,
          data: values,
          backgroundColor: [
            '#00fff2',
            '#7b2cff',
            '#e040fb',
            '#39ff14',
            '#ffe600',
            '#ff0055'
          ]
        }
      ]
    };
  }

  static generateAnomalyChart({ title, labels, values, outliers = [] }) {
    const backgroundColors = values.map(v => outliers.includes(v) ? '#ff0055' : '#00fff2');

    return {
      type: 'bar',
      title: title || 'Anomaly Detection Matrix (IQR / Z-Score)',
      labels,
      datasets: [
        {
          label: 'Dataset Values',
          data: values,
          backgroundColor: backgroundColors,
          hasAnomalies: outliers.length > 0,
          outlierCount: outliers.length
        }
      ]
    };
  }
}
