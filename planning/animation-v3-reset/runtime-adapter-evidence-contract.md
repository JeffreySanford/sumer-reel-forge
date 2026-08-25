# Runtime Adapter Evidence Contract

Status: **Phase 2C/3+ evidence boundary specification**

Runtime adapters must explain what they evaluated without being allowed to certify their own visual correctness. This document separates **runtime evidence** from **independent QA evidence**.

## 1. Core principle

```text
runtime adapter says:
  "what I loaded and what state I evaluated"

independent QA says:
  "whether the final output satisfies the contract"

human reviewer says:
  "whether the production result is visually acceptable"
```

No engine grades itself as the only authority.

## 2. Runtime evidence purpose

Runtime evidence supports:

- traceability;
- determinism diagnostics;
- capability diagnostics;
- asset/version verification;
- exact-frame inspection;
- Storybook/Remotion state parity;
- failure localization.

It is not a promotion receipt.

## 3. Adapter identity evidence

```ts
interface RuntimeIdentityEvidence {
  runtimeId: string;
  adapterType: string;
  adapterVersion: string;
  engineName?: string;
  engineVersion?: string;
  capabilities: readonly string[];
  canonicalConfigHash?: string;
}
```

Exact production engine versions must be recorded when a real engine is used.

## 4. Prepared-resource evidence

```ts
interface RuntimePreparedEvidence {
  runtimeId: string;
  definitionId: string;
  definitionRevision: number;
  sourceAssetRefs: Array<{
    id: string;
    revision?: number;
    sha256: string;
  }>;
  preparedArtifactRefs?: Array<{
    id: string;
    sha256: string;
    lifecycle: 'runtime-cache' | 'approved-bake' | 'registered-runtime-asset';
  }>;
  capabilityBindings: string[];
}
```

Temporary caches may be reported but must not masquerade as canonical production assets.

## 5. Frame evidence

```ts
interface RuntimeFrameEvidence {
  sceneId: string;
  resolvedSceneHash: string;
  runtimeId: string;
  frame: number;
  fps: number;
  semanticSeedBindings: Array<{
    targetId: string;
    channel: string;
    purpose: string;
    seedVersion: number;
    seedValue: number;
  }>;
  evaluatedChannels: RuntimeChannelEvidence[];
  stateFingerprint: string;
  warnings: RuntimeWarning[];
}
```

`stateFingerprint` fingerprints normalized semantic runtime state, not raster output quality.

## 6. Channel evidence

```ts
interface RuntimeChannelEvidence {
  targetId: string;
  channel: string;
  ownerRuntimeId: string;
  value: number | string | boolean | readonly number[];
  source: 'authored' | 'driver' | 'bake' | 'derived-seed' | 'control';
  sourceRef?: string;
}
```

This allows diagnostics to answer why the rigging angle, eye openness or vessel roll has a particular value at a frame.

## 7. Ownership evidence

Each adapter must report the properties it owns for the prepared definition.

Example:

```text
runtime:rive:enki
  owns ACTOR_LOCAL facial/body channels

runtime:pixi:water
  owns local water deformation channels

runtime:three:stag
  owns WORLD_3D vessel-root transform
```

Compiler/preflight rejects overlapping exclusive ownership before render.

## 8. State fingerprint

The runtime state fingerprint should be deterministic from a normalized semantic state such as:

```text
target IDs
owned channels
channel values after evaluation
relevant prepared asset hashes
runtime version
frame
seed bindings
```

It must exclude:

```text
wall-clock time
GPU timing
random cache address
DOM element ID generated at runtime
filesystem temp path
```

## 9. Storybook/Remotion parity

For selected proof states:

```text
Storybook runtime state fingerprint
              ==
Remotion runtime state fingerprint
```

where scene/fixture/frame/control/runtime versions are identical.

Raster output can have separate visual comparison tolerances, but semantic runtime state should match exactly where the same adapter path is used.

## 10. Runtime warnings

Structured warning examples:

