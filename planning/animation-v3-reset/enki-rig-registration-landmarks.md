# Enki Rig Registration and Landmark Contract

Status: **rig-preparation specification / coordinates intentionally unmeasured until source inspection**

This document defines how Enki source pixels become a reusable rig-preparation package without allowing crop guesses, generated patches or runtime-local coordinates to silently redefine character identity.

## 1. Core rule

Registration is a first-class artifact.

A rig region is not valid merely because it visually overlaps the source. Every prepared region must be traceable through:

```text
canonical source asset + hash
  ↓
source-pixel crop
  ↓
mask/alpha derivation
  ↓
registration transform
  ↓
semantic landmarks
  ↓
actor-local anchors
  ↓
runtime rig import
```

## 2. Coordinate spaces

Use existing V3 coordinate vocabulary:

```text
SOURCE_PIXEL   immutable coordinates of approved source image
ASSET_LOCAL    pixels within a prepared rig-region asset
ACTOR_LOCAL    semantic Enki rig space
SCENE_2D       scene placement, owned outside the rig
OUTPUT_PIXEL   final render coordinates
```

Rive internals may introduce implementation-local coordinates, but they never replace the canonical registration data.

## 3. Registration package

Proposed package:

```text
source:actor:enki:rig-prep:v1/
  reference-full.png
  regions/
    head-base.png
    beard-hair.png
    eye-left.png
    eye-right.png
    torso-robe.png
    upper-arm-left.png
    forearm-left.png
    hand-left.png
    upper-arm-right.png
    forearm-right.png
    hand-right.png
  registration.json
  source-receipt.json
  derivation-receipt.json
  contact-anchors.json
```

Optional regions may be added only with provenance/registration records.

## 4. Source receipt

Must bind:

```ts
interface RigSourceReceipt {
  sourceAssetId: string;
  sourcePath: string;
  sourceSha256: string;
  sourceWidth: number;
  sourceHeight: number;
  visualBibleId: string;
  sourceSceneId?: string;
  approvalReceiptId?: string;
}
```

Primary current source remains Reel 1 editorial Shot 3 until a dedicated Enki source sheet is approved.

## 5. Region registration

```ts
interface RigRegionRegistration {
  id: string;
  semanticRole: string;
  sourceRect: { x: number; y: number; width: number; height: number };
  assetSize: { width: number; height: number };
  sourceToAsset: Affine2D;
  actorLocalOrigin: { x: number; y: number };
  derivation: 'copied' | 'masked' | 'inpainted' | 'generated-extension';
  maskAssetId?: string;
  sourceSha256: string;
  regionSha256: string;
  reviewerStatus: 'draft' | 'approved' | 'rejected';
  notes?: string;
}
```

`generated-extension` is allowed only when unavoidable source occlusion requires reconstruction and must receive separate human review.

## 6. Landmark vocabulary

Required neutral landmarks:

```text
landmark:enki:head-top
landmark:enki:chin
landmark:enki:eye-left-inner
landmark:enki:eye-left-outer
landmark:enki:eye-left-center
landmark:enki:eye-right-inner
landmark:enki:eye-right-outer
landmark:enki:eye-right-center
landmark:enki:nose-tip
landmark:enki:mouth-center
landmark:enki:beard-bottom
landmark:enki:shoulder-left
landmark:enki:shoulder-right
landmark:enki:torso-root
landmark:enki:hand-left-center
landmark:enki:hand-right-center
```

Do not invent numeric coordinates in planning. Measure them from the approved source during rig-prep and commit them as evidence.

## 7. Landmark record

```ts
interface SourceLandmark {
  id: string;
  sourcePixel: { x: number; y: number };
  actorLocal: { x: number; y: number };
  confidence: 'measured' | 'estimated-occluded';
  sourceAssetId: string;
  reviewerStatus: 'draft' | 'approved';
}
```

A landmark estimated behind occlusion must never be mislabeled measured.

## 8. Bilateral eye contract

The blink benchmark depends on paired eye geometry.

