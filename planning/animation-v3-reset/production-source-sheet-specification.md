# Production Source-Sheet Specification

Status: **planning contract / reusable visual-source preparation**

A production source sheet is the approved visual reference package from which reusable actor/prop/runtime preparation is derived. It exists to stop one shot crop from becoming the accidental permanent definition of a character, vessel or object.

## 1. Source-sheet purpose

For reusable production identities such as Enki, Enlil, the Stag, recurring animals and major props, the source sheet provides:

- canonical visual identity reference;
- approved neutral pose/view(s);
- source dimensions and hashes;
- registration landmarks;
- palette/material notes;
- known/unknown geometry;
- permissible segmentation/inpainting boundaries;
- provenance to editorial/visual-bible evidence;
- human approval.

## 2. Authority hierarchy

```text
visual bible / character or prop bible
        ↓
approved editorial references
        ↓
production source sheet
        ↓
rig/mesh/model preparation
        ↓
runtime implementation
```

A source sheet cannot silently override the bible that authorized it.

## 3. Package layout

Conceptual:

```text
source-sheets/actors/enki/v1/
  source-sheet.json
  identity-front.png
  identity-three-quarter.png   optional until approved
  neutral-full.png             optional depending source coverage
  registration.json
  palette.json
  source-receipt.json
  review.json
```

For the Stag:

```text
source-sheets/props/stag/v1/
  source-sheet.json
  broadside.png
  helm-detail.png
  rigging-reference.png
  registration.json
  parts-map.json
  source-receipt.json
  review.json
```

## 4. SourceSheet contract

Conceptual:

```ts
interface ProductionSourceSheet {
  id: string;
  revision: number;
  subjectId: string;
  subjectKind: 'actor' | 'prop' | 'animal' | 'environment';
  visualBibleId: string;
  sourceRefs: SourceImageRef[];
  identityAnchors: string[];
  registrationId: string;
  paletteProfileId?: string;
  materialProfileIds?: string[];
  unresolvedQuestions: SourceSheetQuestion[];
  allowedDerivations: DerivationPolicy[];
  approval: SourceSheetApproval;
}
```

## 5. Source image references

Every source image records:

```text
logical asset ID
content hash
pixel dimensions
crop relationship to parent source
whether original editorial, approved extension or derived reconstruction
rights/provenance status
```

No `latest.png` or machine-local path is source identity.

## 6. Identity anchors

For Enki:

```text
face/head silhouette
compact horned crown
hair/beard silhouette
cream robe mass
lapis/copper trim
belt/jewelry relationship
skin/value range
```

For the Stag:

```text
high curved prow/stern
reed/dark-timber practical expedition construction
sail/mast proportions
woven shelter/cargo language
helm/tiller relationship
```

Anchors are reviewed semantically and, where useful, measured geometrically.

## 7. Pose/view policy

Do not invent unseen views merely because a rigging tool prefers them.

Each view is classified:

```text
DIRECT_APPROVED_SOURCE
APPROVED_SOURCE_EXTENSION
RECONSTRUCTED_WITH_EVIDENCE
SPECULATIVE_PROJECT_VIEW
```

A speculative back view cannot be treated as equally authoritative to the approved face reference.

## 8. Segmentation policy

Segmentation may separate regions needed for deformation, but every region records:

- parent source hash;
- crop/registration;
- alpha-generation method;
- whether pixels copied, repaired or generated;
- reviewer status.

Debug masks/localization outputs never become source-sheet identity.

## 9. Inpainting/source extension

When hidden pixels must be reconstructed:

```text
source gap identified
  ↓
reconstruction candidate generated/painted
  ↓
classified as source extension
  ↓
identity QA
  ↓
human approval
  ↓
new source-sheet revision or approved derivative
```

Never overwrite original source pixels to hide the distinction.

## 10. Multi-shot continuity

The source sheet exists specifically so later shots bind to the same subject identity instead of extracting incompatible versions from each frame.

A shot-specific pose may reference the subject source sheet plus a pose derivative.

## 11. Historical evidence

Source sheets may reference visual-evidence applications for costume/material/vehicle context.

Historical evidence does not become portrait identity. Enki's project identity remains an approved artistic continuity even when direct ancient portrait evidence is unavailable.

## 12. Negative cases

```text
FAILURE-SOURCE-SHEET-001-missing-parent-hash
FAILURE-SOURCE-SHEET-002-unapproved-source-extension
FAILURE-SOURCE-SHEET-003-debug-mask-as-source
FAILURE-SOURCE-SHEET-004-unseen-view-labeled-direct
FAILURE-SOURCE-SHEET-005-shot-local-identity-overrides-sheet
FAILURE-SOURCE-SHEET-006-source-dimensions-invented
FAILURE-SOURCE-SHEET-007-rights-status-unknown-for-copied-evidence-image
```

## 13. Enki migration

Current Shot 3 editorial/derived artwork remains valid source evidence.

The first Enki source-sheet v1 should:

- reference Shot 3/editorial visual baseline;
- measure source dimensions/landmarks;
- preserve current approved identity;
- explicitly record any required unseen-region extension;
- enable future multi-shot rigs without requiring Shot 3 coordinates forever.

## 14. Stag migration

Current approved Shot 3 vessel and rigging layers become inputs to a dedicated Stag source-sheet rather than the Stag remaining equivalent to those two files.

## 15. Storybook/Studio

Required views:

```text
SourceSheets/Enki/Overview
SourceSheets/Enki/Registration
SourceSheets/Enki/DerivedRegions
SourceSheets/Enki/UnresolvedQuestions
SourceSheets/Stag/Overview
SourceSheets/Stag/Parts
SourceSheets/Stag/SourceComparison
```

## 16. Tests

```text
CONTRACT-SOURCE-SHEET-001-valid-sheet
CONTRACT-SOURCE-SHEET-002-source-hash-binding
CONTRACT-SOURCE-SHEET-003-view-classification
FAILURE-SOURCE-SHEET-002-unapproved-source-extension
VISUAL-ENKI-001-neutral
HUMAN-SOURCE-SHEET-001-enki-identity
```

## 17. Definition of readiness

A source sheet is ready when reusable runtime preparation can begin without deciding subject identity, inventing measurements, hiding reconstruction, or depending on one scene's crop as permanent truth.