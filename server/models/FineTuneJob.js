import mongoose from 'mongoose';

const fineTuneJobSchema = new mongoose.Schema({
  jobName: { type: String, required: true },
  baseModel: { type: String, required: true },
  department: { type: String, required: true },
  datasetName: { type: String, required: true },
  method: { type: String, enum: ['LoRA', 'QLoRA', 'Full Parameter'], default: 'QLoRA' },
  epochs: { type: Number, default: 3 },
  learningRate: { type: String, default: '2e-4' },
  status: { type: String, enum: ['Queued', 'Training', 'Completed', 'Failed'], default: 'Queued' },
  progressPercent: { type: Number, default: 0 },
  currentLoss: { type: Number, default: 1.84 },
  startedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.FineTuneJob || mongoose.model('FineTuneJob', fineTuneJobSchema);
