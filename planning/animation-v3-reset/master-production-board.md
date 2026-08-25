# Master Production Board and Scene Inventory Model

Status: **planning contract**

The platform needs a story-facing production board that answers what is ready, blocked and reusable across Chapters 1–3. This is separate from GitHub issues and separate from runtime benchmark dashboards.

## 1. Purpose

The production board should answer:

- what narrative units exist;
- which are L1/L2/L3;
- which sources/evidence are ready;
- which actors/worlds/capabilities they need;
- which platform benchmarks block them;
- which scenes are production-ready;
- which proofs/approvals are current;
- what should be built next for maximum reuse.

## 2. ProductionUnit

Conceptual:

```ts
interface ProductionUnit {
  id: string;
  chapterId: string;
  sectionId?: string;
  reelId?: string;
  sceneIds: string[];

  title: string;
  narrativeThreadIds: string[];
  purpose: string;
  beatTypes: string[];

  targetLevel: 1 | 2 | 3;
  requiredCapabilityIds: string[];
  actorIds: string[];
  worldIds: string[];

  historicalSourceIds: string[];
  visualResearchTaskIds: string[];

  benchmarkFixtureIds: string[];
  dependencies: ProductionDependency[];

  status: ProductionReadinessStatus;
  blockers: ProductionBlocker[];
}
```

## 3. Readiness dimensions

Do not reduce production status to one `DONE` flag.

Track:

```text
NARRATIVE
SOURCE
VISUAL_RESEARCH
ASSET
CAPABILITY
FIXTURE
SCENE
LOCAL_QUALITY
CI_QUALITY
RENDER_PROOF
SEMANTIC
HUMAN
PROMOTION
```

Possible values:

```text
NOT_STARTED
PLANNED
IN_PROGRESS
READY
BLOCKED
STALE
N/A
```

## 4. Board columns

Recommended high-level board:

```text
NARRATIVE_REVIEW
SOURCE_RESEARCH
VISUAL_RESEARCH
PLATFORM_BLOCKED
ASSET_PREP
SCENE_AUTHORING
LOCAL_QA
RENDER_REVIEW
APPROVED
PROMOTED
```

These are views over readiness data, not manually duplicated status.

## 5. Capability-first view

Another view groups demand by reusable capability:

```text
Rive hero face       → Ch1 Enki, Ch2 Enlil/Sud, Ch3 recurring gods
Pixi water/rigging   → Ch1 voyage/storm/Eridu, Ch3 waterways
Crowd/work runtime   → Ch1 canal teams, Ch2 council/procession, Ch3 Igigi/cities
Herd/animals         → Ch2 marriage procession, Ch3 livestock cities
CityKit              → Ch1 Eridu, Ch3 city sequence
Montage              → Ch2 long journey, Ch3 long city development
```

This helps prioritize platform work that unlocks many scenes.

## 6. Chapter 1 high-level inventory

Initial planning groups:

```text
CH1-A Voyage / Stag of the Absu
  Enki performance, boat, water, rigging
  L2 → selective L3

CH1-B Nammu / underwater / Absu
  water deformation, atmospheric depth, divine presence
  L2/L3

CH1-C Dilmun condition and transformation
  environment state, water, vegetation/growth, city/world transition
  L3

CH1-D Canal/civilization work
  workers, water networks, travel/world progression
  L3

CH1-E Kutu / Kur storm
  storm, hail, physical boat response, mythic conflict
  L3

CH1-F Ninhursag / earth-life material
  hero performance, animals/vegetation, environment
  L2/L3

CH1-G Eridu / E-Absu
  city identity, water, architecture, divine reveal
  L3
```

Exact reel/shot mapping remains separate and can evolve.

## 7. Chapter 2 high-level inventory

```text
CH2-A Enlil / Grand Council
  formal hero performance, group reaction, architecture/status
  L2/L3

CH2-B Enki/Enlil private conversation
  two-actor performance
  L2

CH2-C Sud / Nisaba / Haia
  emotional multi-actor dialogue
  L2/L3

CH2-D Messenger / formal protocol
  reusable gesture/dialogue clips
  L2

CH2-E Courtship / reconciliation / marriage
  multi-actor ceremony, crowds, audio
  L3

CH2-F Marriage goods and herds
  animal rigs, path systems, dust/crowd scale
  L3

CH2-G Long journey / cultures / time
  montage, continuity subject, world/environment changes
  L3
```

## 8. Chapter 3 high-level inventory

