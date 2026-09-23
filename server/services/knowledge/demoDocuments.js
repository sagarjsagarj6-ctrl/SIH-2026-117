import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO_DOCUMENT_DIR = path.resolve(__dirname, '../../data/demo-documents');

// Keep the metadata used by the repository and the source files used by the
// vector bootstrap in one deterministic registry. The content is synthetic.
export const DEMO_DOCUMENTS = [
  {
    fileName: 'q3-enterprise-financial-risk-audit.md',
    title: 'Q3 Enterprise Financial Risk Audit',
    category: 'Financial Ledger',
    department: 'Finance & Accounting',
    fileType: 'PDF',
    sensitivity: 'Confidential',
    tokenCount: 1840,
    uploadedBy: 'Elena Vance'
  },
  {
    fileName: 'corporate-intellectual-property-patent-filings-2026.md',
    title: 'Corporate Intellectual Property & Patent Filings 2026',
    category: 'Legal Portfolio',
    department: 'Legal & Compliance',
    fileType: 'PDF',
    sensitivity: 'Top Secret',
    tokenCount: 3200,
    uploadedBy: 'David Sterling'
  },
  {
    fileName: 'air-gapped-sovereign-ai-system-architecture-specs.md',
    title: 'Air-Gapped Sovereign AI System Architecture Specs',
    category: 'Technical Schematic',
    department: 'R&D / Engineering',
    fileType: 'Markdown',
    sensitivity: 'Confidential',
    tokenCount: 2450,
    uploadedBy: 'Dr. Marcus Vance'
  },
  {
    fileName: 'enterprise-employee-compensation-benefit-guidelines.md',
    title: 'Enterprise Employee Compensation & Benefit Guidelines',
    category: 'HR Policy',
    department: 'Human Resources',
    fileType: 'DOCX',
    sensitivity: 'Restricted',
    tokenCount: 1600,
    uploadedBy: 'Sarah Connor'
  },
  {
    fileName: 'sovereign-ai-security-governance-charter.md',
    title: 'Sovereign AI Security Governance Charter',
    category: 'Enterprise Policy',
    department: 'All',
    fileType: 'PDF',
    sensitivity: 'Internal',
    tokenCount: 2100,
    uploadedBy: 'System Admin'
  },
  {
    fileName: 'project-alpha-budget-charter.md',
    title: 'Project Alpha Budget Charter',
    category: 'Financial Ledger',
    department: 'Executive & Strategy',
    fileType: 'TXT',
    sensitivity: 'Confidential',
    tokenCount: 80,
    uploadedBy: 'Audit Fixture'
  },
  {
    fileName: 'project-beta-budget-charter.md',
    title: 'Project Beta Budget Charter',
    category: 'Financial Ledger',
    department: 'Executive & Strategy',
    fileType: 'TXT',
    sensitivity: 'Confidential',
    tokenCount: 70,
    uploadedBy: 'Audit Fixture'
  }
];

export async function loadDemoDocuments() {
  return Promise.all(DEMO_DOCUMENTS.map(async (metadata) => {
    const content = await fs.readFile(path.join(DEMO_DOCUMENT_DIR, metadata.fileName), 'utf8');
    return {
      ...metadata,
      snippet: content.trim(),
      vectorIndexed: true
    };
  }));
}

