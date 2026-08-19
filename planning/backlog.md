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

## Epic 2 - Blessings Of Sumer Pilot

- [x] Move Chapter 1 source metadata into persistent records.
- [x] Seed all 18 Chapter 1 reel records.
- [ ] Expand all 18 Chapter 1 reels into detailed storyboard records.
- [ ] Establish visual bible for Enki, Nammu, Dilmun, Martu, and the Stag of the Absu.
- [ ] Render the first 60-second prototype locally.
- [ ] Review against platform safety and style consistency.

## Epic 3 - Local Rendering Pipeline

- [x] Scaffold renderer worker script.
- [x] Add no-op render job claiming and heartbeat updates.
- [ ] Integrate ComfyUI image generation.
- [ ] Add TTS generation.
- [ ] Add Whisper caption timing.
- [ ] Add FFmpeg assembly.
- [x] Persist asset manifests.
- [ ] Persist renderer stdout/stderr logs.

## Epic 4 - Review Workflow

- [ ] Add approval states: draft, review, approved, rendering, published.
- [x] Add editable narration and shot prompts.
- [ ] Add per-shot asset review.
- [x] Add export metadata for Facebook, X, TikTok, and YouTube Shorts.
- [x] Add copy/export controls for prompts and platform metadata.
