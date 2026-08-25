# Animation V3 Reset — Planning Index

Status: **planning lock complete; historical-source foundation implementation may proceed**.

This directory captures the architectural reset for Sumer Reel Forge after the Reel 1 Level 2 Shot 3 blink investigation demonstrated that the repository had begun re-implementing character-animation primitives one PNG state at a time.

The reset preserves what already works well:

- immutable editorial source as narrative authority;
- candidate-only generation under `tmp/`;
- checksum/provenance binding;
- deterministic frame evaluation;
- explicit promotion;
- independent structural and semantic QA;
- normal-speed human review as the final visual gate.

It changes the animation architecture underneath those rules.

## Core vision

Sumer Reel Forge V3 is a **deterministic historical-fiction animation platform**, not a collection of bespoke Remotion shot scripts.

The three manuscript chapters establish three complementary requirements:

- **Chapter 1 — Enki:** cinematic/environmental animation — water, boats, canals, storms, vegetation, temples, travel, mythic spaces.
- **Chapter 2 — Enlil:** acting/performance animation — councils, dialogue, private conversation, emotional reaction, ceremony, processions, herds.
- **Chapter 3 — The Cities:** persistent-world/civilization animation — cities, agriculture, construction, trades, crowds, animals, waterways, long time spans.

The literary/mythological source layer is anchored to the Oxford **Electronic Text Corpus of Sumerian Literature (ETCSL)** where applicable, cross-checked with ORACC/CDLI/current archaeology and scholarship where claims become production-relevant. The manuscripts remain historical fiction: connective narrative, characterization, chronology, staging, dialogue, symbolic correspondences and visual interpretation may evolve, but changes must not erase or misclassify their source relationships.

## Planning documents

