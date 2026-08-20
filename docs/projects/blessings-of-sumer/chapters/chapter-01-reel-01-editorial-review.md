# Chapter 1 Reel 1 Editorial Review

## Cut

- Reel: `The Voyage Begins`
- Adapter: `editorial`
- Visual baseline: `blessings-of-sumer-v1`
- Final reviewed job: `614b4d96-38c2-4bd9-9fb1-bd16d5b18484`
- Output: `tmp/renders/614b4d96-38c2-4bd9-9fb1-bd16d5b18484/reel-editorial-v1.mp4`
- Narration: Microsoft Mark at rate `-3`, explicitly provisional until the Kokoro audition is approved

The source PNGs are versioned under `assets/blessings-of-sumer/chapter-01/reel-01/editorial-v1`. Derived audio, captions, video, logs, and the JSON manifest remain under `RENDER_OUTPUT_ROOT`; their file URIs and SHA-256 checksums are persisted as generated-asset rows.

## Technical Review

- [x] Duration is exactly 60 seconds.
- [x] Video is H.264 High profile, `1080x1920`, `30 fps`, `yuv420p`, square pixels.
- [x] Audio is AAC LC, mono, `48 kHz`.
- [x] Integrated loudness is `-16.3 LUFS`; true peak is `-1.5 dBFS`.
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

Approve this cut as the first editorial production baseline and as a renderer acceptance artifact. It is not the publication master because the narration voice and music direction remain provisional.

## Publication Follow-Up

- [ ] Install and audition Kokoro `af_heart` and at least one alternate voice against this pacing.
- [ ] Add the approved water, frame-drum, and lyre ambience bed without masking narration.
- [ ] Perform a final listening review on phone speakers and headphones.
- [ ] Queue `final-video` only after the reel production record and replacement voice are approved.
