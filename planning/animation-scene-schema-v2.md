# Animation Scene Schema V2 - Planning Contract

## Purpose

Define the next data model for cinematic animation so Reel 1 can become the template for later reels without requiring a new bespoke React composition per reel.

The scene contract should describe art direction in data while keeping story text and narration authoritative in the reel production record.

## Target Relationship

```text
Reel production data
        |
        v
Planning / scene builder
        |
        v
Versioned scene-v2 JSON
        |
        v
Generic Remotion composition
        |
        +--> animation asset manifest
        +--> named motion presets
        +--> narration/caption timings
        |
        v
Render + review artifacts
```

## Design Principles

1. Story text is not duplicated or rewritten by the animation scene.
2. Scene data owns visual composition, timing references, asset selection, depth, camera behavior, transitions, and motion presets.
3. Assets are referenced semantically and by versioned manifest, not discovered ad hoc by React code.
4. Named presets replace arbitrary transform math scattered across components.
5. The schema must support both physical and numinous motion languages.
6. Human review status is distinct from technical validity.
7. The schema should remain serializable, diffable, auditable, and suitable for structured LLM output.

## Proposed Top-Level Shape

```json
{
  "schemaVersion": 2,
  "sceneId": "chapter-01-reel-01-animation-v1",
  "projectSlug": "blessings-of-sumer",
  "chapterNumber": 1,
  "reelId": "<uuid>",
  "episodeNumber": 1,
  "visualBible": "blessings-of-sumer-v1",
  "styleBible": "reel-01-animation-style-v1",
  "assetVersion": "animation-v1",
  "width": 1080,
  "height": 1920,
  "fps": 30,
  "durationFrames": 1800,
  "shots": [],
  "transitions": [],
  "reviewPolicy": {},
  "sourcePolicy": {}
}
```

## Shot Contract

Each shot should express intent plus executable visual direction.

```json
{
  "id": "enki-at-the-helm",
  "sourceShotNumber": 3,
  "startFrame": 390,
  "durationFrames": 210,
  "emotionalPurpose": "calm authority",
  "eyeTarget": "enki-face",
  "stillnessAnchor": "enki-facial-identity",
  "camera": {},
  "layers": [],
  "performance": [],
  "atmosphere": [],
  "lighting": [],
  "captionPolicy": {},
  "transitionIn": "shot-02-to-03-rigging-occlusion",
  "transitionOut": "shot-03-to-04-water-reflection"
}
```

## Camera Contract

```json
{
  "preset": "slowPush",
  "scaleFrom": 1.0,
  "scaleTo": 1.025,
  "xFrom": 0,
  "xTo": -8,
  "yFrom": 0,
  "yTo": -10,
  "rotationFrom": 0,
  "rotationTo": 0,
  "easing": "cinematicSlow",
  "settleFromProgress": 0.82
}
```

Camera values remain reviewable parameters, not hidden implementation constants.

## Layer Contract

```json
{
  "id": "enki-body",
  "assetId": "shot03-enki-body-v1",
  "role": "character",
  "material": "cloth-heavy",
  "depth": 0.52,
  "anchor": "center",
  "transform": {
    "x": 0,
    "y": 0,
    "scale": 1
  },
  "motionPresets": ["breathing"],
  "required": true
}
```

Useful roles:

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
- caption-support

Useful material tags:

- rigid-vessel
- water
- cloth-heavy
- hair
- reed
- mist
- skin
- stone
- divine-light
- underwater-refraction

## Motion Preset Contract

Presets should be declared in a reusable library and parameterized by scene data.

Examples:

- `cinematicSlow`
- `heavyPhysical`
- `clothLag`
- `waterPulse`
- `boatBob`
- `riggingTension`
- `breathing`
- `blinkOnce`
- `subtleGazeShift`
- `numinousDrift`
- `mistDrift`
- `riseReveal`
- `settle`

Example use:

```json
{
  "preset": "blinkOnce",
  "target": "enki-eyes",
  "startProgress": 0.43,
  "durationFrames": 7,
  "parameters": {
    "reopenBias": 0.6
  }
}
```

