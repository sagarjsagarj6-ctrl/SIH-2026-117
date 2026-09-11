/**
 * TrainingRuntime — capability detection and safe local trainer execution.
 *
 * The default mode is honest simulation. Live LoRA training is enabled only
 * when a local Python environment, model path, and the required ML packages
 * are all present. No user input is executed through a shell.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const trainingRoot = path.resolve(__dirname, '../../data/training');
const defaultScript = path.join(__dirname, 'train_lora.py');

const normalizeMode = (mode) => String(mode || process.env.TRAINING_MODE || 'auto').trim().toUpperCase();

const pythonProbe = (pythonCommand) => {
  try {
    const probe = spawnSync(
      pythonCommand,
      ['-c', 'import importlib.util; required=("torch","transformers","peft","datasets"); missing=[m for m in required if importlib.util.find_spec(m) is None]; print("|".join(missing))'],
      { encoding: 'utf8', timeout: 2500, windowsHide: true }
    );
    if (probe.error || probe.status !== 0) {
      return { available: false, missing: ['python'], detail: probe.error?.message || 'Python probe failed.' };
    }
    const missing = String(probe.stdout || '').trim().split('|').filter(Boolean);
    return { available: true, missing, detail: missing.length ? `Missing Python packages: ${missing.join(', ')}` : 'Python ML runtime ready.' };
  } catch (error) {
    return { available: false, missing: ['python'], detail: error.message };
  }
};

export class TrainingRuntime {
  static get rootDirectory() {
    return trainingRoot;
  }

  static async saveUploadedDataset({ buffer, originalName }) {
    const safeName = path.basename(String(originalName || 'dataset.jsonl')).replace(/[^a-zA-Z0-9._-]/g, '_');
    const uploadDirectory = path.join(trainingRoot, 'uploads');
    await fs.mkdir(uploadDirectory, { recursive: true });
    const datasetPath = path.join(uploadDirectory, `${crypto.randomUUID()}-${safeName}`);
    await fs.writeFile(datasetPath, buffer);
    return { datasetPath, fileName: safeName, sizeBytes: buffer.length };
  }

  static isTrainingPathAllowed(filePath) {
    if (!filePath) return false;
    const resolved = path.resolve(filePath);
    return resolved === trainingRoot || resolved.startsWith(`${trainingRoot}${path.sep}`);
  }

  static async getCapabilities() {
    const requestedMode = normalizeMode();
    const pythonCommand = process.env.TRAINING_PYTHON || 'python';
    const scriptPath = path.resolve(process.env.LORA_TRAINER_SCRIPT || defaultScript);
    const modelPath = process.env.TRAINING_MODEL_PATH || '';
    const python = pythonProbe(pythonCommand);
    let scriptAvailable = false;
    try {
      await fs.access(scriptPath);
      scriptAvailable = true;
    } catch {
      scriptAvailable = false;
    }

    let modelAvailable = false;
    if (modelPath) {
      try {
        await fs.access(path.resolve(modelPath));
        modelAvailable = true;
      } catch {
        modelAvailable = false;
      }
    }

    const liveReady = python.available && python.missing.length === 0 && scriptAvailable && modelAvailable;
    const missing = [
      ...(python.available ? python.missing : ['python']),
      ...(!scriptAvailable ? ['LORA_TRAINER_SCRIPT'] : []),
      ...(!modelAvailable ? ['TRAINING_MODEL_PATH'] : [])
    ];

    return {
      requestedMode,
      selectedMode: liveReady && requestedMode !== 'SIMULATED' ? 'LIVE' : 'SIMULATED_PROGRESS',
      liveReady,
      simulationAvailable: true,
      pythonCommand,
      scriptPath,
      modelPath: modelPath || null,
      missing,
      detail: liveReady
        ? 'Live local LoRA runtime is ready.'
        : `Simulation is active until the local trainer is configured${missing.length ? ` (${missing.join(', ')})` : ''}.`
    };
  }

  static async writeDataset(jobId, jsonlContent) {
    const jobDirectory = path.join(trainingRoot, String(jobId));
    await fs.mkdir(jobDirectory, { recursive: true });
    const datasetPath = path.join(jobDirectory, 'dataset.jsonl');
    await fs.writeFile(datasetPath, `${jsonlContent || ''}\n`, 'utf8');
    return { jobDirectory, datasetPath, outputDirectory: path.join(jobDirectory, 'adapter') };
  }

  static runLive({ capabilities, datasetPath, outputDirectory, config = {}, onProgress = () => {} }) {
    return new Promise((resolve, reject) => {
      const args = [
        capabilities.scriptPath,
        '--dataset', datasetPath,
        '--output', outputDirectory,
        '--model', capabilities.modelPath,
        '--epochs', String(config.epochs || 3),
        '--batch-size', String(config.batchSize || 4),
        '--learning-rate', String(config.learningRate || '2e-4'),
        '--lora-r', String(config.loraRank || 16),
        '--lora-alpha', String(config.loraAlpha || 32),
        '--warmup-steps', String(config.warmupSteps || 0)
      ];
      const child = spawn(capabilities.pythonCommand, args, { windowsHide: true });
      let stdout = '';
      let stderr = '';
      let settled = false;

      const handleOutput = (chunk) => {
        const text = String(chunk);
        stdout += text;
        for (const line of text.split(/\r?\n/)) {
          if (!line.startsWith('SOVEREIGN_TRAIN_PROGRESS ')) continue;
          try {
            onProgress(JSON.parse(line.slice('SOVEREIGN_TRAIN_PROGRESS '.length)));
          } catch {
            // Ignore malformed progress lines; process exit remains authoritative.
          }
        }
      };

      child.stdout.on('data', handleOutput);
      child.stderr.on('data', (chunk) => { stderr += String(chunk); });
      child.on('error', (error) => {
        if (settled) return;
        settled = true;
        reject(error);
      });
      child.on('close', (code) => {
        if (settled) return;
        settled = true;
        if (code === 0) return resolve({ stdout, stderr });
        reject(new Error(`Live LoRA trainer exited with code ${code}: ${stderr.slice(-1200) || stdout.slice(-1200)}`));
      });
    });
  }
}
