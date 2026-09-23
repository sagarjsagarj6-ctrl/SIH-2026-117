/**
 * Ensures the complete synthetic demo document bundle exists for RAG and
 * repository demonstrations. The source content is kept in data/demo-documents.
 */
import { state } from '../../config/db.js';
import KnowledgeDoc from '../../models/KnowledgeDoc.js';
import { loadDemoDocuments } from './demoDocuments.js';

export async function ensureRAGFixtures() {
  const fixtures = await loadDemoDocuments();
  let upserted = 0;

  for (const fixture of fixtures) {
    if (state.isMongooseConnected) {
      const existing = await KnowledgeDoc.findOne({ title: fixture.title });
      if (existing) {
        Object.assign(existing, fixture);
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

  console.log(`[DemoDocuments] Ensured ${fixtures.length} synthetic demo documents (new=${upserted}).`);
  return { upserted, total: fixtures.length };
}
