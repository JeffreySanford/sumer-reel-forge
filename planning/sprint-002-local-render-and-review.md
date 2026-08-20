# Sprint 002 - Local Render And Review

## Goal

Complete the first repeatable 60-second render path and make its outputs reviewable, retryable, and auditable in the studio.

## Completed Work

- [x] Triage the two open Dependabot advisories and document the monitored risk decision.
- [x] Expand all 18 Chapter 1 reels into detailed 60-second production records.
- [x] Add `draft`, `review`, `approved`, `rendering`, and `published` transitions.
- [x] Require approval before final-video queueing and reset edited reels to draft.
- [x] Add ComfyUI, configurable TTS, Whisper, and FFmpeg adapters.
- [x] Add a deterministic mock adapter for repeatable local and CI-adjacent verification.
- [x] Add generated-asset previews, notes, approve/reject, and regeneration controls.
- [x] Persist worker attempts, heartbeat, stdout/stderr/system logs, and failure details.
- [x] Add failed-job retry without losing prior attempt history.
- [x] Render and inspect a 60-second Reel 1 technical prototype.
- [x] Add Storybook asset-review state and Playwright approval/review coverage.

## Verification

- [x] Reel 1 output duration is exactly 60 seconds.
- [x] MP4 contains H.264 video, AAC audio, and MovText subtitles.
- [x] Eight shot images, captions, narration source, audio, video, and manifest rows persist.
- [x] API e2e covers all 18 detailed storyboards, attempts, logs, reviews, retries, and approval gating.
- [x] Web e2e covers editing, copying, queueing, approval, and asset review.
- [ ] GitHub CI passes after this milestone is pushed.

## Next Sprint Inputs

- [ ] Approve character and environment visual references.
- [ ] Select the ComfyUI workflow/checkpoint and production TTS voice.
- [ ] Produce and review the first non-placeholder Reel 1 cut.
- [ ] Add authentication and role-based approval before any remote deployment.
- [ ] Install OS-level watchdog scheduling on the render host.
