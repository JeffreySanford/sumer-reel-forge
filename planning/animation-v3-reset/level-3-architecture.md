# Level 3 Architecture — Spatial Performance

Status: **planning contract**

Level 3 turns Sumer Reel Forge from a living-illustration renderer into a reusable spatial-performance system capable of supporting Chapters 1–3 as a coherent world.

It does not replace the source-safe Level 2 system. It composes Level 2 actors/materials into spatial scenes, deterministic simulations, crowds, cities, montage and selective generative effects.

## 1. Definition

**Level 3 — Spatial Performance** means:

- approved 2D artwork and/or prepared 3D geometry exist in a real spatial scene;
- cameras use explicit spatial transforms rather than only CSS-style pan/zoom;
- hero actors perform through reusable rigs;
- environments persist as world definitions rather than one-shot backgrounds;
- cities, waterways, fields and populations may evolve over time;
- crowds and animals are generated from deterministic reusable systems;
- physics is fixed-step and either reproducible or baked before final render;
- long time spans may use a first-class montage system;
- selective I2V or generative video may appear only as an explicit adapter with source/provenance binding;
- all production evaluation remains frame-driven by Scene V3/Remotion.

## 2. Scene V3 owns intent

No runtime package owns the narrative timeline.

```text
MANUSCRIPT + SOURCE BINDINGS
             │
             ▼
          Scene V3
             │
      FrameContext(frame)
             │
   ┌─────────┼─────────┬──────────┬──────────┐
   │         │         │          │          │
 Rive      Pixi      Three      Rapier    Generative
 actors   material    world      physics     candidate
   │         │         │          │          │
   └─────────┴─────────┴──────────┴──────────┘
             │
          Remotion
             │
           Render
             │
     independent QA/evidence
             │
        Human approval
```

## 3. Scene V3 core contract

Conceptual starting point:

```ts
interface SceneV3 {
  schemaVersion: '3';
  id: string;

  story: StoryBinding;
  historicalSources: HistoricalSourceBinding[];
  visualEvidence: VisualEvidenceBinding[];

  fps: number;
  durationFrames: number;
  width: number;
  height: number;
  seed: number;

  camera: CameraTrack[];
  actors: ActorInstance[];
  props: PropInstance[];
  environments: EnvironmentInstance[];

  performances: PerformanceTrack[];
  materials: MaterialTrack[];
  effects: EffectTrack[];
  simulations: SimulationBinding[];
  crowds: CrowdDefinition[];
  worldStates: WorldStateTrack[];
  montage?: MontageDefinition;

  provenance: ProvenanceContract;
  qa: SceneQaContract;
}
```

Scene V3 is declarative enough to inspect/test, but not so abstract that every engine capability has to be reduced to the lowest common denominator.

## 4. `FrameContext`

Every runtime receives the same production clock:

```ts
interface FrameContext {
  frame: number;
  fps: number;
  timeSeconds: number;
  progress: number;

  seed: number;
  sceneId: string;
  shotId?: string;

  mode: 'preview' | 'storybook' | 'render' | 'qa';
}
```

Rules:

1. production animation does not depend on wall-clock `requestAnimationFrame()`;
2. random variation comes from deterministic seeded generators;
3. a runtime may cache work but may not change semantic state because of render order;
4. same approved input + same frame + same seed + same runtime version must evaluate to the same intended state;
5. runtime version becomes part of evidence/provenance.

## 5. Runtime adapter interface

```ts
interface AnimationRuntimeAdapter<TDefinition, TPrepared> {
  readonly type: RuntimeType;

  validate(definition: TDefinition): ValidationResult;

  prepare(
    definition: TDefinition,
    context: PrepareContext
  ): Promise<TPrepared>;

  evaluate(
    prepared: TPrepared,
    frame: FrameContext
  ): RuntimeFrameState;

  collectEvidence(
    prepared: TPrepared,
    frame: FrameContext
  ): RuntimeEvidence;

  dispose(prepared: TPrepared): void;
}
```

Initial runtime types:

```ts
type RuntimeType =
  | 'layered-v2'
  | 'rive'
  | 'pixi'
  | 'three'
  | 'rapier-baked'
  | 'spine'
  | 'crowd'
  | 'city'
  | 'montage'
  | 'generative-baked';
```

