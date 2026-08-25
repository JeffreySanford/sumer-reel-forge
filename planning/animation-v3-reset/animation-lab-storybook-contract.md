# Animation Lab and Storybook Contract

Status: **planning contract**

This document defines how animation runtimes are developed, inspected and tested before they enter production compositions.

## 1. Why a dedicated animation lab

The existing Angular Storybook is appropriate for Studio UI components, but hero animation runtimes are React/Remotion-adjacent and need a dedicated browser surface where exact frames, seeds, debug overlays and engine internals can be inspected without booting the full production workflow.

Target architecture:

```text
apps/web
  Angular Studio
  Storybook: UI/workflow components

apps/animation-lab
  React + Vite
  Storybook: animation/runtime components
```

The two Storybooks share contracts and source metadata, not framework implementation.

## 2. Animation Lab responsibilities

The lab hosts:

- Rive actors;
- Pixi meshes/materials;
- R3F spatial scenes;
- Rapier baked-simulation playback;
- Spine evaluation components;
- crowd/work systems;
- CityKit views;
- montage components;
- QA/debug overlays;
- source/provenance panels;
- Scene V3 fixture renderer.

It is not a production editor.

## 3. Story contract

Every animation story receives a deterministic fixture:

```ts
interface AnimationStoryArgs {
  frame: number;
  fps: number;
  seed: number;
  resolution: 'preview' | 'production';
  debug: boolean;
  qaOverlay: boolean;
  sourceOverlay: boolean;
}
```

Default story state is paused at a named proof frame.

Playback is opt-in.

## 4. Story state naming

All temporal stories expose at least five named states:

```text
START
ANTICIPATION
PEAK
SETTLE
END
```

Specialized semantic names are preferred when clearer.

Examples:

Blink:

```text
OPEN
CLOSING
CLOSED
OPENING
RETURNED_OPEN
```

Procession:

```text
ENTER
ESTABLISH
PEAK_DENSITY
EXIT_BEGIN
EXIT
```

World growth:

```text
BARREN
EARLY
ORGANIZED
EXPANDING
MATURE
```

## 5. Required story variants

Every production-capable primitive/component gets:

1. `Overview`;
2. named proof states;
3. `Debug`;
4. `Control`;
5. `Stress` where meaningful;
6. `SourceEvidence` where historical/visual provenance is relevant.

## 6. Debug overlays

Reusable debug overlays should include:

- bounding boxes;
- pivots/anchors;
- parent-child links;
- gaze targets;
- contact points;
- safe zones;
- depth labels;
- physics collider shapes;
- crowd agent IDs;
- deterministic seed/channel IDs;
- source asset hashes;
- runtime/version label.

Debug overlays are never included in production renders unless explicitly requested.

## 7. Animation controls

Global toolbar controls:

```text
frame
fps
seed
viewport
background
runtime/backend
QA overlay
source overlay
performance profile
```

Frame entry accepts exact integer values.

Scrubbing must not depend on elapsed wall-clock playback state.

## 8. Storybook interaction tests

Interaction tests validate UI/runtime wiring rather than final visual quality.

Examples:

- selecting CLOSED sets frame/context to closed state;
- toggling debug displays pivots;
- changing seed updates crowd distribution deterministically;
- changing frame preserves same source asset;
- selecting a source entry opens the correct evidence panel;
- runtime error produces explicit diagnostic instead of blank canvas.

## 9. Visual regression

Golden screenshots target named deterministic proof states.

Rules:

- one pinned Chromium environment owns goldens;
- fixed viewport/deviceScaleFactor;
- exact frame/seed;
- animation playback disabled;
- debug overlays off unless testing debug UI;
- fonts/assets preloaded;
- runtime versions included in snapshot metadata.

Firefox/WebKit validate functionality but do not own pixel goldens.

## 10. Motion proof integration

Storybook screenshots do not prove motion.

Each animation story can export a `MotionProofDefinition`:

```ts
interface MotionProofDefinition {
  startFrame: number;
  endFrame: number;
  sampleFrames: number[];
  semanticExpectation?: string;
  controlVariantId?: string;
}
```

A CLI/render harness consumes the same fixture and produces short MP4/evidence frames.

This prevents Storybook and Remotion from using different animation inputs.

## 11. Rive stories

