# Planning Lock — Transition to Build

Status: **decision record**

## Decision

Generic V3 planning is complete enough to begin implementation.

The newly clarified divine-manifestation ontology does **not** reopen the architecture. It resolves a provenance-model ambiguity and should be incorporated into Phase 1B rather than used as a reason for another broad planning cycle.

## Why build now

Further generic planning has diminishing value because the project already has:

- Scene V3 architecture;
- historical-source and visual-evidence models;
- runtime adoption gates;
- deterministic timing/hashing/seeding rules;
- source-sheet and registration contracts;
- actor/performance/material/physics/world/crowd contracts;
- Storybook/render/QA/human-review contracts;
- release/rollback/forensic trace contracts;
- historical corroboration and source-authority rules;
- modern symbolic correspondence separation;
- divine manifestation/cult-identity ontology;
- explicit scene-specific research reopen conditions.

The next useful information should come from TypeScript implementation and tests.

## Immediate build slice

Proceed with Phase 1B in `libs/historical-sources`.

The implementation should add the smallest contract surface needed to represent:

1. canonical visual evidence records;
2. project-specific visual evidence applications;
3. explicit historical/adaptation/symbolic provenance classes;
4. city/deity relationship types that do not overload patronage;
5. project-metaphysical manifestation relationships without promoting them to history;
6. provenance reports that can display these classes separately.

## Required first examples

The first implementation should prove the model against difficult real cases rather than easy toy data:

```text
Kish
  patron -> Zababa
  offering/cult presence -> An
  symbolic correspondence -> An/Kether

Shuruppak
  patron -> Sud/Ninlil
  project symbolic office -> Nergal/Geburah

Eres -> Uruk
  ancient source location -> Eres
  fiction location -> Uruk
  relationship -> DELIBERATE_ADAPTATION

Uttu -> Inanna -> Ishtar
  Uttu/Inanna -> PROJECT_METAPHYSICS manifestation
  Inanna/Ishtar -> HISTORICAL_SYNCRETISM

Ishtar -> Lilith
  MODERN_ESOTERIC_MANIFESTATION / historicalIdentityClaim=false
```

## Tests before animation work

At minimum Phase 1B should include negative tests proving that:

- patron and cult presence are not mutually exclusive;
- symbolic correspondence cannot satisfy a historical-source requirement;
- manifestation cannot silently become historical identity;
- project genealogy cannot masquerade as universal ancient genealogy;
- source location and fiction location remain independently queryable;
- Utu and Uttu cannot collide by normalized ID;
- provenance reports label modern symbolic material visibly.

## What planning may still happen later

Planning/research reopens only when one of these occurs:

- implementation exposes an impossible or ambiguous contract;
- a test shows two provenance classes cannot be represented safely;
- a production scene requires exact archaeological/material detail;
- stronger ancient evidence changes a classification;
- a runtime benchmark fails;
- human review rejects a planned visual interpretation.

## What should not happen

Do not start another broad architecture survey before Phase 1B.

Do not install Rive/Pixi/Three/Rapier as part of this provenance slice.

Do not rewrite manuscript theology to satisfy a one-city/one-god database model.

Do not treat the modern occult source as ancient evidence.

Do not erase the modern occult source either: it is evidence for the project's own metaphysical architecture.

## Next checkpoint

The next architecture review occurs **after Phase 1B implementation and its local quality gate**, using implementation evidence rather than another speculative planning pass.