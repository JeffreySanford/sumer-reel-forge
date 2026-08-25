# Lighting Profile Contract

Status: **final pre-implementation planning contract**

The art-direction document defines lighting language; this contract makes it deterministic, inspectable production data shared by Rive/Pixi/Three/Remotion rather than a collection of runtime-local knobs.

## Proposed contract

```ts
interface LightingProfile {
  id: string;
  revision: number;
  role: 'NATURAL_DAY' | 'DAWN_DUSK' | 'INTERIOR_FIRE' | 'INTERIOR_DIFFUSE' | 'STORM' | 'UNDERWATER' | 'UNDERWORLD' | 'DIVINE_ACCENT' | 'VISION_MEMORY';
  paletteProfileId: string;
  keyDirection?: { x: number; y: number; z: number };
  keyStrength: number;
  ambientStrength: number;
  atmosphereStrength: number;
  contrastIntent: number;
  runtimeConstraints: string[];
  safetyProfileId?: string;
}
```

Runtime adapters map this semantic profile to appropriate mechanisms. The profile does not contain raw Pixi filter objects, Three lights or CSS effects.

## Hybrid consistency

A shot may combine painted cards, Rive actor raster output, Pixi deformation and Three geometry. All must resolve the same profile revision. Runtime-specific approximations are permitted but their evidence should show that the combined frame remains coherent.

## Character limits

Flattened painted actors cannot be aggressively relit as if they had complete surface normals. Character adapters may support bounded tint/value/overlay response. Identity-sensitive facial regions have stricter delta limits than environment cards.

## Kutu storm fixture

`lighting:kutu-storm:v1` should include:

- lower ambient/readability target;
- controlled key direction;
- water/sky contrast intent;
- optional impact-flash events that obey motion-safety policy;
- maximum flash frequency/intensity constraints;
- proof states before/during/after storm accent.

The fixture must not specify unmeasured final artistic numbers as though already approved; unresolved tuning remains explicit until visual review.

## Negative fixtures

```text
FAILURE-LIGHT-001 runtime-default-lighting-used-without-profile
FAILURE-LIGHT-002 actor-environment-key-direction-conflict
FAILURE-LIGHT-003 full-frame-strobe-outside-safety-profile
FAILURE-LIGHT-004 relight-destroys-identity
FAILURE-LIGHT-005 runtime-local-profile-change-not-in-resolved-hash
FAILURE-LIGHT-006 generic-blue-filter-substitutes-for-underwater-design
FAILURE-LIGHT-007 scene-uses-unapproved-palette-profile
```

## Proofs

Storybook should expose source/reference, neutral implementation, lighting-applied state and contribution-isolated controls. Fixed-frame visual QA checks palette/value coherence; human review decides whether lighting preserves the painting rather than creating a game-engine look.

## Versioning

Changing semantic lighting intent/profile revision stales visual proofs that depend on it. Changing a runtime mapping algorithm creates runtime/adapter evidence impact and may require A/B comparison even when the semantic lighting profile remains unchanged.

## Definition of Ready

Ready when at least one calm-water and one storm lighting fixture can be represented without runtime object types and the canonical resolved scene can bind exact lighting profile revision/hash.
