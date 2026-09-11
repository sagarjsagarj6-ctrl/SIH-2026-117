/**
 * FineTuneOrchestrator — dataset preparation, job lifecycle, progress, and
 * optional live local LoRA execution.
 */

import { DatasetPreparer } from './DatasetPreparer.js';
import { LoRATrainer } from './LoRATrainer.js';
import { ModelValidator } from './ModelValidator.js';
import { TrainingRuntime } from './TrainingRuntime.js';
import { state } from '../../config/db.js';
import FineTuneJob from '../../models/FineTuneJob.js';
import KnowledgeDoc from '../../models/KnowledgeDoc.js';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const toId = (job) => String(job?._id || job?.id || '');

export class FineTuneOrchestrator {
  static async getJob(jobId) {
    if (state.isMongooseConnected) {
      return FineTuneJob.findById(jobId);
    }
    return (state.memoryDb.fineTuneJobs || []).find(job => toId(job) === String(jobId)) || null;
  }

  static async updateJob(jobId, patch) {
    if (state.isMongooseConnected) {
      return FineTuneJob.findByIdAndUpdate(jobId, { $set: patch }, { new: true, runValidators: true });
    }
    const job = (state.memoryDb.fineTuneJobs || []).find(item => toId(item) === String(jobId));
    if (!job) return null;
    Object.assign(job, patch, { updatedAt: new Date() });
    return job;
  }

  static async startJob({
    jobName,
    baseModel,
    department,
    method = 'QLoRA',
    epochs = 3,
    learningRate = '2e-4',
    trainingConfig = {},
    requestedExecutionMode = 'AUTO',
    createdBy = 'System',
    ownerRole = 'Employee',
    ownerId = '',
    trainDataFile = '',
    testDataFile = '',
    trainDataFilePath = '',
    extra = {}
  }) {
    return (async () => {
      let docs = [];
      if (state.isMongooseConnected) {
        docs = await KnowledgeDoc.find({ $or: [{ department }, { department: 'All' }] });
      } else {
        docs = (state.memoryDb.knowledgeDocs || []).filter(d => d.department === department || d.department === 'All');
      }

      let dataset;
      if (trainDataFilePath) {
        if (!TrainingRuntime.isTrainingPathAllowed(trainDataFilePath)) {
          throw new Error('Training dataset path is outside the protected local training directory.');
        }
        dataset = await DatasetPreparer.prepareUploadedDataset({ filePath: trainDataFilePath, department });
      } else {
        dataset = DatasetPreparer.prepareInstructionDataset({ documents: docs, department });
      }
      const capabilities = await TrainingRuntime.getCapabilities();
      const requested = String(requestedExecutionMode || 'AUTO').toUpperCase();
      if (requested === 'LIVE' && !capabilities.liveReady) {
        const error = new Error(`Live LoRA training is not ready. ${capabilities.detail}`);
        error.status = 409;
        throw error;
      }

      const executionMode = requested === 'SIMULATED' || (!capabilities.liveReady && requested !== 'LIVE')
        ? 'SIMULATED_PROGRESS'
        : 'LIVE';
      const jobKey = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const datasetFiles = await TrainingRuntime.writeDataset(jobKey, dataset.jsonlContent);
      const normalizedEpochs = Math.min(20, Math.max(1, Number.parseInt(epochs, 10) || 3));
      const normalizedConfig = {
        batchSize: Math.min(64, Math.max(1, Number(trainingConfig.batchSize) || 4)),
        learningRate: String(learningRate || trainingConfig.learningRate || '2e-4'),
        loraRank: Math.min(256, Math.max(4, Number(trainingConfig.loraRank) || 16)),
        loraAlpha: Math.min(512, Math.max(8, Number(trainingConfig.loraAlpha) || 32)),
        warmupSteps: Math.min(10000, Math.max(0, Number(trainingConfig.warmupSteps) || 0))
      };
      const trainingProgress = LoRATrainer.simulateTrainingProgress({ epochs: normalizedEpochs, currentEpoch: 0 });

      const jobData = {
        jobName,
        baseModel,
        department,
        datasetName: `${department}_Instruction_Tuning_v1.jsonl`,
        method,
        epochs: normalizedEpochs,
        learningRate: normalizedConfig.learningRate,
        status: 'Queued',
        executionMode,
        simulation: executionMode !== 'LIVE',
        fallbackReason: executionMode === 'LIVE' ? '' : capabilities.detail,
        progressPercent: 0,
        currentLoss: trainingProgress.currentLoss,
        lossHistory: [],
        sampleCount: dataset.totalSamples,
        trainCount: dataset.trainCount,
        testCount: dataset.testCount,
        trainingConfig: normalizedConfig,
        datasetPath: datasetFiles.datasetPath,
        createdBy,
        ownerRole,
        ownerId,
        trainDataFile,
        testDataFile,
        startedAt: new Date(),
        ...extra
      };

      let job;
      if (state.isMongooseConnected) {
        job = await FineTuneJob.create(jobData);
      } else {
        job = { _id: jobKey, ...jobData, createdAt: new Date(), updatedAt: new Date() };
        state.memoryDb.fineTuneJobs = state.memoryDb.fineTuneJobs || [];
        state.memoryDb.fineTuneJobs.unshift(job);
      }

      return {
        job,
        datasetSummary: {
          totalSamples: dataset.totalSamples,
          trainCount: dataset.trainCount,
          testCount: dataset.testCount,
          samplePreview: dataset.samplePreview
        },
        capabilities
      };
    })();
  }

