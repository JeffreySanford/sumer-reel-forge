# Animation V3 Current Implementation Status and Roadmap

Status: **living implementation record**

Updated: **2026-08-26**

This document records what the Animation V3 reset has actually implemented, what remains experimental, what is still production-authoritative in the existing Reel 1 pipeline, and the recommended execution order from the current foundation to a reusable production animation platform.

It is intentionally more concrete than the original planning documents. The original V3 reset began as an architectural plan. Enough of that architecture now exists in code that the repository needs a reliable distinction between:

- **implemented and locally verified**;
- **implemented but still foundation/preview-only**;
- **planned but not yet implemented**;
- **existing Scene V2/Angular/Remotion production behavior that remains authoritative**;
- **future Studio orchestration that should replace manual command-line workflows without weakening safety or provenance**.

---

## 1. Executive status

The V3 reset has moved beyond architecture-only planning.

The repository now has a real deterministic Scene V3 foundation, a compatibility path from the existing Scene V2 Shot 3 work, an engine-independent exact-frame inspection model, a React Animation Lab, a deterministic fake runtime preview, and the first real visual-engine surface through an isolated PixiJS adapter.

The current major state is:

```text
Phase 0  Planning lock                         COMPLETE
Phase 1  Historical-source foundation          PARTIAL / FOUNDATION WORKING
Phase 2  Scene V3 contracts/compiler/runtime   CORE COMPLETE
Phase 3  Animation Lab foundation               CORE COMPLETE
Phase 4  Pixi material runtime                  FOUNDATION STARTED
Phase 5  Rive performance runtime               NOT STARTED
Phase 6  Three/R3F spatial runtime              NOT STARTED
Phase 7  Combined Reel 1 V3 proof               NOT STARTED
Phase 8+ Physics/crowds/herds/cities/etc.       NOT STARTED
```

The critical architectural milestone already proven is:

```text
Scene V3 semantic state
        ↓
resolved deterministic runtime state
        ↓
exact FrameContext
        ↓
RuntimePreviewModel
        ↓
engine-neutral PixiRenderFrame
        ↓
libs/animation-pixi
        ↓
PixiJS 8.20.0
        ↓
real browser WebGL canvas
```

Pixi does **not** own story time. React does **not** own story time. Remotion remains the eventual production render/frame authority. Scene V3 remains the semantic source of truth.

---

## 2. Product/UI architecture is intentionally dual-surface

The repository now has two UI applications with different responsibilities. They are complementary; one is not replacing the other.

### 2.1 Angular Studio — `apps/web`

Angular remains the main Sumer Reel Forge product/workflow application.

Its role is to become the durable orchestration and review surface for:

- projects, chapters, reels, scenes and shots;
- manuscript/narrative context;
- source/provenance review;
- assets and candidate generation;
- render job submission;
- review and approval;
- promotion and rollback;
- production status;
- eventually typed animation authoring controls;
- eventually typed execution of approved workflows through API methods.

Angular is the application a user should normally consider **Sumer Reel Forge Studio**.

It should not become a low-level Pixi/Rive/Three object editor.

### 2.2 React Animation Lab — `apps/animation-lab`

The React Animation Lab is the animation-runtime engineering and inspection workbench.

Its role is:

- exact-frame Scene V3 inspection;
- runtime diagnostics;
- engine-adapter experiments;
- Storybook proof states;
- visual/runtime debugging;
- local-vs-composed transform inspection;
- evidence-binding diagnostics;
- capability inspection;
- deterministic runtime benchmark work;
- Pixi/Rive/Three/Rapier specialist integration proofs.

It is deliberately allowed to be more technical than the Angular Studio.

### 2.3 Shared foundation

Both applications should converge on shared contracts rather than duplicate animation semantics:

```text
Angular Studio                         React Animation Lab
      │                                        │
      ├────────── API / shared state ──────────┤
      │                                        │
      └──────── Scene V3 / receipts ───────────┘
                         │
                 animation-contracts
                 animation-frame
                 animation-runtime
                 animation-compiler
                 animation-inspection
                         │
              runtime-specific adapters
                         │
            Remotion / render infrastructure
```

The Animation Lab may lead implementation of runtime features, but production controls should eventually surface in Angular through engine-neutral methods and view models.

