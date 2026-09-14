import mongoose from 'mongoose';

const nodeRunSchema = new mongoose.Schema({
  nodeId: String,
  nodeType: String,
  status: String,
  startedAt: Date,
  completedAt: Date,
  durationMs: Number,
  input: mongoose.Schema.Types.Mixed,
  output: mongoose.Schema.Types.Mixed,
  error: String
}, { _id: false });

const workflowRunSchema = new mongoose.Schema({
  workflowId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  status: { type: String, enum: ['running', 'success', 'failed', 'stopped'], default: 'running' },
  trigger: { type: String, default: 'manual' },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
  nodes: { type: [nodeRunSchema], default: [] },
  totalDuration: { type: Number, default: 0 },
  tokensUsed: { type: Number, default: 0 },
  errorCount: { type: Number, default: 0 },
  error: { type: String, default: '' },
  finalOutput: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true });

export default mongoose.models.PlaygroundWorkflowRun
  || mongoose.model('PlaygroundWorkflowRun', workflowRunSchema);
