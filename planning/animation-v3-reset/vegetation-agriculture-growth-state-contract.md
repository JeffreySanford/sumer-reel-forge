# Vegetation and Agriculture Growth-State Contract

Status: **final pre-implementation planning contract**

Dilmun's transformation and Chapter 3 agriculture require vegetation to evolve through authored deterministic states rather than generic particle growth or time-lapse texture swaps.

## Core model

```text
plant/crop profile
  + water/soil/world prerequisites
  ↓
growth-state definition
  ↓
instance population seed
  ↓
world-state transition
  ↓
Level 2/3 representation
```

## Proposed contracts

```ts
interface GrowthProfile {
  id: string;
  revision: number;
  subjectType: 'REED' | 'DATE_PALM' | 'BARLEY' | 'GRASS' | 'SHRUB' | 'FIELD_CROP' | 'ORCHARD';
  evidenceApplicationIds: string[];
  states: GrowthState[];
}

interface GrowthState {
  id: string;
  order: number;
  semantic: 'DORMANT' | 'SPROUT' | 'ESTABLISHED' | 'MATURE' | 'HARVESTABLE' | 'DRY' | 'CLEARED';
  representationProfileIds: string[];
}

interface AgriculturePlotState {
  plotId: string;
  irrigationState: 'DRY' | 'WATER_AVAILABLE' | 'IRRIGATED';
  soilState: string;
  cropProfileId?: string;
  growthStateId?: string;
  laborActivityIds: string[];
}
```

## Causality

Growth state is authored world state, not arbitrary visual interpolation. Where the narrative requires causal order:

```text
water introduced
→ irrigation available
→ sowing/planting
→ established growth
→ mature field
→ harvest/work
```

A montage may compress time, but it cannot skip required semantic state transitions without an explicit montage rule.

## Dilmun benchmark

`benchmark:dilmun-growth:v1` should expose named states:

```text
BARREN
WATER_INTRODUCED
FIRST_GREEN
CULTIVATED
ABUNDANT
```

Required controls separate water, vegetation, agriculture labor and settlement so a camera push or green color grade cannot masquerade as actual transformation.

## Deterministic populations

Vegetation instance placement may use semantic seed channels for density, scale, phase and variant. Adding a distant decorative region must not rearrange already approved foreground reeds or palms.

## Historical policy

Species/crop claims bind evidence applications. Mythic abundance may exceed archaeological certainty but must remain labeled project interpretation rather than direct period proof.

## Negative fixtures

```text
FAILURE-GROWTH-001 mature-before-water-prerequisite
FAILURE-GROWTH-002 camera-only-transformation
FAILURE-GROWTH-003 unrelated-region-rerolls-approved-plants
FAILURE-GROWTH-004 speculative-species-labeled-direct
FAILURE-GROWTH-005 state-order-nondeterministic
FAILURE-GROWTH-006 LOD-changes-growth-state
FAILURE-GROWTH-007 global-green-filter-substitutes-for-growth
```

## Versioning/staleness

Growth profile revisions are distinct from city/world-state revisions. A corrected crop identity may stale scenes that visually depend on that profile while leaving unrelated water or character proofs current.

## Definition of Ready

Ready when Dilmun has one machine-readable growth sequence, the contract can express prerequisites and named proof states without runtime types, and Storybook can eventually inspect the same states used by Remotion.