---

## 3. Local workstation topology

The preferred day-to-day workflow is now a persistent local workstation process plus one or more secondary terminals for implementation/test commands.

### 3.1 `pnpm start:all`

`pnpm start:all` remains the primary long-running local entrypoint.

Its current responsibilities include the existing local workstation orchestration plus the Animation Lab:

```text
Postgres                 managed Docker infrastructure
API                      http://localhost:3000/api
API docs                 http://localhost:3000/api/docs
Angular Studio           http://localhost:4200
Animation Lab            http://localhost:4300
Renderer worker          managed by outer local startup
ComfyUI                  optional/local managed service
Ollama planning          optional/configured planning provider
hardware profile         startup profiling/recommendations
Prisma                    generated/prepared as required
```

The 4300 Animation Lab integration is implemented in the current feature branch and must receive a local `pnpm start:all` smoke test before merge.

### 3.2 Why Animation Lab belongs in `start:all`

The Lab began as specialist scaffolding, but it is now used frequently enough that treating it as a normal workstation service is justified.

Benefits:

- one command establishes the complete interactive development environment;
- Angular remains on its established 4200 port;
- Animation Lab gets a stable 4300 port;
- developers can keep `start:all` running in terminal A;
- terminal B can run tests, scripts, render commands and Git operations;
- Studio and Lab can later deep-link to each other without unpredictable ports;
- Playwright can reuse an already-running Lab when appropriate.

### 3.3 Port contract

Current local port intent:

```text
3000  API
4200  Angular Studio
4300  Animation Lab
5432  Postgres default
8188  ComfyUI default when locally managed
11434 Ollama default
```

Storybook and test-only servers should remain independently configurable.

### 3.4 E2E behavior while `start:all` is running

Animation Lab Playwright currently permits `reuseExistingServer: true`.

Therefore, with `start:all` already running on port 4300, E2E can target that live development server instead of spawning a second preview server.

This is desirable for the normal workstation workflow.

When a future gate specifically needs to prove the production preview bundle rather than the dev server, that test should use an explicit alternate port/`BASE_URL` or disable server reuse rather than taking 4300 away from the workstation.

---

## 4. Phase 1 — historical-source/provenance foundation

### Implemented

The repository has:

- `libs/historical-sources`;
- typed literary/historical source records;
- ETCSL-oriented source identity;
- adaptation classifications;
- visual-evidence contracts;
- stable source IDs;
- source hashing/receipt use in the V3 compiler path;
- golden-scene source binding;
- at least one real visual-evidence record used by the golden fixture (Standard of Ur context);
- Animation Lab display of historical source counts, visual evidence counts and evidence-binding state.

The golden resolved Scene V3 currently binds literary sources and visual evidence into immutable compiled identity.

### Still required

Phase 1 is not considered fully finished because source breadth and Studio UX remain incomplete.

Still needed:

- expand the real museum/archaeological evidence registry;
- add Met/Penn/site records as production needs demand;
- strengthen direct/contextual/analogical classification coverage;
- source-validation CLI/reporting;
- period mismatch warnings;
- missing license/date metadata warnings;
- Angular Studio provenance cards and filters;
- Storybook/Playwright coverage for the Angular provenance workflow;
- production research packet completion for scenes beyond the current golden benchmark.

The source architecture is working. The research corpus and production UX are not yet complete.

---

## 5. Phase 2 — Scene V3 contracts, compiler and deterministic runtime

Phase 2 core foundation is implemented.

### 5.1 `animation-contracts`

Implemented contracts include the real `SceneV3` model and its major semantic collections:

- story/source identity;
- historical sources;
- visual evidence;
- assets;
- frame/fps/resolution/seed;
- cameras;
- actors;
- props;
- environments;
- performances;
- materials;
- effects;
- simulations;
- crowds;
- herds;
- world states;
- montage;
- QA.

These are contracts, not claims that all later runtime implementations already exist.

### 5.2 `animation-frame`

The deterministic frame foundation is implemented sufficiently for V3 compiler/runtime tests and exact-frame preview.

Current key invariant:

```text
integer frame → deterministic context/state
```

No child runtime is allowed to reinterpret story time using its own wall clock.

