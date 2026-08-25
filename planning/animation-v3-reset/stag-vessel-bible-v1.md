# Stag of the Absu Vessel Bible v1

Status: **concrete prop/vehicle continuity packet**

Semantic ID: `prop:stag-of-absu`

The Stag recurs across Chapter 1 voyage, helm, storm and landfall material. It therefore needs the same continuity discipline as a hero character: visual identity, semantic parts, anchors, material behavior, motion ownership and migration rules must survive runtime changes.

## 1. Authority order

```text
1. Blessings of Sumer visual bible v1
2. approved Reel 1 editorial frames
3. approved source-faithful derived vessel/rigging layers
4. approved future vessel source sheet
5. runtime implementation
6. scene-specific motion/simulation
```

A Three model, physics hull or generated boat variation never silently becomes the Stag merely because it renders well.

## 2. Established visual identity

The current visual bible defines the vessel as:

- working reed-and-dark-timber sailing vessel;
- high curved prow and stern;
- woven shelter;
- practical rigging;
- clay jars, timber bundles, reed bundles and tools;
- modest livestock/expedition cargo where composition permits;
- practical expedition craft, not royal spectacle.

Explicitly avoid:

```text
Viking longship
galleon
Greek/Roman galley
fantasy royal barge
modern yacht fittings
ornamental warship silhouette
```

## 3. Canonical current sources

Editorial continuity references include:

```text
shot 02 — Stag under sail / coastline
shot 03 — Enki at the helm
shot 08 — approach/landfall
```

Current approved Shot 3 derived assets:

```text
asset: shot03-vessel-v1
sha256: fe28b4ec5cd0efd724908a106649db782f685f76cd0e34d01e085af02467c3d4
role: major-prop
material: rigid-vessel

asset: shot03-rigging-v1
sha256: 1f3e6add78d406d3f17ee618604da37eef9b2a8bf403650ba98986f4ab82d5f7
role: foreground-occluder / rigging
material: reed
```

These are Shot 3 implementation assets, not yet a complete reusable vessel package.

## 4. Proposed VesselDefinition

```ts
interface VesselDefinition {
  id: 'prop:stag-of-absu';
  revision: number;
  displayName: 'Stag of the Absu';
  visualSourceIds: string[];
  evidenceApplicationIds: string[];
  materialProfileIds: string[];
  partIds: string[];
  anchorIds: string[];
  motionProfileIds: string[];
  physicsProfileIds: string[];
  continuity: VesselContinuityContract;
}
```

The semantic vessel definition remains runtime-neutral.

## 5. Semantic hierarchy

Minimum reusable part vocabulary:

```text
stag.root
stag.hull
stag.prow
stag.stern
stag.deck
stag.shelter
stag.mast
stag.sail
stag.rigging.port
stag.rigging.starboard
stag.tiller
stag.cargo.jars
stag.cargo.reeds
stag.cargo.timber
stag.cargo.tools
```

Scene-specific cargo can vary, but the vessel's identity must remain recognizable.

## 6. Anchor contract

Required semantic anchors:

```text
anchor:stag:root
anchor:stag:center-of-mass
anchor:stag:waterline-center
anchor:stag:bow
anchor:stag:stern
anchor:stag:mast-base
anchor:stag:sail-center
anchor:stag:tiller-grip
anchor:stag:cargo-zone
anchor:stag:enki-stance
```

Enki's semantic hand anchor binds to `anchor:stag:tiller-grip`; Scene V3 does not know the runtime's mesh vertex or Three node name.

## 7. Motion channels

Reusable channels:

```text
vessel.heave
vessel.roll
vessel.pitch
vessel.yaw
sail.fill
sail.flutter
rigging.tension
rigging.lag
cargo.secondary-shift
```

For calm water, motion remains restrained. For Kutu storm, the same semantic channels may be driven by an approved physics bake rather than hand-authored curves.

## 8. Transform ownership

### Level 2

```text
Scene V3 owns timing
layered/2D vessel system owns vessel-root screen-space transform
Pixi may own local sail/rigging deformation
Rive owns Enki local deformation
Remotion owns frame/render authority
```

### Level 3

```text
Three/R3F owns vessel WORLD_3D root placement
approved physics bake may drive vessel root channels
Pixi or Three material subsystem owns local rigging/sail deformation
Rive actor root follows vessel attachment transform
```

Never let physics, Three and a 2D transform layer all write vessel roll simultaneously.

## 9. Material profiles

Initial profiles:

