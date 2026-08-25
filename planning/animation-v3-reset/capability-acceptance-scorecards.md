# Capability Acceptance Scorecards

Status: **planning contract**

This document defines a consistent admission/acceptance scorecard for new animation capabilities. A capability is not “done” because code exists or because one demo looks good. It earns maturity through architecture, testing, performance, provenance, diagnostics and human usefulness.

## 1. Capability lifecycle

```text
PROPOSED
  ↓
PLANNED
  ↓
SPIKE
  ↓
BENCHMARKED
  ↓
PRODUCTION_READY
  ↓
DEPRECATED / RETIRED
```

`PRODUCTION_READY` is evidence-backed, not aspirational.

## 2. Universal scorecard

Every reusable capability is evaluated across:

```text
NARRATIVE_NEED
OWNERSHIP
DETERMINISM
UNIT_TESTS
STORYBOOK
VISUAL_REGRESSION
MOTION_PROOF
E2E
NEGATIVE_FIXTURES
DIAGNOSTICS
PERFORMANCE
ACCESSIBILITY
PROVENANCE
LICENSE_SECURITY
ROLLBACK
HUMAN_VALUE
```

Not every row is applicable, but N/A must be deliberate.

## 3. Status vocabulary

```text
NOT_PLANNED
PLANNED
IN_PROGRESS
PASS
BLOCKED
REVIEW_REQUIRED
N/A
```

Do not encode this as one percentage that hides a blocking failure.

## 4. Example — Enki hero facial performance

| Dimension | Requirement |
|---|---|
| Narrative need | Chapters 1–3 require reusable hero acting |
| Owner | Rive adapter expected |
| Determinism | exact frame seek/advance |
| Unit | channel/clip/seek/reset tests |
| Storybook | OPEN/CLOSED/gaze/breath/combined stories |
| Visual | fixed-frame identity/golden checks |
| Motion | normal-speed blink/gaze/breath proof |
| E2E | load fixture, scrub proof state, inspect runtime/proof |
| Negative | open eyes, one-eye blink, cyan/debug leak, no reopen |
| Diagnostics | rig/hash/runtime/frame/input trace |
| Performance | within hero rig preview/render budget |
| Accessibility | preview paused under reduced motion; textual state available |
| Provenance | rig source hashes/editorial identity |
| License/security | Rive runtime/editor policy documented |
| Rollback | V2/Level 1 actor baseline remains renderable |
| Human | natural, unmistakable, identity preserved |

Production-ready requires every blocking applicable row PASS plus human approval of benchmark.

## 5. Example — Pixi water/rigging

Required:

- deterministic explicit-frame mesh/material evaluation;
- no autonomous ticker dependency in production;
- Storybook water calm/storm and rigging driver states;
- fixed-frame bounds/golden proof;
- short motion proof;
- negative fixture with runaway/unbounded deformation;
- causality proof for vessel→rigging lag;
- WebGL/browser compatibility;
- Remotion rendered proof;
- acceptable workstation cost.

## 6. Example — Three/R3F spatial world

Required:

- exact-frame camera/world state;
- painterly depth-card proof;
- no hidden/unapproved geometry exposure;
- source texture/hash binding;
- Storybook camera/depth states;
- fixed-frame visual regression;
- Remotion proof;
- negative card-edge/occlusion/depth-order fixtures;
- Chromium/browser compatibility;
- human preference over equivalent flat camera when Level 3 is justified.

## 7. Example — Rapier baked physics

Required:

- fixed timestep;
- deterministic initialization/construction order;
- same-seed repeated bake hash;
- bake/playback separation;
- simulation receipt;
- Storybook playback proof;
- Kutu hail benchmark;
- variable-timestep negative fixture;
- stale bake/runtime mismatch blocked;
- performance budget;
- human storm/boat response acceptance.

## 8. Example — crowd/work system

Required:

