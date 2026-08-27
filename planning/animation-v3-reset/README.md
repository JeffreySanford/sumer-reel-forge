# Animation V3 Reset — Planning Index

Status: **active implementation; automation-first character policy adopted**

Updated: **2026-08-26**

Sumer Reel Forge V3 is a deterministic historical-fiction animation platform, not a collection of bespoke Remotion scripts and not a pipeline that requires manual animation-editor work for every reel.

The reset preserves:

- immutable editorial/source authority;
- candidate-only experimental generation under `tmp/`;
- checksum/provenance binding;
- deterministic exact-frame evaluation;
- explicit promotion/rollback;
- independent structural/semantic QA;
- normal-speed human review as final visual gate.

It now also makes production automation explicit:

> **Default reel production must be headless/scriptable. Human work is review/approval, not recurring rig/asset repair.**

## Current authority order

When planning documents disagree, use this order:

1. [`current-implementation-status-and-roadmap.md`](./current-implementation-status-and-roadmap.md) — what is actually implemented/accepted/rejected now.
2. [`automation-first-character-performance.md`](./automation-first-character-performance.md) — production doctrine for actor preparation/performance.
3. [`implementation-backlog.md`](./implementation-backlog.md) — active next work and phase status.
4. [`package-adoption-matrix.md`](./package-adoption-matrix.md) — package/backend adoption and license gates.
5. [`phase-exit-checklists.md`](./phase-exit-checklists.md) — phase completion evidence.
6. [`benchmark-specifications.md`](./benchmark-specifications.md) — capability benchmarks independent of package choice.
7. actor/source-specific bibles and contracts.
8. older architecture/spike documents as historical design context where not superseded above.

Earlier Rive-first language is therefore **not** a production requirement. Rive is a deferred optional specialist adapter unless a future benchmark explicitly promotes it.

## Core architecture

```text
manuscript + historical/visual sources
        ↓
Scene V3 semantic definitions
        ↓
resolved deterministic state
        ↓
exact FrameContext
        ↓
actor/material/spatial capability state
        ↓
approved adapter or baked candidate
        ↓
Remotion production rendering
        ↓
QA + human review + promotion
```

## Current execution summary

```text
Phase 0  planning lock                         COMPLETE
Phase 1  historical sources                    PARTIAL
Phase 2  Scene V3/compiler/runtime             CORE COMPLETE
Phase 3  Animation Lab                         CORE COMPLETE
Phase 4  Pixi/source-backed Shot 3             PARTIAL; ACCEPTED BASELINE
Phase 5  automated actor prep/performance      STARTED
Phase 6  Three/R3F                             NOT STARTED
Phase 7  combined Reel 1 V3                    NOT STARTED
```

Shot 3 currently accepts camera + vessel heave/roll + Enki counter-sway. Blink overlays, whole-cutout breathing, water extraction and rigging extraction are rejected/disabled evidence.

The Rive neutral-contract experiment is retained, but manual `.riv` creation and Rive runtime installation are no longer on the critical path.

## Primary planning contracts

### Story / provenance

- [`narrative-source-map.md`](./narrative-source-map.md)
- [`historical-visual-research-workflow.md`](./historical-visual-research-workflow.md)
- [`historical-period-visual-policy.md`](./historical-period-visual-policy.md)
- [`visual-evidence-application-contract.md`](./visual-evidence-application-contract.md)
- [`production-source-sheet-specification.md`](./production-source-sheet-specification.md)

### Animation semantics / architecture

- [`level-2-specification.md`](./level-2-specification.md)
- [`level-3-architecture.md`](./level-3-architecture.md)
- [`scene-v3-contract-design.md`](./scene-v3-contract-design.md)
- [`spatial-coordinate-transform-standard.md`](./spatial-coordinate-transform-standard.md)
- [`actor-performance-clip-contract.md`](./actor-performance-clip-contract.md)
- [`runtime-adapter-evidence-contract.md`](./runtime-adapter-evidence-contract.md)
- [`automation-first-character-performance.md`](./automation-first-character-performance.md)

### Character / vessel / material bibles

- [`enki-character-bible-v1.md`](./enki-character-bible-v1.md)
- [`enlil-character-bible-v1.md`](./enlil-character-bible-v1.md)
- [`character-costume-rig-bible.md`](./character-costume-rig-bible.md)
- [`stag-vessel-bible-v1.md`](./stag-vessel-bible-v1.md)
- [`water-material-system-bible.md`](./water-material-system-bible.md)

### Implementation / testing / promotion

- [`current-implementation-status-and-roadmap.md`](./current-implementation-status-and-roadmap.md)
- [`implementation-backlog.md`](./implementation-backlog.md)
- [`phase-exit-checklists.md`](./phase-exit-checklists.md)
- [`package-adoption-matrix.md`](./package-adoption-matrix.md)
- [`runtime-spike-playbooks.md`](./runtime-spike-playbooks.md)
- [`benchmark-specifications.md`](./benchmark-specifications.md)
- [`benchmark-acceptance-packets.md`](./benchmark-acceptance-packets.md)
- [`testing-provenance-roadmap.md`](./testing-provenance-roadmap.md)
- [`quality-gates-local-ci.md`](./quality-gates-local-ci.md)
- [`test-command-manifest.md`](./test-command-manifest.md)
- [`risk-register.md`](./risk-register.md)
- [`review-promotion-workflow.md`](./review-promotion-workflow.md)
- [`benchmark-proof-receipt-schema.md`](./benchmark-proof-receipt-schema.md)
- [`render-failure-triage-playbook.md`](./render-failure-triage-playbook.md)

### Studio / production / delivery

- [`animation-lab-storybook-contract.md`](./animation-lab-storybook-contract.md)
- [`studio-information-architecture.md`](./studio-information-architecture.md)
- [`local-developer-environment.md`](./local-developer-environment.md)
- [`master-production-board.md`](./master-production-board.md)
- [`migration-release-strategy.md`](./migration-release-strategy.md)
- [`reel-assembly-release-specification.md`](./reel-assembly-release-specification.md)
- [`performance-render-budget.md`](./performance-render-budget.md)

## Package/backend principle

Packages are replaceable implementation details. Scene V3 semantic performance must survive switching from a deterministic source-region adapter to a baked facial backend or an optional specialist rig.

Any ML backend must bind code/model/template/output hashes and commercial license evidence. A permissive code license does not automatically make bundled weights or auxiliary models production-safe.

## Human gate

A green automated test proves the contract it tests. It does not prove human visual acceptance.

Conversely, human review should decide **accept/reject**, not be required to manually repair every rejected candidate. That distinction is central to scaling from one Shot 3 proof to many reels.