### 5.3 `animation-runtime`

Implemented:

- runtime adapter contract;
- runtime registry;
- deterministic fake runtime adapter;
- prepare/evaluate behavior;
- unsupported-runtime handling;
- failure behavior;
- deterministic repeated evaluation assertions;
- runtime capabilities.

### 5.4 `animation-compiler`

Implemented:

- Scene V3 validation/compilation path;
- source resolution;
- evidence resolution;
- asset binding;
- runtime resolution;
- semantic seed resolution;
- canonical serialization;
- stable resolved identity/hash;
- compiler tests;
- canonical hash hardening.

### 5.5 Resolved Scene V3 golden fixture

The Enki-at-the-Helm golden fixture provides a pinned integration reference including:

- Scene V3 identity;
- source scene hash;
- resolved scene hash;
- 30 fps;
- 210 frames;
- 1080×1920 viewport;
- scene seed `31003`;
- camera/environment/prop/actor runtime bindings;
- Enki parent relationship to `prop:stag-of-absu`;
- semantic seeds;
- QA contracts;
- named proof frames `START`, `BLINK_CLOSED`, `END_SETTLED`.

### 5.6 V2 → V3 compatibility

A real compatibility adapter exists for the current Shot 3 Scene V2 benchmark.

This is important because V3 is not allowed to throw away production work merely to obtain a clean new schema.

The compatibility path preserves:

- timing;
- source binding;
- camera semantics;
- immutable asset expectations;
- story mutation restrictions.

### 5.7 Current integration proof

The latest verified V3 integration suite is green with 10/10 integration tests.

---

## 6. Animation inspection foundation

`libs/animation-inspection` now forms the engine-neutral bridge between resolved Scene V3 and UI inspection.

Implemented:

- exact-frame view model;
- frame stepping/jumps/home/end;
- scene header;
- proof-state activation;
- logical hierarchy;
- historical source projection;
- visual evidence projection;
- QA gate projection;
- runtime diagnostics;
- asset diagnostics;
- semantic-seed diagnostics;
- source/resolved hash diagnostics.

Boundary policy deliberately forbids UI frameworks, animation engines, browser clocks and global randomness from this foundation.

This means Angular and React can eventually consume the same inspection semantics without moving authority into either UI framework.

---

## 7. Phase 3 — Animation Lab foundation

Phase 3 core is now implemented.

### 7.1 React/Vite application

Implemented:

- `apps/animation-lab`;
- React/Vite runtime;
- Vitest;
- Storybook;
- Playwright E2E project;
- engine-neutral inspection consumption;
- production build;
- stable local dev port 4300 in the current branch.

### 7.2 Exact-frame controls

Implemented:

- exact integer frame state;
- previous/next frame;
- home/end;
- keyboard stepping;
- named proof-state buttons;
- visible frame/time/progress state;
- no autonomous playback authority.

Future authoring controls such as editable seed/fps are not yet promoted into the Lab; current fixture data remains authoritative.

### 7.3 Deterministic fake runtime preview

Implemented:

- fake runtime evaluation at exact frame;
- environment/prop/actor preview nodes;
- parent transform composition;
- local vs composed transform diagnostics;
- recursive parent chain;
- missing-parent failure;
- cycle failure policy;
- runtime capability display;
- explicit error state;
- explicit empty state;
- unsupported-runtime failure;
- deterministic same-frame equality.

### 7.4 Evidence/viewport diagnostics

Implemented:

- resolved viewport width/height;
- aspect ratio derived from the Scene V3 frame contract;
- golden 1080×1920 / 9:16 display;
- source/resolved evidence binding;
- `BOUND` vs `STALE` state;
- evidence counts;
- resolved hash visibility.

### 7.5 Storybook

Current Lab stories cover important proof states and failure modes, including:

- frame 0 START;
- frame 101 BLINK_CLOSED;
- end frame;
- runtime error;
- empty runtime preview;
- stale evidence;
- diagnostic fallback renderer;
- Pixi-backed default runtime view.

### 7.6 Browser verification

The current Pixi branch has verified the Lab across:

- Chromium;
- Firefox;
- WebKit.

Playwright checks the real Pixi canvas as well as exact-frame/diagnostic state.

