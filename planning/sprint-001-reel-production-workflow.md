# Sprint 001 - Reel Production Workflow

## Goal

Turn the current review/orchestration slice into a usable production workflow for the first _Blessings of Sumer_ reel.

## Current Status

- [x] Angular dashboard loads Chapter 1 reels from the Nest API.
- [x] API persists Chapter 1 reel metadata in Postgres.
- [x] OpenAPI-generated types are available from `libs/reel-core`.
- [x] Render jobs can be created, listed, queried for stale status, and transitioned through status endpoints.
- [x] Mutating render-job actions write audit rows.
- [x] Local stack starts through `pnpm start:all`.
- [x] Ctrl+C cleanup clears repo-local dev listeners on `3000`, `4200`, and `9229` on Windows.
- [x] GitHub CI validates security audit, lint, tests, builds, Storybook, API e2e, and web e2e.

## Planned Work

- [ ] Add editable episode production fields for narration, shot list, visual prompts, caption text, and export metadata.
- [ ] Add API endpoints and DTO validation for saving reel production edits.
- [ ] Add optimistic UI state and error handling for save/edit flows.
- [ ] Add Storybook stories for the reel workflow states: loading, empty, populated, save error, render queued.
- [ ] Add Playwright coverage for selecting a reel, editing production fields, copying prompts, and queueing a render job.
- [ ] Add request ids and structured logs to API requests and mutating actions.
- [ ] Add a scheduled or command-driven watchdog that transitions stale render jobs and writes audit rows.
- [ ] Add renderer-worker project scaffold with no-op job claiming, heartbeat updates, and graceful shutdown.
- [ ] Add asset manifest persistence for generated images, audio, captions, and final video files.
- [ ] Document local renderer prerequisites for ComfyUI, TTS, Whisper, and FFmpeg.

## Acceptance Criteria

- [ ] `pnpm quality` passes.
- [ ] `pnpm e2e:api` passes.
- [ ] `pnpm storybook:build` passes.
- [ ] `pnpm e2e` passes.
- [ ] CI passes on `master`.
- [ ] A user can edit and save the first reel's production fields.
- [ ] A user can queue a render job from the first reel workflow screen.
- [ ] Stale render jobs can be detected without manually querying the database.
