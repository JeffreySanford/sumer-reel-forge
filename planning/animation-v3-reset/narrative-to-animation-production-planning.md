# Narrative-to-Animation Production Planning

Status: **planning contract**

This document defines how manuscript material is translated into production units without letting technology drive the story.

## 1. Story-first planning sequence

```text
manuscript passage
  ↓
narrative intent
  ↓
source/provenance classification
  ↓
visual beat
  ↓
scene/shot decomposition
  ↓
Level 1 / Level 2 / Level 3 decision
  ↓
reusable capability assignment
  ↓
benchmark/fixture mapping
  ↓
production
```

Do not begin with "which engine can animate this?"

## 2. Narrative unit

Every planned scene/shot gets:

```text
narrative thread ID
chapter/section
point of view
story purpose
emotional purpose
myth/source relationship
visual focal action
required continuity
```

## 3. Visual beat classification

Primary beat classes:

```text
ESTABLISH
PERFORM
INTERACT
TRAVEL
WORK
TRANSFORM
REVEAL
MONTAGE
RITUAL
CONFLICT
ENVIRONMENT
```

A scene may contain multiple beats, but one should dominate shot design.

## 4. Level decision framework

### Level 1 — Cinematic Still

Choose when story is served by:

- composition;
- narration;
- camera/parallax;
- atmospheric motion;
- no meaningful actor articulation required.

### Level 2 — Living Illustration

Choose when story requires:

- actor gesture/expression;
- local mesh/material deformation;
- layered physical causality;
- source-faithful 2D performance;
- no meaningful camera reveal around hidden geometry.

### Level 3 — Spatial Performance

Choose when story requires:

- spatial camera/depth;
- multi-actor blocking;
- persistent world/city state;
- physics;
- crowd/herd systems;
- environmental evolution;
- complex architecture/world interaction;
- montage across large time/space.

## 5. Complexity score

Planning may use a non-authoritative score to reveal platform demand.

One point each:

```text
hero facial performance
hero body articulation
multi-actor interaction
material deformation
spatial camera
physics
crowd
animals/herd
city/world state
weather/particles
montage/time compression
mythic transformation
```

Guideline:

```text
0–2  likely L1/L2
3–5  likely L2
6+   likely L3 or scene decomposition
```

This is a planning heuristic, not a quality label.

## 6. Reuse-first rule

Before designing bespoke code, ask:

```text
Does an existing performance clip solve it?
Does an existing material solve it?
Does CityKit/world state solve it?
Does crowd/work runtime solve it?
Does montage runtime solve it?
Does a benchmark fixture already cover the capability?
```

If not, create platform capability only when recurrence or narrative importance justifies it.

## 7. Chapter 1 planning themes

Recurring capability clusters:

```text
Enki performance
boat/rigging/water
coast/travel
Dilmun transformation
canals/work crews
Kutu storm
underworld/mythic spaces
Eridu/E-Absu architecture
```

Primary L2 targets:

- Enki facial/body performance;
- water/rigging/materials;
- Nammu underwater local deformation.

Primary L3 targets:

- Stag spatial scene;
- Kutu storm;
- canal/world development;
- E-Absu architectural reveal.

## 8. Chapter 2 planning themes

Recurring clusters:

```text
Enlil formal performance
council reaction
private dialogue
Sud/Nisaba/Haia emotional interaction
messenger protocol
marriage ceremony
herd/procession
long journey montage
```

This chapter is the primary proof that hero acting and multi-actor blocking must be reusable systems.

## 9. Chapter 3 planning themes

Recurring clusters:

```text
city identity
canal labor
agriculture
brickmaking
surveying
weaving
metalwork
fisheries
livestock
city growth
long historical development
```

This chapter is the primary proof for CityKit, crowds/work, herd systems and montage.

## 10. Scene decomposition rule

Do not force one scene to demonstrate every available system.

If a shot needs:

```text
hero dialogue + 100 workers + spatial city + storm + transformation
```

consider decomposition unless the narrative specifically requires simultaneity.

