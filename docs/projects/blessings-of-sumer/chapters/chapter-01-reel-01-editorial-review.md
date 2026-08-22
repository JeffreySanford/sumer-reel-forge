# Chapter 1 Reel 1 Editorial Review

## Cut

- Reel: `The Voyage Begins`
- Adapter: `editorial`
- Visual baseline: `blessings-of-sumer-v1`
- Baseline job: `614b4d96-38c2-4bd9-9fb1-bd16d5b18484`
- Current review job: `2609c778-46eb-4b53-9ec8-63bb59dcc1ba`
- Output: `tmp/renders/2609c778-46eb-4b53-9ec8-63bb59dcc1ba/reel-editorial-v1.mp4`
- Video SHA-256: `e700b492061b06cb533ee01d12ab1356a70d98cb9a16530edceb290f6b1ecc70`
- Narration: Kokoro ONNX `af_heart` at `0.90x`, `42.73` seconds
- Alternate audition: Kokoro ONNX `af_bella` at `0.90x`, `44.03` seconds
- Score: deterministic procedural water, low drum, soft lyre, and final-rise candidate

The source PNGs are versioned under `assets/blessings-of-sumer/chapter-01/reel-01/editorial-v1`. Derived audio, captions, video, logs, and the JSON manifest remain under `RENDER_OUTPUT_ROOT`; their file URIs and SHA-256 checksums are persisted as generated-asset rows.

## Technical Review

- [x] Duration is exactly 60 seconds.
- [x] Video is H.264 High profile, `1080x1920`, `30 fps`, `yuv420p`, square pixels.
- [x] Audio is AAC LC, stereo, `48 kHz`.
- [x] Integrated loudness is `-16.1 LUFS`; true peak is `-3.5 dBFS`.
- [x] English MovText subtitle track is present.
- [x] Captions are also burned into the image.
- [x] MP4 uses fast-start metadata.
- [x] Render attempts, worker logs, assets, checksums, and manifest are persisted.

## Editorial Review

- [x] The eight frames progress from dark open water to warm arrival at Dilmun.
- [x] Enki's face, robe, crown, and vessel language remain consistent with the visual bible.
- [x] Nammu reads as a water presence rather than a monster or conventional mermaid.
- [x] The traveler-shrine scene communicates dignity and reciprocal hospitality.
- [x] Captions remain in the lower-middle social safe area and avoid critical faces.
- [x] Caption chunks follow sentence boundaries and stay at eight words or fewer.
- [x] The final title remains legible against the open sky.
- [x] The narration uses Enki, Nammu, Enlil, Dilmun, and Absu consistently.
- [x] Chapter naming policy now distinguishes Eridu from Uruk and introduces Uruk/Erech explicitly.

## Decision

The SAPI cut remains the first renderer acceptance baseline. The Kokoro and ambience revision passed automated media checks and contact-sheet review, and the persistent reel moved from `draft` to `review`. It is not approved or a publication master until a person completes the listening review.

## Publication Follow-Up

- [x] Install project-local Kokoro and audition `af_heart` plus `af_bella` against this pacing.
- [x] Add a water, low-drum, soft-lyre, and final-rise candidate bed below narration.
- [ ] Perform a final listening review on phone speakers and headphones.
- [ ] Approve or revise the selected voice and ambience asset review rows.
- [ ] Move the reel from `review` to `approved` and run `pnpm render:final:reel1` only after listening approval.
