# Animation V3 Performance and Render Budget

Status: **planning contract**

This document defines performance expectations for the V3 platform. The goal is not premature optimization; it is to prevent a visually successful architecture from becoming unusable for local iteration or milestone rendering.

## 1. Hardware assumption

Primary local development target is a modern workstation with approximately:

- 24 logical CPU threads;
- 64 GB RAM;
- NVIDIA GPU with about 10 GB VRAM;
- local SSD;
- Docker/ComfyUI/Ollama available when needed.

The platform should degrade gracefully on lesser developer machines for Storybook/unit work, but full proof renders may target the primary workstation profile.

## 2. Performance classes

### Class A — unit/contract

Target: sub-second to a few seconds per project target.

No GPU requirement.

### Class B — Storybook isolated preview

Target: interactive enough for frame scrubbing and debugging.

### Class C — short motion proof

Target: seconds to low minutes depending on runtime complexity.

### Class D — full 60-second reel

Target: bounded and observable; exact target refined after V3 benchmarks.

## 3. Frame evaluation budget

Pure Scene V3 state evaluation should remain cheap.

Initial target:

- ordinary frame state resolution: < 5 ms CPU;
- complex city/crowd state resolution: < 20 ms CPU before actual graphics rendering;
- deterministic seed derivation and track evaluation should not scale with unrelated scene complexity.

These are design budgets, not immediate hard CI failures.

## 4. Animation Lab budget

Interactive preview goals:

- exact-frame seek should feel immediate for simple actor/material stories;
- switching named proof states should complete without a multi-second stall after assets are loaded;
- 20-agent crowd story should remain comfortably interactive;
- 100-agent story is allowed to be a stress benchmark rather than 60fps editor playback.

## 5. Asset loading policy

Avoid loading every runtime asset for every story/scene.

Use:

- lazy runtime initialization;
- per-scene asset manifests;
- texture reuse;
- bounded cache;
- explicit disposal hooks;
- prefetch only for known upcoming assets.

## 6. VRAM policy

10 GB VRAM means the platform cannot casually keep many full-resolution 4K textures and AI models resident at once.

Production guidelines:

- use production resolution only where needed;
- maintain preview textures for Storybook;
- dispose scene-specific textures between large proofs;
- ComfyUI/Ollama may need serialized use with GPU-heavy render workloads;
- evidence tools should record OOM/resource failures explicitly.

## 7. Pixi budget

Track:

- texture count;
- mesh vertex count;
- filter count;
- render targets;
- draw calls where available.

Prefer a few purposeful mesh subdivisions over extremely dense grids for painted 2D material deformation.

## 8. Rive budget

Track:

- number of active hero rigs;
- raster texture size;
- active state machines/animations;
- per-frame advance cost.

Hero rigs may be more expensive than background actors. Do not use full hero complexity for distant crowds.

## 9. Three/R3F budget

Track:

- draw calls;
- texture memory;
- light count;
- shadow maps;
- post-processing passes;
- instanced object counts;
- transparent depth-card overdraw.

Default painterly 2.5D scenes should prefer:

- limited dynamic lights;
- no expensive real-time shadows unless visually justified;
- instancing for repeated architecture/vegetation/animals;
- bounded post-processing.

## 10. Physics budget

Live Rapier simulation is authoring/proof work.

Approved production scenes consume baked transform data.

This moves final render cost from collision solving to deterministic playback.

Bake files should be compact enough to load quickly; use quantization/compression only after proving it does not alter approved transforms beyond tolerance.

## 11. Crowd budget

Target benchmark:

- 1 actor — correctness;
- 20 actors — normal scene use;
- 100 actors — stress/Chapter 3 benchmark.

Distant crowds should use lower-cost representations.

Potential LOD classes:

```text
HERO
MID_RIG
DISTANT_LOOP
SPRITE_OR_INSTANCE
```

LOD choice must not visibly pop at approved camera distances.

## 12. Herd budget

Large processions may mix:

- near skeletal animals;
- mid-distance simplified rigs;
- far instanced/sprite animals.

