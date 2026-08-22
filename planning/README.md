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

## Active Plan

- [x] Sprint 000: foundation, persistence, API contract, first workflow screen, local startup, CI.
- [x] Sprint 001: editable reel production workflow and renderer-worker groundwork.
- [x] Sprint 002: first local 60-second render pipeline and production review workflow.
- [x] Sprint 003: visual bible, local production targets, and editorial Reel 1 baseline.
- [ ] Sprint 004: reproducible Kokoro narration, scored review candidate, listening approval, and final-video gate.
- [x] Sprint 005: Remotion cinematic animation proof of concept and full Reel 1 technical draft.
- [ ] Sprint 006: polish Reel 1 into the approved cinematic animation benchmark before beginning Reel 2 animation.
- [ ] Sprint 007: automate the approved Reel 1 planning/review/revision process in the Studio. The provider/runtime foundation has started in parallel with Sprint 006 because the deterministic and Ollama boundaries do not require freezing art direction.

## Current Animation Direction

Sprint 005 proved that Remotion, narration synchronization, worker orchestration, persistence, and full-reel rendering work. Sprint 006 changes the acceptance question from `can it animate?` to `is the animation style good enough to publish and repeat?`.

Use:

- `reel-01-animation-style-bible.md` for governing camera, motion, lighting, transitions, layered assets, and shot-by-shot direction;
- `reel-01-cinematic-direction-plan.md` for the reel-wide emotional arc, color script, lens/camera grammar, material motion rules, transition plan, character micro-performance, atmosphere palette, sound-to-motion cues, and shot intent cards;
- `reel-01-timing-attention-map.md` for narration-to-image pacing, shot-level attention hierarchy, motion-intensity planning, sound handoffs, and the reel's alternating movement/stillness rhythm;
- `reel-01-animation-asset-production-workflow.md` for immutable-source policy, overscan, semantic layer separation, hidden-background reconstruction, alpha cleanup, material tags, manifests, and pre-animation QC;
- `animation-asset-manifest-contract.md` for the reusable semantic/provenance contract between approved editorial art and animation scenes;
- `animation-scene-schema-v2.md` for the data-driven scene contract that should eventually drive a generic Remotion composition;
- `reel-01-animation-review-scorecard.md` for repeatable visual-quality scoring, hard-fail conditions, A/B comparisons, phone review, and publication thresholds;
- `reel-01-creative-test-strategy.md` for the creative/design testing pyramid, machine-checkable invariants, golden-frame review strategy, and human/AI review boundaries;
- `reel-01-phase-exit-plan.md` for the explicit Reel 1 phase gates from toolchain stability through benchmark approval, full-reel integration, device review, visual baselines, and automation readiness;
- `reel-01-shot-03-enki-benchmark-plan.md` for the concrete first benchmark: composition, layer list, overscan, camera amplitude, character timing, water/light behavior, transition design, A/B tests, and pass criteria;
- `reel-01-shot-03-keyframe-sheet.md` for 0/25/50/75/100% directorial checkpoints and still-frame review targets;
- `reel-01-shot-04-nammu-benchmark-plan.md` for the contrasting supernatural benchmark and the series principle that a believable physical world makes the mythology feel extraordinary;
- `sprint-006-reel-one-animation-polish.md` for the active implementation sequence;
- `sprint-007-studio-planning-automation.md` for the reusable Studio workflow and the provider/runtime work already underway;
- `remotion-cinematic-animation-roadmap.md` for the broader renderer roadmap;
- `../documentation/studio/automated-reel-planning.md` for the deterministic + optional-AI planning/review architecture;
- `../documentation/studio/ollama-planning-runtime.md` for the implemented local Ollama planning endpoint, environment variables, runtime check, and Reel 1 pilot request;
- `../documentation/studio/local-model-selection-2026-08.md` for the dated local text/vision model strategy and shell-specific environment setup.

Shot 3, Enki at the helm, is the primary benchmark. Shot 4, Nammu beneath the water, is the planned secondary benchmark because it tests the opposite visual problem: restrained numinous intervention rather than physical character presence. Both must pass before the style is propagated to all eight Reel 1 shots.

The working series principle is: **make the ordinary world believable enough that the mythology feels extraordinary.** Physical materials obey weight and inertia; supernatural imagery earns its impact by departing from those rules carefully rather than through spectacle.

## Creative Quality Automation

The repository now has a machine-readable Reel 1 creative policy plus fast Node tests. `pnpm creative:test` validates structural Reel 1 timing/captions and representative Enki/Nammu direction constraints. `pnpm workspace:check` catches Nx plugins referenced by `nx.json` but missing from `package.json` before Nx itself fails with a less useful module-resolution error.

These tests protect approved constraints such as camera limits, stillness anchors, narrator-only lip-sync policy, motion budgets, standard review markers, and Nammu's environmental-coherence treatment. They do not certify beauty or publication quality; those remain review decisions.

## Studio Automation Direction

The long-term Studio workflow should automate planning, validation, benchmark rendering, review artifact generation, revision tracking, and inheritance of approved style decisions across later reels.

The required baseline remains deterministic. The Nest API now also has an initial local Ollama provider that can discover installed models and return schema-constrained shot-plan proposals through `/api/planning`. Ollama is useful immediately as an assistant-director provider, but model output remains untrusted proposal data until deterministic validation and human review pass.

The first implementation boundary deliberately does not persist planning runs or apply proposals directly to Scene V2. The next automation slice is persistence + server-side context assembly + human review/edit before a proposal can affect rendering.

Rhubarb lip sync, Reel 2 animation, skeletal rigging, and larger animation-engine expansion remain deferred until the Reel 1 benchmark style is approved.

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
- [ ] Animation publication quality passes the Reel 1 style-bible and review-scorecard gates before animation production expands to later reels.
- [x] Provider-level planning works without an LLM and can optionally use schema-constrained local Ollama planning.
- [ ] Persisted planning/review automation works end-to-end and preserves human approval.
