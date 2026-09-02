import mongoose from 'mongoose';

const knowledgeDocSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, required: true },
  department: { type: String, required: true },
  fileType: { type: String, default: 'PDF' },
  sensitivity: { type: String, enum: ['Internal', 'Confidential', 'Restricted', 'Top Secret'], default: 'Confidential' },
  snippet: { type: String },
  tokenCount: { type: Number, default: 1250 },
  vectorIndexed: { type: Boolean, default: true },
  uploadedBy: { type: String, required: true }
}, { timestamps: true });

export default mongoose.models.KnowledgeDoc || mongoose.model('KnowledgeDoc', knowledgeDocSchema);
