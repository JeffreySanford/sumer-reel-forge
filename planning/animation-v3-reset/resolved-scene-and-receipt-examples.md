# Resolved Scene, Evidence and Promotion Receipt Examples

Status: **planning examples; not final schemas**

These examples pressure-test the traceability model by following one authored scene through resolution, rendering, QA, human review and promotion. They are deliberately verbose enough to expose missing identity/version fields before implementation.

## 1. Authoring vs resolved scene

Authoring Scene V3 contains semantic references:

```text
actor:enki
asset:enki:rig rev 1
clip:enki:blink-natural:v1
material:water:gulf-calm:v1
```

The resolved scene contains the exact revisions/hashes/runtime versions that production will consume.

No Remotion composition may choose a later candidate after this resolution boundary.

## 2. Example resolved scene

Conceptual:

```json
{
  "schemaVersion": "3",
  "sourceSceneId": "scene:ch01:r01:s03",
  "sourceSceneRevision": 1,
  "sourceSceneHash": "sha256:AUTHORING...",
  "resolvedHash": "sha256:RESOLVED...",
  "frame": {
    "fps": 30,
    "durationFrames": 210,
    "width": 1080,
    "height": 1920
  },
  "sourceRegistry": {
    "revision": 4,
    "hash": "sha256:SOURCES..."
  },
  "historicalSources": [
    {
      "id": "lit:etcsl:enki-journey-nibru",
      "recordRevision": 1,
      "recordHash": "sha256:ETCSL_RECORD...",
      "adaptation": "composite-adaptation"
    }
  ],
  "assets": [
    {
      "id": "asset:enki:rig",
      "revision": 1,
      "kind": "RUNTIME_ASSET",
      "runtime": "rive",
      "logicalPath": "actors/enki/enki-v1.riv",
      "contentHash": "sha256:ENKI_RIG...",
      "sourceHashes": ["sha256:ENKI_EDITORIAL..."],
      "maturity": "PRODUCTION_READY"
    },
    {
      "id": "asset:stag:vessel",
      "revision": 1,
      "kind": "CANONICAL_PRODUCTION_ASSET",
      "runtime": "layered-v2",
      "logicalPath": "ch01/reel01/shot03/stag-v1.png",
      "contentHash": "sha256:STAG...",
      "sourceHashes": ["sha256:SHOT03_EDITORIAL..."],
      "maturity": "PRODUCTION_READY"
    }
  ],
  "runtimes": [
    {
      "id": "runtime:rive:hero-character",
      "package": "@rive-app/canvas",
      "version": "PINNED_VERSION",
      "adapterVersion": "1"
    },
    {
      "id": "runtime:pixi:material",
      "package": "pixi.js",
      "version": "PINNED_VERSION",
      "adapterVersion": "1"
    },
    {
      "id": "runtime:remotion",
      "package": "remotion",
      "version": "4.0.515"
    }
  ],
  "semanticSeeds": [
    {
      "targetId": "actor-instance:enki:s03",
      "channel": "face.blink",
      "purpose": "timing",
      "algorithmVersion": 1,
      "value": 123456789
    }
  ],
  "canonicalScene": "<normalized canonical scene data>"
}
```

Actual resolved schema should avoid embedding redundant data unless it improves reproducibility. The example shows the information that must be obtainable, not necessarily one physical JSON layout.

## 3. Compiler report

Resolution produces both canonical output and diagnostics:

```json
{
  "sceneId": "scene:ch01:r01:s03",
  "status": "PASS",
  "stages": [
    {"id":"schema","status":"PASS"},
    {"id":"semantic","status":"PASS"},
    {"id":"sources","status":"PASS"},
    {"id":"assets","status":"PASS"},
    {"id":"runtimes","status":"PASS"},
    {"id":"capabilities","status":"PASS"},
    {"id":"seeds","status":"PASS"},
    {"id":"canonicalize","status":"PASS"}
  ],
  "warnings": [
    {
      "code":"VISUAL_EVIDENCE_CONTEXTUAL",
      "message":"Boat appearance is supported by contextual rather than direct scene evidence."
    }
  ]
}
```

Warnings cannot disappear merely because rendering succeeds.

## 4. Render request

The render request binds to a resolved hash:

```json
{
  "compositionId": "SceneV3Benchmark",
  "sceneId": "scene:ch01:r01:s03",
  "resolvedSceneHash": "sha256:RESOLVED...",
  "renderProfile": "proof",
  "frameRange": [0, 210],
  "expectedAssetHashes": {
    "asset:enki:rig": "sha256:ENKI_RIG...",
    "asset:stag:vessel": "sha256:STAG..."
  }
}
```

If staging resolves bytes with different hashes, render preflight blocks.

## 5. Render receipt

```json
{
  "receiptVersion": 1,
  "receiptType": "RENDER",
  "commit": "abc123",
  "sceneId": "scene:ch01:r01:s03",
  "sceneRevision": 1,
  "resolvedSceneHash": "sha256:RESOLVED...",
  "compositionId": "SceneV3Benchmark",
  "renderProfile": "proof",
  "frame": {
    "fps": 30,
    "width": 1080,
    "height": 1920,
    "start": 0,
    "endExclusive": 210
  },
  "runtimeVersions": {
    "remotion": "4.0.515",
    "rive": "PINNED_VERSION",
    "pixi": "PINNED_VERSION"
  },
  "assetHashes": {
    "asset:enki:rig": "sha256:ENKI_RIG...",
    "asset:stag:vessel": "sha256:STAG..."
  },
  "stagedAssetHashes": {
    "asset:enki:rig": "sha256:ENKI_RIG...",
    "asset:stag:vessel": "sha256:STAG..."
  },
  "output": {
    "logicalProofId": "proof:enki-helm:motion:v1",
    "sha256": "sha256:VIDEO..."
  }
}
```