---

## 8. Phase 4 — Pixi runtime status

Phase 4 has started, but only the **engine foundation**, not the intended material system, is complete.

### 8.1 Dependency/adoption work complete

Implemented and locally verified:

- exact `pixi.js` version `8.20.0`;
- root lockfile pin;
- MIT runtime license review;
- dedicated `libs/animation-pixi` boundary;
- boundary test preventing direct Pixi imports from sibling app/libraries;
- `pnpm audit --prod --audit-level high` with no known vulnerabilities at verification time;
- production bundle measurement;
- Storybook build;
- three-browser E2E;
- adapter/unit tests.

Measured production Lab Pixi-related library chunk at the current foundation proof:

```text
~467.72 kB minified
~132.82 kB gzip
```

This is acceptable for an internal specialist Lab but remains a reason to keep Pixi isolated from unrelated product bundles.

### 8.2 Exact-frame Pixi surface complete

Implemented:

- framework-neutral `PixiPreviewSurface` contract;
- asynchronous Pixi v8 application initialization;
- WebGL preference for current benchmark;
- `autoStart: false`;
- `sharedTicker: false`;
- ticker explicitly stopped;
- explicit one-pass render calls;
- no adapter `requestAnimationFrame` loop;
- exact frame metadata on the canvas;
- deterministic projection from `RuntimePreviewModel`;
- surface lifecycle/destroy behavior;
- viewport mismatch rejection;
- node-count consistency check.

### 8.3 What Pixi is currently drawing

The current Pixi proof intentionally draws diagnostic geometry:

- camera frame;
- environment shape;
- vessel/prop shape;
- actor shape/proof pulse.

This proves engine ownership and exact-frame behavior.

It is **not yet the production visual treatment**.

### 8.4 Next Pixi work

Still required:

- load a real source-backed Shot 3 asset into the Pixi proof;
- immutable asset-hash binding at visual load time;
- texture/sprite registration;
- source-space → output-space registration proof;
- water material proof;
- bounded displacement/deformation;
- vessel/rigging proof;
- rope/mesh approach only where justified by benchmark;
- material driver channels;
- painterly preservation boundaries;
- fixed-frame screenshot evidence;
- short motion proof using the same exact-frame model;
- QA metrics for containment/deformation;
- human comparison before any production claim.

The next Pixi milestone should therefore be a **source-backed visual/material benchmark**, not another diagnostic-geometry refinement.

---

## 9. Production Reel 1 authority has not moved to V3 yet

This distinction is critical.

The existing production Reel 1 pipeline still relies on the current approved/canonical Scene V2 and Remotion infrastructure.

V3 currently provides:

- contracts;
- compiler;
- compatibility;
- fixtures;
- inspection;
- preview/runtime proofs.

V3 does **not** yet automatically replace canonical Reel 1 rendering.

Do not describe the Pixi Lab as final rendering or production animation output.

The migration plan remains proof-first and reversible.

---

## 10. Human acceptance remains independent

Automated tests, runtime evidence and browser success do not manufacture human approval.

The existing renderer suite correctly preserves the distinction:

- deterministic/structural tests can pass;
- human acceptance can remain absent;
- milestone tests may intentionally skip when human evidence does not exist;
- promotion must not infer approval from a green build.

This rule applies equally to future V3/Pixi/Rive/Three work.

---

## 11. Current verified quality evidence

As of the latest Pixi foundation verification:

```text
animation-pixi unit/boundary tests      4/4 pass
animation-lab tests                    20/20 pass
animation-lab browser E2E               3/3 pass
animation-v3-integration               10/10 pass
renderer tests                        124 pass / 2 intentional skips / 0 fail
workspace lint                         14 projects successful
workspace build                        12 projects successful
workspace test                         12 projects successful
production dependency audit            no known vulnerabilities
```

Known nonblocking tooling notices:

- Nx Vite tsconfig-path plugin deprecation;
- Nx copy-assets plugin deprecation;
- Storybook/Vite large-chunk warning;
- Nx historical flaky-task classification for API build/test.

These should be handled as dedicated tooling maintenance rather than mixed into animation behavior branches unless they become blocking.

---

## 12. Phase 5 — Rive performance runtime: not started

