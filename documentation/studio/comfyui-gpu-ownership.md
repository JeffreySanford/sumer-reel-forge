# ComfyUI GPU ownership

Status: **SPECIALIZED CALLER MIGRATION IN PROGRESS**

This document records the execution-ownership boundary for ComfyUI workloads in Sumer Reel Forge. The shared GPU lease serializes heavy Reel Forge GPU execution; it does not imply that all VRAM is free.

## Rule

One logical ComfyUI production operation owns one outer `withGpuAiTask` lease.

Do not acquire a second lease inside helpers, workflow runners, or internal candidate concurrency that already runs beneath a managed parent.

```text
public managed entrypoint
  -> acquire GPU lease
  -> capture before telemetry
  -> run complete logical ComfyUI workload
  -> capture after telemetry
  -> persist receipt
  -> release lease
```

ComfyUI remains running after the task. Unlike the one-shot Ollama vision review, these callers do not currently request allocator/model cleanup after each generation. Physical post-generation telemetry should be measured before adding any ComfyUI cleanup policy.

## Managed entrypoints

The following public paths now own the lease for their complete generation operation:

- `tools/scripts/shot03-background-layer.mjs`
  - owner: `shot03-background-layer`
  - task: `shot-3-background-repair`
  - lease command: `generate`
- `tools/scripts/repair-background-from-overlay.mjs`
  - owner: `animation-background-repair`
  - task derived from shot and background layer
  - lease command: `generate`
- `tools/scripts/shot03-level2-enki-blink-v2.mjs`
  - owner: `level2-character-state`
  - task: `shot-3-enki-blink-generation`
  - lease commands: `generate`, `all`
  - one lease covers both SAM localization and character-state inpainting
- `tools/scripts/shot03-level2-enki-blink-replacement.mjs`
  - owner: `level2-character-state`
  - task: `shot-3-enki-blink-replacement-generation`
  - lease commands: `generate`, `all`
- `tools/renderer/comfyui-adapter.mjs`
  - owner: `local-renderer-comfyui`
  - one lease covers the complete episode image batch
  - TTS, Whisper, and FFmpeg run after the ComfyUI lease has returned

The corresponding `*-engine.mjs` modules are implementation bodies and are intentionally lease-neutral. They must execute under their public managed entrypoint when performing generation.

## Already-managed generic candidate generation

`tools/scripts/animation-layer-candidates.mjs generate` already owns one lease around `generateLayerCandidates(...)`, including its configured internal ComfyUI concurrency.

Thin wrappers such as Shot 3 water, vessel, Enki body, and Shot 4 mid-current delegate to that generic CLI and therefore must not acquire another lease.

## Preflight policy

Preflight, verification, and preview-only commands remain lease-free. A lease is reserved only for commands that actually submit GPU generation work.

## Hybrid Ollama -> ComfyUI experiments

The Shot 3 ROI/rigging research lanes use Ollama vision localization followed by the already-managed generic ComfyUI candidate CLI. Their ComfyUI generation is therefore serialized correctly, but Ollama residency before that child process remains a separate resource-policy concern.

Do not wrap the entire hybrid script in one outer lease: the generic ComfyUI child would then attempt to acquire its own lease and could deadlock. The correct future sequence is task-aware Ollama lease and unload, followed by the existing ComfyUI lease.

## Validation

Regression coverage must prove:

- specialized public generation entrypoints are managed;
- internal engines are lease-neutral;
- preflight stays lease-free;
- generation sees the lease and releases it afterward;
- generic thin wrappers do not double-acquire;
- multi-workflow blink generation uses one outer lease;
- the legacy local renderer releases the ComfyUI lease before non-Comfy TTS/Whisper/FFmpeg stages.

Physical workstation validation should capture idle, active-generation, immediate post-generation, and final idle telemetry using `node tools/scripts/gpu-resource-status.mjs` plus the task receipt under `tmp/runtime/gpu-tasks`.