Absolute `D:\...` paths may appear in local diagnostics but are not portable receipt identity.

## 6. Deterministic QA receipt

```json
{
  "receiptVersion": 1,
  "receiptType": "QA",
  "qaContractId": "qa:benchmark:enki-helm:v1",
  "resolvedSceneHash": "sha256:RESOLVED...",
  "renderHash": "sha256:VIDEO...",
  "gates": [
    {"id":"asset-binding","verdict":"PASS"},
    {"id":"actor-motion","verdict":"PASS","metrics":{"activeFrames":14}},
    {"id":"blink-sequence","verdict":"PASS"},
    {"id":"cyan-debug-leak","verdict":"PASS","metrics":{"cyanDominanceMax":0.01}},
    {"id":"rigging-causality","verdict":"PASS","metrics":{"lagFrames":7}},
    {"id":"contact-tiller","verdict":"PASS"}
  ],
  "verdict": "PASS"
}
```

A gate ID is versioned by its QA contract. Changing the algorithm/threshold materially requires contract/version review.

## 7. Semantic QA receipt

```json
{
  "receiptVersion": 1,
  "receiptType": "SEMANTIC_QA",
  "contractId": "semantic:enki-helm:v1",
  "model": "qwen3-vl:4b-instruct",
  "inputProofHashes": ["sha256:CONTACT...", "sha256:VIDEO_SAMPLE..."],
  "questions": {
    "blinkReadsNaturally": true,
    "identityStable": true,
    "debugOverlayVisible": false,
    "helmGestureReads": true
  },
  "confidence": 0.91,
  "verdict": "PASS"
}
```

Semantic QA is advisory/blocking according to contract but cannot promote.

## 8. Human review receipt

```json
{
  "reviewVersion": 1,
  "candidateId": "scene-candidate:ch01:r01:s03:v3-001",
  "candidateHash": "sha256:RESOLVED...",
  "renderHash": "sha256:VIDEO...",
  "reviewedProofHashes": ["sha256:AB_VIDEO...", "sha256:CONTACT..."],
  "criteria": {
    "blinkUnmistakable": "PASS",
    "identityPreserved": "PASS",
    "motionNatural": "PASS",
    "noDistractingArtifacts": "PASS",
    "improvesBaseline": "PASS"
  },
  "reviewerDecision": "APPROVED",
  "notes": ["Small helm gesture reads well at normal speed."]
}
```

If resolved scene or rendered bytes change, this receipt becomes stale.

## 9. Promotion receipt

```json
{
  "receiptVersion": 1,
  "receiptType": "PROMOTION",
  "promotionId": "promotion:scene:ch01:r01:s03:v3-001",
  "sceneId": "scene:ch01:r01:s03",
  "oldCanonical": {
    "revision": 2,
    "resolvedSceneHash": "sha256:OLD_V2..."
  },
  "newCanonical": {
    "revision": 3,
    "resolvedSceneHash": "sha256:RESOLVED..."
  },
  "renderReceiptHash": "sha256:RENDER_RECEIPT...",
  "qaReceiptHash": "sha256:QA_RECEIPT...",
  "semanticReceiptHash": "sha256:SEMANTIC_RECEIPT...",
  "humanReviewReceiptHash": "sha256:HUMAN_RECEIPT...",
  "supersedes": "scene:ch01:r01:s03@2"
}
```

Promotion is transactional: exact promoted inputs must match reviewed inputs.

## 10. Staleness examples

### Rig changes

```text
Enki rig hash changes
  → resolved scene hash changes
  → render receipt stale
  → QA/semantic/human review stale
  → promotion blocked
```

### ETCSL description typo only

If source record display text changes without changing scene interpretation or visual inputs:

```text
source metadata revision changes
  → provenance display current
  → visual proof may be SOFT_STALE or unaffected according to dependency rules
```

Staleness must identify reason rather than globally invalidating expensive evidence.

## 11. Negative receipt fixtures

Required fixtures:

- candidate hash differs from staged bytes;
- runtime version omitted;
- resolved hash differs from render request;
- human approval references old render hash;
- promotion references QA receipt for another scene;
- debug asset appears in canonical resolved assets;
- source revision unresolved;
- physics bake hash stale;
- supersedes chain cycles.

## 12. Unit tests

- canonical resolved serialization stable;
- receipt required fields validate;
- absolute local paths excluded from canonical identity;
- expected/staged hashes must match;
- staleness propagation deterministic;
- receipt cross-links reference same scene/resolved hash;
- approval/promotion rejects stale inputs.

## 13. Storybook/Studio representations

Storybook fixtures should show:

```text
Evidence/ResolvedScene/Current
Evidence/ResolvedScene/StaleAsset
Evidence/RenderReceipt/Pass
Evidence/QAReceipt/Blocked
Evidence/HumanReview/Approved
Evidence/Promotion/Ready
Evidence/Promotion/Stale
```

Studio should make the chain navigable in both directions.

## 14. E2E trace

One golden workflow should prove:

```text
load authored fixture
→ compile
→ inspect resolved hash
→ open exact asset hash/runtime version
→ inspect proof receipt
→ inspect QA
→ approve
→ promote
→ reload canonical
→ navigate back to manuscript/source
```

## 15. Definition of example success

The receipt model is sufficient when no important visual claim depends on filenames, timestamps, chat history or implicit current package state. The exact reviewed output can be reconstructed from durable IDs, revisions, hashes, runtime versions and receipts.