Rive remains the planned leading candidate for reusable hero-character performance where it earns its complexity.

Required before adoption:

- runtime/editor licensing review;
- exact version pin;
- low-level deterministic/host-driven seek or advance proof;
- no autonomous story-time ownership;
- source-backed Enki identity preservation;
- reusable semantic performance channels;
- blink/gaze/breath/head/torso/arm controls;
- Storybook proof states;
- fixed-frame and motion evidence;
- human review.

The goal is not "use Rive because it exists." The goal is to prove a reusable hero performance system that is materially better than bespoke PNG-state animation.

---

## 13. Phase 6 — Three/R3F spatial runtime: not started

The spatial runtime remains planned for scenes that genuinely need 2.5D/3D placement, depth, fog, camera motion or spatial lighting.

Required proof:

- dependency/version compatibility;
- Remotion compatibility;
- exact-frame camera state;
- source-backed painterly cards;
- no hidden geometry exposure;
- deterministic transforms;
- fixed-frame visual regression;
- performance budget.

Do not put ordinary 2D layer work into Three merely because Three is available.

---

## 14. Phase 7 — combined V3 Reel 1 proof: not started

The first combined proof is still expected to be Enki at the Helm.

Target composition:

```text
Scene V3             semantic/time authority
Rive                  hero performance, if accepted
Pixi                  water/rigging/material behavior
Three/R3F             only if spatial proof justifies it
Remotion              production frame/render authority
```

Required controls must make component value measurable:

- Level 1 baseline;
- character frozen;
- material frozen;
- vessel/camera controls;
- normal-speed A/B;
- exact-frame evidence;
- no source-fidelity loss.

The architecture only earns production complexity if the combined result is visibly better and operationally maintainable.

---

## 15. Later platform phases still open

### Physics / Rapier

Not started:

- fixed-step harness;
- construction-order hashing;
- deterministic bake format;
- bake receipts;
- playback adapter;
- storm benchmark.

### Crowds/work crews

Contracts exist at Scene V3 level; actual reusable crowd runtime remains pending.

Need:

- stable agent IDs;
- schedules;
- paths/regions;
- role variation;
- anti-synchronization metrics;
- LOD/performance.

### Herd/animals

Pending runtime evaluation and licensing/authoring decision.

### CityKit/world state

Contracts/planning exist; production implementation remains pending.

### Montage/long-time-span system

Planning exists; runtime implementation remains pending.

### Theatre authoring bridge

Authoring-only policy remains. No production dependency should be introduced until export-to-Scene-V3 value is proven.

### Unified evidence/QA

A substantial foundation exists, but complete runtime-independent proof receipts and production promotion integration remain future work.

---

## 16. Recommended near-term execution order

The next implementation sequence should optimize for usable production capability, not package count.

### Step A — finish/merge current Pixi foundation branch

Before merge:

- pull current remote docs/startup changes;
- run Animation Lab focused gates after port change;
- run `pnpm start:all` smoke test;
- confirm 3000/4200/4300 are all reachable;
- confirm Ctrl+C shuts down all three dev services cleanly;
- confirm existing untracked local files remain untouched.

### Step B — source-backed Pixi visual proof

Use a real existing Shot 3 source/approved asset.

Prove:

- checksum-bound asset load;
- deterministic registration;
- exact-frame transform;
- same source identity as Scene/receipt;
- browser rendering;
- diagnostic fallback parity.

### Step C — first real material behavior

Select one bounded, production-relevant behavior—preferably Shot 3 water or rigging.

Do not attempt water + cloth + rope + particles simultaneously.

### Step D — load resolved Scene V3 dynamically

The Lab currently relies heavily on a pinned golden browser fixture.

Next architecture improvement:

- fetch/select a resolved scene by ID/revision/hash;
- verify receipt identity;
- keep golden fixture for tests;
- stop requiring hand-maintained reduced fixture copies for normal use.

### Step E — Angular Studio ↔ Animation Lab navigation

Add an engine-neutral Studio action such as:

```text
Open Animation Lab
```

The link should carry semantic identity rather than local object state, for example:

```text
/scene/scene:ch01:r01:s03:foundation?revision=1&frame=101
```

The Lab should resolve the scene from API/shared state and verify the expected hash.

