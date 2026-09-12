/**
 * OllamaBackend — Integration with local Ollama API (http://localhost:11434) with air-gap fallback.
 */

export class OllamaBackend {
  // UI/catalogue labels are intentionally separate from executable Ollama tags.
  // A single configured local model can therefore serve the existing agent
  // defaults without requiring the user to create impossible custom aliases.
  static CATALOG_MODEL_NAMES = new Set([
    'mistral-7b-v0.3-enterprise',
    'deepseek-r1-distill-qwen-14b',
    'llama-3-8b-instruct',
    'qwen2-vl-7b-instruct',
    'qwen2-vl-7b-visionocr'
  ]);

  static get endpoint() {
    return process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
  }

  static resolveModel(requestedModel) {
    const requested = String(requestedModel || '').trim();
    const configured = String(process.env.OLLAMA_MODEL || '').trim();
    const isCatalogueName = this.CATALOG_MODEL_NAMES.has(requested.toLowerCase());

    if (!requested || isCatalogueName) return configured || 'qwen2.5:3b-instruct-q5_0';
    return requested;
  }

  static async isAvailable() {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`${this.endpoint}/api/tags`, { signal: controller.signal });
      clearTimeout(id);
      return res.ok;
    } catch {
      return false;
    }
  }

  static async generate({ model, prompt, stream = false }) {
    const resolvedModel = this.resolveModel(model);
    const online = await this.isAvailable();
    if (online) {
      try {
        const res = await fetch(`${this.endpoint}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: resolvedModel,
            prompt,
            stream: false
          })
        });
        if (res.ok) {
          const data = await res.json();
          return {
            text: data.response,
            backend: 'Ollama (Live Local Daemon)',
            usedFallback: false,
            live: true,
            modelUsed: resolvedModel,
            tokens: data.eval_count || 120,
            latencyMs: Math.floor(data.total_duration ? data.total_duration / 1e6 : 140)
          };
        }
      } catch (err) {
        console.warn('[OllamaBackend] Live call failed, switching to air-gap engine:', err.message);
      }
    }

    // Do not return a pre-written answer as if it were model output. The
    // router decides whether an explicitly enabled deterministic demo fallback
    // may be used; normal production flow receives this unavailable signal.
    return {
      text: '',
      backend: 'Ollama (Unavailable)',
      usedFallback: true,
      live: false,
      modelUsed: resolvedModel,
      error: `Ollama is unavailable or the local model "${resolvedModel}" is not installed.`,
      tokens: 0,
      latencyMs: 0
    };
  }
}
