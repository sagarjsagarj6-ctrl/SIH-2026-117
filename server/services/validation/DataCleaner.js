/**
 * DataCleaner — Detects and redacts PII across structured text, logs, and JSON.
 * Supports FULL, GDPR, HIPAA, and PCI-DSS redaction profiles.
 */

const FRAMEWORK_TYPES = {
  FULL: ['SSN', 'CREDIT_CARD', 'CVV', 'EMAIL', 'PHONE', 'ADDRESS', 'PERSON_NAME', 'PATIENT_ID', 'MEDICAL_RECORD'],
  GDPR: ['PERSON_NAME', 'EMAIL', 'PHONE', 'ADDRESS'],
  HIPAA: ['PATIENT_ID', 'MEDICAL_RECORD', 'SSN', 'PERSON_NAME', 'PHONE', 'ADDRESS', 'EMAIL'],
  'PCI-DSS': ['CREDIT_CARD', 'CVV']
};

const TYPE_ORDER = [
  'CREDIT_CARD',
  'SSN',
  'CVV',
  'EMAIL',
  'PHONE',
  'PATIENT_ID',
  'MEDICAL_RECORD',
  'ADDRESS',
  'PERSON_NAME'
];

export class DataCleaner {
  static FRAMEWORK_TYPES = FRAMEWORK_TYPES;

