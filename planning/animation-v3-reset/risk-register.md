# Animation V3 Risk Register

Status: **planning contract / automation-first revision**

Updated: **2026-08-26**

Rive remains a **deferred/optional specialist** backed by historical neutral-contract evidence; it is not the required/default hero pipeline.

Scale: Probability Low/Medium/High; Impact Low/Medium/High/Critical.

## R-001 — Actor performance changes source identity

Probability: High
Impact: Critical

Risk: source-region deformation, a skeletal rig or an ML facial backend changes Enki/another actor enough to lose approved identity.

Mitigation: immutable source receipts; identity-sensitive region QA; fixed proof states; return-to-neutral checks; human A/B; preserve accepted lower-capability baseline.

Fallback: reject the performance channel/backend rather than repainting the source until it passes.

## R-002 — Runtimes fight over transforms/time

Probability: High
Impact: High

Mitigation: Scene V3 ownership; exact FrameContext; one resolved transform tree; backend boundary tests; no wall-clock/autoplay authority.

## R-003 — Manual authoring becomes the real production bottleneck

Probability: High
Impact: Critical scope/throughput

Risk: a proof works only because a person opens Rive/Photoshop/GIMP/another editor for every actor, shot or reel.

Mitigation:

- automation-first actor-prep contract;
- record manual touch count in spike evidence;
- default production path must be headless/scriptable;
- human work is review/promotion, not recurrent construction;
- reject/fallback when automation fails rather than silently requiring repair.

Trigger: a second shot requires repeating the same GUI prep work.

## R-004 — AI semantic critic produces false confidence

Probability: High
Impact: High

Reference: Shot 3 blink/mask experiments produced technically meaningful changed pixels without human-readable performance.

Mitigation: deterministic structural checks; negative fixtures; rendered proof; human normal-speed gate; AI never sole promotion authority.

## R-005 — Source candidate and rendered bytes diverge

Probability: Medium
Impact: Critical

Mitigation: candidate → staged/baked → resolved → rendered hash binding; stale receipt rejection.

## R-006 — Automated segmentation selects the wrong semantic object

Probability: High
Impact: High

Reference: Shot 3 water and rigging recovery exposed sparse fragments, scene contamination and clipping despite source-faithful RGB.

Mitigation: region-specific structural QA; source-boundary awareness; semantic overlays; bounded search; stop instead of widening indefinitely.

## R-007 — Whole-cutout motion masquerades as character performance

Probability: High
Impact: High creative

Reference: Shot 3 breathe-calm was technically green but human review preferred the accepted counter-sway control.

Mitigation: require semantically local regions; face/crown stability; contact checks; human A/B; do not tune global scaling into a fake breath.

## R-008 — Model/backend license contaminates production

Probability: Medium-High
Impact: Critical legal/product

Risk: code may be permissively licensed while bundled model weights or auxiliary detection/landmark models are not commercially usable.

Current example: LivePortrait code is MIT, but its upstream licensing notes bundled InsightFace detection models are restricted to non-commercial research use.

Mitigation:

- machine-readable code + weights + auxiliary-model license receipt;
- production adoption blocked until all required components are commercially compatible;
- replace restricted detector/landmark components when feasible;
- exploratory spikes stay isolated from production dependencies.

## R-009 — ML facial performance is not reproducible enough

Probability: Medium-High
Impact: High

Mitigation: treat output as baked candidate; bind source/model/template/config/seed/output hashes; production consumes approved baked bytes; regeneration not required for every render.

## R-010 — Generated performance drifts outside the face/actor

Probability: High
Impact: High

Mitigation: compare control/active regions; background/vessel/camera must remain unchanged; face/head crop proof plus full-frame proof; reject contamination.

## R-011 — Package/editor licensing surprise

Probability: Medium
Impact: High

Applies to Rive editor/export plans, Spine, Live2D, Theatre and future specialist tools.

Mitigation: adoption matrix; exact versions; license checkpoint before canonical dependency; optional adapters; portable Scene V3 semantics.

## R-012 — Package/model upgrade changes approved output

Probability: High
Impact: High

Mitigation: exact versions/hashes; stale evidence detection; benchmark replay before upgrade; old approved bake/runtime retained until replacement acceptance.

## R-013 — Browser/GPU rendering differences

Probability: High
Impact: Medium-High

Mitigation: pinned golden environment; functional checks elsewhere; visual tolerances; browser/GPU/runtime receipt.

## R-014 — Test suite/AI generation slows iteration

Probability: High
Impact: High

Mitigation: L0-L4 tiers; focused tests; Nx caching; short proofs; reuse baked outputs/templates; avoid rerunning expensive model work when inputs/evidence are unchanged.

## R-015 — CI becomes development bottleneck

Probability: High
Impact: Medium

Mitigation: local-first gates, coherent pushes, quota-aware workflows, no routine GPU render in CI.

## R-016 — CI/local semantics drift

Probability: Medium
Impact: High

Mitigation: shared pnpm scripts and parity tests; no hidden CI-only quality semantics.

## R-017 — Pixi/material source decomposition is invalid

Probability: High for painterly single-frame sources
Impact: High

Mitigation: source-specific ROI QA, source reconstruction proof, human overlays; do not assume every painted material can be isolated.

## R-018 — Three/R3F makes the painting look like a game

Probability: Medium
Impact: Critical creative

Mitigation: 2.5D depth cards first, limited camera travel, no invented back geometry, human A/B.

## R-019 — Physics becomes art-direction obstacle or nondeterministic

Probability: Medium
Impact: High

Mitigation: fixed timestep, stable construction order, bake checksum, use physics only where it earns value.

## R-020 — Crowd/herd systems look cloned

Probability: High
Impact: High

Mitigation: semantic seeds, clip pools, phase/path/tool variation, synchronization metrics, negative fixtures.

## R-021 — Procedural world loses historical specificity

Probability: Medium
Impact: Critical editorial

Mitigation: source/evidence-bound city/architecture profiles; deterministic authored palettes/topology; no generic ancient-city generator as canonical authority.

## R-022 — Historical fiction is presented as fact

Probability: Medium
Impact: Critical editorial

Mitigation: adaptation classifications; literary vs archaeological evidence separation; Studio provenance; explicit uncertainty.

## R-023 — Storybook/Lab differs from Remotion production

Probability: Medium
Impact: Critical testing

Mitigation: shared Scene V3 fixtures and adapters; same proof IDs; production frame parity tests.

## R-024 — Binary/baked assets become unreviewable

Probability: High
Impact: Medium

Mitigation: small canonical binaries only; text receipts/hashes; candidates under `tmp`; selected evidence frames; Git LFS only if proven necessary.

## R-025 — Planning drifts back to package-first/manual assumptions

Probability: High
Impact: High

Mitigation:

- `automation-first-character-performance.md` is authoritative;
- roadmap/backlog/package matrix/benchmarks/phase gates are aligned;
- planning regression test rejects known stale phrases such as mandatory Rive hero runtime;
- architectural changes require documentation update in the same PR.

## Review cadence

Review this register before each new backend/model dependency, at every phase exit, after escaped visual failures and before broad Reel/Chapter migration.

New failure classes normally become both a regression fixture and a risk/mitigation update.
