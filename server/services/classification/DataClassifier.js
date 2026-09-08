/**
 * DataClassifier — High-level classification orchestrator combining sensitivity labeling, department tagging, and category extraction.
 */

import { SensitivityLabeler } from './SensitivityLabeler.js';
import { DepartmentTagger } from './DepartmentTagger.js';

export class DataClassifier {
  static CATEGORIES = [
    'Financial Ledger',
    'Operational SOP',
    'Compliance Policy',
    'Architecture Blueprint',
    'Contract & NDA',
    'HR & People Protocol',
    'Executive Memo',
    'Technical Telemetry'
  ];

  static inferCategory(text, filename = '') {
    const combined = (filename + ' ' + (text ? text.slice(0, 500) : '')).toLowerCase();
    if (combined.includes('invoice') || combined.includes('ledger') || combined.includes('financial') || combined.includes('p&l')) {
      return 'Financial Ledger';
    }
    if (combined.includes('sop') || combined.includes('procedure') || combined.includes('manifest') || combined.includes('logistics')) {
      return 'Operational SOP';
    }
    if (combined.includes('contract') || combined.includes('nda') || combined.includes('agreement') || combined.includes('terms')) {
      return 'Contract & NDA';
    }
    if (combined.includes('policy') || combined.includes('compliance') || combined.includes('regulation') || combined.includes('gdpr')) {
      return 'Compliance Policy';
    }
    if (combined.includes('architecture') || combined.includes('design') || combined.includes('blueprint') || combined.includes('api')) {
      return 'Architecture Blueprint';
    }
    if (combined.includes('hr') || combined.includes('employee') || combined.includes('handbook') || combined.includes('leave')) {
      return 'HR & People Protocol';
    }
    if (combined.includes('telemetry') || combined.includes('metric') || combined.includes('log') || combined.includes('dataset')) {
      return 'Technical Telemetry';
    }
    return 'Executive Memo';
  }

  static classifyDocument({ text, filename, userDepartment, explicitDepartment, explicitSensitivity, explicitCategory }) {
    const sensitivity = SensitivityLabeler.classify(text, explicitSensitivity);
    const departmentResult = DepartmentTagger.tag(text, userDepartment);
    const category = explicitCategory || this.inferCategory(text, filename);
    const department = explicitDepartment || departmentResult.department;

    return {
      category,
      department,
      sensitivity: sensitivity.level,
      classificationConfidence: {
        sensitivity: sensitivity.confidence,
        department: explicitDepartment ? 1 : departmentResult.confidence
      },
      tags: [
        category.toLowerCase().replace(/\s+/g, '-'),
        department.toLowerCase(),
        sensitivity.level.toLowerCase().replace(/\s+/g, '-')
      ]
    };
  }
}
