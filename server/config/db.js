import mongoose from 'mongoose';

export const state = {
  isMongooseConnected: false,
  memoryDb: {
    users: [],
    departments: [],
    models: [],
    auditLogs: [],
    knowledgeDocs: [],
    fineTuneJobs: []
  }
};

export const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sovereign_ai_db';
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 2000
    });
    state.isMongooseConnected = true;
    console.log(`[MongoDB] Connected successfully to ${mongoURI}`);
  } catch (error) {
    state.isMongooseConnected = false;
    console.warn(`[MongoDB] Local MongoDB connection skipped/unavailable (${error.message}). Operating in High-Speed Local In-Memory Mode.`);
  }
};