1. [`narrative-source-map.md`](./narrative-source-map.md) — manuscript → ETCSL/other source mapping, adaptation policy and visual provenance.
2. [`level-2-specification.md`](./level-2-specification.md) — formal Level 2 Living Illustration contract.
3. [`level-3-architecture.md`](./level-3-architecture.md) — Scene V3, runtimes, world/crowd/city/montage architecture.
4. [`testing-provenance-roadmap.md`](./testing-provenance-roadmap.md) — full testing/provenance strategy and phased roadmap.
5. [`package-adoption-matrix.md`](./package-adoption-matrix.md) — Rive/Pixi/Three/Rapier/Spine/Theatre adoption rules.
6. [`scene-v3-contract-design.md`](./scene-v3-contract-design.md) — planned concrete Scene V3 TypeScript contract boundaries.
7. [`benchmark-specifications.md`](./benchmark-specifications.md) — manuscript-derived benchmark scenes and acceptance criteria.
8. [`animation-lab-storybook-contract.md`](./animation-lab-storybook-contract.md) — React/Vite Animation Lab and exact-frame Storybook model.
9. [`migration-release-strategy.md`](./migration-release-strategy.md) — V2/V3 coexistence, rollback and migration.
10. [`performance-render-budget.md`](./performance-render-budget.md) — workstation, runtime and render budgets.
11. [`implementation-backlog.md`](./implementation-backlog.md) — dependency-aware Phase 0–17 execution backlog.
12. [`architecture-decision-records.md`](./architecture-decision-records.md) — ADRs locking time authority, runtime ownership, provenance, testing and promotion rules.
13. [`chapter-capability-matrix.md`](./chapter-capability-matrix.md) — Chapter 1–3 narrative requirements mapped to reusable L2/L3 capabilities and tests.
14. [`quality-gates-local-ci.md`](./quality-gates-local-ci.md) — local L0–L4 test tiers and GitHub Actions re-check contract.
15. [`test-fixture-catalog.md`](./test-fixture-catalog.md) — shared unit/Storybook/visual/motion/E2E fixtures and negative regressions.
16. [`risk-register.md`](./risk-register.md) — architecture, historical, licensing, performance, CI and visual risks.
17. [`phase-exit-checklists.md`](./phase-exit-checklists.md) — explicit Phase 0–17 local/CI/render/human exit gates.
18. [`ci-workflow-redesign.md`](./ci-workflow-redesign.md) — proposed quota-aware GitHub Actions topology and local command parity.
19. [`accessibility-motion-testing.md`](./accessibility-motion-testing.md) — Studio accessibility, reduced-motion, captions, motion safety and AT/browser testing.
20. [`observability-diagnostics.md`](./observability-diagnostics.md) — Scene/runtime/frame/render diagnostics, asset traces and proof bundles.
21. [`dependency-license-security.md`](./dependency-license-security.md) — package adoption, licensing, version lockstep and supply-chain controls.
22. [`persistence-versioning.md`](./persistence-versioning.md) — scene/rig/source/proof version domains, migration and staleness rules.
23. [`failure-injection-resilience.md`](./failure-injection-resilience.md) — deliberate negative integration tests, service failures, corrupt assets, stale revisions and promotion resilience.
24. [`phase-1-provenance-studio-ux.md`](./phase-1-provenance-studio-ux.md) — concrete Phase 1 provenance components, warnings, Storybook states, accessibility and E2E scenarios.
25. [`phase-2-implementation-blueprint.md`](./phase-2-implementation-blueprint.md) — exact planned Nx libraries, Scene V3 compiler stages, FrameContext, runtime registry, fixtures, tests and PR sequence.
26. [`asset-taxonomy-ownership.md`](./asset-taxonomy-ownership.md) — source/derived/rig/runtime/material/spatial/simulation/generative/proof/canonical asset classes and lifecycle rules.
27. [`review-promotion-workflow.md`](./review-promotion-workflow.md) — candidate → QA → human review → transactional promotion → supersession state machine.
28. [`test-command-manifest.md`](./test-command-manifest.md) — local L0–L4 commands, Storybook/E2E/lint/build expectations and GitHub Actions parity.
29. [`branch-pr-change-management.md`](./branch-pr-change-management.md) — branch types, capability-sized PRs, local evidence, CI rerun discipline and dependency/schema upgrade policy.
30. [`traceability-requirements-matrix.md`](./traceability-requirements-matrix.md) — manuscript/source → Scene V3 → assets/runtimes → frame/proof → QA/human → promotion trace chain.
31. [`studio-information-architecture.md`](./studio-information-architecture.md) — Scene V3 authoring/review workspace, timeline, inspectors, QA, diagnostics, candidate review and accessible E2E flows.
32. [`runtime-spike-playbooks.md`](./runtime-spike-playbooks.md) — manuscript-derived adoption playbooks for Rive, Pixi, Three/R3F, Rapier, Spine, Theatre and optional generative runtimes.
33. [`benchmark-fixture-data-contract.md`](./benchmark-fixture-data-contract.md) — shared benchmark/proof-state fixture model consumed by unit, Storybook, visual, motion, semantic and E2E tests.
34. [`narrative-to-animation-production-planning.md`](./narrative-to-animation-production-planning.md) — story-first scene/shot planning, L1/L2/L3 selection, capability requests and test planning.
35. [`historical-visual-research-workflow.md`](./historical-visual-research-workflow.md) — archaeology/museum research questions, evidence hierarchy, design synthesis, licensing and uncertainty handling.
36. [`local-developer-environment.md`](./local-developer-environment.md) — Windows/Linux reproducibility, optional services, render profiles, path/hash policy, caches and future `doctor:v3` diagnostics.
37. [`scene-v3-example-enki-helm.md`](./scene-v3-example-enki-helm.md) — worked authored Scene V3 example with ownership, proof states, tests and Level 3 extension path.
38. [`resolved-scene-and-receipt-examples.md`](./resolved-scene-and-receipt-examples.md) — concrete resolved-scene, render, QA, semantic, human and promotion receipt examples.
39. [`citykit-example-eridu.md`](./citykit-example-eridu.md) — worked CityKit example with development states, evidence confidence, seeded regions/paths and L2/L3 projections.
40. [`studio-wireframe-component-contracts.md`](./studio-wireframe-component-contracts.md) — textual Studio wireframes and testable Angular component/Storybook/E2E contracts.
41. [`id-naming-version-conventions.md`](./id-naming-version-conventions.md) — semantic ID grammar, revisions, contract versions, receipt/fixture naming and path rules.
42. [`repository-storage-retention.md`](./repository-storage-retention.md) — Git/tmp/cache/evidence retention, cleanup, golden images, bakes, model and release artifact policy.
43. [`capability-acceptance-scorecards.md`](./capability-acceptance-scorecards.md) — universal maturity scorecard spanning narrative need, determinism, unit/Storybook/E2E, proof, performance, provenance and human value.
44. [`planning-definition-of-ready.md`](./planning-definition-of-ready.md) — implementation Definition of Ready/Done for capabilities, runtime spikes, phases, visual promotion and docs-only work.
45. [`historical-period-visual-policy.md`](./historical-period-visual-policy.md) — period bands, near-period/contextual evidence rules, mythic design synthesis and initial authoritative museum/site evidence targets.
46. [`audio-dialogue-caption-architecture.md`](./audio-dialogue-caption-architecture.md) — narration/dialogue assets, voice identity, viseme/lip-sync tracks, captions, mix buses, QA and E2E.
47. [`cinematography-motion-language.md`](./cinematography-motion-language.md) — common camera, actor, environmental, physics and mythic motion language across runtimes.
48. [`lighting-color-material-direction.md`](./lighting-color-material-direction.md) — painterly preservation, palette/lighting roles, hybrid runtime material ownership and visual-style testing.
49. [`character-costume-rig-bible.md`](./character-costume-rig-bible.md) — reusable hero identity, costume/rig/voice profiles, semantic channels, contact anchors and continuity testing.
50. [`spatial-coordinate-transform-standard.md`](./spatial-coordinate-transform-standard.md) — source/output/2D/world/physics coordinate spaces, units, pivots, anchors, transform ownership and conversion tests.
51. [`render-color-delivery-standard.md`](./render-color-delivery-standard.md) — resolution/fps, color/alpha, codecs, frame extraction, calibration fixtures, output QC and delivery receipts.
52. [`master-production-board.md`](./master-production-board.md) — Chapter 1–3 production-unit model, readiness dimensions, capability reuse, dependencies and blockers.
53. [`test-id-coverage-taxonomy.md`](./test-id-coverage-taxonomy.md) — stable unit/Storybook/visual/motion/semantic/E2E/failure/performance/human test IDs and coverage mapping.
54. [`architecture-review-checklist.md`](./architecture-review-checklist.md) — cross-document readiness review for narrative, runtime ownership, testing, render, promotion, accessibility, performance and migration.
55. [`phase-1-visual-evidence-records.md`](./phase-1-visual-evidence-records.md) — concrete British Museum/Met/Penn source packets, allowed/forbidden inference and Phase 1 evidence-contract pressure test.
56. [`enki-character-bible-v1.md`](./enki-character-bible-v1.md) — production Enki identity/costume/source/rig-prep packet bound to the approved Reel 1 baseline and Shot 3 hashes.
57. [`enlil-character-bible-v1.md`](./enlil-character-bible-v1.md) — Chapter 2 Enlil narrative/performance packet with an explicit `SOURCE_PENDING` visual gate.
58. [`eridu-visual-research-brief.md`](./eridu-visual-research-brief.md) — direct/contextual/analogical/speculative research requirements before Eridu CityKit reconstruction is promoted.
59. [`benchmark-acceptance-packets.md`](./benchmark-acceptance-packets.md) — implementation-facing acceptance sheets for the six core pre-Reel-1 V3 benchmarks.
60. [`phase-2-pr-packet.md`](./phase-2-pr-packet.md) — PR 2A–2E expected files, stable tests, local commands, CI gates, review questions and stop conditions.
61. [`schema-change-review-template.md`](./schema-change-review-template.md) — mandatory persisted-contract/hash/migration review template once Scene V3 implementation begins.
62. [`reel-assembly-release-specification.md`](./reel-assembly-release-specification.md) — exact scene/audio/caption/title assembly, QC, release receipt, promotion and rollback contract.
63. [`chapter-capability-heat-map.md`](./chapter-capability-heat-map.md) — coarse reuse-weight model showing which platform capabilities unlock the most Chapters 1–3 manuscript demand.
64. [`fixtures/README.md`](./fixtures/README.md) — machine-readable planning candidates spanning scenes, evidence, rigging, performance, physics, world, audio, herds, architecture, growth, camera, lighting, montage, ingest, rollback and historical research.
65. [`visual-evidence-application-contract.md`](./visual-evidence-application-contract.md) — separates canonical historical evidence identity from project-specific target/use/confidence/inference/rights applications.
66. [`phase-1b-implementation-packet.md`](./phase-1b-implementation-packet.md) — exact Phase 1B files, slices, stable tests, local commands, CI expectations and stop conditions for visual evidence.
67. [`enki-rig-registration-landmarks.md`](./enki-rig-registration-landmarks.md) — source-pixel/actor-local registration, landmarks, region provenance, anchors and rig-prep negative tests.
68. [`stag-vessel-bible-v1.md`](./stag-vessel-bible-v1.md) — persistent Stag identity, parts, anchors, motion/material/physics ownership and Level 2→3 continuity.
69. [`water-material-system-bible.md`](./water-material-system-bible.md) — runtime-neutral calm/deep/storm/canal/marsh/Absu water profiles, channels, controls, tests and painterly boundaries.
70. [`storybook-benchmark-control-matrix.md`](./storybook-benchmark-control-matrix.md) — shared benchmark proof states/controls, Remotion parity, accessibility and debug/promotion boundaries.
71. [`canonical-hash-fixture-specification.md`](./canonical-hash-fixture-specification.md) — versioned semantic normalization + UTF-8 + SHA-256 contract and Windows/Linux fixture expectations.
72. [`runtime-adapter-evidence-contract.md`](./runtime-adapter-evidence-contract.md) — runtime identity/assets/channels/state fingerprints and the hard separation between runtime evidence, independent QA and human review.
73. [`semantic-seed-versioning-test-vectors.md`](./semantic-seed-versioning-test-vectors.md) — semantic seed tuple encoding, isolation, versioning, RNG admission criteria and normative test-vector plan.
74. [`actor-performance-clip-contract.md`](./actor-performance-clip-contract.md) — reusable frame-addressed semantic performance clips, blending, contacts, proof states and revision impact.
75. [`physics-bake-format-specification.md`](./physics-bake-format-specification.md) — immutable fixed-step simulation bake identity, sampling, playback, evidence and failure rules.
76. [`citykit-topology-region-path-contract.md`](./citykit-topology-region-path-contract.md) — persistent city nodes/edges/regions/paths/water topology independent of runtime representation.
77. [`crowd-archetype-agent-scheduling-contract.md`](./crowd-archetype-agent-scheduling-contract.md) — deterministic archetypes, stable agent IDs, work schedules, density, LOD and anti-clone rules.
78. [`production-source-sheet-specification.md`](./production-source-sheet-specification.md) — reusable actor/prop source-sheet authority, views, registration, reconstruction and derivation policy.
79. [`benchmark-proof-receipt-schema.md`](./benchmark-proof-receipt-schema.md) — machine-readable index of unit/Storybook/render/performance/human evidence behind runtime adoption decisions.
80. [`render-failure-triage-playbook.md`](./render-failure-triage-playbook.md) — evidence-preserving diagnosis order from preflight through runtime, QA, human review and promotion.
81. [`forensic-frame-trace-worked-example.md`](./forensic-frame-trace-worked-example.md) — end-to-end Enki frame 101 trace from narrative/source through runtime state, proof, promotion and release.
82. [`change-impact-dependency-graph.md`](./change-impact-dependency-graph.md) — typed dependency/staleness graph for rigs, clips, materials, cities, scenes, proofs and releases.
83. [`audio-performance-marker-contract.md`](./audio-performance-marker-contract.md) — exact-audio-hash phrase/viseme/emphasis/gesture/listener markers driving deterministic dialogue performance.
84. [`herd-animal-archetype-gait-contract.md`](./herd-animal-archetype-gait-contract.md) — species/archetype/rig/gait/herd separation, deterministic animal identity and mixed-species procession QA.
85. [`architecture-temple-kit-contract.md`](./architecture-temple-kit-contract.md) — evidence-classified reusable architectural modules and building identity independent from Three geometry.
86. [`vegetation-agriculture-growth-state-contract.md`](./vegetation-agriculture-growth-state-contract.md) — causal water/soil/crop/growth world states for Dilmun and Chapter 3 agriculture.
87. [`montage-long-timespan-contract.md`](./montage-long-timespan-contract.md) — explicit montage segments, fictional elapsed time and continuity anchors for compressed history.
88. [`camera-shot-grammar-contract.md`](./camera-shot-grammar-contract.md) — machine-readable camera intent/constraints shared across Level 1/2/3 without camera substituting for primary action.
89. [`lighting-profile-contract.md`](./lighting-profile-contract.md) — deterministic semantic lighting profiles shared across Rive/Pixi/Three/Remotion with painterly/safety limits.
90. [`asset-ingest-checksum-receipt-schema.md`](./asset-ingest-checksum-receipt-schema.md) — canonical asset ingest, exact-byte SHA-256, source lineage, rights and maturity receipts.
91. [`release-rollback-reconstruction-drill.md`](./release-rollback-reconstruction-drill.md) — milestone reconstruction/rollback proof without `latest`, mutable folders or destructive history changes.
92. [`chapter-1-capability-scene-dependency-graph.md`](./chapter-1-capability-scene-dependency-graph.md) — Chapter 1 hard/optional capability dependencies, critical path and failure isolation.
93. [`historical-corroboration-source-audit.md`](./historical-corroboration-source-audit.md) — final Chapters 1–3 Internet/corpus/archaeology audit with direct, adapted, debated, anachronistic and unresolved classifications.
94. [`occult-correspondence-layer-audit.md`](./occult-correspondence-layer-audit.md) — separates genuine Mesopotamian magic from later Qabalah/Wicca while preserving useful modern symbolic resonances.
95. [`city-deity-geography-correction-matrix.md`](./city-deity-geography-correction-matrix.md) — historical city/cult associations separated from deity function, narrative role and modern symbolic correspondence.
96. [`historical-research-source-authority-register.md`](./historical-research-source-authority-register.md) — ETCSL/ORACC/CDLI/museum/science/esoteric source tiers, cross-period rules and citation durability.
97. [`historical-fiction-revision-recommendations.md`](./historical-fiction-revision-recommendations.md) — optional KEEP/RELABEL/CHANGE/DEBATED recommendations protecting the fiction while increasing historical precision.
98. [`historical-research-open-questions.md`](./historical-research-open-questions.md) — scene-specific unresolved research questions and explicit stop conditions preventing endless preproduction.

