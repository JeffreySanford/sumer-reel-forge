# Herd, Animal Archetype and Gait Contract

Status: **final pre-implementation planning contract**

Chapter 2's marriage procession and Chapter 3's livestock cities require animals to be reusable semantic actors, not one generic quadruped loop scaled into sheep, oxen, goats and donkeys.

## Core model

```text
species definition
  ↓
animal archetype
  ↓
rig implementation
  ↓
gait/performance clips
  ↓
herd definition
  ↓
stable animal instances
  ↓
path/schedule/LOD
```

Species identity is separate from runtime representation.

## Proposed contracts

```ts
interface AnimalArchetype {
  id: string;
  revision: number;
  speciesId: string;
  bodyClass: string;
  sizeRange: [number, number];
  rigProfileIds: string[];
  gaitClipIds: string[];
  idleClipIds: string[];
  evidenceApplicationIds: string[];
}

interface HerdDefinition {
  id: string;
  revision: number;
  archetypePool: string[];
  count: number;
  seed: number;
  regionId: string;
  routeId?: string;
  behavior: 'PROCESSION' | 'WALK' | 'GRAZE' | 'REST' | 'SCATTER';
  spacingProfileId: string;
  schedulingProfileId: string;
}
```

## Gait contract

Each visible species class has approved gait semantics where distance/shot scale makes them readable:

```text
WALK
TROT if appropriate
GRAZE
STOP
HEAD_TURN
STARTLE
REST
```

A gait clip records foot-contact phases or other semantic contact markers so speed scaling can be checked against sliding.

## Deterministic variation

Seed by stable animal instance ID + channel + purpose. Variation may affect body scale within archetype bounds, coat/marking variant where supported, gait phase, head-turn timing, path offset and pause duration. Adding animal 51 cannot reroll animals 1–50.

## Procession benchmark

`benchmark:marriage-herd-procession:v1` should include at least two visibly different species classes and prove:

- different silhouettes/gaits;
- non-synchronized phases;
- stable route progression;
- believable spacing;
- no foot sliding above tolerance at benchmark scale;
- herd does not clip through hero/cargo route boundaries;
- LOD changes do not change semantic animal identity/schedule.

## Historical/visual policy

Animal form, tack, cargo and procession use must bind evidence applications separately from species identity. A contextual depiction may support procession composition without proving the exact animal count or arrangement in the manuscript scene.

## Negative fixtures

```text
FAILURE-HERD-001 one-gait-scaled-to-all-species
FAILURE-HERD-002 perfect-phase-synchronization
FAILURE-HERD-003 foot-slide
FAILURE-HERD-004 added-animal-rerolls-existing
FAILURE-HERD-005 route-order-nondeterministic
FAILURE-HERD-006 LOD-changes-schedule
FAILURE-HERD-007 collider-shape-redefines-animal-visual
FAILURE-HERD-008 unsupported-species-evidence-overclaimed
```

## Runtime evaluation

Rive and Spine may both be evaluated for animal rigs. The production contract remains the same. A runtime earns adoption by proving exact-frame gait state, deterministic instancing, acceptable performance, licensing, Storybook inspectability and human gait plausibility.

## Definition of Ready

Ready when at least one mixed-species machine-readable herd fixture exists, stable animal IDs and gait-contact semantics are representable by Scene V3, and the runtime spike can be rejected without invalidating authored herd data.
