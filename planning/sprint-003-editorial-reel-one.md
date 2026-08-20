# Sprint 003 - Editorial Reel One

## Goal

Produce, persist, and review the first non-placeholder 60-second Reel 1 cut while protecting studio data and establishing a repeatable production baseline.

## Data Safety And Test Isolation

- [x] Keep the PostgreSQL named volume when `start:all` stops.
- [x] Make routine Chapter 1 seeding create-only for existing production records.
- [x] Require `db:seed:chapter1:refresh` for an intentional seeded-content reset.
- [x] Run API e2e against an isolated `_e2e` database on port 3100.
- [x] Verify normal seed preservation and explicit refresh behavior automatically.

## Production Baseline

- [x] Create a versioned visual reference board.
- [x] Document Enki, Nammu, the Stag, Dilmun, palette, safe areas, and cultural review rules.
- [x] Select ComfyUI plus SDXL as the local image target and Kokoro as the local narration target.
- [x] Generate eight continuity-matched Reel 1 portrait frames.
- [x] Add a curated editorial renderer adapter with motion, narration, authored captions, and manifest persistence.
- [x] Produce one persisted 60-second Reel 1 editorial render.

## Review

- [x] Verify H.264 video, AAC audio, dimensions, frame rate, duration, and subtitle track.
- [x] Verify burned captions remain readable in common social-platform safe areas.
- [x] Review visual continuity, narration pacing, cultural handling, and source naming.
- [x] Record the editorial decision and publication follow-up.

## Delivery

- [x] Run format, lint, unit, build, API e2e, Storybook, Playwright, and security checks.
- [x] Push the milestone and confirm GitHub Actions passes (`32320162368`).