## Current implementation status

### Phase 0 — architecture/planning/research

**PLANNING LOCK COMPLETE.**

The reset now has software/runtime architecture, Chapters 1–3 production demand, historical/literary provenance, visual evidence, modern-symbolic correspondence separation, character/prop/source continuity, transforms/registration, performance clips, dialogue markers, animals/herds, water/materials, architecture, vegetation/agriculture, persistent city topology, deterministic crowds, fixed-step physics bakes, camera/lighting grammar, Storybook/render parity, canonical hashing, semantic randomness, asset ingest, benchmark receipts, failure triage, dependency impact, release assembly/rollback and forensic traceability.

The final research pass independently checked the manuscript's high-value claims against ETCSL, ORACC, CDLI, museum/archaeological evidence and current science. The result is favorable: many core narrative foundations are directly or strongly corroborated, while the principal corrections cluster around cult geography, cross-tradition genealogy, chronology-sensitive material culture, exact paleogeography and modern esoteric overlays.

Planning remains evidence-responsive, but **no further generic architecture/planning pass is required before Phase 1B implementation**. Research reopens only for a specific production claim, new evidence, benchmark failure or implementation contradiction.

### Phase 1 — historical-source foundation

In progress on `feat/historical-source-registry-v3`.

Completed first slice:

