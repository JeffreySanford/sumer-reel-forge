# Animation V3 Phase Exit Checklists

Status: **planning contract / automation-first revision**

Updated: **2026-08-26**

A phase is complete only when applicable local/CI/render/human evidence is green. Character phases also require a scalable automation gate: normal production may not depend on recurring GUI rig authoring.

Common evidence:

```text
LOCAL_FOCUSED_GREEN
LOCAL_PHASE_GREEN
CI_GREEN
RENDER_PROOF_GREEN
HUMAN_APPROVED
AUTOMATION_REUSE_GREEN
LICENSE_GREEN
```

## Phase 0 — architecture/planning

Exit requires authority, provenance, testing, promotion and automation doctrine to be explicit. Current planning lock is complete; later architecture changes update the same authority docs rather than preserving contradictory package assumptions.

## Phase 1 — historical sources

Exit: source library/build/tests + production-relevant evidence corpus + Angular provenance UX + local/CI green.

## Phase 2 — Scene V3/frame/compiler

Exit: deterministic frame/context, schema positives/negatives, runtime registry, resolved-scene hashes and V2 compatibility all green. No visual runtime is required for this phase.

## Phase 3 — Animation Lab

Exit: exact-frame controls, shared fixtures, Storybook/unit/E2E, inspection fallback and browser proof green. Lab does not gain story-time authority.

## Phase 4 — Pixi/source-backed 2D proof

Deliverables include exact-frame Pixi ownership, source/hash registration, source-backed visual proof and at least one material/local-deformation capability that passes its own source and human gates.

Current Shot 3 evidence:

```text
ACCEPT: camera + vessel heave/roll + Enki counter-sway
REJECT: blink overlays, water extraction, rigging extraction, whole-cutout breathing
```

Rejected channels do not become phase requirements simply because they were in the original plan.

Exit requires:

```text
LOCAL_PHASE_GREEN
CI_GREEN
RENDER_PROOF_GREEN
HUMAN_APPROVED
```

and a source-backed Pixi capability that visibly earns its use.

## Phase 5 — automated hero actor preparation/performance

This replaces the old mandatory Rive hero-runtime phase.

### Deliverables

- engine-neutral `ActorPrepDefinition`/evidence contract;
- automated source/hash/dimension preparation;
- semantic regions/landmarks/anchors with confidence/failure states;
- backend mapping independent of Scene V3 semantics;
- reusable performance template/bake contract;
- one Enki facial-performance benchmark or explicitly accepted lower-capability fallback;
- provenance/license receipts for any ML backend;
- no recurring GUI editor requirement.

### Unit/contract

- source hash stability;
- actor-prep schema validation;
- region/anchor bounds/confidence;
- backend capability compatibility;
- no autonomous timing;
- bake/template hash validation;
- stale evidence rejection;
- unresolved model-license rejection.

### Visual/motion

- neutral/source identity;
- facial control vs active A/B when facial backend is tested;
- OPEN/CLOSED/RETURNED_OPEN semantic proof for blink candidate;
- normal-speed motion proof;
- no camera/background/body-root contamination.

### Human

- identity preserved;
- performance readable/natural;
- preferred to accepted lower-capability baseline when promotion claims improvement.

### Automation

```text
[ ] no per-shot Rive/Photoshop/manual rig step
[ ] same actor-prep packet reusable in a second scene
[ ] failed automation produces rejection/fallback, not required hand repair
```

### License

If LivePortrait or another model backend is evaluated, all code/weights/auxiliary-model licensing must be green for intended production. LivePortrait remains production-blocked until the bundled InsightFace non-commercial model issue is replaced/resolved.

Exit:

```text
LOCAL_PHASE_GREEN
CI_GREEN
RENDER_PROOF_GREEN
HUMAN_APPROVED
AUTOMATION_REUSE_GREEN
LICENSE_GREEN    # when external model/backend is part of accepted path
```

### Rive optional subgate

Rive is not required. Existing neutral contract/prep evidence may be reused if Rive is revisited. A Rive spike can pass only if one-time authoring is reusable and production after authoring is fully headless.

## Phase 6 — Three/R3F spatial runtime

Exit requires painted-depth-card/source-safe spatial proof, exact camera state, no unapproved geometry exposure and human preference.

## Phase 7 — combined Enki-at-Helm V3 proof

Deliverables are backend-neutral:

- accepted actor state/performance backend;
- accepted vessel/environment/material/spatial capabilities as source supports;
- shared Scene V3;
- exact source/runtime/backend receipts;
- multiple meaningful non-camera contributions.

Do not force a failed Shot 3 water/rigging extraction or Rive merely to satisfy an old ownership map.

Required A/B: accepted lower-capability baseline vs combined candidate.

Exit:

```text
LOCAL_PHASE_GREEN
CI_GREEN
RENDER_PROOF_GREEN
HUMAN_APPROVED
```

## Phase 8 — fixed-step/baked physics

Exit requires fixed timestep, repeatable bake checksum, source/runtime receipt, bounded/art-directable physical response and human proof.

## Phase 9 — crowd/work runtime

Exit requires deterministic scheduling, anti-clone variation, performance budget and human readability.

## Phase 10 — animal/herd strategy

Start with data-driven/native/instanced strategy; optional skeletal package only if benchmark value and automation/license cost justify it.

## Phase 11 — CityKit/world states

Exit requires deterministic topology/development state, source/evidence bindings and persistent city identity.

## Phase 12 — montage

Exit requires explicit segments, continuity, deterministic transitions and no hidden real-time stretching.

## Phase 13 — optional visual-authoring bridge

Any Theatre/GUI authoring path must export deterministic Scene V3 data and demonstrate enough reusable benefit to justify manual work. It cannot be required for routine reel generation.

## Phase 14 — unified QA/evidence

Common receipts cover source/runtime/backend/model/bake identities, proof states, deterministic metrics, semantic review, human decision and stale evidence.

## Phase 15 — Reel 1 V3 migration

Shot-by-shot A/B, no timing/source drift without explicit editorial change, per-shot receipts, and human review. Repeated actor preparation should reuse approved actor profiles automatically.

## Phase 16/17 — Chapters 2/3 production readiness

All actor/crowd/world capabilities inherit the automation doctrine. Production readiness includes throughput/reuse, not merely one successful manually-authored demo.

## Universal stop conditions

```text
runtime/backend ownership ambiguous
same exact frame/evidence resolves differently
local/CI semantic commands drift
source or bake hashes stale
unresolved license/model rights
manual GUI work becomes recurring default production dependency
performance exceeds iteration budget by >2x
visual quality repeatedly fails despite technical green
new failure class bypasses existing gates
```

A stop condition preserves the accepted baseline and produces evidence; it does not trigger a manual cleanup obligation.
