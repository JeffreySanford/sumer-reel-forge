# Studio Documentation

Sumer Reel Forge is intended to become a reusable local studio for transforming long-form source material into short-form reels, shorts, and other narrated media.

## Studio Goals

- Ingest long-form source documents.
- Break source material into auditable short-form production units.
- Generate scripts, shot lists, prompts, captions, metadata, and render jobs.
- Support local-first media generation with Docker-hosted services.
- Keep review, approval, and rendering state persistent and inspectable.

## Current Applications

- `apps/web`: Angular review dashboard.
- `apps/api`: NestJS orchestration API.
- `libs/reel-core`: shared contracts and seed story data.

## Current Status

- [x] Nx workspace with Angular, NestJS, shared library, Storybook, and Playwright.
- [x] PostgreSQL runs locally through Docker Compose.
- [x] Prisma migrations define the executable persistence schema.
- [x] Chapter 1 seed data persists 18 reel records.
- [x] All 18 reels contain detailed narration, timed captions, six or more visual beats, prompts, audio direction, and platform metadata.
- [x] OpenAPI docs are exposed by the API and frontend contract types are generated into `libs/reel-core`.
- [x] Angular dashboard loads Chapter 1 reel data from the API with Storybook fallback data.
- [x] Render-job endpoints support queueing, listing, stale queries, and status transitions.
- [x] Mutating render-job actions create audit rows.
- [x] `pnpm start:all` starts Docker/Postgres, applies migrations, creates missing seed records, and launches web/API.
- [x] Normal startup and Ctrl+C preserve the named PostgreSQL volume and all existing studio content.
- [x] `pnpm start:all` cleans only repo-local Windows dev processes and ports on Ctrl+C.
- [x] API e2e runs against an isolated `_e2e` database and temporary API port.
- [x] GitHub CI validates audit, lint, tests, builds, Storybook, API e2e, and Playwright e2e.
- [x] Renderer worker persists attempts, heartbeats, structured logs, checksummed assets, and manifests.
- [x] ComfyUI, configurable TTS, Whisper, FFmpeg, deterministic mock, and curated editorial adapters are wired.
- [x] Approval and per-asset review workflows are persistent and audited.
- [x] A deterministic 60-second Reel 1 prototype has been rendered locally.
- [x] A visual-bible-driven 60-second Reel 1 editorial baseline has been rendered, reviewed, and persisted locally.
- [ ] Authentication/authorization is not implemented yet.

## Operating Principles

- Every generated reel should be traceable back to source material.
- Every render job should have durable state, timestamps, input metadata, and logs.
- Long-running jobs need heartbeat/status updates and stale-job detection.
- Frontend/backend contracts should come from OpenAPI-generated types once the API stabilizes.
- UI work should ship with unit tests, Storybook coverage, and Playwright user-flow checks.

## Local Ports

- Web: `http://localhost:4200`
- API: `http://localhost:3000/api`
- OpenAPI UI: `http://localhost:3000/api/docs`
- Postgres: configured by `POSTGRES_PORT` (default `5432`).
