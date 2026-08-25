# Animation V3 Reset — Planning Index

Status: **architecture reset in planning/foundation phase**.

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

The literary/mythological source layer is anchored to the Oxford **Electronic Text Corpus of Sumerian Literature (ETCSL)** where applicable. The manuscripts remain historical fiction: connective narrative, characterization, chronology, staging, dialogue, and visual interpretation may evolve, but changes must not erase the source relationship that inspired them.

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
12. [`architecture-decision-records.md`](./architecture-decision-records.md) — 30 ADRs locking time authority, runtime ownership, provenance, testing and promotion rules.
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

## Current implementation status

### Phase 0 — architecture/planning

**Exceptionally detailed and substantially complete.** The reset now includes software contracts, worked data examples, production workflow, historical-source and visual-period policy, testing/CI, Storybook/E2E, accessibility, observability, storage/versioning, review/promotion, audio/dialogue, cinematography and visual art-direction rules.

Planning can still evolve when implementation produces evidence, but the first implementation phases should not need chat history to rediscover architecture, testing policy or production language.

### Phase 1 — historical-source foundation

In progress on `feat/historical-source-registry-v3`.

Completed first slice:

- `libs/historical-sources` created;
- typed ETCSL/non-ETCSL/visual-evidence contracts;
- initial Chapter 1–3 narrative bindings;
- explicit fictional-bridge support;
- unit tests;
- local Nx test/build verified green (10/10 tests on 2026-08-25).

Next planned Phase 1 slices are specified in `phase-1-provenance-studio-ux.md`, `historical-visual-research-workflow.md`, and `historical-period-visual-policy.md`:

- authoritative museum/archaeological visual-evidence records;
- source validation/reporting;
- read-only Studio provenance components;
- Storybook coverage for adaptation/evidence/staleness/period states;
- provenance accessibility checks;
- provenance Playwright E2E.

No animation runtime dependency is installed as part of Phase 1.

### Phase 2 — Scene V3 foundation

Not started. The implementation blueprint, worked Scene V3 example, resolved-scene/receipt examples, benchmark fixture contract, naming rules and local environment plan now exercise the proposed foundation from authoring through deterministic resolution and evidence.

Phase 2 remains engine-independent: Rive/Pixi/Three/Rapier do not enter until the common contract/frame/runtime/scene foundation and Animation Lab exist.

### Runtime adoption

Not started. Each runtime has a bounded spike playbook and common capability acceptance scorecard. No package earns production status from a feature list; it must pass its manuscript-derived benchmark, local quality gates, Storybook/render proof, negative fixtures, licensing/security review, performance budget and human visual gate where applicable.

## External authorities and technology references

### Literary / historical source authority

- Oxford ETCSL catalogue: https://etcsl.orinst.ox.ac.uk/edition2/etcslfullcat.php
- ETCSL narrative/mythological catalogue: https://etcsl.orinst.ox.ac.uk/cgi-bin/etcsl.cgi?text=c.1%2A

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
13. **Runtime versions and the exact rendered assets are evidence-bound.**
14. **Historical-fiction revision is allowed; provenance must be reclassified rather than erased.**
15. **Scene V2 remains a supported historical baseline until explicit migration.**
16. **Applicable unit, Storybook, E2E, lint and build checks run locally before push and are independently repeated in GitHub Actions.**
17. **Negative regression fixtures are mandatory for acceptance gates.**
18. **A phase is not repository-complete until local and CI deterministic gates are green.**
19. **Studio authoring and review surfaces are keyboard-accessible and test reduced-motion behavior.**
20. **Runtime/render diagnostics are structured enough to identify which layer failed.**
21. **Animation dependencies require benchmark, licensing, security and rollback decisions before adoption.**
22. **Scene, source, rig, runtime and proof versions are distinct and staleness is reasoned explicitly.**
23. **Representative failure modes are injected in tests before a subsystem is production-ready.**
24. **Asset class, lifecycle and maturity are explicit; debug/proof/candidate artifacts cannot masquerade as canonical production assets.**
25. **Promotion is transactional and exact-byte bound to QA and human-review evidence.**
26. **Any promoted frame must be traceable from manuscript/source through scene/assets/runtime/proof to promotion without relying on chat history.**
27. **Runtime adoption is spike/benchmark driven; no dependency is foundational until exact-frame, testing, licensing, performance and rollback requirements are satisfied.**
28. **Narrative-to-animation planning identifies target level and test obligations before implementation.**
29. **Historical visual reconstruction records evidence class and uncertainty before assets become canonical.**
30. **Canonical hashes and semantics must be portable across the supported Windows local / Linux CI boundary.**
31. **Semantic IDs and content hashes are separate: IDs name meaning; hashes prove exact bytes.**
32. **Ephemeral candidates/proofs/caches may be deleted without destroying canonical traceability.**
33. **A reusable capability must satisfy its full acceptance scorecard, not only a visually successful demo.**
34. **Worked examples must remain representable by the contracts as they become code; otherwise planning reopens before implementation is forced around a bad abstraction.**
35. **Definition of Ready is explicit before implementation; Definition of Done includes all applicable local and GitHub quality layers.**
36. **Mythic/literary time, frame-story chronology and archaeological evidence dates are related but distinct.**
37. **Audio/dialogue/captions are frame-bound production data, not an afterthought layered after visual animation.**
38. **Camera and decorative motion may support but never substitute for readable primary action.**
39. **Rive/Pixi/Three/Remotion must share one painterly visual direction; runtime defaults are not art direction.**

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

## Reset rule

Do not resume broad Reel 1 Level 2 production until the foundation benchmarks in `benchmark-specifications.md`, `implementation-backlog.md`, `capability-acceptance-scorecards.md`, and `phase-exit-checklists.md` are green. Existing Reel 1 Scene V2 work remains valid evidence and can later migrate through a Scene V2 → Scene V3 compatibility adapter.