## 6. Remotion remains render authority

Current repository animation is already registered through Remotion compositions. V3 should preserve this model while adding a `SceneV3Composition` and adapter resolution layer.

When adding `@remotion/three`, all Remotion package versions must remain exact and aligned. Official package guidance explicitly requires matching `remotion` and `@remotion/*` versions:

- https://www.npmjs.com/package/@remotion/three

The V3 renderer should accept already-resolved production props so the rendered composition cannot silently choose a different asset than the one that passed candidate QA.

## 7. Three.js / React Three Fiber — spatial runtime

Level 3 uses Three/R3F for:

```text
spatial camera
painted depth cards
terrain
architectural volumes
water planes
lighting
fog
particles
spatial props
instanced geometry
city layouts
```

Default strategy is **2.5D first**:

```text
sky/background plane        z=-100
mountain depth card         z=-70
city silhouette             z=-50
far vegetation              z=-35
water                       z=-20
boat                        z=0
hero actor                  z=2
rigging                     z=4
foreground reeds            z=12
fog/particles               spatial
```

The goal is to preserve the painted visual language while gaining actual perspective, occlusion, depth and camera motion.

Full 3D reconstruction is only used where it earns its cost: architecture, boats, terrain, reusable props or shots that need meaningful camera parallax.

## 8. Pixi runtime in Level 3

Pixi remains the local deformation/material system even inside spatial scenes.

Official references:

- https://pixijs.com/8.x/guides/components/scene-objects/mesh
- https://pixijs.com/8.x/guides/components/filters

Level 3 examples:

```text
Three plane
   └─ Pixi-produced animated water texture

Rive actor
   └─ Pixi hair/reed/cloth overlay

Three boat
   └─ Pixi rope/rigging material
```

Adapters must define compositing ownership explicitly to avoid double transforms or inconsistent camera mapping.

## 9. Rive hero actors in Level 3

Hero actors remain Rive-first unless another rig system proves superior for a specific class.

Official references:

- https://rive.app/runtimes
- https://www.rive.app/blog/intro-to-meshes

A spatial actor instance might be:

```ts
interface ActorInstance {
  id: string;
  definitionId: string;
  runtime: 'rive';
  transform: SpatialTransform;
  billboardMode?: 'camera-facing' | 'axis-locked' | 'none';
  depthMode: 'card' | 'mesh' | 'hybrid';
}
```

Rive owns performance deformation. Three owns world placement/camera relation.

## 10. Rapier — deterministic simulation

Official reference:

- https://rapier.rs/docs/user_guides/javascript/determinism/

Rapier's JS/WASM documentation states that deterministic results require identical initial conditions, same runtime version, same construction/removal order and deterministic input values.

Therefore production policy is:

```text
simulation definition
        │
   fixed timestep
        │
  simulation proof
        │
   bake transforms
        │
 checksum baked state
        │
  Remotion consumes bake
```

Use physics for:

```text
boat secondary response
rope/joint tension
hanging ornaments
hail/debris collisions
falling objects
pendulums
physical prop settling
```

Avoid using physics for motions that are easier and more art-directable as authored performance.

### Physics evidence

Every approved simulation stores:

```ts
interface SimulationReceipt {
  engine: 'rapier';
  engineVersion: string;
  timestep: number;
  seed: number;
  constructionHash: string;
  initialStateHash: string;
  frameCount: number;
  bakedStateHash: string;
}
```

## 11. Spine — animal and repeated-rig evaluation

Spine is not required to start V3 but becomes a formal evaluation because Chapters 2–3 require herds, animals and repeated non-hero figures.

Potential use:

```text
oxen
sheep
goats
gazelles
bulls
donkeys
background workers
guards
procession participants
```

Spine has a distinct runtime/editor licensing model; licensing must be evaluated before production dependency.

Reference:

- https://esotericsoftware.com/spine-pixi
- https://esotericsoftware.com/spine-runtimes-license

If Rive handles animals/crowds adequately, Spine remains optional.

## 12. CityKit — persistent civilization model

Chapter 3 makes city identity a first-class world concept.

