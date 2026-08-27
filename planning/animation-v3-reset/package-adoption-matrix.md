# Animation V3 Package Adoption and Compatibility Matrix

Status: **planning contract / automation-first revision**

Updated: **2026-08-26**

No package becomes architectural authority merely because it can animate. Character production additionally follows [`automation-first-character-performance.md`](./automation-first-character-performance.md): recurring manual GUI authoring is not an acceptable default reel-production dependency.

## 1. Adoption questions

Every dependency/backend must answer:

1. What capability does it own?
2. What does it explicitly not own?
3. Do Scene V3 and Remotion remain semantic/frame authority?
4. Is its output deterministic or safely baked/hash-bound?
5. Can source/provenance/human-approval rules be preserved?
6. Does it reduce rather than create recurring manual work?
7. Are code, model weights and auxiliary-model licenses valid for intended commercial use?

## 2. Ownership map

| Package/backend | Primary ownership | Status | Must not own |
| --- | --- | --- | --- |
| Scene V3 + actor-prep/performance contracts | semantic actor/performance intent | **DEFAULT** | pixels, wall-clock playback |
| Remotion | production frame/render authority | **DEFAULT** | character semantics, physics intent |
| PixiJS | source-backed 2D composition/material/local deformation | **ADOPTED / CONSTRAINED BY BENCHMARK** | story time, historical truth |
| automated actor-prep pipeline | semantic regions/anchors/backend evidence | **ACTIVE NEXT PATH** | human promotion, story time |
| baked facial-performance adapter | optional headless facial candidate generation | **EXPERIMENTAL** | live timeline authority, automatic promotion |
| LivePortrait | candidate baked facial backend | **EVALUATE ONLY AFTER LICENSE PREFLIGHT** | production authority, unresolved model licensing |
| Rive | optional reusable vector/skeletal rig | **DEFERRED SPECIALIST** | default hero path, recurring per-shot editor work, story time |
| React Three Fiber / Three.js | spatial world/camera/depth | PLANNED | character semantics |
| Rapier | fixed-step/baked secondary physics | PLANNED | acting/performance |
| Spine | optional repeated skeletal rigs | DEFERRED | default hero/animal path without benchmark |
| Theatre.js | optional visual authoring/export | DEFERRED | production state authority |
| ComfyUI | candidate source preparation | AVAILABLE | timing, approval |
| Qwen3-VL/Ollama | localization/semantic review assistance | AVAILABLE | deterministic/promotion authority |

## 3. Actor-performance default

Actor performance is a **capability contract**, not a package choice.

```text
ActorPrepDefinition
→ semantic regions / landmarks / anchors
→ PerformanceClipDefinition
→ chosen backend mapping
→ deterministic state or baked candidate
→ Scene V3 exact-frame composition
```

Backend-specific bone names, prompts, state-machine inputs and editor object IDs do not enter scene authoring data.

## 4. Native/source-preserving actor path

Preferred first because it maximizes source identity and reproducibility.

Candidate responsibilities:

- source-backed actor regions;
- deterministic local transforms/deformation;
- semantic contact anchors;
- exact-frame mapping;
- source hash/registration proof.

Reject a region/deformation if it requires manual cleanup to become production-safe.

## 5. Baked ML facial-performance gate

ML facial animation may be used as a baked candidate adapter, not as live timeline authority.

Required metadata:

```text
source image hash
backend + code revision
model/weights identifiers
all relevant license records
motion-template/driving-input hash
configuration/workflow hash
seed where applicable
output hash
fps/frame mapping
identity QA
human review
```

Production consumes approved baked bytes. The renderer must not call an external model at every frame.

## 6. LivePortrait evaluation gate

Why evaluate:

- command-line/headless inference;
- reusable driving-motion template support;
- potentially high leverage for blink/gaze/head performance.

Current status: **NOT ADOPTED / LICENSE-BLOCKED FOR COMMERCIAL PRODUCTION UNTIL RESOLVED**.

