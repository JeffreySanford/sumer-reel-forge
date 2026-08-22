# Application Map

## Purpose

Sumer Reel Forge is a local-first production studio for turning long-form source material into reviewed short-form video reels. The application separates source/project documentation, persistent studio state, review UI, render orchestration, and local media generation.

## Runtime Areas

- `apps/web`: Angular studio dashboard for reel review, narration settings, shot edits, asset review, render queue actions, and platform metadata.
- `apps/api`: NestJS API for DTO validation, OpenAPI contract generation, persistence access, render-job orchestration, generated-asset review, and audit records.
- `libs/reel-core`: shared contracts, DTO-aligned types, seed data, and production constants used by web/API/tests.
- `prisma`: executable PostgreSQL schema and migrations.
- `tools/renderer`: renderer adapters, FFmpeg assembly, process supervision, API client, and status/log utilities.
- `tools/scripts`: local orchestration scripts for startup, seeding, render commands, TTS setup, watchdogs, and API e2e.
- `tools/tts`: locked Kokoro narration runtime and tests.
- `tools/chatterbox`: Chatterbox integration scripts only; heavy runtime dependencies are installed into ignored `.cache/chatterbox` by setup.
- `assets`: curated source assets and visual-bible references.
- `documentation`: architecture, operations, and project production documentation.
- `planning`: backlog, sprint plans, and roadmap decisions.

## Ownership Boundaries

- API owns database writes and audit records.
- Web owns user interaction and local preview state.
- Renderer workers own long-running media process execution but update state only through API endpoints.
- Prisma owns schema migration history.
- Documentation owns system explanation and production reference.
- Planning owns sprint intent, acceptance criteria, and sequencing.
