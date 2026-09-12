/**
 * InferenceRouter — Sovereign Local Inference Router.
 * Routes requests ONLY to local model backends to ensure data privacy.
 * Priority: VLLM > Ollama > LlamaCpp > Intelligent Local Fallback
 * 
 * NO external API calls - all inference stays on-premise
 */

import { OllamaBackend } from './backends/OllamaBackend.js';
import { VLLMBackend } from './backends/VLLMBackend.js';
import { LlamaCppBackend } from './backends/LlamaCppBackend.js';
import { IntelligentFallback } from './backends/IntelligentFallback.js';
import { PromptManager } from './PromptManager.js';
import { TokenCounter } from './TokenCounter.js';
import { ModelRegistry } from '../models/ModelRegistry.js';

export class InferenceRouter {
  static get deterministicFallbackEnabled() {
    return process.env.ALLOW_DETERMINISTIC_FALLBACK === 'true';
  }

  /**
   * Check status of all local inference backends
   */
  static async checkBackendStatuses() {
    const [ollama, vllm, llamacpp] = await Promise.all([
      OllamaBackend.isAvailable(),
      VLLMBackend.isAvailable(),
      LlamaCppBackend.isAvailable()
    ]);

    return {
      ollama: ollama ? 'ONLINE' : 'STOPPED',
      vllm: vllm ? 'ONLINE' : 'STOPPED',
      llamacpp: llamacpp ? 'ONLINE' : 'STOPPED',
      primaryBackend: vllm ? 'VLLM' : ollama ? 'Ollama' : llamacpp ? 'LlamaCpp' : 'IntelligentFallback',
      dataPrivacy: 'VERIFIED_SOVEREIGN',
      externalAPIs: 'NONE'
    };
  }