```text
material:stag:hull-dark-timber-bitumen:v1
material:stag:reed-woven:v1
material:stag:rope-rigging:v1
material:stag:sail-woven:v1
material:stag:clay-cargo:v1
```

Material definitions preserve painterly texture; runtime shaders should not make the vessel look like glossy PBR game art.

## 10. Collision/physics abstraction

Physics representation is not visual geometry.

Proposed physics profile:

```text
physics:stag:hull-response:v1
```

May contain:

- simplified hull collider(s);
- center of mass;
- buoyancy/response approximation or authored force inputs;
- hail collision layers;
- maximum permitted roll/pitch envelope for benchmark;
- fixed-step version;
- bake version.

The collider must never become visible render geometry.

## 11. Calm-water benchmark

For Enki Helm:

Required causal chain:

```text
water state
  -> vessel roll/heave
  -> rigging lag
  -> actor attachment follows root
  -> Enki local performance remains independent
```

Camera motion is a separate branch.

## 12. Kutu storm benchmark

Required controls:

```text
NO_HAIL
VESSEL_FIXED
NO_RIGGING_RESPONSE
SAME_SEED_REPEAT
DIFFERENT_SEED_COMPARISON
```

Storm acceptance requires plausible bounded vessel response without destroying silhouette or exposing unsupported geometry.

## 13. Level 3 source preparation

Before spatial migration, create a vessel source package:

```text
source:stag:v1/
  reference-side.png
  reference-three-quarter.png
  hull-card-or-mesh
  sail-card-or-mesh
  rigging-source
  cargo-source
  anchors.json
  registration.json
  source-receipt.json
```

Do not extrapolate unseen opposite-side detail without marking the reconstruction class.

## 14. Historical evidence policy

The Stag is a project-designed historical-fiction vessel. Evidence may inform:

- material technology;
- reed/wood/bitumen construction vocabulary;
- cargo types;
- sailing/boat context;
- regional watercraft analogues.

No single later/earlier vessel depiction should be labeled a direct portrait of the Stag.

Applications must use the visual-evidence relationship model.

## 15. Storybook/Animation Lab stories

```text
Props/Stag/Identity
Props/Stag/PartsAndAnchors
Props/Stag/CalmNeutral
Props/Stag/RollPositive
Props/Stag/RollNegative
Props/Stag/RiggingLagPeak
Props/Stag/TillerContact
Props/Stag/DebugCollision
Props/Stag/Level3DepthProof
```

Debug collision view is permanently non-production.

## 16. Stable tests

```text
CONTRACT-STAG-001-required-parts
CONTRACT-STAG-002-anchor-ids-unique
CONTRACT-STAG-003-tiller-anchor-resolves
CONTRACT-STAG-004-single-root-transform-owner
MOTION-STAG-001-calm-roll-heave
MOTION-RIGGING-001-vessel-lag
VISUAL-STAG-001-identity-neutral
VISUAL-STAG-002-rigging-lag-peak
FAILURE-STAG-001-camera-masquerades-as-vessel
FAILURE-STAG-002-double-transform-owner
FAILURE-STAG-003-collider-visible
FAILURE-STAG-004-unbounded-roll
FAILURE-STAG-005-rigging-crosses-enki-face
PERF-STAG-001-level3-preview
HUMAN-STAG-001-vessel-continuity
```

## 17. Negative visual controls

Must fail when:

- hull becomes generic Viking/galleon silhouette;
- high curved prow/stern identity disappears;
- vessel appears royal/ornamental instead of working expedition craft;
- rigging clips across Enki's face in approved framing;
- cargo changes scale impossibly between adjacent shots;
- camera drift is the only apparent boat movement in a benchmark requiring vessel motion;
- waterline relation breaks visibly;
- Three camera reveals unpainted card backs/voids.

## 18. Revision policy

```text
new better physics collider
  -> physics profile revision only

new approved Three spatial representation
  -> runtime/spatial asset revision

visual silhouette redesign
  -> VesselDefinition/visual identity revision and broad continuity review
```

Runtime refinement must not become silent art-direction revision.

## 19. Production readiness

The Stag is reusable-production-ready when:

```text
visual identity approved
source package registered
semantic parts/anchors complete
calm motion proof green
rigging causality green
Enki tiller contact green
Level 3 spatial proof green when used spatially
physics bake contract green when used in storm
negative controls behave correctly
human continuity approval green
```

This makes the Stag a persistent production object rather than a different boat hidden inside every shot.