Complexity should be authored, not accumulated accidentally.

## 11. Source relationship during planning

Each beat declares:

```text
DIRECT_SOURCE
CLOSE_PARAPHRASE
COMPOSITE_ADAPTATION
FICTIONAL_BRIDGE
SPECULATIVE_RECONSTRUCTION
INTENTIONAL_ANACHRONISM
```

Narrative revision is allowed; classification follows the revision.

## 12. Historical visual research trigger

A visual research task is required when a beat materially depends on:

- costume/status;
- architecture;
- tool/technology;
- animal use;
- transport;
- ritual object;
- urban layout;
- agricultural practice;
- iconographic divine attribute.

Research depth depends on visual prominence.

## 13. Shot planning record

Conceptual:

```ts
interface ShotPlan {
  id: string;
  storyBinding: StoryBinding;
  purpose: string;
  beatType: VisualBeatType;
  targetLevel: 1 | 2 | 3;
  requiredCapabilities: string[];
  reusableAssets: string[];
  newCapabilityRequests: string[];
  historicalSourceIds: string[];
  visualEvidenceIds: string[];
  benchmarkFixtureIds: string[];
  humanAcceptanceNotes: string[];
}
```

## 14. Capability request gate

Before new subsystem work is authorized:

1. identify manuscript need;
2. identify frequency across Chapters 1–3;
3. prove existing primitive cannot solve acceptably;
4. decide whether runtime/library already provides it;
5. define tests/benchmark before implementation;
6. assign ownership/runtime boundary.

## 15. Shot test plan created before implementation

Every shot plan declares applicable tests:

```text
unit/contract
Storybook proof states
visual golden
motion proof
semantic QA
E2E workflow
human review
```

A shot cannot reach implementation with "we'll figure out QA later."

## 16. Storyboard relationship

Storyboards/contact sheets should annotate:

```text
narrative beat
camera intent
actor action
runtime/capability notes
source/evidence notes
proof-state candidates
```

Storyboard is visual planning, not canonical scene definition.

## 17. Performance direction

For dialogue scenes, plan actor intent instead of only motion:

```text
speaker goal
listener reaction
power/status
emotion shift
physical beat
pause/look/contact
```

Then map to performance clips/rig channels.

## 18. Crowd planning

Crowd shots specify:

```text
story role of crowd
count/density
hero visibility
work/ceremony behavior
variation target
path/region
sound implications
```

Do not add crowds merely because Level 3 can.

## 19. City planning

City shot defines:

```text
city identity
current development state
visible industries
water relationship
architecture profile
population density
patron/divine motif
historical visual evidence
```

## 20. Mythic FX planning

Classify effect:

```text
METAPHORICAL
LITERAL_WITHIN_NARRATIVE
VISION/MEMORY
DIVINE_MANIFESTATION
TRANSFORMATION
```

This helps avoid visual effects accidentally implying documentary realism.

## 21. Montage planning

Each montage segment declares:

```text
what changes
what remains continuous
scale of elapsed time
source relationship
dominant visual motif
transition style
```

## 22. Production readiness statuses

```text
NARRATIVE_READY
SOURCE_READY
VISUAL_RESEARCH_READY
CAPABILITY_READY
FIXTURE_READY
SCENE_READY
PROOF_READY
HUMAN_APPROVED
```

A scene should not move to production because only artwork happens to exist.

## 23. Chapter readiness gate

Chapter production readiness requires:

- recurring capabilities implemented;
- hero rigs needed by chapter ready;
- historical source registry sufficiently complete;
- benchmark scenes green;
- Storybook/E2E test surfaces ready;
- known high-risk scenes identified and bounded.

## 24. Planning output

Eventually Studio can generate a chapter production board:

```text
scene
narrative status
source status
visual research status
L1/L2/L3
capabilities
runtime dependencies
fixtures
proof status
human status
```

## 25. Definition of good planning

A planned shot is ready to build when its story purpose, source relationship, target level, reusable capabilities, test obligations and human acceptance criteria are clear enough that implementation does not have to invent them while debugging animation code.
