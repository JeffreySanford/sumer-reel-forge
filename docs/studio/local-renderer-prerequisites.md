# Local Renderer Prerequisites

The worker has two explicit modes. `mock` creates deterministic storyboard cards, silent audio, authored captions, and a real 9:16 MP4 for pipeline verification. `local` uses ComfyUI images, a configurable TTS command, Whisper timing, and FFmpeg assembly.

## Commands

- [x] `pnpm renderer:preflight` checks the active adapter prerequisites.
- [x] `pnpm renderer:worker -- --once` claims and processes one queued job.
- [x] `pnpm render:prototype:reel1` queues and verifies a complete Reel 1 mock render.
- [x] `pnpm render:watchdog -- --once` fails stale queued/running jobs through the API.

## Mock Adapter

Set `RENDER_ADAPTER=mock`. It requires Playwright Chromium and FFmpeg. Run:

```sh
pnpm renderer:preflight
pnpm render:prototype:reel1
```

The verified Reel 1 run produced eight PNG shot cards, WAV audio, SRT captions, a 60-second H.264/AAC/MovText MP4, and a JSON manifest under `tmp/renders/<job-id>`.

## Local Adapter

Set `RENDER_ADAPTER=local`, then provide:

- `COMFYUI_BASE_URL` and an API-format workflow at `COMFYUI_WORKFLOW_PATH`.
- `TTS_COMMAND`, `TTS_VOICE`, and `TTS_ARGS_JSON` for a command that writes WAV output.
- `WHISPER_COMMAND`, `WHISPER_MODEL`, and `WHISPER_ARGS_JSON`.
- `FFMPEG_COMMAND`.

Command argument variables are JSON arrays, not shell command strings. Supported placeholders are documented in `.env.sample`; the ComfyUI workflow tokens are documented in `tools/renderer/workflows/README.md`.

## Runtime Controls

- `API_BASE_URL`: Nest API base URL.
- `RENDER_OUTPUT_ROOT`: only this directory can be streamed by the asset-content API.
- `RENDER_WORKER_ID`: stable worker identity for attempts, logs, and audit rows.
- `RENDER_HEARTBEAT_INTERVAL_MS`: worker heartbeat cadence.
- `RENDER_JOB_TIMEOUT_MS`: overall pipeline deadline.
- `RENDER_PROCESS_TIMEOUT_MS`: individual external-process deadline.
- `RENDER_STALE_MAX_AGE_SECONDS`: watchdog stale threshold.

## External Validation Still Required

- [ ] Select and validate the production ComfyUI checkpoint/workflow.
- [ ] Select and validate the production narration voice.
- [ ] Review Whisper timing against the authored caption copy.
- [ ] Approve the character and environment visual bible before final rendering.
