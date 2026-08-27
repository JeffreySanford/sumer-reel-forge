# Automation-First Character Performance

Status: **authoritative production policy**

Updated: **2026-08-26**

This document supersedes any earlier planning assumption that Rive, Live2D, Spine, Theatre or another GUI-authored runtime is the required/default hero-character path.

## 1. Production objective

Sumer Reel Forge is intended to produce many reels from manuscript, source art and reusable capability definitions. The default production workflow therefore must be headless, scriptable, provenance-bound and repeatable.

```text
editorial / approved actor source
        ↓
automated actor discovery + preparation
        ↓
ActorPrepDefinition + source receipt
        ↓
semantic regions / landmarks / anchors
        ↓
PerformanceClipDefinition
        ↓
approved performance backend
        ↓
baked or exact-frame performance evidence
        ↓
Scene V3 exact FrameContext
        ↓
Pixi / Remotion / other approved render adapter
        ↓
rendered proof + deterministic QA
        ↓
human normal-speed review
```

Human work is a **review/approval gate**, not a recurring authoring dependency.

## 2. Automation doctrine

The default path MUST NOT require a person to open a GUI editor for each actor, shot or reel.

Allowed manual work:

- initial visual-bible/source-art creation;
- exceptional one-time research or source approval;
- normal-speed visual review and promotion decision;
- optional specialist authoring when a benchmark proves the cost is justified and the result is reusable across many scenes.

Disallowed as default production architecture:

- per-shot Rive Editor authoring;
- hand-placing bones/meshes/anchors for every reel;
- Photoshop/GIMP cleanup as a required pipeline step;
- manually creating blink/pose PNGs per shot;
- hidden editor state required by production rendering.

If automation cannot produce a trustworthy candidate, the pipeline rejects/falls back. It does not silently convert the failure into manual labor.

## 3. Authority and time ownership

```text
Scene V3 semantic state
        ↓
resolved deterministic state
        ↓
exact FrameContext
        ↓
engine-neutral actor/performance state
        ↓
approved backend adapter or baked candidate
        ↓
Remotion production render
```

No actor backend owns story time. Wall-clock autoplay, unmanaged requestAnimationFrame loops and backend-local timelines cannot be authoritative.

## 4. Actor preparation contract

Every prepared actor package records at minimum:

```text
actor ID
source asset/path/hash
source dimensions and registration
source derivation class
semantic regions and confidence
semantic landmarks/anchors and confidence
backend compatibility
model/workflow versions when ML is used
candidate/bake hashes
human approval status
```

Desired reusable semantic regions include, when the source supports them:

```text
head
face
hair/beard
left-eye/right-eye
crown/headwear
torso/robe
left/right upper arm
left/right forearm
left/right hand
```

Not every source must expose every region. Missing or unsafe regions are explicit capability limitations, not prompts to fabricate geometry.

## 5. Performance backends

### Native/source-preserving path — preferred first

Use source-backed regions, deterministic transforms/deformation and existing Pixi/Remotion infrastructure when the visual result is sufficient. This path has the strongest source identity and reproducibility.

### Baked ML facial-performance path — experimental

A headless portrait-animation system may generate a **baked candidate** for face/head performance. It is not a live semantic authority.

Required evidence:

```text
source hash
backend/model version
model/weights license receipt
motion-template or driving-input hash
configuration/workflow hash
seed where applicable
output frame/video hash
frame-rate/duration mapping
identity/region QA
human normal-speed approval
```

The approved baked bytes are what production consumes. Regeneration is not required during every render.

### LivePortrait candidate

LivePortrait is a candidate for a bounded automated facial-performance spike because it supports command-line inference and reusable motion templates. It is **not adopted yet**.

Commercial-license gate: the upstream project code is MIT, but its license notes that bundled InsightFace models are restricted to non-commercial research use. Production adoption is blocked until those detection models are replaced with a commercially compatible alternative or the rights are otherwise resolved.

### Rive

Rive is **DEFERRED / OPTIONAL SPECIALIST**, not the default hero-performance path.

The existing `libs/animation-rive` and ENKI-RIG-0 preparation work remain useful architectural evidence: they proved the neutral source/provenance contract and the no-autoplay/no-autonomous-time boundary. They do not require us to install the Rive runtime or manually author `.riv` files.

Rive can be reconsidered only if a later benchmark shows that a one-time reusable rig produces enough value to justify the editor/manual authoring cost without creating per-shot work.

## 6. Enki decision from Shot 3

The current human-accepted recovered Shot 3 baseline is:

```text
cinematic camera
+ vessel heave/roll
+ Enki vessel-carried motion
+ Enki local counter-sway/body-settle
```

Rejected for this source/proof lane:

```text
canonical blink overlay
stronger replacement blink overlay
legacy water extraction
fresh rigging ROI extraction
whole-cutout breathe-calm deformation
```

Technical green results for those experiments remain evidence, but human normal-speed rejection prevents promotion.

The accepted recovered Enki proof source currently used for actor-prep experiments is 941×1672 with SHA-256:

```text
sha256:d19ff6b4810a6fad5b8ce41232e07d7fc0f72923799e195df1596f53f4239f07
```

This is proof-lane identity, not an automatic canonical asset promotion.

## 7. Enki automated capability ladder

```text
ENKI-ACTOR-0  source identity + byte/hash receipt
ENKI-ACTOR-1  automated regions/landmarks/anchors
ENKI-ACTOR-2  headless facial performance candidate (blink/gaze)
ENKI-ACTOR-3  source-safe body/secondary performance where supported
ENKI-ACTOR-4  hand/prop contact and helm gesture where source supports articulation
```

Each level is independently rejectable. Failure at a higher level preserves the lower accepted level.

## 8. Performance clip rule

Scene V3 schedules semantic actions such as:

```text
blink-natural
gaze-horizon
reflective-stillness
helm-adjust
```

The scene never stores backend-specific bone names, state-machine inputs, model prompts or GUI-editor object IDs.

A `PerformanceClipDefinition` can map to:

- deterministic procedural/source-region transforms;
- a reusable baked motion template;
- a model-backed baked facial-performance candidate;
- an optional skeletal/vector rig adapter;
- another future adapter that passes the same contracts.

## 9. Failure and fallback policy

If a backend or extraction lane fails:

1. preserve the accepted lower-capability baseline;
2. store the failure receipt;
3. do not loosen structural thresholds merely to get a survivor;
4. do not invent a manual repair step as the normal pipeline;
5. try another bounded automated method only when evidence justifies it;
6. prefer fewer clean motion channels over more technically active but visually worse channels.

## 10. Production-scale acceptance

A character-performance approach becomes `production-capable` only when it demonstrates:

```text
headless/repeatable preparation
source/provenance binding
deterministic or baked-output identity
license-clean dependencies/models
bounded compute cost
semantic proof states
negative controls
normal-speed human approval
reuse across multiple shots without repeated GUI authoring
```

Automation throughput is part of visual-runtime acceptance, not an afterthought.