```text
RUNTIME_ASSET_OPTIONAL_MISSING
RUNTIME_CAPABILITY_DEGRADED
RUNTIME_FALLBACK_ACTIVE
RUNTIME_CACHE_REBUILT
RUNTIME_EVIDENCE_PARTIAL
```

Any fallback must be visible. Silent fallback is forbidden.

## 11. Blocking runtime failures

Examples:

```text
RUNTIME_VERSION_MISMATCH
RUNTIME_REQUIRED_ASSET_MISSING
RUNTIME_ASSET_HASH_MISMATCH
RUNTIME_CAPABILITY_MISSING
RUNTIME_NONDETERMINISTIC_STATE
RUNTIME_TRANSFORM_OWNERSHIP_CONFLICT
RUNTIME_BAKE_HASH_MISMATCH
```

These fail before promotion and, when possible, before expensive render.

## 12. Adapter collectEvidence contract

`collectEvidence()` must be side-effect free with respect to production state.

It must not:

- change animation state;
- trigger a different random sequence;
- write canonical assets;
- approve/promote a candidate;
- hide warning state;
- alter current frame.

Evidence collection should be safe to invoke in Storybook, render QA and diagnostics.

## 13. Independent QA separation

Runtime evidence may say:

```text
face.eye-left-open = 0
face.eye-right-open = 0
```

Independent semantic QA asks:

```text
Are both eyes visibly closed in the rendered result?
Is there a cyan patch?
Did identity drift?
Did the actor reopen correctly?
```

The first cannot substitute for the second.

## 14. Human review separation

Runtime evidence may prove technical state consistency while the human still rejects:

- unnatural puppet motion;
- poor art-direction match;
- visually distracting deformation;
- bad timing at normal speed;
- source identity degradation.

Human rejection keeps candidate unpromoted even if runtime/semantic machine checks are green.

## 15. Physics bake evidence

For Rapier/physics playback:

```text
physics definition ID/revision
fixed timestep
engine/runtime version
simulation seed
input scene hash
bake hash
frame-to-bake sample binding
```

Production rendering consumes approved bake state rather than silently re-authoring simulation differently.

## 16. Generative runtime evidence

If a generative system is used for a bounded bake/candidate:

```text
provider/runtime/model identity
model version/hash where available
workflow/prompt contract hash
source asset hashes
seed/settings
candidate output hash
```

Generative evidence still cannot approve itself.

## 17. Stable tests

```text
CONTRACT-RUNTIME-010-evidence-runtime-version
CONTRACT-RUNTIME-011-evidence-asset-hashes
CONTRACT-RUNTIME-012-channel-owner-reported
CONTRACT-RUNTIME-013-state-fingerprint-repeatable
CONTRACT-RUNTIME-014-collect-evidence-side-effect-free
CONTRACT-STORY-004-remotion-state-parity
FAILURE-RUNTIME-010-silent-fallback
FAILURE-RUNTIME-011-missing-version
FAILURE-RUNTIME-012-overlapping-exclusive-owner
FAILURE-RUNTIME-013-fingerprint-wall-clock-leak
FAILURE-RUNTIME-014-evidence-mutates-state
```

## 18. Receipt relationship

```text
RuntimeEvidence
    ↓ referenced by
Render/Proof Receipt
    ↓ examined by
Independent QA Receipt
    + Human Review Receipt
    ↓
Promotion Receipt
```

Promotion receipt references evidence; it does not merely copy an adapter's `pass=true`.

## 19. Storage policy

Compact structured runtime evidence may be retained with proof receipts.

Large transient debug dumps can remain ephemeral when the retained evidence contains enough hashes/IDs to reproduce or diagnose the approved state.

## 20. Definition of success

At any failed or promoted frame, we can answer:

> Which runtime owned this property?

> Which exact asset/runtime version did it use?

> Which semantic input/seed/driver produced the state?

> Did Storybook and Remotion evaluate the same state?

And those answers remain separate from whether QA/human review judged the final picture good.