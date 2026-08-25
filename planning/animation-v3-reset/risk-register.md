# Animation V3 Risk Register

Status: **planning contract**

This register identifies risks introduced by the Level 2/3 reset and defines the evidence that should trigger mitigation. It should be reviewed at each phase exit and whenever a new runtime dependency is proposed.

Scale:

- Probability: Low / Medium / High
- Impact: Low / Medium / High / Critical

## R-001 — Hero rig cannot preserve source identity

Probability: Medium
Impact: Critical

Risk:

Rive or another rig may deform the original painted character enough that the actor no longer reads as the approved source.

Mitigation:

- source-overlay Storybook stories;
- fixed proof frames;
- identity-region metrics;
- human A/B against editorial source;
- constrain deformation before adding more channels.

Trigger:

- repeated human rejection despite technically correct rig behavior.

Fallback:

- hybrid local rig / source-state approach for that actor;
- evaluate alternative runtime only after diagnosis.

## R-002 — Animation runtimes fight over transform ownership

Probability: High
Impact: High

Risk:

Rive, Pixi and Three may each apply scale/rotation/camera assumptions, producing double transforms or inconsistent placement.

Mitigation:

- Scene V3 transform ownership contract;
- adapter boundary tests;
- single resolved transform tree;
- Storybook transform-debug overlays.

Trigger:

- same asset appears differently between Storybook and Remotion.

## R-003 — Library ticker/wall-clock leaks into production

Probability: Medium
Impact: High

Mitigation:

- adapter API requires explicit frame;
- lint/static tests for unmanaged RAF/ticker use;
- repeated-frame deterministic tests;
- render same frame twice and compare state hash.

## R-004 — Browser/WebGL output differs across environments

Probability: High
Impact: Medium-High

Mitigation:

- pinned Chromium for goldens;
- Firefox/WebKit functional checks;
- visual tolerances;
- record GPU/browser/runtime metadata in receipts.

## R-005 — GitHub Actions quota becomes development bottleneck

Probability: High
Impact: Medium

Mitigation:

- local-first gates;
- coherent pushes;
- single dependency setup per CI job where practical;
- no per-push GPU renders;
- cancel superseded runs;
- milestone workflows manual.

Trigger:

- CI jobs rejected before startup or monthly usage nearing limit.

## R-006 — CI and local commands drift

Probability: Medium
Impact: High

Mitigation:

- shared pnpm scripts;
- CI invokes same commands as local;
- parity tests/documentation;
- no hidden shell-only CI logic for quality semantics.

## R-007 — Animation test suite becomes too slow for iteration

Probability: High
Impact: High

Mitigation:

- explicit L0/L1/L2/L4 tiers;
- compact fixtures;
- Nx caching;
- short motion proofs;
- defer full reels to milestone gates.

Trigger:

- focused edit loop regularly exceeds ~30–60 seconds.

## R-008 — Visual tests become flaky

Probability: High
Impact: High

Mitigation:

- pinned environment;
- fonts bundled/ready;
- no network dependencies;
- exact frame/seed;
- disable wall-clock animation;
- one golden browser.

## R-009 — AI semantic critic produces false confidence

Probability: High
Impact: High

Reference failure:

Shot 3 semantic checks accepted changed eye pixels before the final render clearly showed cyan patches rather than a blink.

Mitigation:

- AI never sole gate;
- deterministic negative fixtures;
- final rendered semantic proof;
- human review.

## R-010 — Gate validates source candidate but renderer consumes different bytes

Probability: Medium
Impact: Critical

Mitigation:

- candidate → staged → resolved → rendered checksum binding;
- render receipts;
- fail on path/hash mismatch.

## R-011 — Package licensing surprises after adoption

Probability: Medium
Impact: High

Applicable especially to Rive editor/export plans, Spine and Live2D.

Mitigation:

- package adoption matrix;
- license decision before production lock-in;
- isolate adapter;
- keep portable Scene V3 contract.

## R-012 — Package upgrade changes visual output

Probability: High
Impact: High

Mitigation:

- runtime versions evidence-bound;
- exact versions where needed;
- benchmark replay before upgrade promotion;
- maintain old runtime branch/lockfile until acceptance.

## R-013 — `@remotion/*` version mismatch

Probability: Medium
Impact: High

Mitigation:

- exact matching Remotion versions;
- workspace consistency rule;
- package-change test.

## R-014 — Rive is insufficient for animal/herd workload

Probability: Medium
Impact: Medium

Mitigation:

- benchmark animals before generalizing hero rig assumptions;
- keep Spine evaluation isolated;
- use instancing/LOD independent of rig runtime.

## R-015 — Spine adoption adds unnecessary complexity

Probability: Medium
Impact: Medium

Mitigation:

- only adopt if marriage-herd benchmark demonstrates measurable benefit;
- keep optional adapter.

## R-016 — Three/R3F makes painted style look like a game

Probability: Medium
Impact: Critical creative

Mitigation:

- 2.5D painted depth cards first;
- limited camera parallax;
- source-faithful materials;
- human A/B against Level 2;
- architecture/geometry only where earned.

## R-017 — Spatial camera reveals invented/unapproved geometry

Probability: High
Impact: High

Mitigation:

- explicit approved spatial geometry/depth requirement;
- camera travel bounds;
- Level 2 vs Level 3 boundary policy;
- no unrestricted orbit around flat paintings.

## R-018 — Rapier physics becomes art-direction obstacle

Probability: Medium
Impact: Medium

Mitigation:

- use physics only for secondary motion where beneficial;
- authored motion remains acceptable;
- bake and edit/scale physical output if contract allows;
- avoid simulating everything.

## R-019 — Physics loses determinism

Probability: Medium
Impact: High