  /**
   * Main inference method - routes to available local backend
   * @param {Object} params - Inference parameters
   * @param {string} params.model - Model name to use
   * @param {string} params.role - Agent role (RAG, DATA_SCIENCE, etc.)
   * @param {string} params.query - User query
   * @param {string} params.context - Retrieved context for RAG
   * @param {string} params.preferredBackend - 'AUTO' | 'VLLM' | 'OLLAMA' | 'LLAMACPP'
   * @param {Array} params.history - Conversation history
   * @param {number} params.temperature - Sampling temperature
   */
  static async infer({
    model = 'Mistral-7B-v0.3-Enterprise',
    role = 'GENERAL',
    query,
    context = '',
    preferredBackend = 'AUTO',
    history = [],
    temperature = 0.7
  }) {
    const modelRecord = await ModelRegistry.getModelByName(model);
    const tokenLimit = TokenCounter.getModelLimit(model);

    // 1. Context Trimming & Prompt Formatting
    const trimmedContext = TokenCounter.trimContext(context, Math.floor(tokenLimit * 0.6));
    const fullPrompt = PromptManager.formatPrompt({
      role,
      context: trimmedContext,
      query,
      history
    });

    const inputTokens = TokenCounter.countTokens(fullPrompt);
    const startTime = Date.now();

    let output = null;
    let backendUsed = 'Unavailable';
    const backendErrors = [];

    // 2. Route to LOCAL backends only (privacy-preserving)
    
    // VLLM - Highest priority local backend
    if (preferredBackend === 'VLLM' || (preferredBackend === 'AUTO' && await VLLMBackend.isAvailable())) {
      try {
        const candidate = await VLLMBackend.generate({ model, prompt: fullPrompt });
        if (candidate?.live && candidate.text) {
          output = candidate;
          backendUsed = candidate.backend;
        } else if (candidate?.error) {
          backendErrors.push(candidate.error);
        }
      } catch (err) {
        backendErrors.push(`vLLM: ${err.message}`);
        console.warn('[InferenceRouter] VLLM failed, trying Ollama:', err.message);
      }
    }

    // Ollama - Second priority local backend
    if (!output && (preferredBackend === 'OLLAMA' || (preferredBackend === 'AUTO' && await OllamaBackend.isAvailable()))) {
      try {
        const candidate = await OllamaBackend.generate({ model, prompt: fullPrompt });
        if (candidate?.live && candidate.text) {
          output = candidate;
          backendUsed = candidate.backend;
        } else if (candidate?.error) {
          backendErrors.push(candidate.error);
        }
      } catch (err) {
        backendErrors.push(`Ollama: ${err.message}`);
        console.warn('[InferenceRouter] Ollama failed, trying LlamaCpp:', err.message);
      }
    }

    // LlamaCpp - Third priority local backend
    if (!output && (preferredBackend === 'LLAMACPP' || (preferredBackend === 'AUTO' && await LlamaCppBackend.isAvailable()))) {
      try {
        const candidate = await LlamaCppBackend.generate({ model, prompt: fullPrompt });
        if (candidate?.live && candidate.text) {
          output = candidate;
          backendUsed = candidate.backend;
        } else if (candidate?.error) {
          backendErrors.push(candidate.error);
        }
      } catch (err) {
        backendErrors.push(`llama.cpp: ${err.message}`);
        console.warn('[InferenceRouter] LlamaCpp failed, using intelligent fallback:', err.message);
      }
    }

    // Demo fallback is opt-in. In normal operation an unavailable local model
    // must be shown honestly instead of returning a pre-written response that
    // looks like an AI completion.
    if (!output) {
      if (this.deterministicFallbackEnabled) {
        output = IntelligentFallback.generate({
          role,
          query,
          context: trimmedContext,
          model
        });
        backendUsed = 'Deterministic Demo Fallback (Explicitly Enabled)';
      } else {
        const totalLatencyMs = Date.now() - startTime;
        return {
          model,
          modelUsed: null,
          backendUsed: 'No live local model',
          usedFallback: false,
          live: false,
          response: '',
          error: {
            code: 'LOCAL_MODEL_UNAVAILABLE',
            message: 'No local Ollama, vLLM, or llama.cpp model is currently available. Install and start an approved local model to generate a response.',
            details: backendErrors
          },
          metrics: {
            inputTokens,
            tokensGenerated: 0,
            totalTokens: inputTokens,
            latencyMs: totalLatencyMs,
            tokensPerSecond: 0
          },
          privacy: {
            dataStaysLocal: true,
            externalAPICalls: 0,
            sovereignProcessing: true
          }
        };
      }
    }

    const totalLatencyMs = Date.now() - startTime;
    const tokensGenerated = output.tokens || Math.ceil((output.text || '').length / 4);
    const tokensPerSec = totalLatencyMs > 0 
      ? Number(((tokensGenerated / (totalLatencyMs / 1000))).toFixed(1)) 
      : 0;

    // Update model latency stats
    if (modelRecord) {
      await ModelRegistry.updateModelHealth(model, { latencyMs: totalLatencyMs });
    }

    return {
      model,
      modelUsed: output.modelUsed || model,
      backendUsed,
      usedFallback: Boolean(output.usedFallback),
      live: Boolean(output.live),
      response: output.text,
      metrics: {
        inputTokens,
        tokensGenerated,
        totalTokens: inputTokens + tokensGenerated,
        latencyMs: totalLatencyMs,
        tokensPerSecond: tokensPerSec
      },
      // Privacy metadata
      privacy: {
        dataStaysLocal: true,
        externalAPICalls: 0,
        sovereignProcessing: true
      }
    };
  }

