# Architecture and Temple Kit Contract

Status: **final pre-implementation planning contract**

Architecture must become reusable historical-fiction world data without pretending that sparse archaeological evidence gives us exact complete buildings. The goal is a kit that preserves semantic identity, evidence classification and development state while allowing Level 2 painted projection or Level 3 spatial realization.

## Core model

```text
architectural evidence + project design synthesis
  ↓
ArchitectureKit
  ↓
semantic modules
  ↓
BuildingDefinition
  ↓
CityKit placement/topology
  ↓
Level 2 projection OR Level 3 geometry
```

## Proposed contracts

```ts
interface ArchitectureKit {
  id: string;
  revision: number;
  periodBand: string;
  region: string;
  moduleIds: string[];
  materialProfileIds: string[];
  evidenceApplicationIds: string[];
  reconstructionPolicyId: string;
}

interface ArchitectureModule {
  id: string;
  semanticType: 'WALL' | 'GATE' | 'STAIR' | 'PLATFORM' | 'COURTYARD' | 'COLUMN' | 'DOORWAY' | 'ROOF' | 'QUAY' | 'DRAIN' | 'REED_STRUCTURE' | 'DECORATIVE_PANEL';
  footprintClass: string;
  heightClass?: string;
  materialProfileId: string;
  confidence: 'DIRECT' | 'CONTEXTUAL' | 'ANALOGICAL' | 'PROJECT_SYNTHESIS';
}
```

Dimensions may remain unresolved until evidence/design review. Planning never fabricates archaeological measurements.

## Building identity

A building such as the project E-Absu uses a stable semantic definition independent from mesh implementation:

```text
building:eridu:e-absu:v1
  ├── architecture kit
  ├── topology/entrances
  ├── water/quay relationship
  ├── development state
  ├── source/evidence applications
  └── art-direction notes
```

Three meshes, depth cards and future replacements are representations of the building, not its identity.

## Reconstruction layers

Every visually consequential feature carries one of:

```text
DIRECT_SITE_EVIDENCE
NEAR_PERIOD_CONTEXT
ANALOGICAL_ARCHITECTURE
LITERARY_INTERPRETATION
PROJECT_DESIGN_SYNTHESIS
```

Studio should eventually allow reviewers to see this classification per module or design decision.

## Temple benchmark

`benchmark:eridu-temple-kit:v1` should prove:

- kit modules instantiate deterministically;
- entrance/stair/platform relationships remain topologically valid;
- camera cannot reveal undefined backs/interiors in Level 2 mode;
- Level 3 geometry preserves the same semantic anchors;
- material palette remains evidence/art-direction compliant;
- replacing mesh implementation does not alter building semantic IDs.

## Negative fixtures

```text
FAILURE-ARCH-001 invented-measurement-labeled-direct
FAILURE-ARCH-002 analogue-labeled-site-evidence
FAILURE-ARCH-003 mesh-id-used-as-building-id
FAILURE-ARCH-004 disconnected-entrance-path
FAILURE-ARCH-005 undefined-backside-revealed
FAILURE-ARCH-006 runtime-default-pbr-overrides-painterly-material
FAILURE-ARCH-007 module-change-silently-mutates-old-release
```

## Versioning

Kit revision, module revision, building definition revision and runtime geometry revision are distinct. A better historical reconstruction creates a new building/kit revision and triggers typed dependency impact; old releases remain bound to old resolved hashes.

## Definition of Ready

Ready when Eridu has one planning kit fixture, module/evidence classifications are representable without Three types, and Level 2/Level 3 can share building identity and semantic anchors.
