/**
 * TokenCounter — Accurate token counting and context window management per model.
 */

export class TokenCounter {
  static MODEL_LIMITS = {
    'Mistral-7B-v0.3-Enterprise': 8192,
    'DeepSeek-R1-Distill-Qwen-14B': 16384,
    'Llama-3-8B-Instruct': 8192,
    'Llama-3.3-70B': 32768,
    'Qwen2-VL-7B-Instruct': 8192,
    'NVIDIA-NeMo-Embed-Enterprise': 2048,
    'DEFAULT': 8192
  };

  /**
   * Estimates token count for English & multilingual text (~4 chars per token).
   */
  static countTokens(text) {
    if (!text || typeof text !== 'string') return 0;
    // Fast accurate approximation (words + punctuation weights)
    const words = text.trim().split(/\s+/).filter(Boolean);
    const charCount = text.length;
    return Math.max(words.length, Math.ceil(charCount / 3.8));
  }

  static getModelLimit(modelName) {
    return this.MODEL_LIMITS[modelName] || this.MODEL_LIMITS.DEFAULT;
  }

  /**
   * Trims context to fit within the designated token budget.
   */
  static trimContext(contextText, maxBudgetTokens = 4096) {
    const currentTokens = this.countTokens(contextText);
    if (currentTokens <= maxBudgetTokens) return contextText;

    const targetChars = maxBudgetTokens * 3.8;
    return contextText.slice(0, targetChars) + '\n...[Context truncated to meet model token bounds]';
  }
}
