# Animation V3 Current Implementation Status and Roadmap

Status: **living implementation record / automation-first actor policy active**

Updated: **2026-08-27**

This is the current implementation authority for the Animation V3 reset. Read it together with [`automation-first-character-performance.md`](./automation-first-character-performance.md). Older documents may discuss Rive as an early candidate; Rive is no longer the required/default hero-character path.

## 1. Executive status

```text
Phase 0  Planning lock                               COMPLETE
Phase 1  Historical-source foundation                PARTIAL / FOUNDATION WORKING
Phase 2  Scene V3 contracts/compiler/runtime         CORE COMPLETE
Phase 3  Animation Lab foundation                     CORE COMPLETE
Phase 4  Pixi / Shot 3 source-backed proof            PARTIAL — ACCEPTED BASELINE EXISTS
Phase 5  Automated actor-prep/performance pipeline    ACTIVE R&D — SOURCE IDENTITY VERIFIED
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

A proof-shot experiment is not allowed to become a reel-wide release blocker merely because optional research remains open. Required production readiness and optional R&D capability readiness are tracked separately.

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

This is the current Shot 3 motion baseline.

### Rejected/disabled lanes

- canonical blink: technically isolated, human-invisible at normal speed;
- stronger replacement blink: technically stronger, still human-invisible;
- legacy water extraction: sparse painted-detail alpha, not a valid water basin;
- legacy rigging extraction: sparse fragments;
- fresh bounded rigging ROI recovery: no trustworthy survivor after exact-locator expanded confirmation;
- whole-cutout `breathe-calm`: technical proof green, human reviewer preferred the counter-sway control.

These failures are retained as evidence. Do not restart amplitude-tuning loops or promote technically green but visually worse results.

### Phase 4 status

Pixi remains a useful exact-frame/source-backed 2D adapter. Shot 3 does **not** yet satisfy every aspirational Level 2 actor-articulation target merely because camera/vessel/counter-sway are accepted. Additional channels must be source-supported and human-readable.

That does **not** make optional semantic/facial/hand R&D a Reel 1 blocker. Counter-sway remains the current accepted Shot 3 motion baseline while actor-articulation research proceeds separately.

The tracked review set is `tools/animation/review-sets/shot03-recovered-motion.review-set.json`. It records:

```text
primary        accepted earlier reference
counter-sway   CURRENT ACCEPTED BASELINE
breath         REJECTED REFERENCE
```

Run:

```sh
pnpm animation:shot3:motion-decision-packet
pnpm animation:shot3:motion-review-montage
```

The tools are now generic/config-driven under `animation-candidate-review-*`; the Shot 3 commands are compatibility wrappers. Breathing may appear in the montage as historical evidence but is not reopened as a selectable candidate.

Generate the Reel 1 production-readiness matrix with:

```sh
node tools/scripts/animation-reel-readiness.mjs
```

Required manifest layers and accepted motion baselines are production readiness. Planned optional layers and semantic articulation experiments remain visible without silently becoming blockers.

## 5. Phase 5 — automated actor preparation/performance

Status: **ACTIVE R&D — SOURCE IDENTITY VERIFIED; GROUPED SEMANTIC DISCOVERY EXPERIMENTAL/NON-BLOCKING**

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

A missing `rive` shell command is therefore not a production blocker.

### Verified automated actor-prep evidence — 2026-08-27

Local verification completed successfully:

```text
planning alignment tests          10/10 PASS
animation-contracts tests         18/18 PASS
animation-contracts build         PASS
automated actor-prep packet       PASS
manual editor invocations         0
model invocations                 0
canonical mutation                none
```

Accepted recovered Enki actor-prep source:

```text
941x1672
sha256:d19ff6b4810a6fad5b8ce41232e07d7fc0f72923799e195df1596f53f4239f07
```

Verified actor-prep definition:

```text
sha256:81b39d95d47ecbade72a7c1b861619d7271a465050a3a70d51d4789ff18fa606
```

The source-identity stage is therefore complete for this proof packet.

### Semantic discovery evidence and current shape

Semantic discovery has progressed beyond the original all-`not-visible` attempt:

- exact actor-prep source hash revalidation before inference;
- deterministic region/anchor geometry validation;
- two-pass spatial agreement before a result can be considered stable;
- face-within-head and eye-within-face checks;
- crown/head attachment checks;
- semantic anchors constrained to owning regions;
- explicit facial/hand/torso capability readiness;
- invalid model geometry preserved as diagnostic evidence before/after one bounded repair;
- exact pre-padding actor-locator crop recovered after the old 15% padding was shown to expand to the full frame;
- lower-boundary-only crop extension preserved as evidence for edge anatomy;
- face/head, body/arms and hands/contact requests split into smaller groups for the local vision model;
- group definitions moved to tracked actor data: `tools/animation/actors/enki-semantic-groups-v1.json`;
- generic grouped hook: `tools/scripts/actor-semantic-grouped-vision-hook.mjs`;
- Enki hook retained only as a compatibility adapter;
- hands/contact is capability-specific and is not required for core face/torso structural progress;
- standalone SVG review remains a human gate before any source-pixel extraction/segmentation;
- no ComfyUI/SAM/generative pixel work, actor-prep mutation, canonical mutation, rigging, animation or promotion occurs in semantic discovery.

The semantic locator may propose geometry. It is **not** allowed to declare a production region accepted by itself.

### Backend status

```text
native source-region path      PREFERRED
Qwen3-VL semantic locator      ADVISORY / R&D DISCOVERY ONLY
LivePortrait                   EXPERIMENTAL + LICENSE-BLOCKED
Rive                           DEFERRED / OPTIONAL
```

LivePortrait may be evaluated later because it supports headless inference and reusable motion templates. It is not adopted. Upstream licensing notes a commercial-use problem with bundled InsightFace models, so production use remains blocked until those models are replaced/resolved and license evidence is green.

### Phase 5 R&D sequence

1. keep the accepted Shot 3 counter-sway baseline frozen;
2. run the config-driven grouped semantic gate when actor-articulation R&D is being worked;
3. inspect any structurally contained semantic overlay at normal human review scale;
4. allow unsupported hands/contact to remain unavailable without blocking facial/torso capability;
5. if useful semantic locations are human accepted, bind only those locations into source-pixel extraction candidates;
6. prove source fidelity and reconstruction behavior before deformation/performance;
7. create reusable performance-template/bake contracts;
8. run a bounded facial-performance backend spike only after license preflight;
9. map an approved result into Scene V3 clips/Remotion.

If semantic discovery disagrees or misidentifies anatomy, stop at the locator gate. Do not lower thresholds and do not hand-correct coordinates as the default workflow. Preserve the accepted lower-capability Shot 3 baseline and continue Reel 1 production work.

## 6. Phase 6 — spatial runtime

Three/R3F remains a future bounded spike for painted depth cards, spatial camera, architecture and world placement. It must preserve the painted source and may not expose invented geometry.

## 7. Phase 7 — combined Reel 1 proof

The combined benchmark is backend-neutral. It requires accepted actor state/performance where needed, source-supported environment/material/spatial behavior, exact Scene V3 timing/receipts, multiple meaningful non-camera contributions where the source supports them, and normal-speed human preference.

It does **not** require Rive specifically, nor does it require resurrecting failed Shot 3 water/rigging/blink masks merely to fill a channel count.

## 8. Product/UI boundary

Angular Studio should orchestrate projects, candidate generation, QA, review, promotion and rollback. Animation Lab remains the technical runtime workbench. Neither becomes a mandatory manual bone/mesh editor.

Long-term Studio flow:

```text
choose project/reel
→ generate/reuse actor prep automatically when needed
→ render candidate
→ inspect deterministic + semantic evidence
→ human accept/reject
→ promote
```

Generic review/readiness tools should replace shot-specific orchestration as contracts stabilize.

## 9. Immediate next gates

### Reel 1 production track

1. pull the consolidation changes;
2. run focused renderer tests for review sets, readiness and grouped semantic contracts;
3. generate `pnpm animation:shot3:motion-decision-packet`;
4. generate `pnpm animation:shot3:motion-review-montage` if a visual reference is useful;
5. run `node tools/scripts/animation-reel-readiness.mjs`;
6. use the readiness matrix to work the next genuinely blocked Reel 1 shot rather than reopening rejected Shot 3 channels.

### Actor-articulation R&D track

Run `node tools/scripts/shot03-enki-semantic-discovery-grouped-auto.mjs` only when continuing the reusable actor-articulation experiment. It requires Ollama plus the configured vision model. A failure here does not invalidate the accepted Shot 3 counter-sway baseline and does not block Reel 1 asset readiness.

Region segmentation/deformation remains blocked until a structurally contained semantic result receives explicit human review.

## 10. Universal stop conditions

```text
same exact frame is nondeterministic
source hashes drift
backend gains autonomous time ownership
manual GUI authoring becomes recurring production work
model/license status is unresolved for intended use
technical green output is human-rejected
identity or painterly source fidelity drifts
semantic locator passes disagree materially
semantic boxes/anchors violate source anatomy
thresholds must be weakened merely to obtain a survivor
optional R&D starts blocking an already accepted lower-capability production baseline
```

The automation platform is successful when failures become bounded receipts/fallbacks rather than manual cleanup queues, and when lessons from one difficult shot become reusable tools for the rest of the reel.