The benchmark measures not merely count but believable phase variation and render cost.

## 13. CityKit budget

Cities should be reusable data, not thousands of unique React components.

Use:

- instanced geometry;
- chunked districts;
- visibility/camera culling where appropriate;
- development-state deltas;
- reusable material palettes.

A mature city scene should not require loading every possible historical city definition simultaneously.

## 14. Render concurrency

The current local renderer already derives concurrency from available hardware.

V3 should keep concurrency configurable because WebGL/WASM-heavy scenes may have different optimal settings than layered 2D scenes.

Benchmark each runtime combination rather than hard-code one universal concurrency value.

## 15. Render observability

Every nontrivial render reports:

- bundle/startup time;
- frame render time summary;
- encode time;
- total time;
- concurrency;
- runtime versions;
- hardware profile;
- peak memory if available;
- failure stage.

This helps distinguish code regressions from machine/runtime issues.

## 16. Benchmark timing baselines

Each platform proof stores a timing baseline with generous warning thresholds.

Initially warn rather than fail on modest timing drift.

Hard fail only for:

- hangs/timeouts;
- OOM;
- runaway frame time;
- massive regression that makes the workflow unusable.

## 17. CI performance policy

CI is not the production performance benchmark because hosted runner hardware differs and Actions availability is constrained.

CI verifies:

- contracts;
- builds;
- unit tests;
- lightweight browser stories.

Local milestone receipts capture expensive performance evidence.

## 18. Render cache policy

Cache only outputs whose inputs are completely hash-bound.

A cache key may include:

```text
scene hash
asset hashes
runtime versions
frame range
resolution
seed
render configuration
```

Never reuse a render merely because file names match.

## 19. Preview vs production quality

Explicit profiles:

### Preview

- reduced texture resolution where safe;
- fewer particles;
- lower sample counts;
- no expensive optional post effects;
- same semantic frame state.

### Production

- full approved textures;
- approved effects;
- full evidence binding.

Preview may reduce fidelity but may not change narrative timing or actor semantic state.

## 20. Timeouts

Every render/bake/generative operation needs a bounded timeout and useful diagnostic.

Long-running processes should emit heartbeat/progress so a stalled GPU/runtime can be distinguished from a slow valid render.

## 21. Determinism vs performance

Never trade determinism for a small speed gain in production evidence.

Examples to avoid:

- variable physics timestep;
- nondeterministic random scheduling;
- async race affecting asset choice;
- runtime auto-quality mode that changes output based on machine load.

## 22. Performance acceptance before Reel 1

Before Reel 1 resumes, require measured results for:

- one Rive hero story;
- one Pixi material story;
- one R3F spatial story;
- one Rapier bake/playback story;
- 20-agent crowd story;
- short combined Enki-at-helm proof.

The combined proof must remain practical for iterative local use.

## 23. Performance acceptance before Chapter 3

Before Chapter 3 production:

- 100-agent crowd benchmark measured;
- CityKit mature-state benchmark measured;
- agriculture/work scene measured;
- multi-runtime scene does not exceed available VRAM under supported render profile;
- LOD strategy proven.

## 24. Regression receipts

Performance receipt concept:

```ts
interface PerformanceReceipt {
  benchmarkId: string;
  commitSha: string;
  runtimeVersions: Record<string, string>;
  hardwareProfile: string;
  frameCount: number;
  resolution: string;
  totalMs: number;
  bundleMs?: number;
  renderMs?: number;
  encodeMs?: number;
  concurrency?: number;
  warnings: string[];
}
```

## 25. Definition of Done

The performance plan is satisfied when:

- preview/production profiles are explicit;
- expensive systems have stress benchmarks;
- local hardware remains the authoritative heavy-render environment;
- CI avoids wasteful full renders;
- cache inputs are hash-bound;
- runtime memory/concurrency are observable;
- crowd/city/herd LOD strategy exists;
- Reel 1 can iterate without multi-hour feedback loops for ordinary shots.
