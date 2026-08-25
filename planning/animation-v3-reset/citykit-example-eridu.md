# CityKit Worked Example — Eridu

Status: **planning example; not executable schema yet**

This example pressure-tests CityKit as a persistent world definition rather than a generated background prompt. Eridu is used because Chapters 1 and 3 repeatedly connect it with Enki, water, reeds, fisheries, quays, temple identity and maritime life.

## 1. Why a CityKit example

A city definition must separate:

- enduring identity;
- historical/visual evidence;
- development state;
- scene-specific camera/actors;
- reusable industries/populations;
- procedural variation;
- speculative reconstruction.

A city is not one PNG and not one Three.js scene file.

## 2. Conceptual CityDefinition

```ts
const eridu: CityDefinition = {
  id: 'city:eridu',
  revision: 1,
  displayName: 'Eridu',

  narrativeBindings: [
    'thread:ch01:eridu-e-absu',
    'thread:ch03:eridu-water-city',
  ],

  historicalSourceIds: [
    'lit:etcsl:enki-world-order',
    'lit:etcsl:enki-journey-nibru',
  ],

  visualEvidenceIds: [
    'visual:eridu:site-context:v1',
    'visual:mesopotamia:reed-water-context:v1',
  ],

  geography: {
    terrainProfileId: 'terrain:southern-alluvium:v1',
    elevationMode: 'low-alluvial',
    waterSystemIds: ['water:eridu:canals:v1', 'water:eridu:marsh:v1'],
  },

  architecture: {
    paletteId: 'architecture:early-southern-mesopotamia:v1',
    templeComplexId: 'architecture:eridu:e-absu:v1',
    residentialDensityProfile: 'low-to-medium',
    quayProfileId: 'quay:reed-mudbrick:v1',
  },

  vegetation: {
    profileId: 'vegetation:marsh-reed:v1',
    dominant: ['reed', 'date-palm-contextual'],
  },

  industries: [
    { id: 'industry:fishing', weight: 1.0 },
    { id: 'industry:boat-work', weight: 0.8 },
    { id: 'industry:reed-work', weight: 0.7 },
    { id: 'industry:agriculture', weight: 0.5 },
  ],

  livestock: [
    { speciesId: 'animal:sheep', prevalence: 0.35 },
    { speciesId: 'animal:goat', prevalence: 0.25 },
  ],

  population: {
    roleProfileId: 'population:eridu:v1',
    heroActorIds: ['actor:enki'],
  },

  patronage: {
    principalDivineActorId: 'actor:enki',
    visualMotifIds: ['motif:fresh-water', 'motif:fish', 'motif:reeds'],
  },
};
```

The exact evidence records are placeholders until Phase 1 visual research records are implemented and verified.

## 3. Development states

CityKit should represent authored states rather than an uncontrolled procedural simulation.

```text
ERIDU_0_WATER_EDGE
ERIDU_1_EARLY_SETTLEMENT
ERIDU_2_CANALIZED
ERIDU_3_TEMPLE_CENTER
ERIDU_4_MATURE_PORT
```

Each state declares enabled features and density scales.

Example:

```ts
{
  id: 'ERIDU_2_CANALIZED',
  ordinal: 2,
  enabledFeatures: [
    'primary-canal',
    'secondary-water-gates',
    'quay-small',
    'reed-work-area',
    'fish-processing-area',
  ],
  populationScale: 0.45,
  buildingDensity: 0.38,
  agricultureScale: 0.42,
  industryScale: 0.52,
}
```

## 4. Scene binding

A Scene V3 binds to city + state:

```ts
worldStates: [{
  worldId: 'world:sumer:v1',
  cityId: 'city:eridu',
  stateId: 'ERIDU_3_TEMPLE_CENTER',
  startFrame: 0,
  endFrame: 300,
}]
```

Scene-specific Enki/camera/boat placement does not mutate the reusable city definition.

## 5. Level 2 usage

Level 2 may project CityKit into layered visual elements:

```text
far architecture
mid architecture
water layer
reed layer
boats
foreground quay/reeds
```

Camera remains conservative enough not to reveal unsupported geometry.

## 6. Level 3 usage

Level 3 resolves approved CityKit elements into Three/R3F spatial representations:

```text
terrain/depth cards
water planes
architecture cards/models
quay geometry
reeds/vegetation instances
crowd/work regions
boat paths
fog/light volumes
```

The city definition remains runtime-neutral at its semantic layer.

## 7. Historical confidence by feature

Each major feature should be able to carry evidence confidence independently.

Example planning matrix:

