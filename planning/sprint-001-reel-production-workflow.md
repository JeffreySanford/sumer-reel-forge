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

- [x] Add editable episode production fields for narration, shot list, visual prompts, caption text, and export metadata.
- [x] Add API endpoints and DTO validation for saving reel production edits.
- [x] Add optimistic UI state and error handling for save/edit flows.
- [x] Add Storybook stories for the reel workflow states: loading, empty, populated, save error, render queued.
- [x] Add Playwright coverage for selecting a reel, editing production fields, copying prompts, and queueing a render job.
- [x] Add request ids and structured logs to API requests and mutating actions.
- [x] Add a scheduled or command-driven watchdog that transitions stale render jobs and writes audit rows.
- [x] Add renderer-worker script scaffold with no-op job claiming, heartbeat updates, and graceful shutdown.
- [x] Add asset manifest persistence for generated images, audio, captions, and final video files.
- [x] Document local renderer prerequisites for ComfyUI, TTS, Whisper, and FFmpeg.

## Implementation Status

- [x] Editable production draft UI is implemented for narration, prompts, captions, audio direction, platform notes, and export metadata.
- [x] Save/edit API endpoint is implemented with nested DTO validation.
- [x] Storybook includes populated, empty, save-error, render-queued, and loading-fixture stories.
- [x] Playwright includes edit, copy, save, and queue coverage with mocked API routes.
- [x] API request IDs are generated, returned, logged, and passed into audit rows for mutating actions.
- [x] Command-driven stale-job watchdog endpoint and script are implemented.
- [x] Renderer worker scaffold claims jobs, sends heartbeats, creates a manifest asset, and completes/fails jobs.
- [x] Asset manifest persistence is implemented.
- [x] Local renderer prerequisite documentation is started.
- [ ] Real media generation adapters are pending.
- [ ] OS-level watchdog scheduling is pending.

## Acceptance Criteria

- [x] `pnpm quality` passes.
- [x] `pnpm e2e:api` passes.
- [x] `pnpm storybook:build` passes.
- [x] `pnpm e2e` passes.
- [x] CI passes on `master`.
- [x] A user can edit and save the first reel's production fields.
- [x] A user can queue a render job from the first reel workflow screen.
- [x] Stale render jobs can be detected without manually querying the database.
