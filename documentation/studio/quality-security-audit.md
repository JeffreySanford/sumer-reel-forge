# Quality, Security, And Audit Plan

## Required Gates

- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`
- `pnpm storybook:build`
- `pnpm security:audit`

CI runs these gates through Nx plus Storybook and Playwright. Local development can use
`pnpm quality` for lint/test/build and then run the focused Storybook, e2e, and audit
commands when preparing a pull request.

## Current Gate Status

- [x] Focused API, web, shared-contract, API e2e, and Playwright checks passed locally on August 19, 2026.
- [x] `pnpm start:all` starts Postgres, API, and web locally.
- [x] Ctrl+C cleanup was verified locally for ports `3000`, `4200`, and `9229`.
- [x] GitHub CI run `32317667267` passed on `master` for the Sprint 002 checkpoint.
- [x] API e2e uses a dedicated `_e2e` database and temporary API port 3100.
- [x] API e2e verifies that routine seeding preserves edits and explicit refresh restores seed content.
- [x] Sprint 003 local gates passed on August 19, 2026: Nx quality, isolated API e2e, Storybook build, Chromium/Firefox Playwright, and production dependency audit.
- [x] GitHub CI run `32320162368` passed on `master` for Sprint 003 with `pnpm/action-setup@v6` and no deprecated action-runtime annotation.
- [x] CI has timeouts for the overall quality job, API e2e, Storybook build, Playwright install, and web e2e.
- [x] GitHub Dependabot alerts are closed as of August 22, 2026.

## Security Baseline

- Validate every write DTO with `class-validator`.
- Keep CORS explicit per environment.
- Never expose local filesystem paths or model logs to public clients without authorization.
- Persist render commands as structured arguments, not interpolated shell strings.
- Store secrets in environment variables, never source files.
- Use Prisma migrations for PostgreSQL schema changes and generated Prisma types for the persistence boundary.
- Use generated OpenAPI types from `@sumer-reel-forge/reel-core` for frontend/API contract sharing.

## Dependency Audit

`pnpm security:audit` fails on high-severity production dependency advisories. Full
development audits are also reviewed before merge. The Angular/Nx toolchain can pull
optional Less dependencies that are not used by this application; unused vulnerable
optional packages are removed from the resolved graph with pnpm overrides.

- Do not process untrusted Less/image metadata through the build pipeline.
- Prefer SCSS/CSS and Angular component styles for authored UI work.
- Keep `pnpm audit --audit-level high` clean.
- Keep `pnpm security:audit` clean.
- Keep pnpm overrides only when the dependency is unused or a compatible patched transitive version exists.

## Audit Baseline

Every mutating API action should eventually emit an audit record:

- actor id or local system actor
- action name
- entity type and id
- before/after summary where relevant
- request id
- timestamp

The Chapter 1 seed script writes audit rows only when it creates or explicitly refreshes content. Routine startup seeding is create-only for existing reels and shots. Render jobs persist status, heartbeat, attempts, bounded logs, artifact checksums, and manifests.

## Stuck Process Detection

Render workers should update heartbeat rows while running. A scheduled watchdog should detect:

- jobs stuck in `queued`
- jobs stuck in `running`
- processes with no heartbeat
- missing output files after successful process exit
- stderr growth beyond a configured threshold

Current implementation status:

- [x] Render jobs have heartbeat/status fields.
- [x] API exposes stale render-job query groundwork.
- [x] API exposes status transition endpoint groundwork.
- [x] `start:all` has local process cleanup for dev server listeners.
- [x] Command-driven watchdog script is available through `pnpm render:watchdog`.
- [x] Worker heartbeat loop scaffold is available through `pnpm renderer:worker`.
- [x] Every worker attempt persists worker id, heartbeat, completion/failure state, and error text.
- [x] Renderer stdout, stderr, and system events persist as bounded structured log rows.
- [x] External process execution uses argument arrays, no shell interpolation, and configurable timeouts.
- [x] Failed jobs can be requeued while preserving prior attempt history.
- [ ] OS-level scheduled watchdog service is not installed yet.
- [x] Renderer process supervision is implemented for FFmpeg, TTS, and Whisper command adapters.
