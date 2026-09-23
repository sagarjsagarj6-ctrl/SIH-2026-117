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

  static modelCache = { models: null, expiresAt: 0 };

  static get endpoint() {
    return (process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/+$/, '');
  }

  static resolveModel(requestedModel) {
    const requested = String(requestedModel || '').trim();
    const configured = String(process.env.OLLAMA_MODEL || '').trim();
    const isCatalogueName = this.CATALOG_MODEL_NAMES.has(requested.toLowerCase());

    // Keep a valid, commonly available local default for direct service/test
    // usage when dotenv has not been loaded by the server entry point.
    if (!requested || isCatalogueName) return configured || 'qwen2.5:3b';
    return requested;
  }

  static async getInstalledModels() {
    if (this.modelCache.models && Date.now() < this.modelCache.expiresAt) {
      return this.modelCache.models;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    try {
      const response = await fetch(`${this.endpoint}/api/tags`, { signal: controller.signal });
      if (!response.ok) return null;
      const data = await response.json();
      const models = Array.isArray(data.models) ? data.models : [];
      this.modelCache = { models, expiresAt: Date.now() + 30_000 };
      return models;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  static resolveInstalledModel(requestedModel, installedModels) {
    const requested = String(requestedModel || '').trim();
    const configured = String(process.env.OLLAMA_MODEL || '').trim();
    const catalogueName = this.CATALOG_MODEL_NAMES.has(requested.toLowerCase());
    const names = (installedModels || []).map((model) => String(model.name || model.model || '').trim()).filter(Boolean);
    const lowerNames = new Map(names.map((name) => [name.toLowerCase(), name]));

    // A direct Ollama tag always wins when it is installed.
    if (lowerNames.has(requested.toLowerCase())) return lowerNames.get(requested.toLowerCase());
    if (configured && lowerNames.has(configured.toLowerCase())) return lowerNames.get(configured.toLowerCase());

    // UI catalogue labels (including Advanced-mode defaults) are aliases, not
    // literal Ollama tags. Use the first installed local model if no explicit
    // OLLAMA_MODEL was configured, so a valid local daemon is still usable.
    if (!requested || catalogueName) return names[0] || this.resolveModel(requested);
    return requested;
  }

  static async isAvailable() {
    return (await this.getInstalledModels()) !== null;
  }

  static async generate({ model, prompt, stream = false }) {
    const installedModels = await this.getInstalledModels();
    const resolvedModel = installedModels
      ? this.resolveInstalledModel(model, installedModels)
      : this.resolveModel(model);
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