  /**
   * Streaming inference with SSE support for real-time responses
   */
  static async *inferStream({
    model = 'Mistral-7B-v0.3-Enterprise',
    role = 'GENERAL',
    query,
    context = '',
    preferredBackend = 'AUTO',
    temperature = 0.7
  }) {
    const tokenLimit = TokenCounter.getModelLimit(model);
    const trimmedContext = TokenCounter.trimContext(context, Math.floor(tokenLimit * 0.6));
    const fullPrompt = PromptManager.formatPrompt({ 
      role, 
      context: trimmedContext, 
      query, 
      history: [] 
    });
    
    const startTime = Date.now();

    // Try local backends for streaming
    if (preferredBackend !== 'FALLBACK') {
      // VLLM streaming
      if (preferredBackend === 'VLLM' || (preferredBackend === 'AUTO' && await VLLMBackend.isAvailable())) {
        yield* this._streamVLLM(model, fullPrompt, temperature, startTime);
        return;
      }
      
      // Ollama streaming
      if (preferredBackend === 'OLLAMA' || (preferredBackend === 'AUTO' && await OllamaBackend.isAvailable())) {
        yield* this._streamOllama(model, fullPrompt, startTime);
        return;
      }
    }

    // Demo fallback is opt-in. Do not simulate a live chat completion when no
    // local runtime is available.
    if (!this.deterministicFallbackEnabled) {
      yield {
        done: true,
        live: false,
        backend: 'No live local model',
        error: {
          code: 'LOCAL_MODEL_UNAVAILABLE',
          message: 'Start an approved local model runtime before using streaming chat.'
        },
        metrics: { tokensGenerated: 0, latencyMs: Date.now() - startTime }
      };
      return;
    }

    // Explicitly enabled deterministic demo fallback
    const result = IntelligentFallback.generate({ role, query, context: trimmedContext, model });
    
    // Yield words for streaming effect
    const words = result.text.split(' ');
    for (let i = 0; i < words.length; i++) {
      yield { 
        token: words[i] + (i < words.length - 1 ? ' ' : ''), 
        done: false,
        backend: 'Intelligent Local Fallback'
      };
      await new Promise(r => setTimeout(r, 15)); // Simulate generation delay
    }
    
    yield { 
      done: true, 
      backend: 'Intelligent Local Fallback',
      metrics: { 
        tokensGenerated: words.length,
        latencyMs: Date.now() - startTime 
      }
    };
  }

  static async *_streamVLLM(model, prompt, temperature, startTime) {
    try {
      const response = await fetch('http://localhost:8000/v1/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: true,
          temperature,
          max_tokens: 2048
        })
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(l => l.trim());
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.choices?.[0]?.text) {
                  yield { token: data.choices[0].text, done: false, backend: 'VLLM', live: true };
                }
              } catch {}
            }
          }
        }
        yield { done: true, live: true, backend: 'VLLM', metrics: { latencyMs: Date.now() - startTime } };
        return;
      }
    } catch (err) {
      console.warn('[InferenceRouter] VLLM streaming failed:', err.message);
    }
    
    yield {
      done: true,
      live: false,
      backend: 'vLLM (Unavailable)',
      error: { code: 'LOCAL_MODEL_UNAVAILABLE', message: 'vLLM streaming is unavailable or the requested model is not loaded.' },
      metrics: { tokensGenerated: 0, latencyMs: Date.now() - startTime }
    };
  }

  static async *_streamOllama(model, prompt, startTime) {
    try {
      const resolvedModel = OllamaBackend.resolveModel(model);
      const response = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: resolvedModel,
          prompt,
          stream: true
        })
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(l => l.trim());
          
          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.response) {
                yield { token: data.response, done: false, backend: 'Ollama', live: true };
              }
            } catch {}
          }
        }
        yield { done: true, live: true, backend: 'Ollama', metrics: { latencyMs: Date.now() - startTime } };
        return;
      }
      yield {
        done: true,
        live: false,
        backend: 'Ollama (Unavailable)',
        error: { code: 'LOCAL_MODEL_UNAVAILABLE', message: `Ollama did not accept local model "${resolvedModel}".` },
        metrics: { tokensGenerated: 0, latencyMs: Date.now() - startTime }
      };
      return;
    } catch (err) {
      console.warn('[InferenceRouter] Ollama streaming failed:', err.message);
    }
    
    yield {
      done: true,
      live: false,
      backend: 'Ollama (Connection Failed)',
      error: { code: 'LOCAL_MODEL_UNAVAILABLE', message: 'Ollama streaming connection failed.' },
      metrics: { tokensGenerated: 0, latencyMs: Date.now() - startTime }
    };
  }
}