- `libs/historical-sources` created;
- typed ETCSL/non-ETCSL/visual-evidence contracts;
- initial Chapter 1–3 narrative bindings;
- explicit fictional-bridge support;
- unit tests;
- local Nx test/build previously verified green (10/10 tests on 2026-08-25).

Planning selects **canonical evidence identity + project-specific `VisualEvidenceApplication` records**. Rights status remains separate from historical confidence. The final source audit additionally requires historical evidence, adaptation and modern symbolic correspondence to remain separate provenance classes.

`phase-1b-implementation-packet.md` is the next normal code slice. No animation runtime dependency is installed as part of Phase 1.

### Phase 2 — Scene V3 foundation

Not started. Phase 2 now has abstract contracts, worked examples, machine-readable planning candidates, PR 2A–2E packets, schema-change governance, canonical-hash rules, semantic-seed rules, runtime evidence, performance/audio semantics, source-sheet/registration requirements, benchmark receipt expectations and V2 compatibility planning.

Phase 2 remains engine-independent: real Rive/Pixi/Three/Rapier adoption follows the common contract/frame/runtime/scene foundation and Animation Lab.

### Runtime adoption

Not started. Each runtime must pass manuscript-derived benchmark, exact-frame authority, local quality gates, Storybook/render proof, negative fixtures, licensing/security review, performance budget and human visual gate where applicable.

