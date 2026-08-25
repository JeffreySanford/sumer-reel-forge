# Spatial Coordinates, Transforms, Units and Anchor Standard

Status: **planning contract**

V3 will combine source pixels, Rive local rigs, Pixi local meshes, Three/R3F world space, Remotion output pixels and Rapier physics. This document prevents each subsystem from inventing incompatible axes, pivots, scale and parentage.

## 1. Core rule

Every transform exists in one declared coordinate space. Conversion between spaces is explicit and testable.

No runtime may silently reinterpret coordinates.

## 2. Coordinate spaces

Planned spaces:

```text
SOURCE_PIXEL
  immutable editorial/source raster coordinates

ASSET_LOCAL
  local prepared asset/rig coordinates

ACTOR_LOCAL
  hero/character semantic rig space

OBJECT_LOCAL
  prop/material local space

SCENE_2D
  Level 1/2 composition space

WORLD_3D
  Level 3 spatial world space

PHYSICS_WORLD
  Rapier simulation space

OUTPUT_PIXEL
  final Remotion composition pixels
```

## 3. Source pixel space

Definition:

- origin: top-left;
- +X right;
- +Y down;
- units: source pixels;
- dimensions bound to exact source asset hash.

Localization/segmentation boxes live here unless otherwise declared.

The Enki eye grounding bug is a reference example of why this must be explicit.

## 4. Output pixel space

Final 9:16 default:

```text
1080 x 1920
origin top-left
+X right
+Y down
```

Safe-zone/caption tests operate here after projection.

Source pixel coordinates must never be compared directly with output pixels without transform/projection metadata.

## 5. Scene 2D space

Recommended semantic composition space:

```text
normalized or authored canvas coordinates mapped deterministically to output
Z = layer/depth ordering, not physical meters
```

Exact implementation may use output-pixel-like coordinates initially, but space ID remains explicit.

## 6. World 3D convention

Proposed Three/R3F world convention:

```text
+X = screen/world right
+Y = up
+Z = toward camera OR forward by documented project convention
```

Before implementation, choose one canonical handedness/forward convention aligned with Three.js and preserve it in adapters/tests.

Do not mix CSS-style +Y-down with 3D +Y-up without named conversion.

## 7. Physics world

Rapier binding uses the same semantic world scale/orientation as spatial runtime where possible.

If coordinate conversion is required, bake/adapter records exact matrix and unit conversion.

Physics body transform cannot be independently authored from the same prop’s world transform during playback.

## 8. World units

Choose a stable project world-unit policy before Three/Rapier adoption.

Recommended planning default:

```text
1 WORLD_UNIT = 1 meter for physically meaningful spatial/physics scenes
```

Reasons:

- intuitive boats/architecture/people;
- direct Rapier tuning;
- camera near/far readability;
- consistent city/world scale.

Stylized depth-card scenes may use authored scaling but resolve into world meters through explicit metadata.

## 9. Character scale

Actor definition stores nominal height/scale metadata independent from raster dimensions.

Example:

```text
actor:enki nominalVisualHeightMeters: 1.8 (project staging reference, not historical height claim)
```

This is a staging unit, not biographical fact.

## 10. Pivot/origin contract

Every transformable asset declares pivot semantics.

Examples:

```text
actor root: feet/ground reference
boat root: center-of-buoyancy / authored hull root
rigging rope: anchor attachment point
reed: base at ground/water root
door: hinge
wheel: axle center
```

Do not default every asset to image center.

## 11. Anchor contract

Semantic anchors:

```ts
interface AnchorDefinition {
  id: string;
  space: CoordinateSpaceId;
  position: Vec3;
  orientation?: Quaternion;
  purpose: string;
}
```

Examples:

```text
anchor:enki:hand-right
anchor:stag:tiller-grip
anchor:stag:rigging-root
anchor:city:eridu:quay-entry
```

## 12. Parent ownership

One parent owns root transform at a time.

Example Level 3:

```text
Three/R3F vessel world root
  └ Enki actor root attached to vessel
      └ Rive local skeleton

vessel world driver
  └ Pixi rigging local material response
```

Rive must not independently move Enki’s world root while Three also moves it.

## 13. Transform stack

Conceptual order:

```text
source registration
→ asset-local preparation
→ rig/object local deformation
→ parent/object transform
→ world transform
→ camera/view/projection
→ output pixel transform
```

Diagnostics should expose each stage when registration fails.

## 14. Matrix representation

Canonical serialized authoring should prefer human-readable transforms. Resolved/evaluated runtime may use matrices/quaternions.

