import mongoose from 'mongoose';

const runtimeRecordSchema = new mongoose.Schema({
  collectionName: { type: String, required: true, index: true },
  recordId: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true }
}, { timestamps: true });

runtimeRecordSchema.index({ collectionName: 1, recordId: 1 }, { unique: true });

export default mongoose.models.RuntimeRecord || mongoose.model('RuntimeRecord', runtimeRecordSchema);
