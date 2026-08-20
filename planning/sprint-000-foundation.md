# Sprint 000 - Foundation

## Goal

Create a maintainable studio foundation that can support _Blessings of Sumer_ and later projects.

## Scope

- [x] Studio documentation tree.
- [x] Project-specific documentation tree.
- [x] Agile planning folder.
- [x] Storybook configuration for Angular.
- [x] Playwright e2e configuration for Angular.
- [x] Docker Postgres service.
- [x] OpenAPI documentation endpoint.
- [x] Root pnpm scripts for common Nx workflows.
- [x] Prisma persistence for projects, chapters, reels, render jobs, assets, and audit logs.
- [x] Chapter 1 seed script for 18 reels.
- [x] Frontend API integration for Chapter 1 reels and selected reel details.
- [x] Typed OpenAPI contract generation into `libs/reel-core`.
- [x] Render-job API groundwork with stale-job query and status transitions.
- [x] `start:all` stack bootstrap with dependency freshness checks, Docker startup, migration, seed, API, and web.
- [x] Windows Ctrl+C cleanup for repo-local dev processes and managed ports.
- [x] Persistent PostgreSQL data and edited reel content survive normal startup and Ctrl+C cleanup.
- [x] Default seeding creates missing records only; destructive seed refresh requires an explicit command.
- [x] CI workflow for security audit, lint, test, build, API e2e, Storybook build, Playwright install, and web e2e.
- [x] CI timeouts for long-running quality, Storybook, Playwright, and e2e steps.

## Acceptance Criteria

- [x] `pnpm quality` passes locally.
- [x] `pnpm storybook:build` passes in CI.
- [x] `pnpm e2e` passes in CI against port 4200.
- [x] `docker compose up postgres` starts a healthy Postgres service.
- [x] API exposes Swagger UI at `/api/docs`.
- [x] CI passed on `master` for run `32291308057`.
