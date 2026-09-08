/**
 * QualityScorer — Computes completeness, consistency, validity, and accuracy scores.
 */

export class QualityScorer {
  static evaluateQuality({ text, fileValidation, piiScan, fileType }) {
    let completeness = 100;
    let consistency = 100;
    let encodingValidity = 100;
    let accuracyScore = 95;
    const flags = [];

    // Length and completeness
    if (!text || text.trim().length === 0) {
      completeness = 0;
      flags.push('Document contains no extractable text');
    } else if (text.trim().length < 50) {
      completeness = 50;
      flags.push('Very short document length (<50 characters)');
    }

    // Encoding validity
    const nonAsciiCount = (text.match(/[^\x00-\x7F]/g) || []).length;
    if (nonAsciiCount > text.length * 0.15) {
      encodingValidity = 75;
      flags.push('Elevated non-standard character encoding count');
    }

    // Consistency
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    if (lines.length > 0) {
      const avgLineLength = text.length / lines.length;
      if (avgLineLength < 5) {
        consistency -= 20;
        flags.push('Irregular line fragmentation detected');
      }
    }

    // PII check penalty
    if (piiScan.piiDetected) {
      flags.push(`Sensitive PII elements detected (${piiScan.matches.map(m => m.type).join(', ')})`);
      accuracyScore -= 5;
    }

    // File validation warnings
    if (fileValidation.warnings && fileValidation.warnings.length > 0) {
      flags.push(...fileValidation.warnings);
      consistency -= 10;
    }

    const overallScore = Math.round(
      (completeness * 0.35) +
      (consistency * 0.25) +
      (encodingValidity * 0.20) +
      (accuracyScore * 0.20)
    );

    let status = 'PASSED';
    if (overallScore < 60) {
      status = 'FAILED';
    } else if (overallScore < 85 || piiScan.piiDetected) {
      status = 'WARNING';
    }

    return {
      overallScore: Math.max(0, Math.min(100, overallScore)),
      metrics: {
        completeness: Math.max(0, Math.min(100, completeness)),
        consistency: Math.max(0, Math.min(100, consistency)),
        encodingValidity: Math.max(0, Math.min(100, encodingValidity)),
        accuracyScore: Math.max(0, Math.min(100, accuracyScore))
      },
      status,
      flags
    };
  }
}
