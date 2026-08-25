# Physics Bake Format Specification

Status: **planning contract / Rapier-first immutable simulation evidence**

Physics is an authoring and proof tool. Final production rendering should consume an approved deterministic bake rather than re-simulating opportunistically during every Remotion frame render.

## 1. Production flow

```text
SimulationDefinition
  ↓ validate
fixed-step simulator
  ↓
SimulationProof
  ↓ human/QA approval
PhysicsBake
  ↓ content hash
Scene V3 binding
  ↓
Remotion playback
```

## 2. Bake identity

Conceptual:

```ts
interface PhysicsBake {
  schemaVersion: '1';
  id: string;
  revision: number;
  simulationDefinitionId: string;
  simulationDefinitionHash: string;
  engine: 'rapier';
  engineVersion: string;
  adapterVersion: string;
  timestepNumerator: number;
  timestepDenominator: number;
  sceneFps: number;
  seed: number;
  constructionHash: string;
  initialStateHash: string;
  bodyOrder: string[];
  frameCount: number;
  channels: BakedBodyChannel[];
  eventLog: BakedPhysicsEvent[];
  bakeHash: string;
}
```

The exact binary/JSON storage may evolve, but these facts must be recoverable.

## 3. Fixed timestep

Timestep is persisted as an exact rational pair rather than an ambiguous decimal where practical.

Examples:

```text
1 / 60 second
1 / 120 second
```

Scene sampling from the bake is separately deterministic.

Variable timestep is prohibited for approved production bakes.

## 4. Construction order

Rapier determinism depends on consistent construction/removal order. Therefore body/collider/joint creation order becomes explicit evidence.

`constructionHash` covers at minimum:

- ordered body IDs;
- collider definitions;
- mass/inertia configuration;
- joints/constraints;
- gravity/environment parameters;
- collision groups;
- deterministic initial transforms.

Changing construction order without semantic change still creates a different construction identity until proven equivalent.

## 5. Semantic body IDs

Physics bodies use semantic IDs:

```text
physics:stag:hull
physics:stag:tiller
physics:kutu:hail:0001
physics:kutu:debris:rope-01
```

Rendering objects resolve these through bindings. Array index is never durable identity.

## 6. Baked channels

Initial production channel set:

```text
position.x/y/z
rotation quaternion x/y/z/w
linearVelocity x/y/z optional evidence
angularVelocity x/y/z optional evidence
sleep/active state optional
```

Only playback-required channels need to be in the canonical production bake. Debug-only force/contact data can remain in diagnostic evidence.

## 7. Sampling policy

Preferred first implementation:

- simulate at fixed physics timestep;
- sample/bake exact state for each Scene V3 output frame;
- Remotion performs no free-running physics;
- optional high-frequency debug simulation data is non-canonical.

This intentionally favors reproducibility over maximum compactness.

## 8. Event log

Semantic collision/contact events may be recorded:

```text
HAIL_HULL_CONTACT
DEBRIS_WATER_CONTACT
ROPE_LIMIT_REACHED
BODY_SLEEP
```

Events include frame/substep, involved semantic IDs and bounded contact metadata required by QA.

## 9. Bake immutability

An approved bake is immutable content-addressed data.

Any change to:

```text
simulation definition
engine version
adapter version
timestep
seed
construction
initial state
frame count
baked states
```

produces a new bake/hash.

## 10. Kutu storm benchmark

Primary bake fixture:

```text
bake:kutu-hail:stag-response:v1
```

Required bodies:

- Stag hull response body;
- representative hail population;
- bounded debris if used;
- optional simplified rigging response anchors.

Required controls:

```text
NO_HAIL
VESSEL_FIXED
SAME_SEED_REPEAT
DIFFERENT_SEED
VARIABLE_TIMESTEP_NEGATIVE
```

## 11. Physics/render ownership

Physics bake owns approved physical transforms.

Three/R3F owns spatial representation/playback.

Rive owns Enki local deformation.

Pixi may consume approved vessel movement as a driver for rigging/water detail.

No runtime may independently add a second vessel roll after bake playback unless the scene explicitly declares a separate local channel.

## 12. Contact with hero actors

A physics bake does not directly animate hero skeleton joints unless explicitly designed.

For Enki at the helm:

```text
baked vessel root
   ↓
actor root follows vessel
   ↓
Rive local performance preserves hand/tiller intent
```

Contact QA verifies the combined render.

## 13. Storage tiers

```text
simulation definition        tracked
small canonical bake         tracked if practical
large canonical bake         retained artifact/storage + content hash
high-frequency diagnostics   ephemeral unless needed for issue evidence
preview caches               ephemeral
```

Canonical references never point only to an untracked temp path.

## 14. Bake receipt

A promotion-ready bake receipt records:

```text
bake ID/revision/hash
simulation definition hash
commit SHA
engine + adapter versions
timestep
seed
construction hash
initial state hash
frame count
QA receipt IDs
human review ID when visually consequential
storage locator + content hash
```

## 15. Negative tests

```text
FAILURE-RAPIER-001-variable-timestep
FAILURE-RAPIER-002-engine-version-mismatch
FAILURE-RAPIER-003-construction-order-mismatch
FAILURE-RAPIER-004-stale-bake-hash
FAILURE-RAPIER-005-body-id-unknown
FAILURE-RAPIER-006-frame-count-mismatch
FAILURE-RAPIER-007-render-resimulates
FAILURE-RAPIER-008-nondeterministic-repeat
```

## 16. Determinism test

Supported-environment repeat:

```text
same definition
same engine/adapter
same seed
same construction order
same timestep
  → same canonical bake hash
```

If this fails, the runtime cannot be promoted as deterministic authoring for that benchmark.

## 17. Cross-platform policy

Do not assume Rapier/WASM bakes produced on arbitrary architectures are automatically cross-platform identical until measured.

Production can select a canonical bake-authoring environment if needed. Once approved, playback consumes the exact bake bytes everywhere.

This is different from Scene V3 canonical JSON, which is explicitly required to hash identically on supported Windows/Linux environments.

## 18. Art-direction override

Physics output may be rejected or edited through a new authored simulation definition/constraint/bake. Do not hand-edit baked transforms without creating an explicit derived bake revision and provenance.

Physics plausibility does not outrank cinematography or readable story action.

## 19. Tests and stories

Planned:

```text
CONTRACT-PHYSICS-001-valid-bake
CONTRACT-PHYSICS-002-immutable-input-binding
UNIT-PHYSICS-001-frame-sampling
UNIT-PHYSICS-002-body-id-resolution
FAILURE-RAPIER-001-variable-timestep
MOTION-KUTU-001-hail-impact
PERF-RAPIER-001-kutu-simulation
HUMAN-KUTU-001-storm-readability
```

Storybook/Animation Lab can inspect exact baked frames and controls but never silently run a different live simulation.

## 20. Definition of readiness

Physics is production-ready when simulation authoring is deterministic enough to produce reviewable bakes, approved bakes are immutable/hash-bound, playback does not re-simulate, body IDs remain semantic, and a stale/mismatched engine/definition/bake is blocked before render.