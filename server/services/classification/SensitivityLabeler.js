/**
 * SensitivityLabeler — Assigns security classification levels based on content keywords and patterns:
 * Public, Internal, Confidential, Restricted, Top Secret.
 */

export class SensitivityLabeler {
  static RULES = {
    'Top Secret': [
      /\b(top secret|classified|national security|air-gap master key|cryptographic private key|zero trust root|kernel vulnerability)\b/i
    ],
    'Restricted': [
      /\b(strictly confidential|restricted distribution|merger|acquisition|executive compensation|board minutes|audit finding)\b/i
    ],
    'Confidential': [
      /\b(confidential|proprietary|non-disclosure|financial ledger|salary|customer pii|internal audit|source code)\b/i
    ],
    'Internal': [
      /\b(internal use only|employee handbook|guideline|process documentation|operations protocol|standard operating procedure)\b/i
    ],
    'Public': [
      /\b(public release|press release|open documentation|whitepaper|announcement|overview)\b/i
    ]
  };

  static classify(text, explicitHint = '') {
    if (explicitHint && ['Public', 'Internal', 'Confidential', 'Restricted', 'Top Secret'].includes(explicitHint)) {
      return {
        level: explicitHint,
        confidence: 0.99,
        reason: 'Explicitly assigned by authorized user'
      };
    }

    if (!text) {
      return { level: 'Internal', confidence: 0.50, reason: 'Default fallback' };
    }

    for (const [level, patterns] of Object.entries(this.RULES)) {
      for (const regex of patterns) {
        if (regex.test(text)) {
          return {
            level,
            confidence: 0.88,
            reason: `Matched security classification pattern: "${regex.source}"`
          };
        }
      }
    }

    return {
      level: 'Confidential',
      confidence: 0.75,
      reason: 'Enterprise default classification'
    };
  }
}
