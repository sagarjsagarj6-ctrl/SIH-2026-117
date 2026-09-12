import mongoose from 'mongoose';

const complianceReportSchema = new mongoose.Schema({
  framework: { type: String, enum: ['FULL', 'GDPR', 'HIPAA', 'PCI-DSS'], required: true },
  format: { type: String, enum: ['text', 'json', 'log'], default: 'text' },
  fileName: { type: String, default: 'sandbox-scan' },
  department: { type: String, default: 'All' },
  piiDetected: { type: Boolean, default: false },
  detectedCount: { type: Number, default: 0 },
  counts: { type: mongoose.Schema.Types.Mixed, default: {} },
  matches: { type: Array, default: [] },
  redactedPreview: { type: String, default: '' },
  compliant: { type: Boolean, default: true },
  notes: [{ type: String }],
  parseWarning: { type: String, default: null },
  createdBy: { type: String, default: 'System' }
}, { timestamps: true });

export default mongoose.models.ComplianceReport || mongoose.model('ComplianceReport', complianceReportSchema);