The six platform gates remain Enki Facial, Enki Helm, Stag Spatial, Kutu Storm, Igigi Crew and Eridu City Growth. Supporting performance, bake, topology, crowd, source, historical and evidence contracts are now specified before runtime implementation.

## External authorities and technology references

### Literary / historical authority

- Oxford ETCSL: https://etcsl.orinst.ox.ac.uk/
- ORACC: https://oracc.museum.upenn.edu/
- CDLI: https://cdli.earth/
- British Museum collection: https://www.britishmuseum.org/collection
- Penn Museum: https://www.penn.museum/
- Met Heilbrunn Timeline: https://www.metmuseum.org/toah/

See `historical-research-source-authority-register.md` for source-tier and cross-period rules.

### Initial visual evidence authorities

- British Museum Standard of Ur: https://www.britishmuseum.org/collection/object/W_1928-1010-3
- British Museum Royal Game of Ur: https://www.britishmuseum.org/collection/object/W_1928-1009-378
- Met Early Dynastic banquet cylinder seal 56.157.1: https://www.metmuseum.org/art/collection/search/324572
- Penn Museum al-‘Ubaid/Ninhursag temple publication: https://www.penn.museum/sites/bulletin/2583/

### Planned animation/runtime technologies

- Rive runtimes: https://rive.app/runtimes
- Rive meshes: https://www.rive.app/blog/intro-to-meshes
- PixiJS v8 Mesh: https://pixijs.com/8.x/guides/components/scene-objects/mesh
- PixiJS filters/displacement: https://pixijs.com/8.x/guides/components/filters
- `@remotion/three`: https://www.npmjs.com/package/@remotion/three
- React Three Fiber: https://r3f.docs.pmnd.rs/
- Rapier determinism: https://rapier.rs/docs/user_guides/javascript/determinism/
- Storybook Angular/Vite: https://storybook.js.org/docs/get-started/frameworks/angular-vite
- Storybook Vitest addon: https://storybook.js.org/docs/writing-tests/integrations/vitest-addon/index
- Playwright visual comparisons: https://playwright.dev/docs/test-snapshots
- Playwright traces: https://playwright.dev/docs/trace-viewer-intro
- Theatre.js: https://www.theatrejs.com/docs/latest/getting-started/with-react-three-fiber
- Spine Pixi runtime: https://esotericsoftware.com/spine-pixi