Do not serialize engine-specific Matrix4 classes into Scene V3 authoring JSON.

## 15. Rotation units

Canonical contract uses radians internally or explicitly names degrees at authoring boundary; never ambiguous numbers.

Recommended:

```ts
rotationRadians
```

or a typed angle representation.

No bare `rotation: 90` whose unit depends on runtime.

## 16. Scale

Scale is dimensionless.

Negative scale/mirroring requires explicit policy because it can alter handedness, text, costumes and historical attributes.

Hero actors should not be casually mirrored if asymmetric identity/costume/evidence matters.

## 17. Depth ordering Level 2

L2 depth uses explicit ordered semantic layers or numeric depth with deterministic tie-breaking.

Tests:

- no nondeterministic equal-depth ordering;
- actor face state above body when intended;
- foreground rigging does not unexpectedly cross face safe zone;
- debug layers excluded production.

## 18. Camera transforms

Camera contract identifies:

- coordinate space;
- projection;
- position/orientation;
- target/focus semantics;
- near/far clipping in Level 3;
- safe-zone framing metadata.

Camera transform remains independent test contribution.

## 19. Source registration

Any derivative raster/rig asset stores registration back to editorial source:

```text
source asset hash
source width/height
crop rectangle
scale
translation
rotation if any
mask bounds
```

A candidate with correct local pixels but wrong source registration fails.

## 20. 2D → 3D projection

Depth cards derived from source declare:

```text
source crop
card dimensions in world units
pivot
depth placement
camera assumption/reference
approved visible angular/camera range
```

The approved camera range prevents exposing card edges/unseen geometry.

## 21. Billboard actors

If a Rive/Pixi actor is placed on a Three billboard/card:

- local rig coordinates stay local;
- world root belongs to Three;
- billboard facing policy explicit;
- scale conversion explicit;
- camera-facing behavior can be disabled/limited for authored pose.

## 22. Physics transform flow

Authoring:

```text
Scene V3 initial transform
→ simulation definition
→ Rapier fixed-step bake
→ baked frame transforms
→ Three/Remotion playback
```

Production playback does not recompute a competing authored transform for the same channel.

## 23. Contact constraints

Contacts compare anchors in a shared resolved space.

Example:

```text
world(anchor:enki:hand-right)
vs
world(anchor:stag:tiller-grip)
```

Tolerance expressed in meaningful space units, not arbitrary crop pixels.

## 24. Bounding volumes

Each asset can expose:

```text
local bounding box
world bounding box
semantic safe regions
collision proxy
```

QA uses correct space for containment/collision.

## 25. Coordinate diagnostics overlay

Animation Lab DEBUG mode can show:

- axes;
- pivots;
- anchors;
- bounding boxes;
- parent links;
- card edges;
- camera frustum;
- world units grid;
- source crop/registration.

This overlay is debug-only and must never enter canonical render resolution.

## 26. Unit tests

- source→asset transform round trip;
- 2D +Y-down ↔ world +Y-up conversion;
- pivot transform correctness;
- parent-child composition;
- anchor world position;
- no transform cycle;
- unit/angle type validation;
- stable depth tie-break;
- camera projection fixture;
- card safe-view bounds;
- physics→world playback equality;
- Windows/path independent semantics.

## 27. Storybook stories

```text
Geometry/Spaces/SourcePixel
Geometry/Spaces/Scene2D
Geometry/Spaces/World3D
Geometry/Pivots/Actor
Geometry/Pivots/Boat
Geometry/Anchors/HandToTiller
Geometry/Parenting/VesselActor
Geometry/DepthCards/SafeCamera
Geometry/Debug/AllOverlays
```

## 28. Visual/motion regression

- anchor stays registered through motion;
- no card-edge reveal;
- parent freeze affects children as expected;
- local Rive action remains while world root frozen;
- rigging material responds in expected local/world relationship.

## 29. E2E

- select actor → inspect coordinate space/pivot;
- toggle anchor overlay;
- select hand/tiller anchors;
- inspect world distance/contact QA;
- switch L2/L3 projection and verify stable semantic position;
- load invalid transform-ownership fixture and verify compiler block.

## 30. Stop condition

If Rive/Pixi/Three/Rapier integration requires duplicate ownership of a root transform or undocumented implicit conversion, stop and amend the coordinate standard before proceeding.

## 31. Definition of coordinate readiness

The standard is ready when the Enki helm worked example can trace an eye pixel, hand anchor, vessel root, rigging anchor and final output coordinate through clearly named transforms, with unit tests proving conversions and no runtime ambiguity about who owns each transform.
