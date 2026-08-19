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
development audits are still reviewed, but the current Angular/Storybook toolchain pulls
`image-size` through Less build tooling and the advisory has no patched release available.
Mitigations until upstream packages publish a fixed path:

- Do not process untrusted Less/image metadata through the build pipeline.
- Prefer SCSS/CSS and Angular component styles for authored UI work.
- Keep `pnpm audit --json` output in sprint review when dependency updates are planned.
- Keep pnpm overrides for advisories with patched transitive versions.

## Audit Baseline

Every mutating API action should eventually emit an audit record:

- actor id or local system actor
- action name
- entity type and id
- before/after summary where relevant
- request id
- timestamp

The Chapter 1 seed script writes an initial `audit_logs` row, and render jobs persist
status plus heartbeat fields for future watchdog checks.

## Stuck Process Detection

Render workers should update heartbeat rows while running. A scheduled watchdog should detect:

- jobs stuck in `queued`
- jobs stuck in `running`
- processes with no heartbeat
- missing output files after successful process exit
- stderr growth beyond a configured threshold
