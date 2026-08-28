# Local AI resource orchestration

Status: **CALLER INTEGRATION ACTIVE**

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
pnpm ollama
```

Explicitly pull missing core models:

```sh
pnpm ollama:pull
```

Include the retrieval model:

```sh
node tools/scripts/setup-ollama.mjs --pull-missing --include-retrieval
```

The setup command never auto-loads a model, never runs at normal startup, and never changes human promotion authority. It writes observed state to `tmp/runtime/ollama-managed-state.json`.

## Managed startup residency

Managed `pnpm start:all` still verifies that Ollama is reachable and that the configured planning/vision models are installed, but it no longer pins the text planner in GPU memory by default.

When `start-local.mjs` has produced a hardware profile, the planning warm-up command detects managed workstation startup and skips the `qwen3:8b` warm request. The planner loads lazily on first real planning use instead.

Explicit opt-in is available with:

- `OLLAMA_WARM_ON_START=true`.

This change is intentionally narrower than globally forcing `OLLAMA_KEEP_ALIVE=0`. After an actual planning request, the text model may still remain resident for the configured keep-alive interval. That runtime residency must be measured against ComfyUI contention before a broader unload policy is chosen.

## Shared GPU lease

Cross-process primitive:

- `tools/runtime/gpu-resource-lease.mjs`

Standard AI-task wrapper:

- `tools/runtime/gpu-ai-task.mjs`

Runtime telemetry:

- `tools/runtime/gpu-runtime-telemetry.mjs`

Default lease directory:

- `tmp/runtime/gpu-lease/`

Default task-receipt directory:

- `tmp/runtime/gpu-tasks/`

The lease uses atomic directory creation so separate Node/Nest/CLI processes can coordinate one GPU. Each lease records owner, task, backend, optional model, PID/host, unique ownership token, acquisition time, expiry, and heartbeat extensions.

An active lease is never stolen. Expired/dead-owner evidence can be quarantined and recovered. Release verifies the token before deleting the lease so one process cannot release another process's GPU ownership.

**Lease state represents active Reel Forge execution ownership, not total GPU residency.** A `FREE` lease can coexist with VRAM consumed by a loaded Ollama model, ComfyUI/PyTorch allocator state, the desktop compositor, or another process. Runtime diagnostics must therefore show lease ownership and observed VRAM/model residency separately.

The AI-task wrapper standardizes lease behavior through:

- `SRF_GPU_LEASE_TIMEOUT_MS`;
- `SRF_GPU_LEASE_DURATION_MS`;
- `SRF_GPU_LEASE_POLL_MS`;
- `SRF_GPU_LEASE_PATH`.

Telemetry is enabled by default and may be disabled explicitly with:

- `SRF_GPU_TASK_TELEMETRY=false`.

Its receipt directory may be overridden with:

- `SRF_GPU_TASK_TELEMETRY_PATH`.

Current live diagnostic:

```sh
node tools/scripts/gpu-resource-status.mjs
```

It uses the same telemetry implementation as GPU task receipts. It reports:

- execution lease ownership;
- `nvidia-smi` memory total / used / free;
- Ollama `/api/ps` loaded-model residency and reported model VRAM;
- ComfyUI `/system_stats` reachability and device/allocator memory where available.

Using the HTTP Ollama endpoint avoids a Windows/Git-Bash false-negative caused by relying on the separate `ollama ps` CLI command.

## Task telemetry receipts

Every managed GPU AI task now captures best-effort state before and after the leased work:

- NVIDIA GPU memory total / used / free;
- currently loaded Ollama models and reported VRAM allocation;
- ComfyUI reachability and reported device/VRAM state;
- lease owner, task, backend, model, PID, start/expiry metadata;
- task outcome and error text when the task itself fails.

Telemetry is operational evidence only. A failed `nvidia-smi`, Ollama `/api/ps`, ComfyUI `/system_stats`, or receipt write is recorded/advisory and cannot fail an otherwise valid render or review.

## Managed caller: delta vision review

The managed shot-review runtime acquires one shared GPU lease for the complete heavy Ollama vision phase:

```text
acquire GPU lease
  -> capture before telemetry
  -> warm qwen3-vl
  -> run evidence-aware delta vision critique
  -> capture after telemetry
  -> persist receipt
  -> release GPU lease
