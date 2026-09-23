# Air-Gapped Sovereign AI System Architecture Specs

SOVEREIGN AI — SYNTHETIC DEMO DOCUMENT
Department: R&D / Engineering
Classification: Confidential
Document ID: RND-ARCH-2026
Revision: 2.1

## Architecture summary

The platform runs on a private LAN with no permitted external cloud transmission. Inference services expose local endpoints for Ollama, llama.cpp, and vLLM-compatible workers. Requests are routed through a policy layer before reaching a model.

## Runtime requirements

- The vector store is persisted as a local JSON index with 768-dimensional embeddings.
- RBAC and ABAC checks must run before document retrieval and before tool execution.
- GPU allocation must account for model VRAM, current utilization, and a safety reserve.
- Every agent execution emits a correlation ID, input summary, selected model, confidence, and audit result.

## Recovery and observability

The runtime should degrade to deterministic local embeddings when an embedding daemon is unavailable. Health checks must distinguish `READY`, `DEGRADED`, and `FAILED` states. A failed specialist may not silently fabricate a result; the orchestrator must return a truthful fallback or an explicit error.

## Verification note

This is synthetic architecture guidance for local integration tests.