```ts
interface CityDefinition {
  id: string;
  name: string;

  terrain: TerrainProfile;
  water: WaterNetwork;
  architecture: ArchitecturePalette;

  roads: RouteNetwork;
  gates: GateDefinition[];

  agriculture: AgricultureProfile[];
  industries: IndustryProfile[];
  vegetation: VegetationProfile;
  livestock: AnimalPopulation[];

  population: PopulationProfile;
  patron: DivinePatronBinding;
  visualMotifs: VisualMotif[];

  developmentStates: CityDevelopmentState[];
}
```

Planned city profiles derived from Chapters 1–3:

```text
Eridu
  water / quays / reeds / fish / E-Absu

Nippur
  assembly / E-kur / governance / divine center

Adab
  Ninhursag / mountain / household-city growth

Umma
  ploughs / barley / fields / ditches

Shuruppak
  construction / brickmaking

Larsa
  boundaries / surveying / trade / solar identity

Uruk
  weaving / livestock / dense social activity

Lagash
  upland ecology / pasture / goats / ibex

Ur
  foundations / building / metalwork / fisheries

Sippar
  caravan / route / trade outpost
```

A city is not a generative prompt. It is a reusable authored definition with historical/visual evidence.

## 13. World-state transitions

Cities and landscapes need explicit development states:

```ts
interface WorldStateTrack {
  targetId: string;
  keyframes: WorldStateKeyframe[];
}
```

Examples:

```text
Dilmun
  barren/saline
  fresh-water introduced
  irrigation established
  cultivated fields
  quay/trade
  abundant settlement

City
  sparse household
  early settlement
  canal access
  construction expansion
  agricultural production
  mature civic center
```

These transitions support Chapter 3's idea that cities are living, changing entities.

## 14. Crowd/work runtime

Crowds are deterministic seeded systems, not autonomous AI agents.

```ts
interface CrowdDefinition {
  id: string;
  actorPool: string[];
  count: number;
  seed: number;
  region: SpatialRegion;
  behavior: CrowdBehaviorDefinition;
}
```

Example:

```ts
spawnCrew({
  activity: 'dig-canal',
  count: 24,
  seed: 818122,
  region: canalBank,
  clipPool: ['dig', 'carry-silt', 'walk-load', 'rest']
});
```

Variation comes from deterministic:

- clip choice;
- clip phase;
- rest intervals;
- body scale;
- location/path;
- tool variant;
- walk speed;
- facing;
- role assignment.

Required QA includes synchronization detection so a crowd cannot accidentally look like identical clones.

## 15. Animal/herd runtime

Animal populations need a similar seeded system:

```ts
interface HerdDefinition {
  species: string;
  count: number;
  rigPool: string[];
  seed: number;
  behavior: 'graze' | 'walk' | 'procession' | 'rest' | 'scatter';
  region: SpatialRegion;
}
```

Chapter 2's marriage gifts become the primary herd/procession benchmark.

## 16. Work-system runtime

Chapter 3 requires repeated civilization tasks:

```text
dig canal
carry silt
lay brick
measure boundary
plough field
sow grain
harvest
weave
hammer metal
herd animals
row/steer
load boat
```

Work systems are assembled from performance clips + props + spatial paths + deterministic scheduling.

## 17. Montage runtime

Long time spans must not be faked by stretching one animation.

```ts
interface MontageDefinition {
  id: string;
  segments: MontageSegment[];
  transitionStyle: string;
  continuitySubjects: string[];
  temporalScale: 'days' | 'years' | 'generations' | 'mythic';
}
```

Primary benchmarks:

- Chapter 2 long migration/journey;
- city growth;
- canal construction;
- agricultural cycles;
- long labor spans;
- kingdoms/eras if retained in narrative.

## 18. Theatre.js — authoring bridge

Theatre is an authoring tool, not production state authority.

Reference:

- https://www.theatrejs.com/docs/latest/getting-started/with-react-three-fiber

Workflow:

```text
Theatre Studio
    │
 author camera/light/object tracks
    │
 export JSON
    │
 compile/validate
    │
 Scene V3 tracks
```

Production renders consume validated Scene V3 data, not hidden local editor state.

## 19. Generative runtime

ComfyUI and future I2V remain part of the platform but are demoted from "animation solution" to **candidate/baked specialty adapters**.

Valid uses:

- segmentation;
- background repair;
- source extension;
- texture/atmosphere candidates;
- difficult one-off transformation candidates;
- selective I2V where deterministic rigs are uneconomical.