## Performance Contract

Character performance should be sparse and explicit.

```json
{
  "target": "enki-body",
  "preset": "breathing",
  "startProgress": 0,
  "endProgress": 1,
  "intensity": 0.18
}
```

Narrator-only shots should not automatically generate mouth movement.

## Atmosphere And Lighting

Atmosphere and lighting should be separate from ordinary material layers when useful.

```json
{
  "id": "dawn-mist",
  "assetId": "shot03-mist-v1",
  "preset": "mistDrift",
  "intensity": 0.2,
  "depthRange": [0.2, 0.7]
}
```

```json
{
  "id": "water-reflection",
  "maskAssetId": "shot03-water-reflection-mask-v1",
  "preset": "waterPulse",
  "intensityFrom": 0.08,
  "intensityTo": 0.18
}
```

## Numinous Motion Support

The schema must not assume all animation is character rigging.

For Nammu, a shot may primarily use masks, currents, refraction, and coherence:

```json
{
  "id": "nammu-coherence",
  "assetId": "shot04-nammu-coherence-mask-v1",
  "role": "mask",
  "material": "divine-light",
  "depth": 0.42,
  "motionPresets": ["numinousDrift"],
  "visibility": {
    "fromProgress": 0.2,
    "peakProgress": 0.72,
    "toProgress": 1.0,
    "mode": "coherence"
  }
}
```

Avoid encoding Nammu as a generic character fade.

## Transition Contract

Transitions should be named, scene-motivated handoffs.

```json
{
  "id": "shot-03-to-04-water-reflection",
  "fromShot": "enki-at-the-helm",
  "toShot": "nammu-under-water",
  "type": "material-handoff",
  "sourceElement": "water-reflection",
  "targetElement": "surface-refraction",
  "durationFrames": 12,
  "fallback": "short-dissolve"
}
```

## Caption Policy

The scene should describe placement constraints, not duplicate authoritative caption text.

```json
{
  "safeZone": "lower-middle",
  "avoidTargets": ["enki-face", "helm"],
  "motion": "stable",
  "maxLines": 2
}
```

## Keyframe Review Markers

Support named review checkpoints without requiring them to be animation keyframes.

```json
{
  "reviewMarkers": [
    { "id": "opening", "progress": 0.0 },
    { "id": "quarter", "progress": 0.25 },
    { "id": "hero", "progress": 0.5 },
    { "id": "handoff-prep", "progress": 0.75 },
    { "id": "end", "progress": 1.0 }
  ]
}
```

The review tool can extract these frames automatically.

## Review Policy

```json
{
  "scorecard": "reel-01-animation-review-v1",
  "humanApprovalRequired": true,
  "minimumCategory": 4,
  "publishabilityMinimum": 5,
  "hardFailsBlockApproval": true
}
```

AI-assisted review may propose scores or notes but may not set `humanApprovalRequired` to false.

## Source Policy

```json
{
  "storyMutationAllowed": false,
  "narrationSource": "reel-production-record",
  "captionSource": "reel-production-record",
  "visualSource": "versioned-animation-asset-manifest"
}
```

## Validation Layers

### Schema validation

- required ids and timing;
- valid presets/materials;
- frame ranges within reel duration;
- transition references resolve;
- asset references exist in manifest.

### Asset validation

- dimensions;
- alpha expectation;
- checksum;
- overscan;
- source lineage;
- duplicate/missing ids.

### Editorial validation

- visual bible reference exists;
- hard-fail policy present;
- human approval remains required;
- source text remains immutable.

## LLM / Planner Compatibility

Scene V2 should be intentionally suitable for JSON-schema-constrained generation. A local or remote planning model can propose a scene object, but the system must:

1. validate it against the schema;
2. resolve it against approved asset manifests;
3. apply deterministic guardrails;
4. show the proposal to a human;
5. persist approval/revision history.

The model proposes; the studio validates and the human approves.

## Definition Of Success

The contract is successful when Reel 2 can use the same generic Remotion composition and motion primitive library by supplying new approved assets and Scene V2 data rather than introducing a bespoke `FullReel2Animation.tsx`.