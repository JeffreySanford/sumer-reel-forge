# Water and Fluid Material System Bible v1

Status: **runtime-neutral material/behavior specification**

Water is not one shader in Sumer Reel Forge. It is a recurring narrative system spanning open sea, deep/primordial water, canals, marshes, storm water and sacred/numinous Absu imagery. The platform needs one semantic language with several authored profiles rather than one generic looping displacement effect.

## 1. Core rule

```text
Scene V3 owns when/why water changes
Material profile owns semantic water behavior
Runtime adapter owns how that behavior is rendered
Remotion owns frame authority
```

A Pixi filter, Three shader or generated video clip may implement a profile; it does not redefine the profile's narrative meaning.

## 2. Initial water classes

```text
water:gulf:calm:v1
water:gulf:travel:v1
water:deep:nammu:v1
water:kutu:storm:v1
water:canal:managed:v1
water:marsh:reed:v1
water:absu:numinous:v1
```

These are semantic/material identities, not scene IDs.

## 3. Shared semantic channels

Where applicable:

```text
surface.amplitude
surface.frequency
surface.direction-x
surface.direction-y
surface.phase
surface.detail
current.speed
current.direction-x
current.direction-y
depth.opacity
depth.fog-density
reflection.strength
refraction.strength
foam.amount
spray.amount
particulate.amount
caustic.strength
numinous.intensity
```

Profiles expose only channels they support.

## 4. Deterministic phase rule

No wall-clock animation.

All oscillatory/stateful material motion derives from:

```text
frame
fps
scene seed
material semantic ID
target semantic ID
channel
purpose
algorithm version
```

Adding reeds or another actor cannot re-phase the water.

## 5. Painterly preservation

Water should preserve source illustration character rather than become a visibly unrelated real-time-game surface.

Required:

- maintain approved dominant value/color structure;
- local distortion rather than global image swimming;
- avoid hard procedural specular highlights absent from source art;
- preserve face/vessel silhouette readability;
- preserve caption-safe area;
- avoid obvious repeated sine-wave wallpaper.

## 6. `water:gulf:calm:v1`

Use:

- opening voyage;
- Enki Helm calm/travel proof;
- coastal approach where weather is mild.

Behavior:

```text
low amplitude
long wavelength impression
slow phase drift
small independent local detail
restrained reflection variation
no aggressive foam
```

Motion must be visible in proof controls but subtle at normal reel speed.

## 7. `water:deep:nammu:v1`

Narrative purpose: depth, origin, memory, primordial presence.

Behavior may include:

```text
slow current layers
volumetric/depth fog
suspended particulate
soft refraction
light attenuation
rare caustic movement
numinous intensity channel
```

Nammu's presence should emerge from water/light/depth rather than conventional mermaid or monster effects.

## 8. `water:kutu:storm:v1`

Behavior:

```text
high surface energy
short/long scale wave combination
foam/spray increase
weather-driven directionality
vessel-response driver output
storm-to-calm authored transition
```

Do not drive the boat with arbitrary independent oscillation when the benchmark claims water/physics causality.

## 9. `water:canal:managed:v1`

Narrative purpose: human/divine infrastructure and controlled flow.

Behavior:

- directional flow legible;
- lower surface chaos than open sea;
- gates/branches can alter flow state;
- water-release events are frame-authored;
- irrigation network topology comes from world data, not shader randomness.

This profile must support Chapter 1 canal work and Chapter 3 city/agriculture systems.

## 10. `water:marsh:reed:v1`

Behavior:

- shallow-water cues;
- small ripples around reeds/boats;
- localized reflection/refraction;
- vegetation interaction may be approximated deterministically;
- no deep-sea wave language.

Eridu's persistent identity depends heavily on this class.

## 11. `water:absu:numinous:v1`

This is an authored supernatural profile, not a physically correct fluid claim.

May alter:

```text
light transport
apparent depth
slow directional impossibility
particle suspension
color/value emphasis
```

Must remain bounded by the project's visual-language rules and clearly classified as mythic interpretation.

## 12. Runtime ownership

### Pixi

Good candidate for:

- 2D displacement;
- source-image localized deformation;
- masks/reflections;
- reed/water overlays;
- Level 2 material motion.