License note: upstream code is MIT, but upstream licensing notes that bundled InsightFace detection models are restricted to non-commercial research use. Commercial production therefore requires replacing those detection models with commercially compatible components or otherwise resolving the rights before adoption.

Benchmark requirements:

- same accepted Enki source hash;
- pinned code/model versions;
- no manual editor step;
- source → reusable motion-template → baked output;
- stable identity at OPEN/CLOSED/RETURNED_OPEN/gaze states;
- no unintended body/camera/background motion;
- proof receipt and human normal-speed approval.

## 7. Rive policy

Rive is no longer the required/default hero runtime.

Existing evidence retained:

- isolated `libs/animation-rive` neutral contract;
- no-autoplay/no-autonomous-clock boundary;
- byte-identical ENKI-RIG-0 source prep.

Reason for deferment: the next step required manual Rive Editor `.riv` authoring, which conflicts with the many-reel automation objective.

Reconsider Rive only if:

- one-time rig authoring can be amortized across many scenes;
- source identity clearly improves over automated alternatives;
- runtime/export licensing is acceptable;
- production rendering is fully headless after the one-time rig exists;
- no per-shot editor intervention is required.

Do not install the Rive runtime merely because the neutral scaffolding exists.

## 8. PixiJS policy

Pixi owns source-backed 2D rendering/material/local deformation only when the source supports a trustworthy region/material representation.

Accepted capabilities include exact-frame renderer ownership and the current recovered Shot 3 baseline. Rejected Shot 3 water/rigging masks remain rejected evidence; they are not reasons to weaken QA or abandon Pixi generally.

## 9. Three/R3F policy

Intended for painted depth cards, camera, architecture, terrain, occlusion and world placement. Remotion remains frame authority. 2.5D cards first; full 3D only when a benchmark earns it.

## 10. Rapier policy

Physics is fixed-step/baked and limited to useful secondary response. If authored motion is simpler and easier to direct, do not simulate it.

## 11. Spine / Live2D / Theatre policy

These remain specialist/deferred tools. None enters the default production path until a manuscript-derived benchmark proves visible value, deterministic/baked integration, acceptable licensing and low recurring manual cost.

## 12. Generative/I2V policy

Generative motion is a baked candidate, never runtime semantic authority. Bind source/model/workflow/prompt/seed/output hashes and human review. Identity drift or unsupported source mutation is a hard rejection.

## 13. Version and license policy

Accepted production-critical packages/backends use pinned versions. Model weights and auxiliary models are part of the license/security surface, not merely implementation details.

A machine-readable license record must include code license plus any model/weights/editor restrictions relevant to production.

License uncertainty blocks production adoption.

## 14. Adoption order from current branch

```text
1. existing Scene V3/frame/compiler/inspection foundations
2. accepted Pixi/recovered Shot 3 baseline
3. engine-neutral ActorPrepDefinition and automated Enki prep
4. headless semantic region/landmark discovery
5. reusable performance-template/bake contract
6. bounded license-safe facial backend spike (LivePortrait candidate)
7. Three/R3F spatial spike when actor path is sufficiently proven
8. Rapier / crowds / herds / city systems as manuscript demand requires
9. optional Rive/Spine/Live2D/Theatre only when benchmark value justifies manual/tooling cost
```

Reel production is gated by **capability evidence**, not by adopting a predetermined package list.

## 15. Keep/reject record

Every spike records:

```text
Decision: KEEP | KEEP_WITH_CONSTRAINTS | DEFER | REJECT
Capability/backend/version
Determinism or baked-output strategy
Source fidelity
Manual touch count
Reuse potential
Testing cost
License/model-weight status
Performance
Known risks
Fallback
```

## 16. Definition of Done

The package strategy is healthy when no dependency becomes a second timeline authority, no model license is implicit, rejected experiments remain rejected, and producing another reel does not require repeating GUI rig-authoring work.
