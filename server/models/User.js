import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'Manager', 'Employee'], default: 'Employee' },
  department: { type: String, required: true },
  assignedAIProfile: { type: String, enum: ['Fast', 'Balanced', 'Advanced'], default: 'Balanced' },
  status: { type: String, enum: ['Active', 'Inactive', 'Suspended'], default: 'Active' },
  lastLogin: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', userSchema);
