# Animation V3 Package Adoption and Compatibility Matrix

Status: **planning contract**

This document defines how Sumer Reel Forge adopts animation/runtime dependencies for Levels 2 and 3. The purpose is to prevent a package from becoming architectural authority merely because a proof of concept looks impressive.

## 1. Adoption principle

Every new runtime must answer five questions before production use:

1. What problem does it own?
2. What problem does it explicitly not own?
3. Can Scene V3 and Remotion remain timing authority?
4. Can the runtime be tested deterministically enough for evidence and regression?
5. Can we preserve source/provenance/human-approval rules around it?

No package is adopted only because it can animate.

## 2. Package ownership map

| Package/runtime | Primary ownership | Secondary use | Must not own |
| --- | --- | --- | --- |
| Remotion | production frame/render authority | composition, encoding | character semantics, physics intent |
| Rive | hero-character deformation/performance | reusable props with rigs | global scene timing, historical truth |
| PixiJS | 2D mesh/material deformation | particles, ropes, water textures | world camera authority |
| React Three Fiber / Three.js | spatial world, camera, geometry | particles, depth cards | character rig semantics |
| @remotion/three | Remotion/R3F bridge | production integration | independent timeline |
| Rapier | fixed-step physical simulation | joints, secondary motion | authored acting/performance |
| Spine | optional repeated skeletal rigs | animals, background actors | hero-character default unless proven superior |
| Theatre.js | visual authoring | camera/light/object keyframes | production state authority |
| ComfyUI | candidate asset preparation | segmentation, repair, selective generation | production timing, approval |
| I2V adapter | selective baked motion | one-off difficult organic motion | default Level 3 renderer |
| Qwen3-VL | semantic/perceptual QA | localization assistance | promotion authority |

## 3. Required package spike format

Every dependency gets a bounded spike branch and one canonical proof.

A spike must include:

- exact version;
- license note;
- bundle/runtime cost;
- deterministic timing strategy;
- Storybook story;
- unit tests;
- one rendered proof;
- one negative test;
- evidence receipt;
- written keep/reject decision.

The spike does not migrate Reel 1.

## 4. Rive adoption gate

### Intended ownership

- blink;
- gaze;
- brows;
- breathing;
- head movement;
- torso/arm/hand articulation;
- reusable facial/body performance clips;
- selected cloth/hair deformation attached to actors.

### Required benchmark

**Enki Facial Performance**

Must demonstrate:

- OPEN → CLOSED → OPEN blink;
- left/right eyes synchronized within approved tolerance;
- gaze shift independent from blink;
- breathing independent from face;
- source identity visually preserved;
- explicit frame control from the host;
- repeatable same-frame output state.

### Reject Rive as hero default if

- host cannot reliably seek/evaluate exact frames;
- raster art cannot be preserved without unacceptable repainting;
- authoring workflow requires excessive proprietary/manual steps for every actor;
- head/body deformations create a puppet aesthetic inconsistent with the paintings.

## 5. PixiJS adoption gate

### Intended ownership

- water displacement;
- reeds/vegetation sway;
- rope/rigging mesh;
- hair/cloth local deformation;
- smoke/fire/heat shimmer;
- 2D material effects.

### Required benchmark

**Rigging + Water Material Proof**

Must demonstrate:

- frame-driven motion;
- two independently timed material channels;
- vessel-driven rigging causality;
- bounded displacement;
- no autonomous ticker dependency in production mode;
- screenshot and short-motion regression coverage.

### Reject or constrain if

- renderer requires an uncontrolled real-time ticker;
- WebGL/WebGPU output cannot be made stable enough for approved evidence;
- integration duplicates work better owned by Three/R3F.

## 6. Three/R3F adoption gate

### Intended ownership

- spatial camera;
- painted depth cards;
- architecture;
- terrain;
- world placement;
- occlusion;
- lighting/fog;
- instancing;
- spatial particles.

### Required benchmark

**Stag on Water Spatial Proof**

Must demonstrate:

- at least five depth planes;
- controlled camera move with real perspective;
- no invented hidden geometry exposed by camera;
- stable composition at exact frames;
- actor card remains source-faithful;
- Remotion remains authoritative frame source.

### Production policy

2.5D cards first. Full 3D only where the scene genuinely benefits.

## 7. @remotion/three policy