| Feature | Evidence class | Confidence | Rule |
|---|---|---:|---|
| Eridu as Enki-centered cult city | literary/archaeological | high | core identity |
| Water/marsh relationship | contextual/site | high | core environment |
| Exact quay geometry | reconstructive | medium | design synthesis |
| Exact E-Absu elevation/façade | interpretive | medium/low | label reconstruction |
| Specific background household placement | speculative | low | never described as fact |

This allows the fiction to be visually rich without pretending every wall placement is archaeologically established.

## 8. Procedural generation boundary

Permitted seeded variation:

- reed placement within authored regions;
- small boat/background prop selection;
- crowd agent placement;
- fishing/work clip phases;
- minor clutter;
- smoke/fire phase;
- animal distribution within constraints.

Not permitted as uncontrolled procedural variation:

- moving temple to another district;
- changing city patron;
- replacing water network topology;
- inventing major monument form at render time;
- changing development state because random seed differs.

## 9. Stable city seed

CityKit can derive local variation from:

```text
world seed
city ID
state ID
semantic region
purpose
```

Example:

```text
seed(world1, eridu, ERIDU_3, quay-east, reed-placement)
```

Adding workers in another district must not rearrange the quay reeds.

## 10. Crowd/work regions

Eridu can define named regions:

```text
region:eridu:quay
region:eridu:fish-market
region:eridu:reed-work
region:eridu:temple-approach
region:eridu:canal-bank
```

Crowd runtime consumes these regions rather than arbitrary screen rectangles.

## 11. Paths

Reusable paths:

```text
path:eridu:main-canal
path:eridu:quay-procession
path:eridu:temple-approach
path:eridu:boat-entry
```

Path topology belongs to world/city data; one scene binds actors/herds/boats to paths.

## 12. CityKit benchmark proof states

For `benchmark:city-growth:v1`, Eridu may serve as first world example:

```text
BARREN
EARLY_SETTLEMENT
CANALIZED
TEMPLE_CENTER
MATURE_PORT
```

The benchmark must show persistent recognizable geography across states rather than five unrelated AI backgrounds.

## 13. Unit tests

- city ID/revision validation;
- development states strictly ordered;
- referenced water/architecture/region/path IDs resolve;
- development state cannot disable required geography unexpectedly;
- deterministic local variation stable;
- unrelated-region changes do not perturb other region seeds;
- evidence IDs resolve;
- speculative feature explicitly classified;
- no runtime-specific Three/Rive object embedded in semantic city contract.

## 14. Storybook stories

```text
World/Eridu/Identity
World/Eridu/WaterEdge
World/Eridu/EarlySettlement
World/Eridu/Canalized
World/Eridu/TempleCenter
World/Eridu/MaturePort
World/Eridu/EvidenceOverlay
World/Eridu/RegionsAndPaths
World/Eridu/DebugLOD
```

Exact world state fixtures should be shared with visual and E2E tests.

## 15. Visual regression

Pinned proof frames should verify:

- major geography persists;
- city silhouette develops rather than jumps identity;
- water network remains registered;
- temple district appears at intended state;
- no card edge/void exposure in Level 3 camera proof.

## 16. E2E scenarios

- open Eridu definition;
- inspect source/evidence confidence;
- switch development state;
- inspect regions/paths;
- create scene bound to state;
- change scene without mutating CityDefinition;
- mark visual-evidence record stale and verify warning;
- reload and verify deterministic state.

## 17. Performance budgets

CityKit needs explicit LOD profiles:

```text
storybook: minimal instances, full semantic state
preview: bounded crowd/vegetation
proof: representative target density
production: approved full density within workstation budget
```

LOD may reduce representation complexity; it cannot change story semantics.

## 18. City identity acceptance

Human acceptance asks:

- does the city remain recognizably the same place across development states?
- does water remain a defining feature of Eridu?
- does increased complexity feel like growth rather than scene replacement?
- does the result retain painterly/historical-fiction visual language?
- are speculative features plausible and not distractingly overconfident?

## 19. Reuse across Chapters 1–3

The same `city:eridu` definition can support:

- Chapter 1 E-Absu/Enki scenes;
- Chapter 3 city overview/development material;
- later returns to Eridu without rebuilding its geography.

Scene revision changes should not require city revision unless persistent city truth changes.

## 20. Definition of example success

CityKit is correctly bounded when one semantic Eridu definition can drive layered Level 2 and spatial Level 3 representations, remain historically traceable, evolve through authored development states, support deterministic crowds/materials, and remain independent from any one shot or rendering engine.