### Step F — safe workflow execution from Angular UI

Begin moving common CLI operations behind typed API methods/jobs.

This should happen incrementally, not through a generic browser shell.

### Step G — Rive benchmark

Only after the exact-frame/runtime/asset path is stable enough that Rive debugging is about Rive rather than about missing platform plumbing.

### Step H — spatial benchmark if needed

Introduce Three/R3F only when the chosen shot demonstrates a genuine spatial need.

---

## 17. Future UI-driven script execution

The long-term goal of running common workflows from Angular Studio is sound, but the implementation should not expose arbitrary shell execution to the browser.

The preferred architecture is:

```text
Angular button/action
       ↓
typed API command
       ↓
validated command/job definition
       ↓
server-side allowlisted workflow service
       ↓
existing script/library/runtime operation
       ↓
persisted job state + logs + receipts
       ↓
SSE/WebSocket/polling status back to Studio
```

### 17.1 Why not a generic shell endpoint

Avoid:

```text
POST /run-shell { command: "..." }
```

That would create security, quoting, reproducibility, auditability and accidental-mutation problems.

### 17.2 Preferred command model

Each Studio operation should map to a typed method/job, for example:

```text
prepareShotAssets(shotId)
generateCandidate(shotId, layerId, workflowId)
verifyCandidate(candidateId)
renderProof(sceneId, revision, profile)
runMaterialQa(proofId)
openPromotionPlan(candidateId)
promoteReviewedCandidate(reviewReceiptId)
compileSceneV3(sceneId, revision)
renderNamedProofState(sceneId, proofStateId)
```

Internally, the first implementation may still invoke existing scripts.

Over time, logic should move from CLI wrappers into reusable TypeScript services so both CLI and API call the same domain method.

### 17.3 Required job behavior

UI-driven operations should eventually support:

- stable job ID;
- operation type;
- validated inputs;
- scene/shot/candidate identity;
- start/end timestamps as operational metadata only;
- stdout/stderr or structured log capture;
- progress/status;
- cancel where safe;
- retry policy where safe;
- output artifact IDs/hashes;
- QA receipt references;
- human review requirement;
- no implicit promotion.

### 17.4 Promotion remains special

Promotion commands require stronger controls than ordinary rendering/generation:

- exact candidate hash;
- current canonical revision check;
- current QA/evidence receipts;
- human approval evidence;
- explicit confirmation;
- transactional update;
- rollback metadata.

The Angular UI should make safe workflows easier, not bypass the repository's existing safety model.

---

## 18. Testing strategy going forward

### Pure foundation

Keep fast tests engine/browser independent:

- contracts;
- compiler;
- frame math;
- inspection;
- projection plans;
- policy/boundary tests.

### Engine adapter

Test:

- config/time authority;
- invalid frame/viewport rejection;
- lifecycle;
- deterministic projection;
- import boundaries.

### Browser

Use Playwright for actual engine initialization and DOM/canvas integration.

### Visual evidence

Add fixed-frame screenshots only when the visual output has stable meaning. Diagnostic geometry screenshot churn is less valuable than source-backed material/actor benchmarks.

### Motion proof

Short deterministic motion proofs should come from the same exact-frame evaluator used by Storybook/Lab, not a second animation clock.

### Human

Human A/B remains required for subjective production-value claims.

---

## 19. Documentation maintenance rule

From this point forward, implementation branches that materially complete a planned V3 item should update this status record and the relevant phase backlog before merge.

Checklist states should mean:

```text
[x] implemented and backed by repository evidence/local verification
[~] partial/foundation exists but phase capability is not complete
[ ] planned/not yet implemented
```

Do not mark a planned feature complete merely because its TypeScript interface exists.

Do not mark human acceptance complete from automated evidence.

---

## 20. Current next milestone

After the current startup/documentation update is locally verified and merged, the highest-value next milestone is:

> **Render a real, checksum-bound Shot 3 visual asset through the deterministic Pixi surface at exact Scene V3 frames, then add one bounded material behavior without allowing Pixi to own time.**

That milestone moves the platform from "real engine rendering diagnostic primitives" to "real engine rendering production-authoritative source material" while preserving every architectural invariant already proven.