  static async runJob(jobId) {
    const job = await this.getJob(jobId);
    if (!job) return null;

    try {
      await this.updateJob(jobId, { status: 'Training', startedAt: new Date(), errorMessage: '' });
      const runtimeJob = await this.getJob(jobId);
      const config = runtimeJob.trainingConfig || {};

      if (runtimeJob.executionMode === 'LIVE') {
        const capabilities = await TrainingRuntime.getCapabilities();
        const outputDirectory = runtimeJob.datasetPath.replace(/dataset\.jsonl$/i, 'adapter');
        await TrainingRuntime.runLive({
          capabilities,
          datasetPath: runtimeJob.datasetPath,
          outputDirectory,
          config: { ...config, epochs: runtimeJob.epochs },
          onProgress: async (progress) => {
            const loss = Number.isFinite(Number(progress.loss)) ? Number(progress.loss) : runtimeJob.currentLoss;
            const historyEntry = {
              epoch: progress.epoch || Math.max(1, Math.ceil((Number(progress.progressPercent) || 0) / 100 * runtimeJob.epochs)),
              loss,
              learningRate: runtimeJob.learningRate,
              recordedAt: new Date()
            };
            const latest = await this.getJob(jobId);
            if (latest?.cancelRequested) return;
            await this.updateJob(jobId, {
              progressPercent: Math.min(99, Number(progress.progressPercent) || 0),
              currentLoss: loss,
              lossHistory: [...(latest?.lossHistory || []), historyEntry].slice(-200)
            });
          }
        });
      } else {
        for (let epoch = 1; epoch <= runtimeJob.epochs; epoch += 1) {
          const current = await this.getJob(jobId);
          if (current?.cancelRequested) {
            await this.updateJob(jobId, { status: 'Cancelled', errorMessage: 'Training cancelled by the job owner.' });
            return this.getJob(jobId);
          }
          const metric = LoRATrainer.simulateTrainingProgress({
            epochs: runtimeJob.epochs,
            currentEpoch: epoch,
            initialLoss: epoch === 1 ? 1.85 : Number(current?.currentLoss || 1.85)
          });
          const historyEntry = {
            epoch,
            loss: metric.currentLoss,
            learningRate: runtimeJob.learningRate,
            recordedAt: new Date()
          };
          await this.updateJob(jobId, {
            progressPercent: metric.progressPercent,
            currentLoss: metric.currentLoss,
            lossHistory: [...(current?.lossHistory || []), historyEntry]
          });
          await delay(350);
        }
      }

      const validation = ModelValidator.evaluate({
        baseModel: runtimeJob.baseModel,
        adapterName: runtimeJob.jobName,
        department: runtimeJob.department,
        simulation: runtimeJob.executionMode !== 'LIVE',
        executionMode: runtimeJob.executionMode
      });
      await this.updateJob(jobId, {
        status: 'Completed',
        progressPercent: 100,
        validation,
        currentLoss: runtimeJob.executionMode === 'LIVE' ? runtimeJob.currentLoss : 0.38
      });
      return this.getJob(jobId);
    } catch (error) {
      await this.updateJob(jobId, { status: 'Failed', errorMessage: error.message });
      return this.getJob(jobId);
    }
  }

  static async cancelJob(jobId) {
    const job = await this.getJob(jobId);
    if (!job) return null;
    if (['Completed', 'Failed', 'Cancelled'].includes(job.status)) return job;
    return this.updateJob(jobId, { cancelRequested: true });
  }

  static async validateJob(jobId) {
    const job = await this.getJob(jobId);
    if (!job) throw new Error('Job not found');
    const validation = ModelValidator.evaluate({
      baseModel: job.baseModel,
      adapterName: job.jobName,
      department: job.department,
      simulation: job.executionMode !== 'LIVE',
      executionMode: job.executionMode
    });
    await this.updateJob(jobId, { validation });
    return { job: await this.getJob(jobId), validation };
  }
}
