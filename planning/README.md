# Planning

This folder captures agile planning for the studio and project-specific production work.

## Cadence

- Maintain a prioritized backlog.
- Plan work in small increments that end with a running, tested slice.
- Treat every renderer integration as infrastructure work with observability and failure handling.
- Keep acceptance criteria concrete enough to test through Nx targets.
- Separate technical renderer acceptance from art-direction acceptance.
- Do not scale a visual workflow to later reels until the benchmark reel meets the agreed quality bar.
- Automate repeatable production workflow without automating away the human editorial gate.
- Convert approved creative decisions into machine-checkable invariants where possible, while keeping taste and publication approval human-owned.
- Preserve successful technical baselines even when a later human review shows the creative quality bar has not yet been met.

## Active Plan

- [x] Sprint 000: foundation, persistence, API contract, first workflow screen, local startup, CI.
- [x] Sprint 001: editable reel production workflow and renderer-worker groundwork.
- [x] Sprint 002: first local 60-second render pipeline and production review workflow.
- [x] Sprint 003: visual bible, local production targets, and editorial Reel 1 baseline.
- [ ] Sprint 004: reproducible Kokoro narration, scored review candidate, listening approval, and final-video gate. This older editorial-audio track is no longer the active animation-quality path.
- [x] Sprint 005: Remotion cinematic animation proof of concept and full Reel 1 technical draft.
- [x] Sprint 006: establish the source-preserving layered/canonical Reel 1 Level 1 pipeline. Technical/production result passed; publication-motion quality carried forward. See `sprint-006-retrospective.md`.
- [ ] Sprint 007: automate the Reel planning/review/revision process in the Studio. Provider/runtime work may continue in parallel, but automation must not freeze Level 1 motion limits as final art direction.
- [ ] **Sprint 008: Level 2 - Living Shots. Active visual-quality milestone.** Make Reel 1 unmistakably animated through source-preserving articulated 2.5D motion, beginning with Shot 3.

## Current Animation Direction

Reel 1 has now answered the technical pipeline question decisively. The studio can resolve approved `animation-v1` assets, render all eight Scene V2 shots through the canonical `CanonicalReel1` composition, preserve approved shot timing, assemble an exact 1800-frame / 60-second reel, distribute Chatterbox narration across the full story, add continuous ambience, and preserve provenance/human-approval boundaries.

That result is the **Level 1 canonical baseline**.

Full-reel human review then exposed the next problem: Level 1 still reads primarily as still paintings with restrained camera/material motion. The next question is no longer `can it animate?` or even `can it render approved layered art?`. It is:

> **Can the approved illustrated world feel alive without sacrificing source identity, material realism, deterministic evidence, or human control?**

Sprint 008 answers that question with **Level 2 - Living Shots**.

### Level 1 - validated baseline

Level 1 includes:

- approved layered or source-backed `animation-v1` assets;
- camera motion and parallax;
- restrained material/environment motion;
- Scene V2 data-driven rendering;
- deterministic QA and evidence-aware critique;
- human promotion gates;
- canonical full-reel assembly;
- shot-aligned narration and continuous ambience.

Level 1 remains reproducible and must not be silently overwritten.

### Level 2 - active milestone

Level 2 adds source-preserving articulated 2.5D motion:

- parent/child transform relationships;
- explicit pivots and anchors;
- character micro-articulation;
- head/gaze/blink states when source-supported;
- rigid-vessel motion independent from the camera;
- rigging/cloth secondary lag;
- material/contact motion;
- depth occlusion and multi-plane parallax;
- starts, settles, inertia, and asymmetry;
- deterministic evidence that separates camera motion from actual subject/material motion.

Level 2 does **not** mean maximum movement, puppet acting, mandatory lip sync, or uncontrolled image-to-video generation.

## Level 2 Benchmark Order

1. **Shot 3 - Enki at the helm:** primary character + vessel + water benchmark.
2. **Shot 4 - Nammu beneath the water:** contrasting numinous/environmental benchmark.
3. **Shot 8 - landfall:** rigid-body + water/contact benchmark.
4. Shot 5 - hospitality + contained water.
5. Shot 7 - environmental reveal.
6. Shot 2 - coastline/vessel environment.
7. Shot 6 - deliberately restrained values montage.
8. Shot 1 - quiet atmospheric opening.

Shot-specific stillness remains valid. The full reel needs a living motion language; every shot does not need equal motion density.

## Governing Planning References

Use:

