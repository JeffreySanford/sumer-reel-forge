# Rendering Pipeline

## Current Pipeline

1. User approves or queues work from the Angular studio.
2. API validates the request, creates a render job, and writes audit rows.
3. Renderer worker claims the job through the API.
4. Adapter creates media assets using configured local tools.
5. FFmpeg assembles output and validates codecs/dimensions.
6. Worker persists manifests, checksums, logs, attempts, and final status.
7. Studio dashboard reviews the generated asset.

## Adapter Types

- `mock`: deterministic local test output.
- `local`: configurable ComfyUI, TTS, Whisper, and FFmpeg path.
- `editorial`: curated Reel 1 path with known frames, Kokoro narration, ambience, captions, and FFmpeg assembly.
- `animation`: Remotion-driven cinematic illustrated animation output using layered assets, full narration, captions, and the standard generated-asset persistence path.
- `animation-proof` (standalone): current Remotion proof command invoked with `pnpm render:animation:proof`; renders visual motion, synthesizes timed narration clips, muxes AAC audio, and writes a checksum manifest.

## Animation Adapter Target

The animation adapter accepts a render job and produces the same persisted asset contract as the existing adapters. It currently renders the complete 60-second Reel 1 draft through `FullReelAnimation`. It does not bypass approval, audit, watchdog, or generated-asset review.

Inputs:

- Reel/shot data from API.
- Approved narration text and voice settings.
- Audio file and timing metadata.
- Layered animation scene data.
- Visual-bible asset references.

Outputs:

- MP4 video.
- Optional preview still.
- Render manifest JSON.
- Timing/lip-sync metadata.
- Checksums and generated-asset rows.
