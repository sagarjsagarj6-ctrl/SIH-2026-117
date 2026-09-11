/**
 * EnvChecker — Automated environment variable validation, connectivity probing,
 * and capability readiness diagnostics for Sovereign AI Enterprise Workbench.
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';
import mongoose from 'mongoose';
import { state } from '../../config/db.js';
import { TrainingRuntime } from '../finetune/TrainingRuntime.js';
import { ImageOCRParser } from '../ingestion/parsers/ImageOCRParser.js';
import { EmbeddingService } from '../knowledge/EmbeddingService.js';

export class EnvChecker {
  /**
   * Probes an HTTP/HTTPS endpoint with an aggressive timeout.
   */
  static async probeEndpoint(targetUrl, timeoutMs = 1500) {
    return new Promise((resolve) => {
      try {
        const parsed = new URL(targetUrl);
        const client = parsed.protocol === 'https:' ? https : http;
        const req = client.request(
          {
            hostname: parsed.hostname,
            port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path: parsed.pathname || '/',
            method: 'GET',
            timeout: timeoutMs
          },
          (res) => {
            resolve({
              reachable: true,
              statusCode: res.statusCode,
              latencyMs: Date.now() - startTime
            });
          }
        );

        const startTime = Date.now();
        req.on('timeout', () => {
          req.destroy();
          resolve({ reachable: false, reason: 'Connection timeout', latencyMs: timeoutMs });
        });

        req.on('error', (err) => {
          resolve({ reachable: false, reason: err.message, latencyMs: Date.now() - startTime });
        });

        req.end();
      } catch (err) {
        resolve({ reachable: false, reason: err.message, latencyMs: 0 });
      }
    });
  }

  /**
   * Evaluates all platform environment variables.
   */
  static evaluateVariables() {
    const defaultSecret = 'sovereign_enterprise_airgap_secret_key_2026_x992';
    const currentSecret = process.env.JWT_SECRET;
    const isPlaceholderSecret = !currentSecret || currentSecret === defaultSecret || currentSecret === 'your_secure_airgapped_jwt_secret_key_minimum_32_chars_long';

    const variables = [
      {
        key: 'PORT',
        value: process.env.PORT || '5001 (Default)',
        configured: Boolean(process.env.PORT),
        status: 'VALID',
        description: 'Server HTTP listening port'
      },
      {
        key: 'NODE_ENV',
        value: process.env.NODE_ENV || 'development (Default)',
        configured: Boolean(process.env.NODE_ENV),
        status: 'VALID',
        description: 'Execution environment runtime mode'
      },
      {
        key: 'ALLOW_SELF_REGISTRATION',
        value: process.env.ALLOW_SELF_REGISTRATION || 'true (Development Default)',
        configured: Boolean(process.env.ALLOW_SELF_REGISTRATION),
        status: process.env.NODE_ENV === 'production' && process.env.ALLOW_SELF_REGISTRATION !== 'true' ? 'VALID' : 'WARNING_REVIEW',
        description: 'Controls whether unauthenticated users may create Employee accounts'
      },
      {
        key: 'MONGODB_URI',
        value: process.env.MONGODB_URI ? `${process.env.MONGODB_URI.split('@').pop()}` : 'mongodb://127.0.0.1:27017/sovereign_ai_db (Default)',
        configured: Boolean(process.env.MONGODB_URI),
        status: 'VALID',
        description: 'MongoDB connection string with automatic in-memory fallback'
      },
      {
        key: 'JWT_SECRET',
        value: currentSecret ? `${currentSecret.substring(0, 6)}...[REDACTED]` : 'Using fallback secret',
        configured: Boolean(process.env.JWT_SECRET),
        status: isPlaceholderSecret ? 'WARNING_DEFAULT_KEY' : (currentSecret && currentSecret.length < 32) ? 'WARNING_LOW_ENTROPY' : 'OPTIMAL',
        description: 'HMAC-SHA256 signature secret for air-gapped authentication'
      },
      {
        key: 'OLLAMA_HOST',
        value: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434 (Default)',
        configured: Boolean(process.env.OLLAMA_HOST),
        status: 'VALID',
        description: 'Ollama local inference daemon endpoint'
      },
      {
        key: 'VLLM_HOST',
        value: process.env.VLLM_HOST || 'http://127.0.0.1:8000 (Default)',
        configured: Boolean(process.env.VLLM_HOST),
        status: 'VALID',
        description: 'vLLM OpenAI-compatible high-throughput inference engine'
      },
      {
        key: 'LLAMACPP_HOST',
        value: process.env.LLAMACPP_HOST || 'http://127.0.0.1:8080 (Default)',
        configured: Boolean(process.env.LLAMACPP_HOST),
        status: 'VALID',
        description: 'llama.cpp standalone server endpoint'
      },
      {
        key: 'ALLOW_LAN_ONLY',
        value: process.env.ALLOW_LAN_ONLY || 'true (Default)',
        configured: Boolean(process.env.ALLOW_LAN_ONLY),
        status: 'VALID',
        description: 'Restricts traffic strictly to isolated private subnets'
      },
      {
        key: 'AIRGAP_MODE',
        value: process.env.AIRGAP_MODE || 'true (Default)',
        configured: Boolean(process.env.AIRGAP_MODE),
        status: 'VALID',
        description: 'Enforces zero-outbound WAN policy and offline execution'
      },
      {
        key: 'CLIENT_ORIGIN',
        value: process.env.CLIENT_ORIGIN || 'http://localhost:5173 (Default)',
        configured: Boolean(process.env.CLIENT_ORIGIN),
        status: 'VALID',
        description: 'Approved origin for Cross-Origin Resource Sharing (CORS)'
      },
      {
        key: 'LOG_LEVEL',
        value: process.env.LOG_LEVEL || 'info (Default)',
        configured: Boolean(process.env.LOG_LEVEL),
        status: 'VALID',
        description: 'Diagnostic log verbosity level'
      },
      {
        key: 'EMBEDDING_BACKEND',
        value: process.env.EMBEDDING_BACKEND || 'auto (Default)',
        configured: Boolean(process.env.EMBEDDING_BACKEND),
        status: 'VALID',
        description: 'Neural Ollama embedding selection with deterministic local fallback'
      },
      {
        key: 'TRAINING_MODE',
        value: process.env.TRAINING_MODE || 'auto (Default)',
        configured: Boolean(process.env.TRAINING_MODE),
        status: 'VALID',
        description: 'Live or capability-gated simulated LoRA training mode'
      },
      {
        key: 'TRAINING_MODEL_PATH',
        value: process.env.TRAINING_MODEL_PATH || 'Not configured (optional)',
        configured: Boolean(process.env.TRAINING_MODEL_PATH),
        status: process.env.TRAINING_MODE === 'live' && !process.env.TRAINING_MODEL_PATH ? 'WARNING_REQUIRED_FOR_LIVE' : 'OPTIONAL',
        description: 'Local Hugging Face-compatible model path for live training'
      },
      {
        key: 'TESSERACT_CMD',
        value: process.env.TESSERACT_CMD || 'tesseract (Default)',
        configured: Boolean(process.env.TESSERACT_CMD),
        status: 'OPTIONAL',
        description: 'Local OCR executable for real image text extraction'
      }
    ];

    return variables;
  }

  /**
   * Conducts live connectivity probes on configured services.
   */
  static async probeAllServices() {
    const ollamaUrl = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
    const vllmUrl = process.env.VLLM_HOST || 'http://127.0.0.1:8000';
    const llamacppUrl = process.env.LLAMACPP_HOST || 'http://127.0.0.1:8080';

    const [ollamaProbe, vllmProbe, llamacppProbe, embeddingRuntime, trainingCapabilities, ocrCapabilities] = await Promise.all([
      this.probeEndpoint(ollamaUrl),
      this.probeEndpoint(vllmUrl),
      this.probeEndpoint(llamacppUrl),
      EmbeddingService.getRuntimeInfo(),
      TrainingRuntime.getCapabilities(),
      ImageOCRParser.getCapabilities()
    ]);

    const mongoStatus = {
      connected: Boolean(state.isMongooseConnected),
      mode: state.isMongooseConnected ? 'Live MongoDB Daemon' : 'Local High-Speed In-Memory DB',
      readyState: mongoose.connection.readyState,
      activeCollections: state.isMongooseConnected ? Object.keys(mongoose.connection.collections).length : Object.keys(state.memoryDb).length
    };

    return {
      database: mongoStatus,
      inferenceBackends: {
        ollama: {
          endpoint: ollamaUrl,
          ...ollamaProbe,
          fallbackActive: !ollamaProbe.reachable
        },
        vllm: {
          endpoint: vllmUrl,
          ...vllmProbe,
          fallbackActive: !vllmProbe.reachable
        },
        llamacpp: {
          endpoint: llamacppUrl,
          ...llamacppProbe,
          fallbackActive: !llamacppProbe.reachable
        }
      },
      embeddingRuntime,
      training: trainingCapabilities,
      ocr: ocrCapabilities
    };
  }

  /**
   * Generates a complete diagnostic capability report.
   */
  static async getDiagnosticReport() {
    const variables = this.evaluateVariables();
    const services = await this.probeAllServices();

    const issues = [];
    const recommendations = [];

    const secretVar = variables.find(v => v.key === 'JWT_SECRET');
    if (secretVar?.status === 'WARNING_DEFAULT_KEY') {
      issues.push('JWT_SECRET is using the pre-shared default key. Recommended to define a custom 32+ character key for mission-critical deployments.');
      recommendations.push('Set JWT_SECRET=<secure_random_string> in server/.env');
    }

    const liveBackends = [
      services.inferenceBackends.ollama.reachable,
      services.inferenceBackends.vllm.reachable,
      services.inferenceBackends.llamacpp.reachable
    ].filter(Boolean).length;

    let overallHealth = 'OPTIMAL';
    if (!services.database.connected && liveBackends === 0) {
      overallHealth = 'AIRGAP_STANDALONE_SIMULATION';
    } else if (!services.database.connected || liveBackends === 0) {
      overallHealth = 'OPERATIONAL_WITH_FALLBACKS';
    }

    return {
      timestamp: new Date().toISOString(),
      overallHealth,
      airgapEnforced: process.env.AIRGAP_MODE !== 'false',
      lanIsolation: process.env.ALLOW_LAN_ONLY !== 'false',
      liveInferenceBackendsCount: liveBackends,
      databaseMode: services.database.mode,
      variables,
      services,
      issues,
      recommendations
    };
  }
}
