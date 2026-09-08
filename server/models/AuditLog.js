import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  eventId: { type: String, index: true },
  timestamp: { type: Date, default: Date.now },
  sessionId: { type: String, index: true },
  userId: { type: String },
  userName: { type: String, required: true },
  role: { type: String, required: true },
  department: { type: String, required: true },
  action: { type: String, required: true }, // e.g. "RAG_SEARCH", "DATA_ANALYTICS", "LOGIN", "MODEL_TOGGLE"
  resource: { type: String, required: true },
  status: { type: String, enum: ['SUCCESS', 'DENIED', 'WARNING', 'FAILED'], default: 'SUCCESS' },
  ipAddress: { type: String, default: '127.0.0.1 (LAN)' },
  deviceFingerprint: { type: String },
  riskScore: { type: Number, min: 0, max: 1, default: 0 },
  details: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

export default mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
