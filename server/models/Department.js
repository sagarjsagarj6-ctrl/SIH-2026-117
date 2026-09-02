import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true },
  description: { type: String },
  securityLevel: { type: String, enum: ['Standard', 'Confidential', 'Restricted', 'Top-Secret'], default: 'Confidential' },
  allowedAgents: [{ type: String }],
  vectorIndexId: { type: String },
  memberCount: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.models.Department || mongoose.model('Department', departmentSchema);