- `sprint-008-level-2-living-shots.md` for the active Level 2 implementation sequence, benchmark requirements, QA model, rollout, and exit criteria;
- `sprint-006-retrospective.md` for the Level 1 result and the reason the project advanced to Level 2;
- `sprint-006-reel-one-animation-polish.md` as the historical plan that originally defined the layered-art and restrained-motion quality target;
- `reel-01-animation-style-bible.md` for governing camera, motion, lighting, transitions, layered assets, and shot-by-shot direction;
- `reel-01-cinematic-direction-plan.md` for the reel-wide emotional arc, color script, lens/camera grammar, material motion rules, transition plan, character micro-performance, atmosphere palette, sound-to-motion cues, and shot intent cards;
- `reel-01-timing-attention-map.md` for narration-to-image pacing, shot-level attention hierarchy, motion-intensity planning, sound handoffs, and the reel's alternating movement/stillness rhythm;
- `reel-01-animation-asset-production-workflow.md` for immutable-source policy, overscan, semantic layer separation, hidden-background reconstruction, alpha cleanup, material tags, manifests, and pre-animation QC;
- `animation-asset-manifest-contract.md` for the reusable semantic/provenance contract between approved editorial art and animation scenes;
- `animation-scene-schema-v2.md` for the data-driven scene contract; Level 2 should extend it minimally and backwards-compatibly where possible;
- `reel-01-animation-review-scorecard.md` for repeatable visual-quality scoring, hard-fail conditions, A/B comparisons, phone review, and publication thresholds;
- `reel-01-creative-test-strategy.md` for the creative/design testing pyramid, machine-checkable invariants, golden-frame review strategy, and human/AI review boundaries;
- `reel-01-phase-exit-plan.md` for Reel 1 phase gates;
- `reel-01-shot-03-enki-benchmark-plan.md` and `reel-01-shot-03-keyframe-sheet.md` for the original Shot 3 framing and review checkpoints;
- `reel-01-shot-04-nammu-benchmark-plan.md` for the contrasting supernatural benchmark;
- `sprint-007-studio-planning-automation.md` for the reusable Studio workflow and provider/runtime work underway in parallel;
- `remotion-cinematic-animation-roadmap.md` for the broader renderer roadmap;
- `../documentation/projects/blessings-of-sumer/chapters/chapter-01-reel-01-animation-v1-review.md` for the full-reel Level 1 milestone review;
- `../documentation/studio/animation-pipeline.md` for the production animation architecture and Level 2 technical direction;
- `../documentation/studio/automated-reel-planning.md` for the deterministic + optional-AI planning/review architecture;
- `../documentation/studio/ollama-planning-runtime.md` for the local Ollama planning runtime;
- `../documentation/studio/local-model-selection-2026-08.md` for the dated local text/vision model strategy.

The working series principle remains: **make the ordinary world believable enough that the mythology feels extraordinary.** Physical materials obey weight, contact, lag, and inertia; supernatural imagery earns its impact by departing from those rules carefully rather than through spectacle.

## Level 2 Quality Rule

A technically valid render is not enough.

For the Shot 3 Level 2 benchmark, the candidate must visibly read as animation at normal playback speed and include at least four independently timed non-camera motion channels, at least one genuine character-articulation channel, independent rigid-vessel motion, and at least one secondary-motion relationship with lag or inertia.

The required review is an A/B against the approved Level 1 Shot 3. Level 2 does not pass unless the reviewer prefers the new candidate, can identify at least three meaningful motion improvements, and does not identify a compensating loss of source fidelity or material realism.

Aggregate frame differences do not prove this. Level 2 QA must separate camera contribution from subject/material contribution.

## Creative Quality Automation

The repository has machine-readable Reel 1 creative policy plus fast Node tests. `pnpm creative:test` validates structural timing/captions and representative direction constraints. Deterministic tests remain appropriate for source lineage, frame bounds, containment, alpha, transforms, contact relationships, and calibrated motion evidence.

Level 2 adds a new testing requirement: distinguish **what moved** from merely proving that pixels changed. Camera movement alone cannot satisfy subject/material animation evidence.

AI vision critique remains useful for perceptual review, but it must remain evidence-aware, advisory, and subordinate to deterministic facts for literal measurable claims. Human approval remains final.

## Studio Automation Direction

Sprint 007 may continue in parallel with Level 2. The long-term Studio should automate planning, validation, benchmark rendering, review artifact generation, revision tracking, and inheritance of approved style decisions.

The required baseline remains deterministic. Local Ollama may propose direction and critique evidence, but model output remains untrusted proposal data until deterministic validation and human review pass.

Planning automation should now learn from the Level 2 benchmarks. Do not encode the conservative Level 1 motion amplitudes as a permanent definition of the project style merely because they are already implemented.

## Level 3 Boundary

Selective image-to-video or other generative motion is deferred until the Level 2 Shot 3/4/8 benchmarks pass.

A future Level 3 experiment may be useful for difficult organic motion, but it must enter through the same candidate, provenance, review, and promotion discipline. It is not the current critical path.

## Deferred Until Level 2 Approval

- Reel 2 animation production.
- Full narrator lip sync.
- Large generalized skeletal-rig authoring system.
- Broad WebGL/PixiJS migration without measured need.
- Uncontrolled generative-video production.
- Generalized animation-engine expansion without a concrete Level 2 benchmark requirement.

Bounded local articulation, pivots, transform hierarchies, secondary lag, and optional deformation are **not** deferred; they are now in scope where Shot 3 demonstrates a concrete need.

## Definition Of Done

- [x] Code is linted.
- [x] Unit tests pass.
- [x] Builds pass.
- [x] E2E tests pass for user-facing workflows.
- [x] Storybook stories exist for new UI surfaces.
- [x] API DTOs are validated.
- [x] Mutating behavior is auditable or explicitly documented as temporary.
- [x] Long-running processes have timeout and heartbeat behavior.
- [x] CI has bounded runtimes for steps that can hang.
- [x] Workspace/Nx plugin configuration has an explicit consistency check.
- [x] Initial Reel 1 machine-checkable creative guardrails run as tests.
- [x] Level 1 canonical Reel 1 production pipeline is complete and reproducible.
- [ ] Shot 3 Level 2 benchmark is human-approved as unmistakably animated and source-faithful.
- [ ] Shot 4 proves the same richer system can preserve numinous environmental motion without puppet animation.
- [ ] Shot 8 proves rigid-body/environment contact motion.
- [ ] Full 60-second Level 2 Reel 1 no longer reads primarily as still imagery with minor animation.
- [ ] Animation publication quality passes the Reel 1 scorecard before animation production expands to Reel 2.
- [x] Provider-level planning works without an LLM and can optionally use schema-constrained local Ollama planning.
- [ ] Persisted planning/review automation works end-to-end and preserves human approval.