- stable agent IDs;
- deterministic clip/phase/region assignment;
- 1/5/20/100 Storybook states;
- synchronization metric;
- negative perfectly synchronized crowd fixture;
- path/density constraints;
- performance/CPU/GPU budget;
- Igigi canal benchmark;
- human “not cloned” judgment.

## 9. Example — CityKit

Required:

- semantic city definition independent from renderer;
- development states;
- evidence/confidence bindings;
- seeded local variation isolation;
- Level 2 and Level 3 projections;
- Storybook states;
- city growth motion/montage proof;
- persistent identity visual criteria;
- performance LOD policy;
- E2E state/evidence/edit distinction;
- human city identity acceptance.

## 10. Example — Theatre authoring bridge

Required:

- authoring-only boundary;
- exported tracks compile to Scene V3;
- round-trip equality for supported fields;
- production render does not require Theatre Studio;
- Storybook/preview uses compiled data;
- negative unsupported-field/export mutation tests;
- rollback is plain Scene V3 data.

## 11. New capability proposal template

```text
Capability ID:
Name:
Narrative demand:
Chapters/scenes:
Expected owner/runtime:
What it explicitly does NOT own:
Existing alternatives:
Benchmark fixture:
Proof states:
Negative cases:
Local test obligations:
CI obligations:
Performance budget:
License/security concerns:
Rollback/fallback:
Human acceptance:
```

No implementation branch before this template is sufficiently answered.

## 12. Acceptance precedence

Blocking order:

```text
architecture/source safety
  ↓
determinism/contract
  ↓
unit/build/lint
  ↓
Storybook/browser
  ↓
final rendered proof
  ↓
performance
  ↓
human value
```

A visually beautiful demo cannot override a nondeterministic or provenance-breaking implementation.

## 13. Test completeness

A scorecard should list exact test IDs/fixtures rather than “tested”.

Example:

```text
UNIT-RIVE-014 exact-frame seek
STORY-enki-facial-closed
VISUAL-enki-facial-CLOSED
MOTION-enki-facial-v1
E2E-ANIM-003 exact proof state
NEG-enki-cyan-eye
```

## 14. CI relationship

Local capability gate is primary developer verification. GitHub independently repeats deterministic rows:

```text
lint
unit
build/types
Storybook browser/a11y
applicable E2E
receipt/schema checks
```

Heavy render/human rows are represented by current receipts and remain local/milestone unless CI explicitly opts in.

## 15. Runtime adoption decision

Scorecard concludes one of:

```text
KEEP
KEEP_WITH_CONSTRAINTS
DEFER
REJECT
```

`KEEP_WITH_CONSTRAINTS` records constraints as enforceable contract, e.g. “Pixi ticker disabled in production” or “Rapier production consumes baked simulations only.”

## 16. Re-evaluation triggers

Re-run benchmark/scorecard when:

- major runtime version changes;
- adapter architecture changes;
- source/rig format changes;
- performance regresses substantially;
- browser/Remotion integration changes;
- license terms change;
- escaped failure challenges an assumption.

## 17. Dashboard projection

Studio Benchmark Dashboard can project scorecard rows rather than invent status:

```text
Capability            Local CI  Story Visual Motion E2E Human Perf   Status
Enki facial / Rive    PASS PASS PASS  PASS   PASS   PASS PASS  PASS   READY
Pixi water             ...
```

Visual simplification is fine, but blockers remain inspectable.

## 18. Phase relationship

Phase exits reference capability scorecards. Example:

- Phase 5 cannot exit until Enki facial scorecard production-ready;
- Phase 7 requires combined Enki-at-helm scorecard;
- Phase 9 requires crowd scorecard;
- Phase 11 requires CityKit scorecard.

## 19. Definition of acceptance rigor

The scorecard system is successful if future development cannot plausibly declare a package/capability “done” while quietly skipping Storybook, negative fixtures, rendered semantics, E2E, performance, provenance or human usefulness.
