# V3 Failure Injection and Resilience Test Plan

Status: **planning contract**

Animation pipelines become fragile when every test assumes the happy path. V3 should deliberately inject representative failures into source resolution, runtime adapters, browser rendering, external services, physics, persistence and promotion.

The goal is not chaos engineering at data-center scale. The goal is to prove that ordinary failures are bounded, diagnosable and do not corrupt canonical work.

## 1. Failure classes

```text
source/provenance
asset resolution
runtime initialization
frame evaluation
browser/WebGL
physics
external local services
render/encode
persistence
promotion
CI infrastructure
```

## 2. Source/provenance failures

Inject:

- unknown ETCSL source ID;
- non-ETCSL tradition mislabeled as ETCSL;
- missing adaptation classification;
- visual evidence missing date/site/license state;
- narrative revision changed after scene proof.

Expected:

- validation blocks or warns according to contract;
- no crash;
- precise diagnostic category;
- Studio shows actionable source state.

Tests:

- unit fixtures;
- Storybook invalid/warning cards;
- E2E save blocked where required.

## 3. Asset-resolution failures

Inject:

- missing file;
- checksum mismatch;
- candidate hash differs from staged hash;
- resolved scene points to wrong asset;
- transparent layer unexpectedly empty;
- debug/mask artifact used as production candidate.

Expected:

- render/proof blocked before promotion;
- trace identifies exact boundary;
- canonical unchanged.

Reference regression:

- Shot 3 wrong eye/mask/cyan patch class.

## 4. Runtime initialization failures

### Rive

- missing `.riv`;
- incompatible runtime version;
- missing expected state machine/input;
- corrupt asset.

### Pixi

- WebGL/WebGPU init unavailable;
- shader compile failure;
- texture missing;
- unsupported filter.

### Three/R3F

- WebGL context failure;
- asset geometry missing;
- invalid camera bounds.

### Rapier

- WASM load failure;
- invalid body definition;
- non-finite initial transform.

Expected:

- typed runtime failure;
- preview can show diagnostic fallback where safe;
- production render blocks;
- no silent substitution with another engine.

## 5. Frame-evaluation failures

Inject:

- negative frame;
- frame >= duration;
- NaN progress;
- unsupported proof state;
- missing semantic seed channel;
- adapter returns nondeterministic state for same frame.

Expected:

- contract rejects invalid frame;
- deterministic mismatch test fails loudly;
- no clamp unless contract explicitly defines clamp.

## 6. Browser/context loss

For Animation Lab/Studio integration, simulate or test handling of:

- WebGL context lost;
- tab hidden/resumed;
- component destroyed/recreated;
- asset loading delayed;
- resize during preview.

Production semantics must remain frame-authoritative after recovery.

Storybook stories can include delayed-loader fixtures.

E2E can reload/navigate away/back and verify no accidental mutation.

## 7. Physics resilience

Inject:

- variable timestep request;
- body creation order changed;
- extreme impulse;
- NaN transform;
- missing bake frame;
- corrupted bake hash.

Expected:

- variable timestep rejected for canonical bake;
- invalid/non-finite simulation blocks;
- stale/corrupt bake not promoted;
- authored fallback can be selected intentionally, never silently.

## 8. Crowd resilience

Inject:

- zero actor pool;
- requested count > configured maximum;
- blocked path;
- all actors select same clip/phase;
- invalid role distribution.

Expected:

- validation errors/warnings;
- synchronization gate catches clone behavior;
- count budget warning before browser freeze.

## 9. City/world resilience

Inject:

- disconnected water network;
- missing city development state;
- structure references absent asset;
- state order invalid;
- historically asserted visual profile with no evidence binding.

Expected:

- world validation blocks canonical render where structural;
- provenance warning/block according to policy;
- no partially promoted city revision.

## 10. External local service failures

### ComfyUI

- unreachable;
- queue timeout;
- workflow missing node;
- model missing;
- malformed output.

### Ollama/Qwen

- unreachable;
- model not installed;
- timeout;
- malformed JSON;
- ambiguous semantic response.

### TTS

- engine unavailable;
- generation timeout;
- duration mismatch.

Expected:

- explicit `EXTERNAL_SERVICE_UNAVAILABLE` or typed equivalent;
- deterministic tests use fixtures/mocks and remain green without live services;
- live integration command exits nonzero with compact diagnosis;
- no automatic acceptance when critic unavailable.

## 11. Render failures

Inject/test:

- Remotion bundle failure;
- composition missing;
- asset load failure;
- render watchdog timeout;
- ffmpeg/encode failure;
- output file missing/truncated;
- wrong frame count.

Expected:

- partial output never treated as proof;
- receipt status `FAILED`/absent canonical proof;
- temp output cleanable;
- error category and stage recorded.

## 12. Persistence failures

Inject:

- stale scene revision save;
- database unavailable;
- partial API failure;
- migration mismatch;
- invalid Scene V3 payload;
- concurrent save conflict.

Expected:

- optimistic conflict surfaced;
- no last-write-wins silent loss;
- transaction boundaries preserve prior canonical state;
- retry does not duplicate promotion/audit record.

## 13. Promotion failures

Inject:

- stale proof receipt;
- candidate hash changed after review;
- source hash changed;
- runtime version changed;
- human approval absent;
- copy/write interrupted.

Expected:

- promotion blocked before canonical mutation when possible;
- if failure during mutation, transaction/atomic write strategy leaves recoverable state;
- no half-updated manifest pointing at missing bytes.

## 14. GitHub Actions infrastructure failures

Recognize separately:

- Actions quota/billing block;
- runner unavailable;
- dependency registry outage;
- Playwright browser download failure.

Expected status:

```text
CI_UNAVAILABLE / INFRASTRUCTURE_FAILURE
```

not code regression and not `CI_GREEN`.

Local phase gate remains useful evidence while CI is unavailable, but repository phase exit waits for independent CI when required.

## 15. Timeouts and cancellation

All long-running local commands should:

- have explicit timeout/watchdog where practical;
- report heartbeat/progress;
- terminate child processes;
- leave canonical state untouched on cancellation;
- retain enough temp diagnostics to investigate.

## 16. Retry policy

Retry only operations with understood transient failure modes.

Do not retry semantic failures such as:

- eyes not closed;
- checksum mismatch;
- invalid provenance;
- nondeterministic physics.

External service request retry may be bounded if idempotent.

## 17. Failure-injection test tiers

### Unit

Pure malformed/invalid state.

### Storybook

Visual error states and delayed/loading runtime states.

### E2E

Workflow interruption, stale revision, service-unavailable UI, failed promotion.

### Local integration

Live ComfyUI/Ollama/TTS outage/timeout.

### Render proof

Asset mismatch, missing frame, encode failure, semantic rejection.

## 18. Required negative regression inventory before Reel 1 migration

At minimum:

```text
wrong eye localization
open eyes mislabeled closed
cyan/debug patch
candidate/staged hash mismatch
camera-only motion counted as articulation
rigging detached anchor
Storybook/Remotion frame mismatch
variable-timestep physics
crowd clone synchronization
stale narrative revision
mislabeled source authority
stale promotion receipt
external critic unavailable
```

## 19. Resilience Definition of Done

A subsystem is resilient enough for production when:

- its primary failure classes are typed;
- at least one failure is injected in tests;
- failure cannot silently promote canonical state;
- diagnostic output identifies the failing layer;
- local and CI negative tests pass;
- recovery/retry behavior is documented.