  static PII_PATTERNS = {
    SSN: /\b\d{3}-\d{2}-\d{4}\b/g,
    CREDIT_CARD: /\b(?:\d{4}[ -]?){3}\d{4}\b/g,
    CVV: /\b(?:CVV|CVC|CVV2|CID)[:\s#-]*\d{3,4}\b/gi,
    EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,24}\b/g,
    PHONE: /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g,
    ADDRESS: /\b\d{1,5}[A-Za-z]?\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,4}\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Way|Court|Ct)\.?(?:\s*,?\s*(?:[A-Za-z.\s]+))?(?:\s+\d{5}(?:-\d{4})?)?\b/gi,
    PATIENT_ID: /\b(?:Patient(?:\s*ID)?|PAT(?:IENT)?[-\s]?ID|MRN)[:\s#-]*[A-Z0-9-]{4,20}\b/gi,
    MEDICAL_RECORD: /\b(?:Medical\s+Record(?:\s+Number)?|ICD-10|Diagnosis|Rx)[:\s#-]+[A-Za-z0-9][A-Za-z0-9 ./-]{2,40}\b/gi,
    PERSON_NAME: /\b(?:(?:Mr|Mrs|Ms|Miss|Dr|Prof)\.?\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\b/g
  };

  static NAME_CONTEXT = /\b(?:employee|patient|customer|name|contact|resident|beneficiary|member)\b/i;

  static PLACEHOLDERS = {
    SSN: '[REDACTED_SSN]',
    CREDIT_CARD: '[REDACTED_CARD]',
    CVV: '[REDACTED_CVV]',
    EMAIL: '[REDACTED_EMAIL]',
    PHONE: '[REDACTED_PHONE]',
    ADDRESS: '[REDACTED_ADDRESS]',
    PATIENT_ID: '[REDACTED_PATIENT_ID]',
    MEDICAL_RECORD: '[REDACTED_MEDICAL_RECORD]',
    PERSON_NAME: '[REDACTED_NAME]'
  };

  static emptyScan() {
    const counts = Object.fromEntries(TYPE_ORDER.map((type) => [type, 0]));
    return {
      piiDetected: false,
      matches: [],
      counts,
      findings: [],
      format: 'text',
      parseWarning: null
    };
  }

  static detectFormat(text, requested = 'auto') {
    const requestedFormat = String(requested || 'auto').toLowerCase();
    if (['text', 'json', 'log'].includes(requestedFormat)) return requestedFormat;
    const trimmed = String(text || '').trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      return 'json';
    }
    if (/\b(?:ERROR|WARN|INFO|DEBUG)\b/.test(trimmed) && /\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/.test(trimmed)) {
      return 'log';
    }
    return 'text';
  }

  static collectMatches(text, enabledTypes) {
    const findings = [];
    const occupied = [];

    const overlaps = (start, end) => occupied.some((range) => start < range.end && end > range.start);

    for (const type of TYPE_ORDER) {
      if (!enabledTypes.includes(type)) continue;
      const regex = new RegExp(this.PII_PATTERNS[type].source, this.PII_PATTERNS[type].flags);
      let match;
      while ((match = regex.exec(text)) !== null) {
        const value = match[0];
        const start = match.index;
        const end = start + value.length;
        if (overlaps(start, end)) continue;

        if (type === 'PHONE' && /^\d{3}-\d{2}-\d{4}$/.test(value)) continue;
        if (type === 'PHONE' && (value.replace(/\D/g, '').length >= 15)) continue;
        if (type === 'CREDIT_CARD') {
          const digits = value.replace(/\D/g, '');
          if (digits.length < 13 || digits.length > 19) continue;
        }
        if (type === 'PERSON_NAME') {
          const windowStart = Math.max(0, start - 40);
          const context = text.slice(windowStart, end + 12);
          if (!this.NAME_CONTEXT.test(context)) continue;
          if (/Street|Avenue|Road|Drive|Lane|Boulevard/i.test(value)) continue;
        }

        occupied.push({ start, end });
        findings.push({ type, value, start, end });
      }
    }

    return findings.sort((a, b) => a.start - b.start);
  }

  static summarizeFindings(findings) {
    const counts = Object.fromEntries(TYPE_ORDER.map((type) => [type, 0]));
    const grouped = new Map();

    for (const finding of findings) {
      counts[finding.type] += 1;
      if (!grouped.has(finding.type)) {
        grouped.set(finding.type, { type: finding.type, count: 0, samples: [] });
      }
      const entry = grouped.get(finding.type);
      entry.count += 1;
      if (entry.samples.length < 3) entry.samples.push(finding.value);
    }

    return {
      counts,
      matches: Array.from(grouped.values())
    };
  }

  static maskEmail(email) {
    const [local, domain] = String(email).split('@');
    if (!local || !domain) return this.PLACEHOLDERS.EMAIL;
    const visible = local[0] || '*';
    return `${visible}***@${domain}`;
  }

  static replaceFinding(type, value) {
    if (type === 'EMAIL') return this.maskEmail(value);
    return this.PLACEHOLDERS[type] || '[REDACTED]';
  }

  static applyRedactions(text, findings) {
    let cursor = 0;
    let output = '';
    for (const finding of findings) {
      output += text.slice(cursor, finding.start);
      output += this.replaceFinding(finding.type, finding.value);
      cursor = finding.end;
    }
    output += text.slice(cursor);
    return output;
  }

  static sanitizePlainText(text) {
    return String(text)
      .normalize('NFKC')
      .replace(/\0/g, '')
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  static walkAndRedactJson(value, parentKey = '') {
    if (typeof value === 'string') {
      const key = String(parentKey || '').toLowerCase();
      if (/ssn|social/.test(key) && /\b\d{3}-\d{2}-\d{4}\b/.test(value)) return this.PLACEHOLDERS.SSN;
      if (/card|pan|ccn/.test(key) && /\b(?:\d{4}[ -]?){3}\d{4}\b/.test(value)) return this.PLACEHOLDERS.CREDIT_CARD;
      if (/cvv|cvc/.test(key)) return this.PLACEHOLDERS.CVV;
      if (/email|mail/.test(key) && /@/.test(value)) return this.maskEmail(value);
      if (/phone|mobile|tel/.test(key)) return this.PLACEHOLDERS.PHONE;
      if (/address|street/.test(key)) return this.PLACEHOLDERS.ADDRESS;
      if (/patient|mrn/.test(key)) return this.PLACEHOLDERS.PATIENT_ID;
      if (/name|employee|customer|patient/.test(key) && /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/.test(value.trim())) {
        return this.PLACEHOLDERS.PERSON_NAME;
      }
      const local = this.collectMatches(value, FRAMEWORK_TYPES.FULL);
      return this.applyRedactions(value, local);
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.walkAndRedactJson(item, parentKey));
    }
    if (value && typeof value === 'object') {
      const next = {};
      for (const [key, nested] of Object.entries(value)) {
        next[key] = this.walkAndRedactJson(nested, key);
      }
      return next;
    }
    return value;
  }

  static normalizeFramework(framework = 'FULL') {
    const key = String(framework || 'FULL').toUpperCase();
    if (key === 'PCI' || key === 'PCIDSS') return 'PCI-DSS';
    if (FRAMEWORK_TYPES[key]) return key;
    return 'FULL';
  }

  static scanPII(text, options = {}) {
    if (text == null) {
      return { ...this.emptyScan(), error: 'Text is required for scanning' };
    }
    if (typeof text !== 'string') {
      return { ...this.emptyScan(), error: 'Scan input must be a string, JSON string, or log payload' };
    }
    if (!text.trim()) {
      return { ...this.emptyScan(), error: 'Empty input cannot be scanned' };
    }
    if (text.length > 200000) {
      return { ...this.emptyScan(), error: 'Input exceeds the 200KB sandbox scan limit' };
    }

    const framework = this.normalizeFramework(options.framework);
    const enabledTypes = FRAMEWORK_TYPES[framework];
    const format = this.detectFormat(text, options.format);
    let parseWarning = null;
    let scanTarget = text;
    let parsedJson = null;

    if (format === 'json') {
      try {
        parsedJson = JSON.parse(text);
        scanTarget = JSON.stringify(parsedJson, null, 2);
      } catch {
        parseWarning = 'Malformed JSON: scanned as unstructured text';
      }
    }

    const findings = this.collectMatches(scanTarget, enabledTypes);
    const summary = this.summarizeFindings(findings);

    return {
      piiDetected: findings.length > 0,
      matches: summary.matches,
      counts: summary.counts,
      findings,
      format,
      framework,
      parseWarning,
      parsedJson
    };
  }

  static cleanAndRedact(text, shouldRedact = true, options = {}) {
    if (!text || typeof text !== 'string') return '';

    const format = this.detectFormat(text, options.format);
    if (format === 'json') {
      try {
        const parsed = JSON.parse(text);
        if (!shouldRedact) return JSON.stringify(parsed, null, 2);
        return JSON.stringify(this.walkAndRedactJson(parsed), null, 2);
      } catch {
        // Fall through to unstructured handling
      }
    }

    const cleaned = this.sanitizePlainText(text);
    if (!shouldRedact) return cleaned;

    const findings = this.collectMatches(
      cleaned,
      FRAMEWORK_TYPES[this.normalizeFramework(options.framework)]
    );
    return this.applyRedactions(cleaned, findings);
  }

  static scanAndRedact(text, options = {}) {
    const scan = this.scanPII(text, options);
    if (scan.error) {
      return {
        ok: false,
        error: scan.error,
        piiDetected: false,
        matches: [],
        counts: this.emptyScan().counts,
        redactedPreview: '',
        format: 'text',
        framework: this.normalizeFramework(options.framework)
      };
    }

    const redactedPreview = this.cleanAndRedact(text, options.shouldRedact !== false, options);
    const detectedCount = scan.matches.reduce((sum, item) => sum + item.count, 0);

    return {
      ok: true,
      error: null,
      piiDetected: scan.piiDetected,
      matches: scan.matches,
      counts: scan.counts,
      detectedCount,
      redactedPreview,
      format: scan.format,
      framework: scan.framework,
      parseWarning: scan.parseWarning,
      placeholders: Object.fromEntries(
        scan.matches.map((item) => [item.type, item.type === 'EMAIL' ? 'partial (j***@domain.com)' : this.PLACEHOLDERS[item.type]])
      )
    };
  }
}
