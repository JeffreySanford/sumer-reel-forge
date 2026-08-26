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
engine-neutral actor/material/spatial state
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

Phase 4 progressed far beyond the original diagnostic-geometry foundation.

### Accepted proof-lane baseline

The current human-accepted Shot 3 composition is:

```text
recovered repaired background
+ recovered vessel
+ recovered Enki
+ cinematic camera drift
+ vessel heave/roll
+ nested Enki counter-sway/body-settle
```

The accepted motion is exact-frame, checksum-bound and repeatable. It is the visual baseline for further experiments.

### Rejected/disabled lanes

- canonical blink: technically isolated, human-invisible at normal speed;
- stronger replacement blink: technically stronger, still human-invisible;
- legacy water extraction: sparse painted-detail alpha, not a valid water basin;
- legacy rigging extraction: sparse fragments;
- fresh bounded rigging ROI recovery: no trustworthy survivor after exact-locator expanded confirmation;
- whole-cutout `breathe-calm`: technical proof green, human reviewer preferred the control.

These failures are retained as evidence. Do not restart amplitude-tuning loops or promote technically green but visually worse results.

### Phase 4 status

Pixi remains a useful exact-frame/source-backed 2D adapter. Shot 3 does **not** yet satisfy the full Level 2 target merely because camera/vessel/counter-sway are accepted. Additional channels must be source-supported and human-readable; they are not mandatory if this source cannot safely provide them.

## 5. Phase 5 — automated actor preparation/performance

Status: **STARTED — THIS IS THE NEXT ACTIVE LANE**

### Evidence already completed

A bounded Rive-neutral experiment created:

- `libs/animation-rive` neutral contracts;
- no-autoplay/no-autonomous-clock tests;
- a byte-identical recovered Enki source-prep packet;
- source SHA and registration receipts;
- candidate handoff checks.

Local proof was green, but creating the actual `.riv` requires manual editor authoring. That conflicts with production-scale automation. Therefore:

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

### Next implementation sequence

1. define engine-neutral `ActorPrepDefinition` / backend evidence contracts;
2. generate an automated Enki actor-prep workspace from the accepted source receipt;
3. discover semantic regions/landmarks/anchors headlessly;
4. verify source fidelity and failure behavior;
5. create reusable performance-template/bake contracts;
6. run a bounded facial-performance backend spike;
7. only then map approved results into Scene V3 clips/Remotion.

### LivePortrait candidate

LivePortrait may be evaluated because it supports headless inference and reusable motion templates. It is not adopted. Its upstream license notes a commercial-use problem with bundled InsightFace models, so production use is blocked until those models are replaced/resolved and a license receipt is green.

### Rive candidate

Rive is now **optional/deferred specialist tooling**. Reconsider only if a one-time reusable rig demonstrates enough visual/production value to justify manual editor cost without becoming per-shot work.

## 6. Phase 6 — spatial runtime

Three/R3F remains a future bounded spike for painted depth cards, spatial camera, architecture and world placement. It must preserve the painted source and may not expose invented geometry.

## 7. Phase 7 — combined Reel 1 proof

The combined benchmark is backend-neutral. It requires:

- one accepted actor-performance path;
- accepted vessel/environment/material/spatial behavior as the source supports;
- exact Scene V3 timing and receipts;
- multiple meaningful non-camera contributions;
- no source-fidelity regression;
- normal-speed human preference over the lower-level baseline.

It does **not** require Rive specifically, nor does it require resurrecting failed water/rigging masks merely to fill a channel count.

## 8. Product/UI boundary

Angular Studio should orchestrate projects, candidate generation, QA, review, promotion and rollback. Animation Lab remains the technical runtime workbench. Neither should become a mandatory manual bone/mesh editor.

Long-term Studio goal:

```text
choose project/reel
→ generate/reuse actor prep automatically
→ render candidate
→ inspect deterministic + semantic evidence
→ human accept/reject
→ promote
```

## 9. Immediate next gate

The next code milestone is an automated Enki actor-prep packet generated from the accepted recovered source with:

- source SHA/dimensions;
- zero manual-editor dependency;
- semantic region/anchor intent;
- backend compatibility and license state;
- explicit proof requirements;
- candidate-only output under `tmp/`.

Do not install LivePortrait or another ML backend before that contract and license boundary exist.

## 10. Universal stop conditions

Stop and diagnose when:

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
