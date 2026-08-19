# Backlog

## Epic 1 - Studio Foundation

- Choose and wire the persistence layer for the schema in `db/schema.sql`.
- Add Postgres persistence for projects, chapters, reels, render jobs, assets, and audit logs.
- Generate frontend API types from OpenAPI.
- Add request ids and structured logging.
- Add stale-job watchdog.
- Add CI workflow for lint, test, build, e2e, and Storybook build.

## Epic 2 - Blessings Of Sumer Pilot

- Move Chapter 1 source metadata into persistent records.
- Expand all 18 Chapter 1 reels into detailed storyboard records.
- Establish visual bible for Enki, Nammu, Dilmun, Martu, and the Stag of the Absu.
- Render the first 60-second prototype locally.
- Review against platform safety and style consistency.

## Epic 3 - Local Rendering Pipeline

- Integrate ComfyUI image generation.
- Add TTS generation.
- Add Whisper caption timing.
- Add FFmpeg assembly.
- Persist asset manifests and render logs.

## Epic 4 - Review Workflow

- Add approval states: draft, review, approved, rendering, published.
- Add editable narration and shot prompts.
- Add per-shot asset review.
- Add export metadata for Facebook, X, TikTok, and YouTube Shorts.