Invalid uses:

- automatic identity replacement;
- uncontrolled whole-shot generation as default Level 3;
- generated motion promoted without source/checksum binding;
- generated output serving as its own QA evidence.

```ts
interface GenerativeBakeBinding {
  sourceAssetHashes: string[];
  model: string;
  modelVersion?: string;
  workflowHash: string;
  promptHash: string;
  seed: number;
  outputHash: string;
  humanReviewed: boolean;
}
```

## 20. Historical/source integration

Scene V3 directly embeds provenance:

```ts
interface StoryBinding {
  manuscriptId: string;
  manuscriptVersion: string;
  chapter: string;
  section?: string;
  narrativeRevision: string;
}
```

Ancient/literary and visual evidence are separate arrays, as defined in `narrative-source-map.md`.

This allows the historical-fiction narrative to change while retaining an auditable chain back to ETCSL or other source traditions.

## 21. Proposed repository boundaries

Target structure:

```text
libs/
  animation-contracts/
  animation-frame/
  animation-performance/
  animation-rive/
  animation-pixi/
  animation-three/
  animation-physics/
  animation-spine/
  animation-world/
  animation-crowd/
  animation-montage/
  animation-generative/
  animation-qa/
  historical-sources/

apps/
  web/                  Angular Studio
  animation-lab/        React/Vite animation lab

tools/
  animation/
    remotion/
    scenes/
    render/
    evidence/
  historical/
    etcsl/
    museum/
```

This is a target architecture, not a command to reorganize the repository immediately.

## 22. Scene V2 compatibility

Existing Reel 1 work is not discarded.

Provide:

```text
Scene V2 JSON
    │
SceneV2CompatibilityAdapter
    │
Resolved Scene V3
```

Rules:

- V2 scenes remain renderable during migration;
- V2 canonical asset checksums remain authoritative;
- migration must not silently change timing;
- V2 QA evidence remains historical evidence;
- only migrate a shot when a V3 runtime materially improves it.

## 23. Level 3 Storybook inventory

Required major story groups:

```text
World/DepthCards
World/Camera
World/CityKit
World/WorldStates

Actors/SpatialPlacement
Actors/TwoActorBlocking

Physics/Boat
Physics/Rope
Physics/Hail

Crowds/Workers
Crowds/Procession
Animals/Herd

Montage/Journey
Montage/CityGrowth

Historical/SourceBinding
Historical/VisualEvidence
```

Every story exposes frame, fps, seed, debug overlays and evidence IDs.

## 24. Level 3 benchmark scenes

The architecture is not considered production-ready until these work:

1. **Enki at Helm** — Rive actor + Pixi materials + spatial boat.
2. **Enki Facial Performance** — blink/gaze/breath, source-faithful.
3. **Enlil Council Address** — hero speech + audience reaction.
4. **Sud / Nisaba / Haia** — three-actor emotional conversation.
5. **Stag on Water** — spatial camera + water + boat.
6. **Kutu Hail Storm** — fixed-step physics + particles + vessel response.
7. **Igigi Canal Crew** — deterministic work crowd.
8. **Marriage Herd Procession** — animals + procession + dust.
9. **City Growth** — settlement → functioning city through CityKit states.
10. **Long Journey Montage** — time compression with continuity.

## 25. Level 3 Definition of Done

Level 3 is complete only when:

- Level 2 platform gates are already green;
- Scene V3 schema is stable and versioned;
- `FrameContext` is shared across all runtimes;
- spatial camera/depth rendering is deterministic enough for production evidence;
- hero rigs function in spatial scenes;
- Pixi materials coexist correctly with spatial transforms;
- physics is fixed-step and baked/checksummed;
- crowd/work system handles at least 100 deterministic agents in benchmark mode;
- animal/herd strategy is proven;
- CityKit can evolve one settlement into a functioning city;
- montage engine handles long temporal compression;
- historical-source/visual-evidence bindings are part of scene data;
- Storybook covers all major runtimes;
- Playwright covers the production workflow;
- rendered-motion QA exists for each subsystem;
- all ten benchmark scenes pass deterministic, semantic and human gates;
- Reel 1 migration can begin without creating new per-shot infrastructure for each ordinary motion.

Level 3 is a platform capability, not a visual label applied to a single impressive shot.