Mitigation:

- fixed timestep;
- pinned version;
- stable body construction order;
- initial-state hash;
- bake checksum repeat test.

## R-020 — Crowd looks like clones

Probability: High
Impact: High

Mitigation:

- semantic-channel seeds;
- clip pools;
- phase/scale/path/tool variation;
- synchronization metric;
- negative Storybook fixture.

## R-021 — Crowd system becomes autonomous simulation project

Probability: Medium
Impact: High scope

Mitigation:

- deterministic scheduling, not AI agents;
- bounded behaviors tied to manuscript work tasks;
- no general-purpose NPC system.

## R-022 — CityKit becomes a game engine

Probability: Medium
Impact: Critical scope

Mitigation:

- CityKit represents cinematic world states, not interactive economy simulation;
- only model attributes that drive narrative/visual output;
- use authored development states.

## R-023 — Procedural city loses historical specificity

Probability: Medium
Impact: High

Mitigation:

- city profiles bound to source/evidence;
- visual motifs explicit;
- procedural placement constrained by authored palettes;
- no generic “ancient city” generator as canonical source.

## R-024 — Historical fiction gets accidentally presented as fact

Probability: Medium
Impact: Critical editorial

Mitigation:

- adaptation classification mandatory;
- ETCSL vs non-ETCSL distinction;
- fictional bridge support;
- Studio provenance panel;
- public-facing source language later derived from bindings.

## R-025 — ETCSL composition is overclaimed as literal historical event

Probability: Medium
Impact: High

Mitigation:

- corpus classified as literary/mythic source;
- separate archaeology evidence;
- confidence/adaptation metadata.

## R-026 — Archaeological object from wrong period silently drives reconstruction

Probability: Medium
Impact: High

Mitigation:

- visual evidence records include date/site/culture;
- warnings for analogical/out-of-period use;
- intentional anachronism classification.

## R-027 — Source URLs rot

Probability: Medium over long term
Impact: Medium

Mitigation:

- stable institution/object IDs;
- human-readable citation metadata stored locally;
- do not rely solely on URL text;
- optionally archive citation snapshots where license permits later.

## R-028 — Narrative revision invalidates old animation silently

Probability: High
Impact: High

Mitigation:

- narrative revision binding in Scene V3;
- stale-scene detection;
- source relationship reclassification;
- render receipt includes manuscript revision.

## R-029 — Storybook diverges from production runtime

Probability: Medium
Impact: Critical testing

Mitigation:

- shared fixtures;
- shared adapter code;
- Storybook only supplies FrameContext and presentation shell;
- rendered proof binds same state IDs.

## R-030 — Storybook tests become “UI only” and miss motion semantics

Probability: Medium
Impact: High

Mitigation:

- five-state animation contract;
- semantic proof-state IDs;
- motion proof required separately for temporal behavior.

## R-031 — E2E tries to validate animation math and becomes brittle

Probability: Medium
Impact: Medium

Mitigation:

- E2E tests workflow/persistence/orchestration;
- unit/render tests own math and pixels.

## R-032 — Too many packages increase integration burden

Probability: High
Impact: High

Mitigation:

- runtime registry;
- strict ownership;
- benchmark-driven adoption;
- optional adapters;
- reject packages that overlap without measurable benefit.

## R-033 — Binary animation assets become unreviewable in Git

Probability: High
Impact: Medium

Mitigation:

- small canonical binaries only;
- text manifests/receipts;
- checksums/provenance;
- candidate/intermediate artifacts remain under `tmp`;
- consider Git LFS only if real need appears.

## R-034 — Large 3D assets exceed VRAM/render budgets

Probability: Medium
Impact: High

Mitigation:

- LOD;
- texture budgets;
- depth-card-first policy;
- per-scene memory telemetry;
- proof on target workstation.

## R-035 — React 19 / Angular Studio / React Animation Lab integration becomes confusing

Probability: Medium
Impact: Medium

Mitigation:

- separate apps;
- shared TypeScript contracts through libraries;
- no attempt to embed Angular Storybook as the runtime host for React animation internals;
- E2E crosses application boundaries only through stable APIs/data.

## R-036 — Storybook Angular framework migration destabilizes Studio

Probability: Medium
Impact: Medium

Mitigation:

- migration is its own phase/spike;
- current Storybook remains until new build/tests are green;
- no animation runtime work coupled to that migration unnecessarily.

## R-037 — Local model availability blocks deterministic tests

Probability: High
Impact: Medium

Mitigation:

- Qwen/Comfy responses fixture-backed for normal unit/E2E;
- live-model integration separate;
- semantic model unavailable => test status explicit, not false pass.

## R-038 — Generated I2V motion cannot reproduce exactly

Probability: High
Impact: Medium-High

Mitigation:

- generated output is treated as baked binary candidate;
- source/model/workflow/prompt/seed recorded;
- canonical production uses approved baked output bytes;
- regeneration not required for every render.

## R-039 — Animation proof receipts become stale after code changes

Probability: High
Impact: High

Mitigation:

- bind commit/runtime/source hashes;
- stale receipt detection;
- promotion rejects stale evidence.

## R-040 — Planning drifts away from implementation

Probability: High
Impact: High

Mitigation:

- ADRs versioned in repo;
- phase exit checks documentation;
- PR checklist asks whether architecture changed;
- implementation divergence requires ADR update/supersession.

## Review cadence

Review the register:

- before adopting each new runtime;
- at each phase exit;
- after any production-quality failure that escapes existing tests;
- before broad Reel 1 migration;
- before Chapters 2 and 3 production expansion.

New escaped failures should normally become both:

1. a regression fixture; and
2. a risk/mitigation update if the failure class is broader than one bug.
