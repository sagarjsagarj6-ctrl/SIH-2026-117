/**
 * DataCleaner — Detects and redacts PII (SSN, credit cards, emails, phone numbers) and normalizes UTF-8 encodings.
 */

export class DataCleaner {
  static PII_PATTERNS = {
    SSN: /\b\d{3}-\d{2}-\d{4}\b/g,
    CREDIT_CARD: /\b(?:\d{4}[ -]?){3}\d{4}\b/g,
    EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g,
    PHONE: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g
  };

  static scanPII(text) {
    if (!text || typeof text !== 'string') {
      return { piiDetected: false, matches: [] };
    }

    const matches = [];

    for (const [type, regex] of Object.entries(this.PII_PATTERNS)) {
      const found = text.match(regex) || [];
      if (found.length > 0) {
        matches.push({
          type,
          count: found.length,
          samples: found.slice(0, 3)
        });
      }
    }

    return {
      piiDetected: matches.length > 0,
      matches
    };
  }

  static cleanAndRedact(text, shouldRedact = true) {
    if (!text || typeof text !== 'string') return '';

    // 1. Normalize unicode characters & strip null bytes
    let cleaned = text.normalize('NFKC').replace(/\0/g, '');

    // 2. Strip potential XSS injections
    cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // 3. Redact PII if required
    if (shouldRedact) {
      cleaned = cleaned.replace(this.PII_PATTERNS.SSN, '[REDACTED_SSN]');
      cleaned = cleaned.replace(this.PII_PATTERNS.CREDIT_CARD, '[REDACTED_CARD]');
      cleaned = cleaned.replace(this.PII_PATTERNS.EMAIL, (m) => {
        const [local, domain] = m.split('@');
        return `${local[0]}***@${domain}`;
      });
      cleaned = cleaned.replace(this.PII_PATTERNS.PHONE, '[REDACTED_PHONE]');
    }

    // 4. Clean consecutive whitespace
    cleaned = cleaned.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');

    return cleaned.trim();
  }
}
