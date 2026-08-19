# Quality, Security, And Audit Plan

## Required Gates

- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`
- `pnpm storybook:build`

## Security Baseline

- Validate every write DTO with `class-validator`.
- Keep CORS explicit per environment.
- Never expose local filesystem paths or model logs to public clients without authorization.
- Persist render commands as structured arguments, not interpolated shell strings.
- Store secrets in environment variables, never source files.

## Audit Baseline

Every mutating API action should eventually emit an audit record:

- actor id or local system actor
- action name
- entity type and id
- before/after summary where relevant
- request id
- timestamp

## Stuck Process Detection

Render workers should update heartbeat rows while running. A scheduled watchdog should detect:

- jobs stuck in `queued`
- jobs stuck in `running`
- processes with no heartbeat
- missing output files after successful process exit
- stderr growth beyond a configured threshold