All `@remotion/*` packages must use the exact same version as `remotion`.

A dependency upgrade involving Remotion must update all Remotion packages as one atomic change and rerun:

- animation unit suite;
- bundle smoke test;
- spatial benchmark render;
- canonical Reel 1 smoke render.

## 8. Rapier adoption gate

### Intended ownership

- vessel secondary response;
- ropes/joints;
- hanging ornaments;
- hail/debris impacts;
- falling/settling props.

### Required benchmark

**Kutu Hail Physics Proof**

Must demonstrate:

- fixed timestep;
- repeatable initial conditions;
- stable body construction order;
- identical baked transform hash on repeated runs in the supported environment;
- render consumes baked transforms, not an unverified live simulation.

### Reject physics use when

an authored keyframe/performance track is simpler, clearer or easier to art-direct.

## 9. Spine evaluation gate

Spine is optional and evaluated specifically for:

- herd animals;
- repeated workers;
- guards;
- procession participants.

The first evaluation is **Marriage Herd Procession**.

Spine is not adopted if Rive or a simpler instanced system handles these classes adequately.

Licensing/editor requirements must be documented before any production asset depends on Spine.

## 10. Theatre.js adoption gate

Theatre Studio is permitted only as an authoring environment.

Required proof:

1. author a camera/light/object sequence;
2. export state;
3. compile to Scene V3 tracks;
4. render without Theatre Studio present;
5. compare authored vs compiled key states.

No production render may depend on unsaved local Theatre editor state.

## 11. Live2D policy

Live2D remains a specialist evaluation only.

Possible use:

- dialogue-heavy portrait scenes;
- close facial performance where Rive cannot meet quality.

Do not add Live2D to the critical path until a benchmark demonstrates a clear advantage over Rive.

## 12. Generative/I2V policy

Generative motion is a baked adapter, not a runtime authority.

Required metadata:

- source hashes;
- model name/version;
- workflow hash;
- prompt hash;
- seed;
- output hash;
- frame rate/duration;
- human review status.

A generative candidate must pass the same final rendered semantic and human gates as deterministic animation.

## 13. Version pinning

Animation runtime packages use exact versions once accepted into production.

Avoid broad semver ranges for production-critical render packages.

The evidence receipt records runtime versions so a later dependency update cannot silently reinterpret an approved shot.

## 14. License registry

Create a machine-readable license record before production adoption:

```ts
interface RuntimeLicenseRecord {
  runtime: string;
  version: string;
  license: string;
  editorLicense?: string;
  commercialUseReviewed: boolean;
  redistributionReviewed: boolean;
  notes?: string;
}
```

License uncertainty blocks production dependency, not exploratory spike work.

## 15. Browser/runtime compatibility

For every browser-executed runtime, record:

- Chromium support;
- Firefox support;
- WebKit/Safari support;
- WebGL requirements;
- WebGPU optionality;
- WASM requirements;
- headless render behavior;
- Storybook behavior;
- Remotion render behavior.

Production render may use a narrower supported environment than Studio preview as long as the distinction is explicit.

## 16. Dependency adoption order

Planned order:

1. historical-sources — already started;
2. animation-contracts / animation-frame;
3. React Animation Lab harness;
4. PixiJS spike;
5. Rive spike;
6. Three/R3F + @remotion/three spike;
7. Rapier spike;
8. crowd/work runtime;
9. Spine evaluation;
10. Theatre authoring bridge;
11. selective generative adapter.

Pixi before Rive is acceptable for infrastructure work, but Reel 1 does not resume until both material and hero-performance benchmarks are proven.

## 17. Keep/reject decision record

Every spike ends with:

```md
Decision: KEEP | CONSTRAIN | REJECT
Runtime:
Version:
Benchmark:
Determinism:
Visual quality:
Authoring cost:
Testing cost:
License status:
Performance:
Known risks:
Fallback:
```

A rejected package may remain in research notes but must not remain as a transitive production dependency.

## 18. Definition of Done

This adoption plan is satisfied when:

- every production runtime has an explicit ownership boundary;
- every runtime has an accepted benchmark;
- exact versions are pinned;
- license status is known;
- Storybook and unit-test strategy exists;
- render integration is proven;
- evidence records runtime versions;
- fallback strategy exists;
- no package becomes a second hidden timeline authority.