```

The warm-up and critique intentionally share one lease. This prevents another Reel Forge GPU workload from entering between model load and the actual vision review, while preserving heartbeat and stale-owner recovery behavior.

The caller records:

- owner: `animation-shot-review`;
- task: `shot-<n>-delta-vision-review`;
- backend: `ollama`;
- configured vision model.

For already-approved shots, the managed review runtime now stages the approved canonical animation-v1 assets before deterministic review. It does not require obsolete pre-promotion candidate runs from `tmp/animation-assets/candidates`. Candidate staging remains the path for unpromoted work.

## Managed caller: API Ollama shot planning

The NestJS `OllamaPlanningProvider` uses `tools/scripts/managed-ollama-chat-bridge.mjs` for schema-constrained shot-plan proposals instead of posting directly to Ollama. The bridge imports the shared `runManagedOllamaChat()` runtime helper, so API planning and script-based vision review use one authoritative GPU lease implementation.

The planning caller records:

- owner: `api-ollama-planning`;
- task: `shot-plan-proposal-<shot-id>`;
- backend: `ollama`;
- configured text model.

Each planning inference now follows the same managed scope as vision work:

```text
acquire GPU lease
  -> capture before telemetry
  -> call Ollama /api/chat
  -> capture after telemetry
  -> request scoped model unload
  -> capture after-cleanup telemetry
  -> persist receipt
  -> release GPU lease
```

Managed startup still avoids preloading the text planner by default. Planning loads lazily on first real proposal request and unloads before releasing the lease. This is deliberately task-scoped and does not globally force `OLLAMA_KEEP_ALIVE=0`.

## Managed caller: generic ComfyUI layer candidates

The generic `animation-layer-candidates.mjs generate` path acquires one lease around the entire generation call:

```text
preflight + workflow compatibility
  -> acquire GPU lease
  -> capture before telemetry
  -> generate candidate batch with configured internal ComfyUI concurrency
  -> capture after telemetry
  -> persist receipt
  -> release GPU lease
```

The lease intentionally wraps the batch rather than each candidate. Internal ComfyUI concurrency remains controlled by the existing hardware profile while external Reel Forge GPU consumers remain serialized. Acquiring a separate lease per parallel candidate would cause same-process contention and is explicitly avoided.

The caller records:

- owner: `animation-layer-candidates`;
- task: `shot-<n>-layer-candidate-generation` or `reel-layer-candidate-generation`;
- backend: `comfyui`.

Specialized legacy/direct ComfyUI generation scripts still require an audit before the ComfyUI integration phase can be called complete.

## Integration boundary

Caller integration is deliberately incremental.

Current state:

1. **DONE:** managed GPU-heavy Ollama delta-vision phase uses the shared lease;
2. **DONE:** managed API Ollama shot planning uses the shared lease through the bridge;
3. **DONE:** leased tasks persist best-effort before/after GPU/Ollama/ComfyUI telemetry receipts;
4. **DONE:** managed workstation startup avoids preloading the text planner by default;
5. **DONE:** approved shot review stages canonical approved assets instead of requiring ephemeral candidate evidence;
6. **DONE:** generic ComfyUI candidate generation is wrapped;
7. **DONE:** hybrid Shot 3 ROI locator-to-ComfyUI workflows release Ollama before delegated ComfyUI generation;
8. **DONE:** `/api/runtime/gpu-status` exposes live lease, VRAM, Ollama residency, and ComfyUI allocator state;
9. **NEXT:** turn animation CLI operations into persisted jobs;
10. only then add bounded AI retry/advisory orchestration and retrieval.

Do not globally force `OLLAMA_KEEP_ALIVE=0` without measurement. GPU policy should be task-aware, and startup residency is now separated from post-request residency.

## Authority

The lease, telemetry, and managed model inventory are operational infrastructure only.

They do not:

- own story time;
- generate canonical acceptance;
- lower QA thresholds;
- promote candidate assets;
- retry until a model happens to pass;
- override a prior human rejection.

The standing rule remains: **AI proposes; deterministic rules constrain; human normal-speed review is authoritative for cinematic acceptance.**
