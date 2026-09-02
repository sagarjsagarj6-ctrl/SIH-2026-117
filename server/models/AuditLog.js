import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  userId: { type: String },
  userName: { type: String, required: true },
  role: { type: String, required: true },
  department: { type: String, required: true },
  action: { type: String, required: true }, // e.g. "RAG_SEARCH", "DATA_ANALYTICS", "LOGIN", "MODEL_TOGGLE"
  resource: { type: String, required: true },
  status: { type: String, enum: ['SUCCESS', 'DENIED', 'WARNING', 'FAILED'], default: 'SUCCESS' },
  ipAddress: { type: String, default: '127.0.0.1 (LAN)' },
  details: { type: String }
}, { timestamps: true });

export default mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
