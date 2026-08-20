# Sprint 004 - Kokoro Publication Candidate

## Goal

Replace provisional Reel 1 narration, add the first scored candidate, and preserve an explicit human approval boundary before final-video rendering.

## Reproducible Narration

- [x] Add a Python 3.12 `uv` project with a committed lock file.
- [x] Pin `kokoro-onnx`, `soundfile`, and Ruff versions.
- [x] Download model assets into ignored local cache and verify SHA-256 checksums.
- [x] Use the packaged Windows eSpeak runtime without requiring elevation.
- [x] Add `af_heart` and `af_bella` full-narration auditions.
- [x] Keep Windows SAPI as an explicit fallback adapter.

## Editorial Candidate

- [x] Generate a deterministic water, low-drum, soft-lyre, and final-rise bed.
- [x] Mix narration and ambience to a social-video loudness target.
- [x] Persist narration, ambience, timings, captions, video, checksums, and manifest.
- [x] Validate 60-second H.264, 1080x1920, 30 fps, stereo 48 kHz AAC, and MovText output.
- [x] Review representative frames for caption and title safe areas.
- [x] Move Reel 1 from `draft` to `review` with an audit note.

## Reliability

- [x] Retain failed render revisions instead of overwriting history.
- [x] Bound external-process failure notes to the API DTO limit.
- [x] Keep full failure details in chunked renderer logs.
- [x] Add Ruff and Python unit tests to normal `pnpm lint`, `pnpm test`, and `pnpm quality` commands.

## Approval Gate

- [ ] Compare `af_heart` and `af_bella` on headphones and phone speakers.
- [ ] Approve or revise the ambience balance against narration.
- [ ] Approve the selected generated audio/video asset rows.
- [ ] Move Reel 1 from `review` to `approved`.
- [ ] Run `pnpm render:final:reel1` and complete final platform review.

## Delivery

- [x] Run the complete local quality, API e2e, Storybook, Playwright, and security gates.
- [x] Push the implementation and confirm GitHub Actions passes (`32322877752`).
