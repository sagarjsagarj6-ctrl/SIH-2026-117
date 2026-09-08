import mongoose from 'mongoose';

const dataQualityReportSchema = new mongoose.Schema({
  docId: { type: String, required: true },
  fileName: { type: String, required: true },
  fileType: { type: String, required: true },
  fileSize: { type: Number, default: 0 },
  checksum: { type: String, required: true }, // SHA-256
  department: { type: String, required: true },
  overallScore: { type: Number, required: true, min: 0, max: 100 },
  metrics: {
    completeness: { type: Number, required: true },
    consistency: { type: Number, required: true },
    encodingValidity: { type: Number, required: true },
    accuracyScore: { type: Number, required: true }
  },
  piiDetected: { type: Boolean, default: false },
  piiDetails: [{
    type: { type: String }, // 'SSN', 'CREDIT_CARD', 'EMAIL', 'PHONE'
    count: { type: Number },
    redacted: { type: Boolean, default: true }
  }],
  malwareStatus: { type: String, enum: ['CLEAN', 'QUARANTINED', 'SUSPICIOUS'], default: 'CLEAN' },
  status: { type: String, enum: ['PASSED', 'WARNING', 'FAILED'], default: 'PASSED' },
  flags: [{ type: String }],
  uploadedBy: { type: String, default: 'System' }
}, { timestamps: true });

export default mongoose.models.DataQualityReport || mongoose.model('DataQualityReport', dataQualityReportSchema);
