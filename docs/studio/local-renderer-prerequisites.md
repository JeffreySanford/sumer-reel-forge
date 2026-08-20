# Local Renderer Prerequisites

The worker has two established modes. `mock` creates deterministic storyboard cards, silent audio, authored captions, and a real 9:16 MP4 for pipeline verification. `local` uses ComfyUI images, a configurable TTS command, Whisper timing, and FFmpeg assembly. Sprint 003 adds a curated `editorial` path for approved still assets, production narration, authored captions, and final assembly.

## Commands

- [x] `pnpm renderer:preflight` checks the active adapter prerequisites.
- [x] `pnpm renderer:worker -- --once` claims and processes one queued job.
- [x] `pnpm render:prototype:reel1` queues and verifies a complete Reel 1 mock render.
- [x] `pnpm render:editorial:reel1` queues, renders, persists, and validates the curated Reel 1 draft.
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

## Production Target

- Image generation: ComfyUI on Windows with an SDXL 1.0 workflow sized for the local NVIDIA GPU. Use IP-Adapter or ControlNet references when continuity requires stronger identity control.
- Narration: Kokoro 82M with `af_heart` as the initial audition voice. Treat the voice as provisional until an editorial listening review is recorded.
- Captions: authored shot-aligned SRT for the editorial master. Whisper remains a QA alignment tool rather than the source of approved wording.
- Assembly: FFmpeg with H.264 video, AAC audio, burned safe-area captions, a MovText subtitle track, and fast-start metadata.
- Reproducibility: record prompts, checksums, command configuration, and output metadata in the render manifest.

The workstation currently has the NVIDIA driver, FFmpeg, Python, and `uv`. ComfyUI, Kokoro/eSpeak NG, and Whisper still require local installation before the fully local adapter can pass preflight. The curated editorial path can use already approved assets while those tools are being installed.

## Editorial Adapter

Set `RENDER_ADAPTER=editorial` for preflight. The adapter requires Windows, `pwsh.exe`, an installed System.Speech voice, FFmpeg/FFprobe, and all eight versioned PNGs in `EDITORIAL_ASSET_DIRECTORY`. `pnpm render:editorial:reel1` sets the adapter for its one-shot worker automatically.

The current Microsoft Mark narration is a provisional production aid, not a publication voice approval. Its word events drive authored SRT grouping; FFmpeg burns the captions into the lower-middle safe area and also stores them as a MovText track. The latest reviewed cut is documented in `docs/projects/blessings-of-sumer/chapters/chapter-01-reel-01-editorial-review.md`.

## Runtime Controls

- `API_BASE_URL`: Nest API base URL.
- `RENDER_OUTPUT_ROOT`: only this directory can be streamed by the asset-content API.
- `RENDER_WORKER_ID`: stable worker identity for attempts, logs, and audit rows.
- `RENDER_HEARTBEAT_INTERVAL_MS`: worker heartbeat cadence.
- `RENDER_JOB_TIMEOUT_MS`: overall pipeline deadline.
- `RENDER_PROCESS_TIMEOUT_MS`: individual external-process deadline.
- `RENDER_STALE_MAX_AGE_SECONDS`: watchdog stale threshold.

## External Validation Still Required

- [x] Select ComfyUI plus SDXL 1.0 as the initial local image target.
- [ ] Install and validate the production ComfyUI workflow.
- [x] Select Kokoro `af_heart` as the initial narration audition target.
- [ ] Install Kokoro/eSpeak NG and complete the narration listening review.
- [ ] Review Whisper timing against the authored caption copy.
- [x] Establish a versioned character and environment visual-bible baseline.