## Architectural non-negotiables

1. **The manuscript owns narrative intent.**
2. **ETCSL or another named ancient source owns myth/literary provenance where applicable.**
3. **Museum/archaeological evidence informs material and visual reconstruction; it does not silently become narrative fact.**
4. **Scene V3 owns production timing.** No child runtime owns the story clock.
5. **Remotion remains render authority.**
6. **Production animation is frame-driven, seeded, and reproducible.**
7. **AI produces candidates and critique, never automatic promotion.**
8. **Physics uses fixed steps and approved/baked results.**
9. **No visual reconstruction is presented as ETCSL fact.**
10. **No engine may grade its own output as the only acceptance mechanism.**
11. **Storybook states and rendered motion proofs are first-class animation tests.**
12. **Human visual review remains mandatory for production promotion.**
13. **Runtime versions and exact rendered assets are evidence-bound.**
14. **Historical-fiction revision is allowed; provenance must be reclassified rather than erased.**
15. **Scene V2 remains a supported historical baseline until explicit migration.**
16. **Applicable unit, Storybook, E2E, lint and build checks run locally before push and are independently repeated in GitHub Actions.**
17. **Negative regression fixtures are mandatory for acceptance gates.**
18. **A phase is not repository-complete until local and CI deterministic gates are green.**
19. **Studio authoring/review surfaces are keyboard-accessible and test reduced-motion behavior.**
20. **Runtime/render diagnostics are structured enough to identify which layer failed.**
21. **Animation dependencies require benchmark, licensing, security and rollback decisions before adoption.**
22. **Scene, source, rig, runtime and proof versions are distinct and staleness is reasoned explicitly.**
23. **Representative failure modes are injected before a subsystem is production-ready.**
24. **Asset class, lifecycle and maturity are explicit; debug/proof/candidate artifacts cannot masquerade as canonical production assets.**
25. **Promotion is transactional and exact-byte bound to QA and human-review evidence.**
26. **Any promoted frame must be traceable from manuscript/source through scene/assets/runtime/proof to promotion without relying on chat history.**
27. **Runtime adoption is spike/benchmark driven.**
28. **Narrative-to-animation planning identifies target level and test obligations before implementation.**
29. **Historical visual reconstruction records evidence class and uncertainty before assets become canonical.**
30. **Canonical hashes/semantics must be portable across supported Windows local / Linux CI boundaries.**
31. **Semantic IDs and content hashes are separate: IDs name meaning; hashes prove exact bytes.**
32. **Ephemeral candidates/proofs/caches may be deleted without destroying canonical traceability.**
33. **A reusable capability must satisfy its full acceptance scorecard, not only a visually successful demo.**
34. **Worked examples must remain representable by contracts as they become code.**
35. **Definition of Ready is explicit before implementation; Definition of Done includes applicable local/GitHub layers.**
36. **Mythic/literary time, fictional frame chronology and archaeological evidence dates are related but distinct.**
37. **Audio/dialogue/captions are frame-bound production data.**
38. **Camera/decorative motion may support but never substitute for readable primary action.**
39. **Rive/Pixi/Three/Remotion must share one painterly visual direction; runtime defaults are not art direction.**
40. **Character identity/costume/rig revisions are explicit continuity data rather than regenerated shot-local appearance.**
41. **Every transform has one declared coordinate space and owner.**
42. **Technical rendering preserves visual intent through pinned frame/color/alpha/output contracts.**
43. **Production priority is driven by narrative value/reusable demand, not the latest failing shot.**
44. **Test coverage is multi-layer evidence with stable IDs.**
45. **Visual-evidence identity is separate from each project-specific inference/use.**
46. **Schema changes are production migrations once persisted scenes/receipts depend on them.**
47. **Reel release binds exact scene/audio/caption/title revisions; `latest` is never a release input.**
48. **A source-pending hero identity cannot be silently completed by runtime implementation.**
49. **Historical confidence and image-byte rights are separate dimensions.**
50. **Rig registration coordinates are measured from approved sources and versioned.**
51. **Persistent prop identity is separate from runtime representation and physics approximation.**
52. **Water/material behavior is authored as semantic profiles; shader uniforms are implementation details.**
53. **Storybook and Remotion consume shared fixture/frame semantics.**
54. **Canonical semantic content is normalized under an explicit version and hashed with SHA-256.**
55. **Runtime adapters report evidence but never self-certify final visual correctness or promotion.**
56. **Deterministic variation is isolated by versioned semantic seed identity.**
57. **Performance clips own semantic frame-addressed action; runtime bone/input names remain adapter details.**
58. **Approved physics is replayed from immutable hash-bound bakes; production render does not silently re-simulate.**
59. **City topology is persistent semantic world data and survives representation changes.**
60. **Crowd agent identity/scheduling is deterministic and independent from render order, LOD and unrelated additions.**
61. **Reusable source sheets distinguish approved identity from reconstructed/unseen views and never fabricate source measurements.**
62. **Benchmark adoption decisions are indexes of current independent evidence, not aggregate green percentages.**
63. **Render diagnosis freezes exact inputs before changing candidates, thresholds or runtimes.**
64. **Released frames remain reverse-traceable through scene, clip/material/world/runtime evidence, proof, approval and manuscript/source identity.**
65. **Dependency impact is typed/selective; a local revision must not globally stale unrelated evidence or silently repoint releases.**
66. **Historical evidence, deliberate adaptation, mythic synthesis and modern symbolic correspondence are separate provenance classes.**
67. **A web search result is discovery evidence only; canonical research binds the underlying corpus, museum, publication or institutional source.**
68. **Later-period evidence is labeled as later analogue rather than silently projected unchanged into an earlier production period.**
69. **Mesopotamian deity genealogies and functions may vary by period/text; the project genealogy is explicit rather than presented as one universal ancient family tree.**
70. **Modern Qabalah/Wicca/Hermetic correspondences may enrich the fiction but never become ancient historical evidence merely because they resonate.**
71. **Research has stop conditions: unresolved scene-specific questions do not justify endless generic preproduction.**
72. **Historical material-culture claims are chronology-sensitive; production period bands are required when technology, geography or trade detail matters.**

