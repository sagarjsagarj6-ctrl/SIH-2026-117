import mongoose from 'mongoose';

const fineTuneJobSchema = new mongoose.Schema({
  jobName: { type: String, required: true },
  baseModel: { type: String, required: true },
  department: { type: String, required: true },
  datasetName: { type: String, default: '' },
  method: { type: String, enum: ['LoRA', 'QLoRA', 'Full Parameter'], default: 'QLoRA' },
  epochs: { type: Number, default: 3 },
  learningRate: { type: String, default: '2e-4' },
  status: { type: String, enum: ['Queued', 'Training', 'Completed', 'Failed', 'Cancelled'], default: 'Queued' },
  executionMode: { type: String, enum: ['LIVE', 'SIMULATED_PROGRESS'], default: 'SIMULATED_PROGRESS' },
  simulation: { type: Boolean, default: true },
  fallbackReason: { type: String, default: '' },
  progressPercent: { type: Number, default: 0 },
  currentLoss: { type: Number, default: 1.84 },
  lossHistory: [{
    epoch: Number,
    loss: Number,
    learningRate: String,
    recordedAt: Date
  }],
  sampleCount: { type: Number, default: 0 },
  trainCount: { type: Number, default: 0 },
  testCount: { type: Number, default: 0 },
  trainingConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
  datasetPath: { type: String, default: '' },
  validation: { type: mongoose.Schema.Types.Mixed, default: null },
  errorMessage: { type: String, default: '' },
  cancelRequested: { type: Boolean, default: false },
  startedAt: { type: Date, default: Date.now },
  createdBy: { type: String, default: 'System' },
  ownerRole: { type: String, default: 'Employee' },
  ownerId: { type: String, default: '' },
  trainDataFile: { type: String, default: '' },
  testDataFile: { type: String, default: '' },
  networkId: { type: String, default: '' },
  networkName: { type: String, default: '' },
  networkKey: { type: String, default: '' },
  isDeployed: { type: Boolean, default: false },
  isGlobal: { type: Boolean, default: false },
  accessRoles: [{ type: String }],
  deploymentKey: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.FineTuneJob || mongoose.model('FineTuneJob', fineTuneJobSchema);
