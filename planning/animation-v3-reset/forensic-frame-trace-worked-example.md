# Forensic Frame Trace — Worked Example

Status: **planning worked example / end-to-end traceability proof**

This document follows one intended Enki-at-the-Helm proof frame from narrative intent through source bindings, scene resolution, runtime state, rendered pixels, QA, human approval and eventual reel release. The exact hashes are placeholders until implementation produces normative values; the identity chain is the contract under test.

## 1. Question this trace must answer

> For released frame 101 of the Enki-at-the-Helm benchmark, what exact narrative, evidence, assets, runtimes, performance states, material states, tests and approvals caused those pixels to exist?

If answering requires chat history or `latest`, the architecture failed.

## 2. Narrative origin

```text
manuscript: Blessings of Sumer
chapter: Chapter 1 - Enki
reel: 01
scene/shot concept: Enki at the helm of the Stag of the Absu
narrative intent: calm competence during maritime travel
```

Relevant project narrative/source threads include Enki travel/Eridu/world-order material while the exact cinematic helm staging remains historical-fiction adaptation rather than a claim that an ancient text specifies this shot.

## 3. Literary provenance

Resolved source bindings conceptually include:

```text
etcsl-1.1.3 Enki and the world order
etcsl-1.1.4 Enki's journey to Nibru
```

Each record has stable source identity and metadata revision. The scene's adaptation class remains explicit.

## 4. Visual/project authority

Identity authority chain:

```text
Blessings of Sumer visual bible v1
  ↓
approved Reel 1 editorial shot 03
  ↓
approved Enki/body + Stag/vessel source-faithful derivatives
  ↓
future production source sheets / runtime rigs
```

Current known approved derived hashes remain evidence inputs where applicable:

```text
Enki body: 3c7cdfdbde7776f91cf4b3f81908443b56194931a74654ecdbdb5798917aa6f5
Stag vessel: fe28b4ec5cd0efd724908a106649db782f685f76cd0e34d01e085af02467c3d4
Rigging: 1f3e6add78d406d3f17ee618604da37eef9b2a8bf403650ba98986f4ab82d5f7
```

Future Rive/source-sheet assets will have separate exact hashes rather than overwriting these historical references.

## 5. Authored Scene V3

Semantic identity:

```text
scene:ch01:r01:s03@revision
fixture:benchmark:enki-helm:v1
fps: 30
durationFrames: 210
seed: 31003
```

The authored scene references semantic IDs:

```text
actor:enki
prop:stag-of-absu
clip:enki:blink-natural:v1
clip:enki:breathe-calm:v1
clip:enki:helm-adjust:v1
material:water:gulf-calm:v1
```

No local file path or runtime bone name is authored here.

## 6. Resolution boundary

Compiler resolves:

```text
source/evidence record revisions
asset revisions + content hashes
runtime package + adapter versions
performance clip revisions
material definition revisions
semantic seeds
optional approved physics bake
```

Canonicalization produces:

```text
canonicalFormVersion: scene-canonical-form:v1
hashAlgorithm: sha256
resolvedSceneHash: sha256:<normative implementation value>
```

The renderer may not select different inputs after this boundary.

## 7. FrameContext 101

For frame 101:

```text
frame = 101
fps = 30
timeSeconds = 101 / 30
sceneId = scene:ch01:r01:s03
sceneSeed = 31003
mode = render or qa
```

All runtime state derives from this deterministic context and resolved inputs.

## 8. Enki performance state

Fixture declares frame 101 as:

```text
BLINK_CLOSED
```

Performance evaluation resolves semantic channels such as:

```text
face.eye-left-open  -> closed target
face.eye-right-open -> closed target
body.breath         -> deterministic clip-local value
```

Rive adapter maps those semantic channels to exact runtime controls and reports runtime evidence. It does not decide that frame 101 is the closed proof frame.

## 9. Stag state

Stag root transform is owned by the declared scene/runtime representation.

If Level 2:

```text
layered vessel transform from deterministic scene driver
```

If Level 3:

```text
Three world root using approved authored/baked transform
```

The semantic Stag identity remains the same.

## 10. Water/rigging state

