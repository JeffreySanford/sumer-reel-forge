# Backlog

## Epic 1 - Studio Foundation

- [x] Choose and wire the persistence layer for the schema in `db/schema.sql`.
- [x] Add Postgres persistence for projects, chapters, reels, render jobs, assets, and audit logs.
- [x] Generate frontend API types from OpenAPI.
- [x] Add request ids and structured logging.
- [x] Add stale-job query groundwork.
- [x] Add command-driven stale-job watchdog automation.
- [ ] Add OS-level scheduled stale-job watchdog service.
- [x] Add CI workflow for security audit, lint, test, build, API e2e, Storybook build, and web e2e.
- [x] Add bounded CI timeouts for long-running steps.
- [x] Add `start:all` local stack script.
- [x] Add Windows Ctrl+C process and port cleanup for `start:all`.
- [x] Make normal startup seeding non-destructive and preserve the PostgreSQL volume on shutdown.
- [x] Isolate API e2e data in a dedicated `_e2e` database and temporary API process.

## Epic 2 - Blessings Of Sumer Pilot

- [x] Move Chapter 1 source metadata into persistent records.
- [x] Seed all 18 Chapter 1 reel records.
- [x] Expand all 18 Chapter 1 reels into detailed storyboard records.
- [x] Establish visual bible for Enki, Nammu, Dilmun, Martu, and the Stag of the Absu.
- [x] Render the first deterministic 60-second technical prototype locally.
- [x] Render the first editorial prototype with approved generated imagery and provisional narration.
- [x] Review the editorial baseline against platform safety and style consistency.
- [x] Replace Windows narration in the review candidate with project-local Kokoro.
- [x] Add and technically validate the deterministic ambience score candidate.
- [ ] Complete human voice/score listening approval and render the final-video candidate.

## Epic 3 - Local Rendering Pipeline

- [x] Scaffold renderer worker script.
- [x] Add no-op render job claiming and heartbeat updates.
- [x] Integrate ComfyUI image generation adapter.
- [x] Add configurable command-driven TTS adapter.
- [x] Add Whisper caption timing adapter.
- [x] Add FFmpeg assembly.
- [x] Persist asset manifests.
- [x] Persist renderer stdout/stderr logs.
- [x] Persist retry attempts and failure history.
- [x] Add deterministic mock renderer and prerequisite preflight.
- [x] Add curated editorial renderer with motion, timed captions, title treatment, media validation, and persisted manifests.
- [x] Add locked Kokoro setup, voice auditions, checksum-verified model cache, and Python quality gates.
- [x] Bound verbose renderer failures to the API status-note contract while retaining full chunked logs.

## Epic 4 - Review Workflow

- [x] Add approval states: draft, review, approved, rendering, published.
- [x] Add editable narration and shot prompts.
- [x] Add per-shot asset review.
- [x] Add approve, reject, regenerate, review-note, preview, and failed-job retry controls.
- [x] Add export metadata for Facebook, X, TikTok, and YouTube Shorts.
- [x] Add copy/export controls for prompts and platform metadata.

## Epic 5 - Cinematic Animation Pipeline

- [x] Add Remotion proof renderer for vertical MP4 output.
- [x] Define layered cinematic scene schema.
- [x] Add animation adapter to the renderer worker.
- [x] Add short cinematic style-test render loop.
- [x] Add contact-sheet style-review artifact generation.
- [x] Add Markdown style-review report generation.
- [x] Persist cinematic style-review artifacts through generated-asset API.
- [x] Add second motion-proof review for shot-to-shot animation language.
- [x] Add complete 60-second Reel 1 Remotion animation draft.
- [x] Route full Reel 1 animation draft through the renderer worker.
- [ ] Add Rhubarb Lip Sync integration for mouth-shape timing.
- [ ] Add character asset conventions for pose, eye, mouth, and expression layers.
- [x] Persist animation manifests with scene version and asset checksums.
- [x] Review animated generated assets in the existing studio dashboard.
