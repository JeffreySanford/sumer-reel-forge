# Sprint 000 - Foundation

## Goal

Create a maintainable studio foundation that can support _Blessings of Sumer_ and later projects.

## Scope

- Studio documentation tree.
- Project-specific documentation tree.
- Agile planning folder.
- Storybook configuration for Angular.
- Playwright e2e configuration for Angular.
- Docker Postgres service.
- OpenAPI documentation endpoint.
- Root pnpm scripts for common Nx workflows.

## Acceptance Criteria

- `pnpm quality` passes.
- `pnpm storybook:build` passes or has a documented blocker.
- `pnpm e2e` passes against port 4200.
- `docker compose up postgres` starts a healthy Postgres service.
- API exposes Swagger UI at `/api/docs`.
