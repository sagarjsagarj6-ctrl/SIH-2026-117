/**
 * DepartmentTagger — Maps documents to target enterprise departments based on linguistic and topical markers:
 * Finance, Operations, Legal, Engineering, HR, Executive, or All.
 */

export class DepartmentTagger {
  static DEPARTMENT_KEYWORDS = {
    Finance: ['revenue', 'balance sheet', 'invoice', 'p&l', 'fiscal', 'audit', 'tax', 'ebitda', 'cash flow', 'budget', 'ledger'],
    Operations: ['supply chain', 'warehouse', 'logistics', 'inventory', 'procurement', 'sla', 'shipping', 'infrastructure', 'facility'],
    Legal: ['contract', 'agreement', 'compliance', 'clause', 'indemnity', 'liability', 'nda', 'litigation', 'statutory', 'gdpr', 'intellectual property'],
    Engineering: ['architecture', 'api', 'docker', 'kubernetes', 'repository', 'bugfix', 'deployment', 'endpoint', 'database', 'firmware', 'python', 'javascript'],
    HR: ['payroll', 'recruitment', 'onboarding', 'performance review', 'benefits', 'employee relations', 'leave policy', 'compensation'],
    Executive: ['board resolution', 'strategic roadmap', 'm&a', 'investor relations', 'quarterly forecast', 'q4 okrs', 'executive briefing']
  };

  static tag(text, userDepartment = '') {
    if (!text || typeof text !== 'string') {
      return {
        department: userDepartment || 'All',
        confidence: 0.6,
        detectedKeywords: []
      };
    }

    const lower = text.toLowerCase();
    const scores = {};
    const matched = {};

    for (const [dept, keywords] of Object.entries(this.DEPARTMENT_KEYWORDS)) {
      scores[dept] = 0;
      matched[dept] = [];
      for (const kw of keywords) {
        const count = (lower.match(new RegExp(`\\b${kw}\\b`, 'g')) || []).length;
        if (count > 0) {
          scores[dept] += count;
          matched[dept].push(kw);
        }
      }
    }

    // Find highest scoring department
    let bestDept = userDepartment || 'All';
    let maxScore = 0;

    for (const [dept, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        bestDept = dept;
      }
    }

    if (maxScore === 0) {
      return {
        department: userDepartment || 'All',
        confidence: 0.7,
        detectedKeywords: []
      };
    }

    return {
      department: bestDept,
      confidence: Math.min(0.98, 0.65 + (maxScore * 0.05)),
      detectedKeywords: matched[bestDept] || []
    };
  }
}
