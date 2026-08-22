# Chapter 1 Production Plan

The chapter is about 16,700 words and is best handled as a short-form series rather than one long video. The seed covers all 18 reels as detailed 60-second production drafts, but animation production should continue to use Reel 1, `The Voyage Begins`, as the benchmark before scaling to later reels.

## Episode Strategy

- Start with Reel 1, `The Voyage Begins`, as the benchmark reel.
- Keep approved cinematic generated stills as the visual source of truth while the animation language is refined.
- Use layered illustrated motion as the preferred animation mode.
- Use optional AI video only for hero shots where it clearly outperforms deterministic layered animation and remains visually consistent.
- Keep adult fertility myth material symbolic for public social platforms.
- Normalize names and remove draft notes before generating final captions.
- Do not begin Reel 2 animation merely because the Reel 1 technical pipeline renders successfully.

## Reel 1 Animation Gate

Sprint 005 proved the animation infrastructure. The active production gate is now visual quality.

Reel 1 should establish:

- the cinematic camera language;
- character-motion restraint;
- layered asset conventions;
- atmosphere and lighting rules;
- transition motifs;
- caption behavior over moving imagery;
- a data-driven scene schema;
- a repeatable review rubric.

Use:

- `planning/reel-01-animation-style-bible.md` for the style contract;
- `planning/sprint-006-reel-one-animation-polish.md` for the active work sequence;
- `planning/remotion-cinematic-animation-roadmap.md` for the broader technical direction.

The primary benchmark is Shot 3, Enki at the helm. A second contrasting benchmark, preferably Shot 4 or Shot 7, must also pass before the approved animation language is propagated across all eight Reel 1 shots.

## Local Pipeline Target

1. Extract chapter text from `.docx` and preserve source provenance.
2. Adapt one section into narration, captions, and shot prompts.
3. Generate or approve cinematic editorial stills.
4. Derive versioned layered animation assets from approved stills or regenerate overscanned equivalents when separation is not practical.
5. Generate narration through Kokoro, Chatterbox, or another approved local TTS path.
6. Time captions through existing timing/Whisper tooling as appropriate.
7. Build a versioned scene definition with camera, depth, motion, lighting, atmosphere, and asset references.
8. Render the scene through generic Remotion composition primitives.
9. Assemble and validate final media through the existing FFmpeg/FFprobe path.
10. Review technical media, sampled stills, motion quality, art continuity, and publishability in the studio workflow.
11. Require human approval before a Reel 1 publication candidate is treated as final.

## Current Scope

This repository currently implements the review and orchestration slice:

- [x] Shared reel contracts and seed data in `libs/reel-core`.
- [x] Nest API endpoints for chapter outline, episode details, and queued render jobs.
- [x] Angular dashboard for storyboard and generated-asset review.
- [x] Postgres persistence through Prisma migrations.
- [x] API e2e coverage for Chapter 1 reel loading.
- [x] Render-job queue/status/stale groundwork.
- [x] GitHub CI coverage for quality, Storybook, and Playwright.
- [x] Editable production fields for narration, shot prompts, and export metadata.
- [x] Renderer worker with mock and local media adapters.
- [x] Generated media asset, checksum, manifest, attempt, and log persistence.
- [x] Persistent approval and per-asset review workflow.
- [x] Deterministic Reel 1 technical MP4 verification.
- [x] Editorial Reel 1 still-image baseline.
- [x] Remotion technical proof and complete 60-second Reel 1 animation draft.
- [x] Reel 1 animation style bible and shot-by-shot motion plan.
- [ ] Layered animation-v1 asset set for the Shot 3 benchmark.
- [ ] Publication-quality Shot 3 benchmark.
- [ ] Second contrasting benchmark using the same animation language.
- [ ] Full eight-shot Reel 1 animation-v1 candidate.
- [ ] Human voice/score and final-video approval.

## Scale Decision

Chapter 1 animation production expands beyond Reel 1 only when the Reel 1 style is demonstrably repeatable.

The intended test is not whether Reel 1 can render. It already can.

The test is whether a later reel can be produced primarily by supplying new approved artwork, layered assets, scene data, narration/caption timing, and review decisions rather than creating a bespoke animation implementation.