```text
CH3-A Igigi labor / canals
  worker crowd, tools, waterways, time compression
  L3

CH3-B City identities
  CityKit base/world definitions
  L3

CH3-C Umma agriculture
  plough/oxen/fields/crops/water
  L3

CH3-D Shuruppak construction
  bricks/building/work crews
  L3

CH3-E Larsa measures/trade/solar identity
  survey/trade/city world + Utu visual language
  L2/L3

CH3-F Lagash uplands/livestock
  terrain/vegetation/animals
  L3

CH3-G Uruk livestock/weaving
  herds, weaving/industry, dense city
  L3

CH3-H Ur foundations/metalwork
  construction, material/industry, city
  L3

CH3-I Eridu fisheries/quays/water
  reusable Eridu CityKit
  L3
```

## 9. Dependency graph

Example:

```text
Enki helm production
  requires:
    Scene V3 foundation
    Animation Lab
    Rive hero face/basic body
    Pixi water/rigging
    V2 compatibility

Kutu storm
  additionally requires:
    Three/R3F spatial
    Rapier baked physics
    storm particles/materials

Marriage procession
  requires:
    crowd/path runtime
    animal/herd strategy
    city/road environment
```

## 10. Blocker classes

```text
NARRATIVE_BLOCKER
SOURCE_BLOCKER
VISUAL_EVIDENCE_BLOCKER
ASSET_BLOCKER
RUNTIME_BLOCKER
CAPABILITY_BLOCKER
PERFORMANCE_BLOCKER
QUALITY_BLOCKER
LICENSE_BLOCKER
HUMAN_REVIEW_BLOCKER
```

A blocker has owner/next action, not only description.

## 11. Reuse score

Planning may estimate reuse:

```text
1 = one-off shot-specific
2 = repeated within one chapter
3 = repeated across multiple chapters
4 = foundational platform-wide
```

This helps justify building Rive facial performance before a one-off complex magical effect.

## 12. Risk score

Separate planning risk categories:

```text
technical
visual
historical
performance
license
production complexity
```

Do not convert these into one false-precision score if qualitative labels are clearer.

## 13. Production priority

Recommended prioritization rule:

```text
high narrative value
+ high cross-chapter reuse
+ resolves foundational uncertainty
- excessive dependency depth
```

This is why Enki facial performance and water/rigging benchmarks precede full city/crowd complexity.

## 14. Source readiness

`SOURCE_READY` means:

- manuscript passage/thread identified;
- literary source relationship classified;
- non-ETCSL source explicitly marked if applicable;
- no unresolved claim masquerading as source fact.

It does not require every archaeological visual question solved.

## 15. Visual research readiness

`VISUAL_RESEARCH_READY` means prominent historically dependent design questions have sufficient evidence/uncertainty notes to begin design.

Background detail can continue to mature later according to salience.

## 16. Capability readiness

A capability is `READY` only if its acceptance scorecard is production-ready or scene has explicit approved exception/fallback.

A successful spike alone does not make all dependent scenes ready.

## 17. Scene readiness

Before scene authoring:

- narrative/source ready;
- target level chosen;
- required capabilities identified;
- source asset available;
- major visual research questions bounded;
- test plan/fixture link defined.

## 18. Production board testing

Unit:

- readiness derivation;
- blocker aggregation;
- dependency cycle detection;
- stale capability propagates to dependent production units;
- source metadata-only change follows defined staleness policy;
- promoted scene cannot be shown current if proof stale.

## 19. Storybook

```text
ProductionBoard/ChapterOverview
ProductionBoard/CapabilityView
ProductionBoard/BlockedScene
ProductionBoard/ReadyScene
ProductionBoard/StaleScene
ProductionBoard/Chapter1
ProductionBoard/Chapter2
ProductionBoard/Chapter3
```

## 20. E2E

- open chapter board;
- filter Level 3/platform-blocked;
- open blocker → navigate to capability benchmark;
- open source blocker → navigate provenance;
- mark capability ready fixture → dependent unit updates;
- stale runtime scorecard → dependent scenes show stale/block;
- navigate approved scene to promotion receipt.

## 21. GitHub relationship

GitHub PR/issues track implementation work; Production Board tracks narrative production readiness.

A production blocker may link a GitHub issue/PR but does not derive truth solely from issue status.

## 22. Human planning review

Before a chapter production sprint:

- verify high-value scenes are not blocked by avoidable platform gaps;
- identify one-off features that should not become foundational packages;
- confirm source/visual research priorities;
- confirm benchmark receipts current;
- confirm workstation/performance budget realistic.

## 23. Definition of production-board success

The board succeeds when we can answer “what should we build next and what does it unlock?” from structured Chapter 1–3 demand, instead of choosing the next engineering task because it is the most recent failing shot.