Record:

```text
left eye inner/outer/center
right eye inner/outer/center
neutral aperture
closed target direction
local eyelid deformation region
identity exclusion zones
```

Closing one eye must not move the other eye's landmark set unless an explicitly authored facial motion requires it.

## 9. Identity exclusion zones

Regions where rig-preparation tools must not alter source identity without a candidate/review cycle:

```text
nose bridge/tip
cheek contour
beard-cheek boundary
crown silhouette
jaw silhouette
major facial lighting boundary
```

Blink generation is not permission to repaint the whole face.

## 10. Contact anchors

Semantic actor anchors:

```text
anchor:enki:hand-left
anchor:enki:hand-right
anchor:enki:gaze-origin
anchor:enki:head-center
anchor:enki:torso-root
anchor:enki:stance-root
```

Each maps to ACTOR_LOCAL and may additionally map to one or more runtime bones/nodes through the Rive adapter.

Scene data references semantic anchor IDs only.

## 11. Rive adapter mapping

Separate file/data conceptually:

```ts
interface RuntimeAnchorBinding {
  semanticAnchorId: string;
  runtimeAssetId: string;
  runtimeNodeName: string;
  runtimeVersion: string;
}
```

Renaming a Rive bone should require adapter-map revision, not Scene V3 edits.

## 12. Registration invariants

- source rect remains within source dimensions;
- region hash matches bytes actually imported;
- all required landmarks lie within or intentionally outside declared regions with explanation;
- source-to-asset mapping invertible;
- actor-local transform deterministic;
- no absolute workstation path in canonical registration object;
- registration revision changes stale dependent identity proofs;
- runtime adapter names are not stored in the canonical source landmark record.

## 13. Visual proof states

Rig-prep Storybook/Animation Lab proofs:

```text
REFERENCE_OVERLAY
REGION_BOUNDARIES
LANDMARKS
NEUTRAL_RIG
BLINK_OPEN
BLINK_CLOSED
RETURNED_OPEN
CONTACT_ANCHORS
```

Debug overlays must be unmistakable and production-ineligible.

## 14. Stable tests

```text
CONTRACT-RIG-001-source-hash-bound
CONTRACT-RIG-002-region-rect-in-source
CONTRACT-RIG-003-landmark-ids-unique
CONTRACT-RIG-004-registration-invertible
CONTRACT-RIG-005-anchor-semantic-runtime-separated
CONTRACT-RIG-006-occluded-landmark-labeled
VISUAL-ENKI-010-registration-overlay
FAILURE-RIG-001-region-out-of-bounds
FAILURE-RIG-002-source-hash-mismatch
FAILURE-RIG-003-duplicate-landmark
FAILURE-RIG-004-debug-mask-promoted
FAILURE-RIG-005-generated-extension-unreviewed
FAILURE-RIG-006-runtime-bone-name-in-scene
```

## 15. Human rig-prep review

Reviewer checks:

- source overlay aligns at 100%;
- face silhouette unchanged;
- eye registration matches approved source;
- crown/beard boundaries do not jump;
- cut regions have adequate overlap for deformation;
- generated/inpainted hidden pixels are plausible and limited;
- contact anchors are anatomically meaningful;
- normal-speed blink returns exactly to recognizable Enki.

## 16. Revision behavior

```text
source changes
  -> new rig-prep source revision
  -> registration revision
  -> rig proof stale

only Rive node names change
  -> runtime adapter binding revision
  -> source registration unchanged
```

This separation is deliberate.

## 17. Exit condition before Rive spike

Do not begin the production-intent Enki Rive benchmark until:

```text
[ ] source receipt exists
[ ] region list approved
[ ] measured source dimensions recorded
[ ] required landmarks measured
[ ] actor-local origin defined
[ ] contact anchors defined
[ ] generated-extension policy applied
[ ] registration overlay reviewed
[ ] debug artifacts classified non-production
```

The first rigging task should be importing a known registered identity, not discovering geometry while animating.