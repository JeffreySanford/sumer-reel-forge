# Local Renderer Prerequisites

The renderer pipeline is scaffolded but does not generate real media yet. Current worker scripts prove queue claiming, heartbeat updates, watchdog failure handling, and asset manifest persistence before heavier model integrations are added.

## Current Commands

- [x] `pnpm renderer:worker -- --once` claims one queued job, sends heartbeats, writes a scaffold manifest asset, and marks the job complete.
- [x] `pnpm render:watchdog -- --once` marks stale queued/running jobs as failed through the API.
- [x] Both scripts use `API_BASE_URL`, defaulting to `http://localhost:3000/api`.

## Required External Tools

- [ ] FFmpeg installed and available on `PATH`.
- [ ] ComfyUI running locally for image generation.
- [ ] A local TTS service selected and documented.
- [ ] Whisper or compatible caption timing service installed.
- [ ] A durable local render output directory selected.

## Planned Environment Variables

- `API_BASE_URL`: Nest API base URL.
- `RENDER_WORKER_ID`: stable worker name for audit logs.
- `RENDER_HEARTBEAT_INTERVAL_MS`: worker heartbeat cadence.
- `RENDER_MOCK_DURATION_MS`: scaffold render duration before real renderer integration.
- `RENDER_STALE_MAX_AGE_SECONDS`: watchdog stale threshold.
- `RENDER_WATCHDOG_INTERVAL_MS`: watchdog polling interval.

## Integration Order

- [ ] FFmpeg probe/validation script.
- [ ] Asset output directory validation.
- [ ] Image generation request adapter.
- [ ] TTS request adapter.
- [ ] Whisper caption timing adapter.
- [ ] FFmpeg assembly adapter.
- [ ] End-to-end render manifest verification.
