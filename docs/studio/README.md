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
