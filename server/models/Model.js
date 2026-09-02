import mongoose from 'mongoose';

const modelSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  version: { type: String, required: true },
  type: { type: String, enum: ['LLM', 'Embedding', 'Vision', 'Code', 'Multimodal'], required: true },
  parameters: { type: String, required: true }, // e.g. "8B", "14B", "70B"
  quantization: { type: String, default: 'Q4_K_M' },
  vramRequiredGB: { type: Number, required: true },
  contextWindow: { type: Number, default: 8192 },
  status: { type: String, enum: ['Active', 'Inactive', 'Loading', 'Error'], default: 'Active' },
  tpsBench: { type: Number, default: 45.2 }, // Tokens Per Second benchmark
  latencyMs: { type: Number, default: 120 }
}, { timestamps: true });

export default mongoose.models.Model || mongoose.model('Model', modelSchema);
