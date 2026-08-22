# Animation Asset Manifest Contract

## Purpose

Define a reusable manifest for animation-ready artwork so every reel can move through the same preparation, validation, render, review, and revision workflow.

The manifest is the bridge between approved editorial art and Scene V2. Scene data should reference semantic asset ids; the manifest should resolve those ids to versioned files and provenance.

## Goals

- preserve immutable source lineage;
- make animation assets auditable and reproducible;
- validate layer quality before rendering;
- give the renderer semantic information such as material, role, depth, alpha, and overscan;
- support automated studio planning and review;
- avoid hard-coded file paths in Remotion components.

## Proposed Shape

```json
{
  "schemaVersion": 1,
  "manifestId": "chapter-01-reel-01-animation-v1",
  "projectSlug": "blessings-of-sumer",
  "chapterNumber": 1,
  "reelId": "<uuid>",
  "episodeNumber": 1,
  "visualBible": "blessings-of-sumer-v1",
  "assetVersion": "animation-v1",
  "sourceEditorialVersion": "editorial-v1",
  "shots": []
}
```

## Shot Entry

```json
{
  "shotId": "enki-at-the-helm",
  "sourceFrame": "../editorial-v1/shot-03.png",
  "sourceFrameSha256": "...",
  "status": "draft",
  "overscan": {
    "leftPercent": 10,
    "rightPercent": 10,
    "topPercent": 8,
    "bottomPercent": 8
  },
  "layers": []
}
```

## Layer Entry

```json
{
  "id": "shot03-enki-body-v1",
  "path": "shot-03/character/enki-body.png",
  "role": "character",
  "material": "cloth-heavy",
  "width": 1240,
  "height": 2180,
  "hasAlpha": true,
  "depthDefault": 0.52,
  "source": {
    "type": "derived",
    "from": "../editorial-v1/shot-03.png"
  },
  "sha256": "...",
  "review": {
    "status": "pending",
    "notes": []
  }
}
```

## Allowed Source Types

- `derived` — separated or transformed from approved editorial art;
- `regenerated` — newly generated to match an approved frame/visual bible;
- `painted-repair` — manually reconstructed hidden area or seam repair;
- `procedural` — mask, atmosphere, texture, or effect generated deterministically;
- `reference-state` — approved variant such as eyes closed or alternate gaze.

Every non-procedural layer should identify its visual source or generation provenance.

## Semantic Roles

Recommended roles:

- background
- environment
- water
- major-prop
- character
- character-state
- foreground-occluder
- atmosphere
- mask
- light
- reflection

## Material Tags

Recommended material vocabulary:

- atmosphere-distant
- rigid-vessel
- rigid-prop
- water
- underwater-refraction
- cloth-heavy
- cloth-light
- hair
- reed
- mist
- smoke
- skin
- stone
- clay
- metal-copper
- divine-light

Material tags should inform default motion suggestions but never force motion.

## Overscan Metadata

Overscan should be explicit so the studio can reject camera plans that expose empty or repaired edges.

Possible future validation:

```json
{
  "requiredForCamera": {
    "maxScale": 1.04,
    "maxX": 18,
    "maxY": 14
  },
  "validated": true
}
```

## Alpha Quality Metadata

Optional future fields:

```json
{
  "alphaReview": {
    "haloFree": true,
    "edgeIntegrity": "approved",
    "reviewScalePercent": 200
  }
}
```

These fields represent human or deterministic QC results, not an assumption that edge quality can be fully automated.

## Character Continuity Metadata

For state layers:

```json
{
  "characterId": "enki",
  "state": "blink",
  "baseAssetId": "shot03-enki-face-open-v1",
  "continuityReview": {
    "identityStable": true,
    "lightingStable": true,
    "silhouetteStable": true
  }
}
```

If a state fails identity continuity, it should be rejected even if technically valid.

## Review State

Suggested states:

- draft
- pending
- approved
- rejected
- superseded

The asset manifest may contain proposed AI review notes, but only explicit studio/human workflow actions should set visual approval.

## Versioning Rules

- never overwrite `editorial-v1`;
- avoid silently replacing approved animation assets;
- create `animation-v2` or a new layer id when a reviewed asset changes materially;
- keep old manifests available for render reproducibility;
- record why a replacement was made.

## Shot 3 Initial Manifest Target

The first useful Shot 3 package should contain only the assets needed to prove the style:

- overscanned sky/coast;
- far water;
- Stag/vessel;
- Enki hero layer;
- foreground rigging;
- mist/reflection treatment;
- blink state.

Head, hair, robe, hands, jewelry, or additional masks should only be split if A/B review proves the extra complexity improves publication quality.

## Shot 4 Initial Manifest Target

- deep water background;
- mid current;
- surface refraction;
- foreground distortion;
- suspended particles;
- Nammu coherence mask;
- optional light contour.

The manifest should reinforce that Nammu is environment-first, not a generic rigged character.

## Automated Validation Opportunities

The studio can automatically check:

- path exists;
- checksum matches;
- image dimensions;
- alpha presence where expected;
- duplicate ids;
- missing required layers;
- manifest/schema validity;
- referenced source version exists;
- Scene V2 references resolve;
- declared overscan is adequate for proposed camera travel when enough geometry is known.

Human review remains responsible for:

- edge quality;
- visual continuity;
- identity stability;
- cultural/world consistency;
- whether the scene actually looks good.

## Definition Of Success

A renderer should be able to receive `scene-v2.json` plus this manifest and resolve every visual dependency without embedding project-specific asset paths or assumptions in React code.