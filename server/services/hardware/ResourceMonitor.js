/**
 * ResourceMonitor — Real-time telemetry monitoring for GPU, CPU, and RAM utilization.
 */

import os from 'os';
import { execFileSync } from 'node:child_process';

export class ResourceMonitor {
  static getGpuMetrics() {
    try {
      const raw = execFileSync('nvidia-smi', [
        '--query-gpu=utilization.gpu,memory.total,memory.used,temperature.gpu,fan.speed,power.draw',
        '--format=csv,noheader,nounits'
      ], { encoding: 'utf8', timeout: 1500, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      const [utilization, total, used, temperature, fan, power] = raw.split(',').map(value => Number(value.trim()));
      const vramTotalGB = Number((total / 1024).toFixed(1));
      const vramUsedGB = Number((used / 1024).toFixed(1));
      return {
        utilizationPct: Number(utilization.toFixed(1)),
        vramTotalGB,
        vramUsedGB,
        vramFreeGB: Number(Math.max(0, vramTotalGB - vramUsedGB).toFixed(1)),
        temperatureC: temperature,
        fanSpeedPct: fan,
        powerDrawWatts: power,
        telemetrySource: 'nvidia-smi'
      };
    } catch {
      return {
        utilizationPct: null,
        vramTotalGB: 0,
        vramUsedGB: 0,
        vramFreeGB: 0,
        temperatureC: null,
        fanSpeedPct: null,
        powerDrawWatts: null,
        telemetrySource: 'unavailable'
      };
    }
  }

  static getMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPct = Number(((usedMem / totalMem) * 100).toFixed(1));

    const gpu = this.getGpuMetrics();
    const loadAverage = os.loadavg()[0] ? Number(os.loadavg()[0].toFixed(2)) : null;

    return {
      timestamp: new Date().toISOString(),
      cpu: {
        cores: os.cpus().length,
        loadAverage,
        utilizationPct: loadAverage === null ? null : Number(Math.min(100, (loadAverage / Math.max(1, os.cpus().length) * 100)).toFixed(1)),
        telemetrySource: 'os'
      },
      ram: {
        totalGB: Number((totalMem / (1024 ** 3)).toFixed(1)),
        usedGB: Number((usedMem / (1024 ** 3)).toFixed(1)),
        freeGB: Number((freeMem / (1024 ** 3)).toFixed(1)),
        utilizationPct: memPct
      },
      gpu
    };
  }
}