Water resolves `material:water:gulf-calm:v1` to a pinned material/runtime definition.

Rigging state consumes vessel motion through an explicit causal driver. It does not run a free unrelated oscillator whose phase depends on wall clock.

## 11. Runtime evidence

Frame evidence bundle records at least:

```text
runtime IDs/versions
loaded asset hashes
evaluated semantic channels
owned transforms/material state
physics bake frame if applicable
state fingerprint
```

This proves what each engine believes it rendered, but does not certify final visual correctness.

## 12. Rendered frame

Remotion renders the composite at output pixel coordinates 1080x1920 according to the render profile.

Selected frame artifact:

```text
proof:enki-helm:frame:BLINK_CLOSED
frame: 101
pngHash: sha256:<future exact value>
```

## 13. Independent deterministic QA

Frame/motion gates include:

```text
VISUAL-ENKI-002-blink-closed
SEMANTIC/STRUCTURAL eye closure requirements
FAILURE-ENKI-002 cyan/debug leakage regression
contact/rigging tests where relevant to surrounding motion proof
```

A Rive state value of zero is not enough; rendered pixels must satisfy independent proof.

## 14. Motion proof

Frame 101 is also interpreted within the temporal sequence:

```text
OPEN → CLOSING → CLOSED → OPENING → RETURNED_OPEN
```

`MOTION-ENKI-001-natural-blink` proves this is animation rather than one correct still.

## 15. Semantic QA

Optional semantic QA asks whether:

- blink reads naturally;
- identity remains stable;
- helm interaction remains readable;
- no debug artifact is visible.

Model/version/prompt contract and input hashes are recorded.

## 16. Human approval

Human review binds exact contact sheet/video hashes and records criteria such as:

```text
blink natural
identity preserved
motion restrained
no distracting artifact
meaningful improvement over baseline
```

Any later render/input change invalidates this approval for promotion.

## 17. Scene promotion

Promotion receipt cross-links:

```text
resolved scene hash
render receipt
QA receipt
semantic receipt if required
human review receipt
superseded canonical revision
```

Promotion cannot substitute newer runtime/assets.

## 18. Reel assembly

The promoted scene revision is bound into a reel assembly manifest with exact:

```text
scene revision/resolved hash
narration/audio revision
caption revision
title revision
render profile
```

No `latest` reference.

## 19. Released MP4

Release receipt records exact encoded artifact hash:

```text
release:blessings-of-sumer:ch01:r01:vX
mp4Sha256: sha256:<future exact value>
```

Encode byte identity is a separate domain from semantic/frame visual determinism.

## 20. Reverse navigation

From released MP4/frame, Studio/diagnostics should support:

```text
release
→ reel assembly
→ promoted scene
→ benchmark/proof receipts
→ resolved scene
→ runtime evidence
→ asset/source hashes
→ performance/material/world definitions
→ historical/literary provenance
→ manuscript revision
```

## 21. Staleness example

If `clip:enki:blink-natural:v2` is promoted later:

```text
old release remains reproducible
old frame 101 remains tied to v1
scene candidate using v2 gets new resolved hash
old visual/motion/human evidence does not transfer automatically
```

## 22. Negative forensic cases

```text
FAILURE-TRACE-001-release-uses-latest
FAILURE-TRACE-002-frame-missing-resolved-hash
FAILURE-TRACE-003-runtime-evidence-input-mismatch
FAILURE-TRACE-004-human-review-old-render
FAILURE-TRACE-005-source-chain-broken
FAILURE-TRACE-006-performance-clip-revision-unrecorded
```

## 23. E2E golden trace

Future E2E:

```text
open release
→ select scene 03
→ select frame 101
→ inspect BLINK_CLOSED proof state
→ inspect Enki runtime evidence
→ inspect exact clip/material/asset hashes
→ inspect QA/human evidence
→ navigate to source/manuscript
→ return to release
```

Stable ID:

```text
E2E-TRACE-002-release-frame-to-manuscript
```

## 24. Definition of success

This forensic model succeeds when an approved frame can be explained forward and backward through durable IDs, versions and hashes without trusting filenames, timestamps, implicit package state or remembered conversation context.