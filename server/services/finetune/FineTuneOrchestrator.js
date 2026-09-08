/**
 * FineTuneOrchestrator — Manages end-to-end local fine-tune job lifecycle.
 */

import { DatasetPreparer } from './DatasetPreparer.js';
import { LoRATrainer } from './LoRATrainer.js';
import { ModelValidator } from './ModelValidator.js';
import { state } from '../../config/db.js';
import FineTuneJob from '../../models/FineTuneJob.js';
import KnowledgeDoc from '../../models/KnowledgeDoc.js';

export class FineTuneOrchestrator {
  static async startJob({ jobName, baseModel, department, method = 'QLoRA', epochs = 3, learningRate = '2e-4' }) {
    // 1. Fetch department documents to prepare dataset
    let docs = [];
    if (state.isMongooseConnected) {
      docs = await KnowledgeDoc.find({
        $or: [{ department }, { department: 'All' }]
      });
    } else {
      docs = (state.memoryDb.knowledgeDocs || []).filter(d => d.department === department || d.department === 'All');
    }

    const dataset = DatasetPreparer.prepareInstructionDataset({ documents: docs, department });
    const trainingProgress = LoRATrainer.simulateTrainingProgress({ epochs, currentEpoch: 1 });

    const jobData = {
      jobName,
      baseModel,
      department,
      datasetName: `${department}_Instruction_Tuning_v1.jsonl`,
      method,
      epochs: parseInt(epochs),
      learningRate,
      status: 'Training',
      progressPercent: trainingProgress.progressPercent,
      currentLoss: trainingProgress.currentLoss,
      sampleCount: dataset.totalSamples,
      startedAt: new Date()
    };

    let newJob;
    if (state.isMongooseConnected) {
      newJob = await FineTuneJob.create(jobData);
    } else {
      newJob = { _id: 'job_' + Date.now(), ...jobData };
      state.memoryDb.fineTuneJobs = state.memoryDb.fineTuneJobs || [];
      state.memoryDb.fineTuneJobs.unshift(newJob);
    }

    return {
      job: newJob,
      datasetSummary: {
        totalSamples: dataset.totalSamples,
        trainCount: dataset.trainCount,
        testCount: dataset.testCount
      }
    };
  }

  static async completeJob(jobId) {
    let job = null;
    if (state.isMongooseConnected) {
      job = await FineTuneJob.findById(jobId);
      if (job) {
        job.status = 'Completed';
        job.progressPercent = 100;
        job.currentLoss = 0.38;
        await job.save();
      }
    } else {
      job = (state.memoryDb.fineTuneJobs || []).find(j => j._id === jobId || j.id === jobId);
      if (job) {
        job.status = 'Completed';
        job.progressPercent = 100;
        job.currentLoss = 0.38;
      }
    }

    if (!job) throw new Error('Job not found');

    const validation = ModelValidator.evaluate({
      baseModel: job.baseModel,
      adapterName: job.jobName,
      department: job.department
    });

    return { job, validation };
  }
}
