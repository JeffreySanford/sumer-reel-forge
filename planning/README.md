# Planning

This folder captures agile planning for the studio and project-specific production work.

## Cadence

- Maintain a prioritized backlog.
- Plan work in small increments that end with a running, tested slice.
- Treat every renderer integration as infrastructure work with observability and failure handling.
- Keep acceptance criteria concrete enough to test through Nx targets.

## Definition Of Done

- Code is linted.
- Unit tests pass.
- Builds pass.
- E2E tests pass for user-facing workflows.
- Storybook stories exist for new UI surfaces.
- API DTOs are validated.
- Mutating behavior is auditable or explicitly documented as temporary.
- Long-running processes have timeout and heartbeat behavior.
