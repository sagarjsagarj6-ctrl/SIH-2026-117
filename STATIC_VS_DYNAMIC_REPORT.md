# STATIC_VS_DYNAMIC_REPORT.md

| File | Line (approx) | Value / Pattern | Why suspicious | Runtime evidence | Recommendation |
|------|---------------|-----------------|----------------|------------------|----------------|
| `server/routes/agentRoutes.js` | 98-174 | Fixed DS/Vision/Report JSON | No compute from prompt | Same structure every call | Route through AgentRegistry |
| `server/agents/specialists/DataScienceAgent.js` | 29-34 | Hardcoded series | Input ignored | mean always 157.1 | Parse numbers from query/context |
| `server/agents/specialists/VisionAgent.js` | 25-59 | Fake OCR table | No image bytes | Random REF only changes | Wire ImageOCRParser + file upload |
| `server/agents/specialists/RAGAgent.js` | 43 | Template string synthesis | No InferenceRouter | Citations real; synthesis canned | Call InferenceRouter.infer |
| `server/agents/BaseAgent.js` | 68-70 | Math.random tokens | Fake usage | — | Use real token counts from router |
| `server/services/inference/backends/OllamaBackend.js` | 49-55 | Canned fallback | Hides offline LLM | Ollama unavailable today | Surface `usedFallback: true` in UI |
| `server/services/knowledge/EmbeddingService.js` | 26-91 | Hash embeddings | Not neural model | Unit test still passes | Document as lexical; optional Ollama embed |
| `server/services/hardware/ResourceMonitor.js` | 14-39 | Random GPU util | Fake telemetry | — | Use real nvidia-smi or mark SIMULATED |
| `server/services/hardware/HardwareProfiler.js` | 20 | Simulated RTX 4090 | Default GPU string | Logged at boot | Detect or label Simulated |
| `server/routes/modelRoutes.js` | 79-105 | Math.random benchmark | Not real eval | — | Run timed InferenceRouter prompts |
| `server/services/finetune/LoRATrainer.js` | 6-23 | Simulated loss | No training | — | Disable or mark DEMO |
| `client/.../ModelComparisonView.jsx` | 17-73 | MOCK_MODELS / fakeResponse | Never fetches API | — | Call /inference/generate + /models/benchmark |
| `client/.../FineTuneManager.jsx` | 29-121 | generateMockLoss | Unused API const | — | Call /models/fine-tune |
| `client/.../IntelligenceDashboard.jsx` | 48-85 | “4 agents”, “ONLINE” | Hardcoded cards | — | Poll /agents/registry + /inference/backends |
| `client/.../AgentCommunicationWorkflow.jsx` | 90-139 | pickActionFromText | Keyword “AI” | No LLM | Call orchestrate/query |
| `client/.../Header.jsx` | 55-58 | Always-green air-gap | Not probed | — | Reflect backend health |
| `AgentOrchestrator.js` | 214-228 | Supervisor always approve | Fake refinement | Tests expect APPROVED | Real second-pass on fail |

## Verdict

Many “online / inference / agent active” UI signals are **STATIC/UNVERIFIED**. Backend orchestration and retrieval are **DYNAMIC** but agent *intelligence* is largely **template/mock**.