## Local-first quality rule

For implementation work:

```text
edit
  ↓
focused local unit/contract tests
  ↓
affected lint + build
  ↓
affected Storybook tests/build
  ↓
affected E2E
  ↓
local rendered proof when visual behavior changed
  ↓
human review when production visual behavior changed
  ↓
phase local gate
  ↓
push coherent batch
  ↓
GitHub Actions independently repeats deterministic gates
```

GPU-heavy rendered animation proofs and human review remain local/milestone evidence unless a dedicated workflow explicitly opts in.

## Planning stop / transition to implementation

The generic V3 planning loop is closed after the final historical corroboration audit.

Next normal work:

```text
Phase 1B historical visual-evidence implementation
  ↓
local focused tests/build
  ↓
expanded local quality gate
  ↓
push
  ↓
CI verification
  ↓
Phase 1 provenance Studio/Storybook/E2E
  ↓
Phase 2 Scene V3 foundation
```

Future planning/research reopens only when:

- implementation exposes a contract contradiction;
- a runtime benchmark disproves an assumption;
- a production unit requires a currently unresolved historical detail;
- a stronger source materially changes the research classification;
- human review rejects a planned visual/motion approach.

## Reset rule

Do not resume broad Reel 1 Level 2/V3 production until the foundation benchmarks in `benchmark-specifications.md`, `benchmark-acceptance-packets.md`, `implementation-backlog.md`, `capability-acceptance-scorecards.md`, `architecture-review-checklist.md`, and `phase-exit-checklists.md` are green. Existing Reel 1 Scene V2 work remains valid evidence and can later migrate through a Scene V2 → Scene V3 compatibility adapter.
