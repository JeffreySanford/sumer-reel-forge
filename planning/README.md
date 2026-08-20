# Planning

This folder captures agile planning for the studio and project-specific production work.

## Cadence

- Maintain a prioritized backlog.
- Plan work in small increments that end with a running, tested slice.
- Treat every renderer integration as infrastructure work with observability and failure handling.
- Keep acceptance criteria concrete enough to test through Nx targets.

## Active Plan

- [x] Sprint 000: foundation, persistence, API contract, first workflow screen, local startup, CI.
- [x] Sprint 001: editable reel production workflow and renderer-worker groundwork.
- [x] Sprint 002: first local 60-second render pipeline and production review workflow.
- [x] Sprint 003: visual bible, local production targets, and editorial Reel 1 baseline.

## Definition Of Done

- [x] Code is linted.
- [x] Unit tests pass.
- [x] Builds pass.
- [x] E2E tests pass for user-facing workflows.
- [x] Storybook stories exist for new UI surfaces.
- [x] API DTOs are validated.
- [x] Mutating behavior is auditable or explicitly documented as temporary.
- [x] Long-running processes have timeout and heartbeat behavior.
- [x] CI has bounded runtimes for steps that can hang.
