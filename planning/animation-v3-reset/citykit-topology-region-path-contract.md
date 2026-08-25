# CityKit Topology, Region and Path Contract

Status: **planning contract / persistent world semantics**

CityKit needs a reusable spatial topology that survives scene changes, Level 2/Level 3 representation changes, and deterministic population changes. A city is not a background image and not a Three.js scene file.

## 1. Core model

```text
CityDefinition
  ├── geography
  ├── water topology
  ├── districts/regions
  ├── paths/routes
  ├── gates/access points
  ├── persistent landmarks
  ├── work zones
  ├── evidence applications
  └── development states
```

Scene V3 binds to this model; scene-specific actors/cameras do not mutate persistent city identity.

## 2. Topology contract

Conceptual:

```ts
interface CityTopology {
  id: string;
  revision: number;
  cityId: string;
  coordinateSpace: 'CITY_LOCAL';
  boundary: Polygon2D;
  waterNodes: TopologyNode[];
  waterEdges: TopologyEdge[];
  routeNodes: TopologyNode[];
  routeEdges: TopologyEdge[];
  regions: CityRegion[];
  landmarks: CityLandmark[];
  gates: CityGate[];
  evidenceApplicationIds: string[];
}
```

Topology describes persistent relationships rather than final rendered geometry.

## 3. Stable node/edge identity

Examples:

```text
node:eridu:canal-entry
node:eridu:quay-east
node:eridu:temple-approach
edge:eridu:water:main-canal-01
edge:eridu:path:quay-to-temple
```

IDs remain stable when visual representation changes.

## 4. Regions

A region is a semantic authored area:

```text
region:eridu:quay
region:eridu:fish-market
region:eridu:reed-work
region:eridu:temple-approach
region:eridu:canal-bank
region:eridu:residential-east
```

Region contract records:

- semantic role;
- geometry/bounds;
- allowed population/archetypes;
- allowed industries;
- density limits;
- evidence applications;
- development-state availability;
- seed namespace.

## 5. Paths

Paths are persistent travel/work/procession routes.

```ts
interface CityPath {
  id: string;
  revision: number;
  fromNodeId: string;
  toNodeId: string;
  pathClass: 'walk' | 'procession' | 'boat' | 'cargo' | 'animal' | 'water';
  waypoints: Point2D[];
  directionPolicy: 'one-way' | 'two-way';
  widthProfileId: string;
  enabledStateIds: string[];
}
```

Scene scheduling assigns agents to paths; runtime does not invent a shortcut through buildings.

## 6. Water topology

Water is especially important for Eridu and Chapter 1/3.

Separate:

```text
persistent water network topology
water material profile
scene water state
physics/local wave effects
```

Changing calm → storm does not rewrite canal graph identity.

## 7. Development-state effects

A development state can enable/disable or alter capacities of persistent features:

```text
ERIDU_0_WATER_EDGE
  no formal quay

ERIDU_2_CANALIZED
  main canal active
  small quay active
  reed-work region active

ERIDU_3_TEMPLE_CENTER
  temple approach active
  civic path capacity increases
```

Do not regenerate the city into unrelated topology for each state.

## 8. Topology invariants

Required:

- referenced node exists;
- edge endpoints exist;
- region IDs unique;
- path IDs unique;
- active path remains inside allowed city/world bounds unless explicitly external;
- no impossible orphan route for required scene intent;
- water edge does not become pedestrian route accidentally;
- state transition cannot remove a required persistent landmark without explicit supersession.

## 9. Scene binding

Scene V3 may bind:

```text
city:eridu@revision
state:ERIDU_3_TEMPLE_CENTER
region:eridu:quay
path:eridu:boat-entry
```

A camera crop or representation LOD does not change topology identity.

## 10. Runtime-neutral geometry

CityKit stores semantic geometry sufficient for deterministic placement/pathing.

It must not embed:

```text
THREE.Mesh
THREE.Curve
Pixi Container
Rapier collider handle
browser DOM node
```

Adapters compile semantic topology into runtime objects.

## 11. Evidence relationship

Persistent features can reference evidence applications:

```text
temple district → archaeological/literary applications
banquet/civic staging region → Standard of Ur / seal contextual applications
quay form → contextual/reconstructive application
```

Evidence applies to the feature/inference, not vaguely to the entire city.

## 12. Seed isolation

Seed derivation includes semantic region/path identity.

Examples:

```text
seed(world, eridu, quay-east, reed-placement)
seed(world, eridu, fish-market, worker-phase)
```

Adding a new residential district cannot rearrange reeds at the quay.

## 13. Level 2 projection

A Level 2 adapter may map regions/topology to layered cards:

```text
far city
mid city
water
quay
foreground reeds
```

This is a projection of the same city data, not a separate city definition.

## 14. Level 3 projection

Three/R3F may compile:

```text
terrain cards/mesh
water planes
architecture volumes/cards
region debug overlays
path splines
instance spawn zones
```

Representation can improve without changing semantic topology revision if persistent city truth did not change.

## 15. Negative cases

```text
FAILURE-CITY-001-missing-node
FAILURE-CITY-002-orphan-path
FAILURE-CITY-003-region-over-capacity
FAILURE-CITY-004-state-removes-required-landmark
FAILURE-CITY-005-runtime-object-in-contract
FAILURE-CITY-006-random-topology-change
FAILURE-CITY-007-path-crosses-forbidden-region
FAILURE-CITY-008-evidence-application-missing
```

## 16. Eridu first fixture

Machine-readable planning fixture should include:

```text
city boundary placeholder
main water entry
main canal
quay region
temple approach region
reed-work region
boat-entry path
quay-to-temple path
state availability
```

Coordinates remain planning placeholders unless measured/authored deliberately; topology relationships are the first contract under test.

## 17. Storybook/Studio

Required inspection modes:

```text
World/Eridu/Topology
World/Eridu/Regions
World/Eridu/Paths
World/Eridu/WaterNetwork
World/Eridu/DevelopmentState
World/Eridu/EvidenceOverlay
World/Eridu/InvalidTopology
```

Studio should allow selecting a region/path and navigating to dependent crowds/scenes/evidence.

## 18. Tests

```text
CONTRACT-CITY-001-valid-topology
CONTRACT-CITY-002-node-edge-resolution
CONTRACT-CITY-003-state-feature-resolution
UNIT-CITY-001-region-seed-isolation
UNIT-CITY-002-path-sampling
FAILURE-CITY-002-orphan-path
SEMANTIC-CITY-001-same-place-growth
HUMAN-CITY-001-growth-identity
```

## 19. Definition of readiness

CityKit topology is ready when one Eridu semantic world can support Level 2 and Level 3 projections, deterministic crowds/pathing, authored development states, evidence-linked features, and scene reuse without rebuilding city truth inside each shot.