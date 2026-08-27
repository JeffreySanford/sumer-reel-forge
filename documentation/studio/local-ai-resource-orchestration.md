# Local AI resource orchestration

Status: **FOUNDATION IMPLEMENTED; CALLER INTEGRATION PENDING**

Sumer Reel Forge uses local Ollama planning/vision and local ComfyUI generation on the same workstation. The system must coordinate those workloads without weakening deterministic rendering, source-preservation QA, or human approval authority.

## Managed Ollama models

Tracked manifest:

- `tools/ollama/managed-models.json`

Core defaults follow the current workstation model-selection decision:

- text planner: `qwen3:8b`
- vision reviewer: `qwen3-vl:4b-instruct`

Retrieval is a separate opt-in tier:

- embeddings: `nomic-embed-text:latest`

Model names remain overridable through their existing environment variables. The manifest is infrastructure policy, not story/domain data.

Check only:

```sh
node tools/scripts/setup-ollama.mjs --check
```

Explicitly pull missing core models:

```sh
node tools/scripts/setup-ollama.mjs --pull-missing
```

Include the retrieval model:

```sh
node tools/scripts/setup-ollama.mjs --pull-missing --include-retrieval
```

The setup command never auto-loads a model, never runs at normal startup, and never changes human promotion authority. It writes observed state to `tmp/runtime/ollama-managed-state.json`.

## Shared GPU lease

Cross-process primitive:

- `tools/runtime/gpu-resource-lease.mjs`

Default lease directory:

- `tmp/runtime/gpu-lease/`

The lease uses atomic directory creation so separate Node/Nest/CLI processes can coordinate one GPU. Each lease records:

- owner;
- task;
- backend (`ollama`, `comfyui`, etc.);
- optional model;
- PID and host;
- unique ownership token;
- acquisition and expiry times;
- heartbeat expiry extensions.

An active lease is never stolen. Expired/dead-owner evidence can be quarantined and recovered. Release verifies the token before deleting the lease so one process cannot release another process's GPU ownership.

Current live diagnostic:

```sh
node tools/scripts/gpu-resource-status.mjs
```

It reports lease ownership, `nvidia-smi` memory totals/used/free values when available, and currently loaded Ollama models.

## Integration boundary

This commit intentionally provides the primitive before wiring callers.

Next integration order:

1. wrap GPU-heavy Ollama vision/semantic-review calls with the shared lease;
2. wrap ComfyUI candidate-generation calls with the same lease;
3. expose lease owner and live VRAM in runtime capabilities / Studio;
4. add explicit model release behavior for one-shot vision workloads;
5. benchmark planner warm retention against ComfyUI contention before changing the existing `OLLAMA_KEEP_ALIVE` default;
6. only then add bounded AI retry/advisory orchestration.

Text planning may remain warm when the GPU is otherwise free. Do not globally force `OLLAMA_KEEP_ALIVE=0`; GPU policy should be task-aware.

## Authority

The lease and managed model inventory are operational infrastructure only.

They do not:

- own story time;
- generate canonical acceptance;
- lower QA thresholds;
- promote candidate assets;
- retry until a model happens to pass;
- override a prior human rejection.

The standing rule remains: **AI proposes; deterministic rules constrain; human normal-speed review is authoritative for cinematic acceptance.**
