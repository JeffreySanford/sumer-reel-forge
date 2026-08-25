# Animation V3 Observability and Diagnostics Plan

Status: **planning contract**

Animation systems fail in ways that ordinary application logs do not explain. V3 should make the runtime state, render inputs, source bindings and proof outputs inspectable without requiring frame-by-frame guesswork.

The goal is not telemetry for telemetry's sake. The goal is to answer quickly:

```text
What scene ran?
What exact source bytes did it use?
What runtime state existed at this frame?
What changed?
Which subsystem owned the change?
Did Storybook and Remotion evaluate the same state?
Why did a proof fail?
```

## 1. Diagnostic layers

```text
Scene diagnostics
Runtime diagnostics
Frame diagnostics
Render diagnostics
QA diagnostics
Source/provenance diagnostics
Performance diagnostics
```

Each layer should be available as structured JSON where practical.

## 2. Scene diagnostics

Every resolved Scene V3 should expose:

```ts
interface SceneDiagnostics {
  sceneId: string;
  schemaVersion: string;
  narrativeRevision: string;
  durationFrames: number;
  fps: number;
  seed: number;
  runtimeAdapters: RuntimeAdapterDescriptor[];
  sourceBindings: string[];
  visualEvidenceBindings: string[];
  assetHashes: Record<string, string>;
  warnings: DiagnosticWarning[];
}
```

Required debug views:

- resolved scene JSON;
- source asset table;
- runtime ownership table;
- unresolved/deferred warnings.

## 3. Runtime diagnostics

Every adapter should provide a compact diagnostic surface.

### Rive

- asset ID/version/hash;
- active state machine/animation;
- input values;
- actor channel weights;
- local transform;
- explicit time/frame advanced to.

### Pixi

- material ID;
- mesh bounds;
- vertex count;
- displacement range;
- ticker mode;
- anchor IDs;
- local material parameters.

### Three/R3F

- camera transform;
- object count;
- visible instance count;
- draw-call estimate where available;
- actor/world transform mapping;
- depth-card bounds.

### Rapier

- timestep;
- body/joint count;
- simulation frame;
- collision events;
- bake hash;
- invalid/NaN count.

### Crowd

- agent count;
- role counts;
- clip distribution;
- synchronization score;
- active/inactive agents;
- LOD bucket counts.

### CityKit

- current world state;
- active structures;
- population profile;
- water network status;
- active industries;
- evidence bindings.

## 4. Frame diagnostics

For any proof frame, collect:

```ts
interface FrameDiagnostics {
  frame: number;
  timeSeconds: number;
  semanticStateIds: string[];
  cameraState: unknown;
  actorStates: Record<string, unknown>;
  materialStates: Record<string, unknown>;
  simulationStateHashes: Record<string, string>;
  activeEvents: string[];
}
```

This enables comparison of:

```text
Storybook frame 101
vs
Remotion frame 101
```

without relying only on screenshots.

## 5. Storybook diagnostics overlay

Animation Lab should provide toggles for:

```text
frame/time
seed/channel seeds
anchors/pivots
mesh bounds
actor channels
camera/depth
runtime ownership
source IDs/checksums
provenance
performance counters
QA state
```

These overlays are not part of production render output.

## 6. Render diagnostics

Every short proof render should emit:

```text
render-start.json
resolved-scene.json
runtime-versions.json
frame-proof-schedule.json
render-result.json
```

`render-result.json` includes:

- output path/hash;
- render duration;
- encoded duration;
- frame count;
- dimensions/fps;
- runtime environment;
- proof receipt path;
- warnings/errors.

## 7. Asset trace diagnostics

Formalize the path trace learned during Shot 3:

```text
canonical/editorial source
        ↓
candidate source
        ↓
staged render asset
        ↓
resolved Scene V3 asset
        ↓
rendered frame evidence
        ↓
promoted canonical asset
```

At each boundary store:

- logical asset ID;
- path or resource identity;
- SHA-256;
- source revision;
- approval state.

