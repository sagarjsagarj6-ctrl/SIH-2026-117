/**
 * Ensures controlled RAG fixture documents exist for anti-hardcode / relevance tests.
 */
import { state } from '../../config/db.js';
import KnowledgeDoc from '../../models/KnowledgeDoc.js';
const FIXTURES = [
  {
    title: 'Project Alpha Budget Charter',
    category: 'Financial Ledger',
    department: 'Executive & Strategy',
    fileType: 'TXT',
    sensitivity: 'Confidential',
    snippet:
      'Project Alpha budget is ₹50 lakh. Project Alpha is the sovereign platform modernization initiative for FY2026. Authorized owner: Executive & Strategy. Capex code: ALPHA-CAP-50L.',
    tokenCount: 80,
    vectorIndexed: true,
    uploadedBy: 'Audit Fixture'
  },
  {
    title: 'Project Beta Budget Charter',
    category: 'Financial Ledger',
    department: 'Executive & Strategy',
    fileType: 'TXT',
    sensitivity: 'Confidential',
    snippet:
      'Project Beta budget is ₹20 lakh. Project Beta covers field operations telemetry expansion. Authorized owner: Executive & Strategy. Capex code: BETA-CAP-20L.',
    tokenCount: 70,
    vectorIndexed: true,
    uploadedBy: 'Audit Fixture'
  }
];

export async function ensureRAGFixtures() {
  let upserted = 0;

  for (const fixture of FIXTURES) {
    if (state.isMongooseConnected) {
      const existing = await KnowledgeDoc.findOne({ title: fixture.title });
      if (existing) {
        existing.snippet = fixture.snippet;
        existing.department = fixture.department;
        existing.vectorIndexed = true;
        await existing.save();
      } else {
        await KnowledgeDoc.create(fixture);
        upserted++;
      }
    } else {
      const docs = state.memoryDb.knowledgeDocs || (state.memoryDb.knowledgeDocs = []);
      const idx = docs.findIndex((d) => d.title === fixture.title);
      if (idx >= 0) {
        docs[idx] = { ...docs[idx], ...fixture, _id: docs[idx]._id };
      } else {
        docs.push({ ...fixture, _id: `fixture_${fixture.title.replace(/\s+/g, '_').toLowerCase()}` });
        upserted++;
      }
    }
  }

  console.log(`[RAGFixtures] Ensured Project Alpha/Beta budget documents (new=${upserted}).`);
  return { upserted, total: FIXTURES.length };
}
