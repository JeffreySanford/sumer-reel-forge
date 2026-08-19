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
- [x] OpenAPI docs are exposed by the API and frontend contract types are generated into `libs/reel-core`.
- [x] Angular dashboard loads Chapter 1 reel data from the API with Storybook fallback data.
- [x] Render-job endpoints support queueing, listing, stale queries, and status transitions.
- [x] Mutating render-job actions create audit rows.
- [x] `pnpm start:all` starts Docker/Postgres, applies migrations, seeds data, and launches web/API.
- [x] `pnpm start:all` cleans repo-local Windows dev processes and ports on Ctrl+C.
- [x] GitHub CI validates audit, lint, tests, builds, Storybook, API e2e, and Playwright e2e.
- [ ] Renderer worker is not implemented yet.
- [ ] ComfyUI, TTS, Whisper, and FFmpeg integrations are not wired yet.
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
- Postgres: `localhost:5432`
