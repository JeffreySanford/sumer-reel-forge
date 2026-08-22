# Planning

This folder captures agile planning for the studio and project-specific production work.

## Cadence

- Maintain a prioritized backlog.
- Plan work in small increments that end with a running, tested slice.
- Treat every renderer integration as infrastructure work with observability and failure handling.
- Keep acceptance criteria concrete enough to test through Nx targets.
- Separate technical renderer acceptance from art-direction acceptance.
- Do not scale a visual workflow to later reels until the benchmark reel meets the agreed quality bar.

## Active Plan

- [x] Sprint 000: foundation, persistence, API contract, first workflow screen, local startup, CI.
- [x] Sprint 001: editable reel production workflow and renderer-worker groundwork.
- [x] Sprint 002: first local 60-second render pipeline and production review workflow.
- [x] Sprint 003: visual bible, local production targets, and editorial Reel 1 baseline.
- [ ] Sprint 004: reproducible Kokoro narration, scored review candidate, listening approval, and final-video gate.
- [x] Sprint 005: Remotion cinematic animation proof of concept and full Reel 1 technical draft.
- [ ] Sprint 006: polish Reel 1 into the approved cinematic animation benchmark before beginning Reel 2 animation.

## Current Animation Direction

Sprint 005 proved that Remotion, narration synchronization, worker orchestration, persistence, and full-reel rendering work. Sprint 006 changes the acceptance question from `can it animate?` to `is the animation style good enough to publish and repeat?`.

Use:

- `reel-01-animation-style-bible.md` for governing camera, motion, lighting, transitions, layered assets, and shot-by-shot direction;
- `reel-01-cinematic-direction-plan.md` for the reel-wide emotional arc, color script, lens/camera grammar, material motion rules, transition plan, character micro-performance, atmosphere palette, sound-to-motion cues, and shot intent cards;
- `reel-01-animation-review-scorecard.md` for repeatable visual-quality scoring, hard-fail conditions, A/B comparisons, phone review, and publication thresholds;
- `reel-01-shot-03-enki-benchmark-plan.md` for the concrete first benchmark: composition, layer list, overscan, camera amplitude, character timing, water/light behavior, transition design, A/B tests, and pass criteria;
- `sprint-006-reel-one-animation-polish.md` for the active implementation sequence;
- `remotion-cinematic-animation-roadmap.md` for the broader renderer roadmap.

Shot 3, Enki at the helm, is the primary benchmark. A second contrasting scene, preferably Nammu beneath the water or the Dilmun reveal, must also pass before the style is propagated to all eight Reel 1 shots.

Rhubarb lip sync, Reel 2 animation, skeletal rigging, and larger animation-engine expansion are deferred until the Reel 1 benchmark style is approved.

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
- [ ] Animation publication quality passes the Reel 1 style-bible and review-scorecard gates before animation production expands to later reels.
