/**
 * ModelAllocator — Dynamically matches models and quantization levels to available GPU VRAM.
 */

import { HardwareProfiler } from './HardwareProfiler.js';

export class ModelAllocator {
  static ALLOCATION_TIERS = {
    tier1: { minVRAM: 20, model: 'Llama-3.3-70B', quantization: 'Q4_K_M', device: 'GPU (Full Offload)' },
    tier2: { minVRAM: 10, model: 'DeepSeek-R1-Distill-Qwen-14B', quantization: 'Q4_K_S', device: 'GPU (Full Offload)' },
    tier3: { minVRAM: 6, model: 'Mistral-7B-v0.3-Enterprise', quantization: 'Q4_K_M', device: 'GPU (Tensor Cores)' },
    fallback: { minVRAM: 0, model: 'Mistral-7B-v0.3-Enterprise', quantization: 'Q2_K', device: 'CPU Fallback' }
  };

  static async determineOptimalModel() {
    const hw = await HardwareProfiler.detectHardware();
    const vram = hw.gpu.vramTotalGB;

    let selectedTier = this.ALLOCATION_TIERS.fallback;
    let tierName = 'fallback';

    if (vram >= 20) {
      selectedTier = this.ALLOCATION_TIERS.tier1;
      tierName = 'tier1 (Ultra 70B)';
    } else if (vram >= 10) {
      selectedTier = this.ALLOCATION_TIERS.tier2;
      tierName = 'tier2 (Pro 14B)';
    } else if (vram >= 6) {
      selectedTier = this.ALLOCATION_TIERS.tier3;
      tierName = 'tier3 (Standard 7B-8B)';
    }

    return {
      tier: tierName,
      hardware: {
        vramAvailableGB: vram,
        cpuCores: hw.cpuCores,
        ramGB: hw.ramTotalGB
      },
      allocation: selectedTier,
      recommendation: `Allocated [${selectedTier.model}] with [${selectedTier.quantization}] on ${selectedTier.device} based on ${vram} GB VRAM.`
    };
  }
}
