import mongoose from 'mongoose';

const workflowNodeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, required: true },
  position: {
    x: { type: Number, default: 80 },
    y: { type: Number, default: 80 }
  },
  data: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: false });

const workflowEdgeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  source: { type: String, required: true },
  sourceHandle: { type: String, default: 'output' },
  target: { type: String, required: true },
  targetHandle: { type: String, default: 'input' }
}, { _id: false });

const workflowSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  ownerId: { type: String, required: true, index: true },
  department: { type: String, required: true, index: true },
  nodes: { type: [workflowNodeSchema], default: [] },
  edges: { type: [workflowEdgeSchema], default: [] },
  settings: {
    concurrency: { type: Number, default: 1 },
    errorHandling: { type: String, enum: ['stop', 'continue'], default: 'stop' },
    timeout: { type: Number, default: 300000 }
  },
  isActive: { type: Boolean, default: false },
  lastRunAt: { type: Date, default: null },
  runCount: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.models.PlaygroundWorkflow
  || mongoose.model('PlaygroundWorkflow', workflowSchema);