Minimum groups:

```text
Actors/Enki/Face
Actors/Enki/Body
Actors/Enki/HelmPerformance
Actors/Enlil/FormalAddress
Actors/Sud/Conversation
```

Each actor story displays:

- rig asset version;
- source image reference;
- semantic channels;
- current channel values;
- source identity evidence.

## 12. Pixi stories

Minimum groups:

```text
Materials/Water
Materials/Rigging
Materials/Reeds
Materials/Cloth
Materials/SmokeFire
```

Debug mode shows mesh points/edges, displacement bounds and containment regions.

## 13. R3F stories

Minimum groups:

```text
Spatial/DepthCards
Spatial/Camera
Spatial/ActorCards
Spatial/Architecture
Spatial/WaterWorld
```

Debug mode shows:

- camera frustum;
- Z positions;
- card edges;
- lights;
- occlusion order;
- safe camera region.

## 14. Physics stories

Minimum groups:

```text
Physics/Boat
Physics/Rope
Physics/Hail
Physics/SecondaryMotion
```

Stories play back baked states by default.

A separate development-only mode may show live simulation, but its output is not production evidence until baked.

## 15. Crowd stories

Required scales:

```text
Crowds/Workers/1
Crowds/Workers/5
Crowds/Workers/20
Crowds/Workers/100
```

Controls expose seed and synchronization diagnostics.

Stress story measures performance and warns if benchmark thresholds are exceeded.

## 16. CityKit stories

Each city profile gets an evidence-aware overview plus development states.

Example:

```text
World/Eridu/Overview
World/Eridu/WaterOnly
World/Eridu/EarlySettlement
World/Eridu/WorkingSettlement
World/Eridu/TempleExpansion
World/Eridu/Mature
World/Eridu/SourceEvidence
```

## 17. Historical/source UI stories

Angular Studio and React Lab should share source contract fixtures.

Required source-card states:

```text
ETCSL direct source
ETCSL composite adaptation
non-ETCSL literary tradition
archaeological visual evidence
analogical evidence
fictional bridge
intentional anachronism
source warning
```

This ensures the provenance language stays understandable to a human reviewer.

## 18. Error-state stories

Every runtime gets explicit failure stories:

- missing asset;
- bad checksum;
- unsupported runtime version;
- invalid scene binding;
- missing source evidence;
- physics bake mismatch;
- render adapter unavailable.

A broken runtime must fail loudly and diagnostically.

## 19. Accessibility

Storybook controls/panels remain keyboard accessible.

Canvas-based runtime previews do not exempt surrounding controls from accessibility requirements.

The Angular Studio provenance/approval UI continues to follow normal WCAG/keyboard/focus practices.

## 20. Performance instrumentation

Animation Lab includes lightweight counters:

- startup time;
- frame evaluation time;
- draw/render time where measurable;
- texture/asset load count;
- memory estimate;
- agent count;
- draw calls where available.

These are diagnostics, not automatically production acceptance metrics until thresholds are defined in the performance-budget plan.

## 21. Story ownership

Each production primitive has one canonical story fixture that tests consume.

Avoid duplicate near-identical fixtures in:

- unit tests;
- Storybook;
- render scripts;
- E2E.

Instead, shared fixture builders should feed all layers.

## 22. Storybook-to-E2E boundary

Storybook proves isolated runtime/component behavior.

Playwright Studio E2E proves workflow:

```text
select scene
inspect source
choose performance
scrub frame
preview
run proof
review evidence
approve/reject
persist
reload
```

Do not use full Studio E2E to test individual mesh math.

## 23. Initial Animation Lab milestone

Before adding a real animation runtime, the lab should prove:

- Scene V3 fixture loads;
- frame control works;
- seed control works;
- debug overlay works;
- five-state story convention works;
- visual snapshot test works;
- motion-proof CLI consumes the same fixture;
- source/provenance card renders.

Use a fake deterministic box/pendulum adapter first.

## 24. Definition of Done

Animation Lab is ready for engine spikes when:

- React/Vite Storybook builds;
- browser interaction tests run;
- one fixed-frame visual regression passes;
- one short motion proof uses the same fixture;
- exact frame/seed controls work;
- runtime errors are visible;
- provenance fixture is visible;
- no real animation engine has yet been required to prove the harness.
