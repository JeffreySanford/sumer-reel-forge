# Animation V3 Current Implementation Status and Roadmap

Status: **living implementation record / automation-first actor policy active**

Updated: **2026-08-26**

This is the current implementation authority for the Animation V3 reset. Read it together with [`automation-first-character-performance.md`](./automation-first-character-performance.md). Older documents may discuss Rive as an early candidate; Rive is no longer the required/default hero-character path.

## 1. Executive status

```text
Phase 0  Planning lock                               COMPLETE
Phase 1  Historical-source foundation                PARTIAL / FOUNDATION WORKING
Phase 2  Scene V3 contracts/compiler/runtime         CORE COMPLETE
Phase 3  Animation Lab foundation                     CORE COMPLETE
Phase 4  Pixi / Shot 3 source-backed proof            PARTIAL — ACCEPTED BASELINE EXISTS
Phase 5  Automated actor-prep/performance pipeline    STARTED
Phase 6  Three/R3F spatial runtime                    NOT STARTED
Phase 7  Combined Reel 1 V3 proof                     NOT STARTED
Phase 8+ Physics/crowds/herds/cities/etc.             NOT STARTED
```

The current production architecture is:

```text
Scene V3 semantic state
        ↓
resolved deterministic runtime state
        ↓
exact FrameContext
        ↓
ActorPrepDefinition + engine-neutral actor/material/spatial state
        ↓
approved adapter or baked candidate
        ↓
Remotion production frame/render authority
```

React, Pixi, Rive, ML backends and future adapters do not own story time.

## 2. Automation doctrine

Sumer Reel Forge is intended to produce many reels. The production critical path therefore must be headless and scriptable.

Default rule:

```text
source → automated preparation → deterministic/baked performance → QA → human review → promotion
```

Human review remains mandatory for visual claims, but humans should not be required to open Rive, Photoshop, GIMP or another GUI for every actor, shot or reel.

If an automated extraction/performance lane fails, preserve the accepted lower-capability baseline and reject/fallback. Do not convert the failure into recurring manual work.

## 3. Existing foundation

### Phase 1 — historical sources

Implemented foundations include `libs/historical-sources`, stable literary/visual evidence identities, source hashing, adaptation classes and resolved-scene source binding. Corpus breadth and full Angular provenance UX remain incomplete.

### Phase 2 — Scene V3

Core Scene V3 contracts/compiler/runtime are working: deterministic integer-frame evaluation, runtime registry, source/evidence binding, canonical serialization, resolved hashes and the Enki-at-the-Helm golden fixture.

### Phase 3 — Animation Lab

`apps/animation-lab` is the specialist exact-frame workbench on port 4300. It supports deterministic inspection, Pixi proof surfaces, Storybook/browser tests and source/runtime diagnostics. Angular Studio remains the product/orchestration surface.

## 4. Phase 4 — current Shot 3 Pixi evidence

### Accepted proof-lane baseline

```text
recovered repaired background
+ recovered vessel
+ recovered Enki
+ cinematic camera drift
+ vessel heave/roll
+ nested Enki counter-sway/body-settle
```

This is the current visual baseline for further experiments.

### Rejected/disabled lanes

- canonical blink: technically isolated, human-invisible at normal speed;
- stronger replacement blink: technically stronger, still human-invisible;
- legacy water extraction: sparse painted-detail alpha, not a valid water basin;
- legacy rigging extraction: sparse fragments;
- fresh bounded rigging ROI recovery: no trustworthy survivor after exact-locator expanded confirmation;
- whole-cutout `breathe-calm`: technical proof green, human reviewer preferred the control.

These failures are retained as evidence. Do not restart amplitude-tuning loops or promote technically green but visually worse results.

### Phase 4 status

Pixi remains a useful exact-frame/source-backed 2D adapter. Shot 3 does **not** yet satisfy the full Level 2 target merely because camera/vessel/counter-sway are accepted. Additional channels must be source-supported and human-readable.

## 5. Phase 5 — automated actor preparation/performance

Status: **STARTED — THIS IS THE ACTIVE NEXT LANE**

### Rive boundary experiment evidence

Completed:

- `libs/animation-rive` neutral contracts;
- no-autoplay/no-autonomous-clock tests;
- byte-identical recovered Enki source-prep packet;
- source SHA and registration receipts;
- candidate handoff checks.

Because useful `.riv` creation requires manual editor authoring:

```text
Rive runtime installation: DEFERRED
manual .riv authoring handoff: CANCELLED AS CRITICAL PATH
libs/animation-rive: retained as architectural evidence / optional future adapter
```

Accepted recovered Enki actor-prep source:

```text
941x1672
sha256:d19ff6b4810a6fad5b8ce41232e07d7fc0f72923799e195df1596f53f4239f07
```

### Actor-prep implementation now on the branch

Implemented pending local verification:

- `libs/animation-contracts/src/lib/actor-prep.ts`;
- `ActorPrepDefinition` source/region/anchor/backend contracts;
- default `headlessDefault: true`;
- recurring manual editor work forbidden;
- failed automation policy `reject-or-fallback`;
- backends forbidden from live story-time authority;
- license-blocked backend validation;
- focused contract tests;
- `tools/scripts/shot03-enki-actor-prep-auto.mjs`;
- candidate-only Enki actor-prep packet with zero manual-editor and zero model invocations;
- backend evidence: native source regions preferred, LivePortrait license-blocked, Rive deferred.

### Next execution sequence

1. local-verify planning alignment + `animation-contracts` + automated actor-prep packet;
2. implement headless semantic region/landmark discovery;
3. verify source fidelity and failure behavior;
4. create reusable performance-template/bake contracts;
5. run a bounded facial-performance backend spike only after license preflight;
6. map an approved result into Scene V3 clips/Remotion.

### LivePortrait candidate

LivePortrait may be evaluated because it supports headless inference and reusable motion templates. It is not adopted. Upstream licensing notes a commercial-use problem with bundled InsightFace models, so production use remains blocked until those models are replaced/resolved and license evidence is green.

## 6. Phase 6 — spatial runtime

Three/R3F remains a future bounded spike for painted depth cards, spatial camera, architecture and world placement. It must preserve the painted source and may not expose invented geometry.

## 7. Phase 7 — combined Reel 1 proof

The combined benchmark is backend-neutral. It requires accepted actor state/performance, source-supported environment/material/spatial behavior, exact Scene V3 timing/receipts, multiple meaningful non-camera contributions and normal-speed human preference.

It does **not** require Rive specifically, nor does it require resurrecting failed water/rigging masks merely to fill a channel count.

## 8. Product/UI boundary

Angular Studio should orchestrate projects, candidate generation, QA, review, promotion and rollback. Animation Lab remains the technical runtime workbench. Neither becomes a mandatory manual bone/mesh editor.

Long-term Studio flow:

```text
choose project/reel
→ generate/reuse actor prep automatically
→ render candidate
→ inspect deterministic + semantic evidence
→ human accept/reject
→ promote
```

## 9. Immediate next gate

Run the new local gate. If green, the next code milestone is automated semantic region/landmark discovery against the generated `ActorPrepDefinition` and exact accepted source receipt.

Do not install LivePortrait or another ML backend before the contract and license boundary are verified locally.

## 10. Universal stop conditions

```text
same exact frame is nondeterministic
source hashes drift
backend gains autonomous time ownership
manual GUI authoring becomes recurring production work
model/license status is unresolved for intended use
technical green output is human-rejected
identity or painterly source fidelity drifts
thresholds must be weakened merely to obtain a survivor
```

The automation platform is successful when failures become bounded receipts/fallbacks rather than manual cleanup queues.
