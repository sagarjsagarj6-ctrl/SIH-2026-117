/**
 * HardwareProfiler — Detects host hardware (NVIDIA GPU via nvidia-smi, CPU cores, System RAM).
 */

import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class HardwareProfiler {
  static async detectHardware() {
    const cpus = os.cpus();
    const totalRamBytes = os.totalmem();
    const totalRamGB = Number((totalRamBytes / (1024 ** 3)).toFixed(1));
    const freeRamGB = Number((os.freemem() / (1024 ** 3)).toFixed(1));

    let gpuInfo = {
      detected: false,
      name: 'No NVIDIA GPU detected',
      vramTotalGB: 0,
      vramUsedGB: 0,
      driverVersion: 'N/A',
      cudaVersion: 'N/A',
      telemetrySource: 'unavailable'
    };

    try {
      // Attempt real nvidia-smi call
      const { stdout } = await execAsync('nvidia-smi --query-gpu=name,memory.total,memory.used,driver_version --format=csv,noheader,nounits', { timeout: 2000 });
      if (stdout && stdout.trim()) {
        const [name, total, used, driver] = stdout.trim().split(',').map(s => s.trim());
        gpuInfo = {
          detected: true,
          name,
          vramTotalGB: Number((parseFloat(total) / 1024).toFixed(1)),
          vramUsedGB: Number((parseFloat(used) / 1024).toFixed(1)),
          driverVersion: driver,
          cudaVersion: 'unknown',
          telemetrySource: 'nvidia-smi'
        };
      }
    } catch {
      // Keep on-premise hardware node configuration
    }

    return {
      host: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpuModel: cpus[0]?.model || 'AMD EPYC / Intel Xeon Enterprise Core',
      cpuCores: cpus.length,
      ramTotalGB: totalRamGB,
      ramFreeGB: freeRamGB,
      gpu: gpuInfo
    };
  }
}
