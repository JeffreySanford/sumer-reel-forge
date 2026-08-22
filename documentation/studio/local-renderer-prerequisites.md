# Local Renderer Prerequisites

The worker has four established modes. `mock` creates deterministic storyboard cards, silent audio, authored captions, and a real 9:16 MP4 for pipeline verification. `local` uses ComfyUI images, a configurable TTS command, Whisper timing, and FFmpeg assembly. `editorial` uses approved still assets, production narration, authored captions, and final assembly. `animation` runs the Remotion cinematic animation path through the worker and persists reviewable generated assets.

## Commands

- [x] `pnpm renderer:preflight` checks the active adapter prerequisites.
- [x] `pnpm renderer:worker -- --once` claims and processes one queued job.
- [x] `pnpm render:prototype:reel1` queues and verifies a complete Reel 1 mock render.
- [x] `pnpm render:editorial:reel1` queues, renders, persists, and validates the curated Reel 1 draft.
- [x] `pnpm tts:kokoro:setup` creates the locked Python environment and verifies model checksums.
- [x] `pnpm tts:kokoro:audition` renders `af_heart` and `af_bella` comparison WAV files.
- [x] `pnpm render:final:reel1` is the approval-gated final-video command.
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

The workstation has the NVIDIA driver, FFmpeg, Python, `uv`, and a project-local Kokoro ONNX environment. `kokoro-onnx` supplies its Windows eSpeak runtime, so no elevated system installation is required. ComfyUI and Whisper still require local installation before the fully local adapter can pass preflight.

Run `pnpm tts:kokoro:setup` once. It uses the locked `tools/tts/uv.lock`, installs Python 3.12 through `uv` when needed, downloads the model and voice bundle to ignored `.cache/kokoro`, and rejects files whose SHA-256 checksums do not match the pinned release assets. Model binaries and virtual environments are never committed.

## Editorial Adapter

Set `RENDER_ADAPTER=editorial` for preflight. The adapter requires FFmpeg/FFprobe and all eight versioned PNGs in `EDITORIAL_ASSET_DIRECTORY`. `EDITORIAL_NARRATION_ADAPTER=auto` follows the studio voice selection, which currently resolves to Chatterbox for the story default. Set `EDITORIAL_NARRATION_ADAPTER=kokoro` for the locked Kokoro fallback or `sapi` for the Windows fallback. `pnpm render:editorial:reel1` sets the render adapter for its one-shot worker automatically.

## Animation Adapter

Set `RENDER_ADAPTER=animation` for preflight. The adapter requires FFmpeg, FFprobe, Remotion, and the configured narration runtime. Chatterbox is the default production voice path for the full Reel 1 animation commands; Kokoro and Windows SAPI remain fallbacks for local troubleshooting. Run:

```sh
pnpm render:animation:proof
pnpm render:animation:style-test
pnpm render:animation:style-review
pnpm render:animation:style-review:studio
pnpm render:animation:full-reel1
pnpm render:animation:reel1
```

The proof, style-test, motion-proof, and full-reel commands render directly into `tmp/renders/animation-proof`. The style test is a shorter art-direction loop. The style-review command renders into `tmp/renders/animation-style-review`, extracts representative stills, creates a contact sheet, and writes a checksum manifest plus Markdown review report. The style-review studio command requires the API and persists those artifacts into generated-asset review. The Reel 1 command queues a `draft-video` render job, runs the worker with the animation adapter, persists the final MP4, narration mix, animation manifest, and visual-only video, then validates the persisted 60-second MP4.

Chatterbox `chatterbox-narrator` with the mythic preset is the current animation review voice. Kokoro `af_heart` at `0.90x` and Windows SAPI are fallbacks, not the preferred Reel 1 animation voice. Audio remains provisional until listening approval. The latest editorial cut is documented in `documentation/projects/blessings-of-sumer/chapters/chapter-01-reel-01-editorial-review.md`.

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
- [x] Install project-local Kokoro/eSpeak and render `af_heart` plus `af_bella` auditions.
- [ ] Complete the narration and ambience listening review.
- [ ] Review Whisper timing against the authored caption copy.
- [x] Establish a versioned character and environment visual-bible baseline.