Any mismatch is a hard proof failure.

## 8. Performance telemetry

Local benchmark/proof runners should record:

```text
bundle time
composition resolution time
render time
encode time
total time
peak memory if practical
GPU/backend info when available
concurrency
frame count
resolution
runtime instance counts
```

Trend storage can initially remain compact JSON under `tmp` plus optional checked-in milestone summary.

## 9. Budget warnings

Warnings should be emitted before catastrophic slowdown.

Examples:

```text
crowd count exceeds preview budget
texture exceeds recommended dimensions
scene draw-call estimate too high
proof render > target duration
physics body count exceeds benchmark budget
runtime asset not cached
```

Warnings do not automatically fail unless a phase contract defines a hard threshold.

## 10. QA diagnostics

Every failed gate should answer:

```text
what was expected
what was measured
what artifact proves it
what source/runtime state was active
what next evidence to inspect
```

Bad:

```text
Blink failed.
```

Good:

```text
BLOCKED: rendered frames 99–106 contain no semantically closed-eye state.
Candidate: sha256:...
Resolved asset: sha256:...
Frame 102 eye-region cyan dominance: 84%
Proof crop: ...
```

## 11. Structured error categories

Suggested categories:

```text
SOURCE_MISSING
SOURCE_STALE
ASSET_HASH_MISMATCH
RUNTIME_VERSION_MISMATCH
SCENE_INVALID
FRAME_STATE_MISMATCH
MATERIAL_BOUNDS_FAILURE
ACTOR_IDENTITY_FAILURE
SEMANTIC_ACTION_FAILURE
PHYSICS_NONDETERMINISTIC
CROWD_SYNCHRONIZATION_FAILURE
PERFORMANCE_BUDGET_WARNING
RENDER_FAILURE
ENCODE_FAILURE
EXTERNAL_SERVICE_UNAVAILABLE
HUMAN_REVIEW_REQUIRED
```

## 12. External service diagnostics

For ComfyUI/Ollama/Qwen/TTS:

- reachable/unreachable;
- model/workflow selected;
- version if available;
- request ID;
- timeout;
- deterministic parameters;
- output hash.

Do not log secrets or enormous prompts/images indiscriminately.

## 13. Persistence diagnostics

When Studio saves V3 state, log/record:

```text
scene ID
previous revision
new revision
schema version
narrative revision
changed subsystem IDs
actor/source bindings affected
```

This helps diagnose stale proof receipts.

## 14. Test coverage for diagnostics

Unit:

- diagnostic serialization;
- stable key fields;
- category mapping;
- redaction;
- proof-frame state comparison.

Storybook:

- overlay toggles;
- diagnostics panel stories;
- long-value/error-state rendering.

E2E:

- failed proof exposes diagnostic summary;
- asset hash mismatch surfaced;
- stale receipt message visible;
- external service unavailable state actionable.

CI:

- diagnostic schemas validated;
- no expected error category missing from typed union.

## 15. Logging policy

Default local console output should be compact:

```text
[ok]
[info]
[warn]
[blocked]
[trace] only when requested
```

Detailed JSON goes to artifact files.

Avoid dumping hundreds of lines into the terminal unless `--verbose` or a failure requires it.

## 16. Proof bundle layout

Conceptual:

```text
proofs/<scene>/<timestamp>/
  receipt.json
  resolved-scene.json
  diagnostics.json
  runtime-versions.json
  frames/
    start.png
    peak.png
    end.png
  contact-sheet.png
  semantic-review.json
  human-review.json   # only after review
```

Large MP4 may remain in `tmp`; compact receipt/contact sheet can later be promoted as milestone evidence when useful.

## 17. Definition of diagnosable

A V3 subsystem is not production-ready if a representative failure cannot be localized to:

- source;
- contract;
- adapter;
- runtime state;
- render/composition;
- QA interpretation;
- external service;
- human preference.

The system should make the wrong layer obvious before we spend days tuning the right code for the wrong problem.