### Three/R3F

Good candidate for:

- Level 3 spatial water plane/card placement;
- perspective/depth relation;
- volumetric fog/light;
- spatial particles.

### Combined rule

If Three owns the spatial water surface, Pixi may still own a local source-faithful material overlay, but only one runtime owns each transform/material property. No double displacement.

## 13. MaterialDefinition concept

```ts
interface FluidMaterialDefinition {
  id: string;
  revision: number;
  class: 'surface-water' | 'deep-water' | 'canal' | 'marsh' | 'numinous';
  sourceAssetIds: string[];
  evidenceApplicationIds: string[];
  channels: string[];
  driverInputs: string[];
  defaultProfile: Record<string, number>;
  limits: Record<string, { min: number; max: number }>;
  proofStateIds: string[];
}
```

Scene data references semantic channels/profiles, not shader uniforms directly.

## 14. Current Shot 3 evidence

Approved current water layer:

```text
asset: shot03-water-v1
sha256: f77eb37906ae589b0483dd3a11504ee39cc1aa28500ec10dba5de14a3b6f8979
role: water
material: water
```

This becomes a source/reference input for the calm-water benchmark, not the permanent definition of all water.

## 15. Driver relationships

Examples:

```text
wind/weather state -> water energy
water/approved bake -> vessel root response
vessel response -> rigging lag
canal gate state -> managed flow state
numinous narrative cue -> absu intensity
```

Driver chains must be explicit in resolved-scene diagnostics.

## 16. Proof states

Common proof-state vocabulary:

```text
NEUTRAL
LOW_ENERGY
MID_ENERGY
PEAK_ENERGY
SETTLED
```

Profile-specific examples:

```text
NAMMU_DEPTH_VISIBLE
STORM_FOAM_PEAK
CANAL_RELEASE
MARSH_RIPPLE_CONTACT
ABSU_NUMINOUS_PEAK
```

Proof frames live in fixture data, not copied literals across tests.

## 17. Required controls

```text
MATERIAL_FROZEN
CAMERA_FROZEN
VESSEL_FROZEN
NO_REFRACTION
NO_PARTICLES
NO_FOAM
NO_NUMINOUS
```

A water benchmark must prove water motion independently from camera movement.

## 18. Stable tests

```text
CONTRACT-WATER-001-profile-id-unique
CONTRACT-WATER-002-supported-channel
CONTRACT-WATER-003-channel-limits
UNIT-WATER-001-frame-repeatability
UNIT-WATER-002-seed-isolation
VISUAL-WATER-001-calm-source-preservation
MOTION-WATER-001-calm-local-motion
MOTION-WATER-002-storm-energy-transition
MOTION-WATER-003-canal-release
FAILURE-WATER-001-wall-clock-phase
FAILURE-WATER-002-camera-only-motion
FAILURE-WATER-003-global-image-swim
FAILURE-WATER-004-double-displacement-owner
FAILURE-WATER-005-storm-profile-on-marsh
PERF-PIXI-001-water-proof
HUMAN-WATER-001-painterly-motion
```

## 19. Boundary/leak tests

Material deformation must not:

- reveal transparent/empty pixels outside approved asset extent;
- move Enki's face as part of water deformation;
- expose repaired/inpainted background seams;
- drag vessel pixels when vessel is supposed to be independent;
- cause visible wrap/repeat seams;
- leak debug masks.

## 20. Performance budget philosophy

Measure separately:

```text
single Level 2 water material
water + vessel + rigging + hero
Level 3 water/depth scene
storm particles + water + physics playback
```

Do not optimize a synthetic shader demo that excludes the actual composition cost.

## 21. Historical/material evidence

Evidence may inform:

- marsh/reed environment;
- canal context;
- watercraft interaction;
- site geography;
- material color/context.

Physical water appearance remains primarily art direction + environment modeling. Do not present a shader parameter as archaeological fact.

## 22. Promotion

A water profile becomes production-capable only when:

```text
semantic contract green
deterministic frame proof green
source-boundary tests green
Storybook controls green
motion proof green
performance budget green
negative cases fail correctly
human painterly-motion review green
runtime/version receipt current
```

One successful calm-water proof does not automatically approve storm, marsh or numinous profiles.