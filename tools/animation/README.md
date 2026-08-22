# Animation Renderer

This folder contains the Remotion-based cinematic illustrated animation compositions for the studio.

Run:

```sh
pnpm render:animation:proof
pnpm render:animation:style-test
pnpm render:animation:style-review
pnpm render:animation:style-review:studio
pnpm render:animation:motion-proof
pnpm render:animation:motion-review
pnpm render:animation:full-reel1
pnpm render:animation:reel1
```

The standalone commands render 1080x1920 MP4 files to `tmp/renders/animation-proof/`, validate them with FFprobe when available, and write checksum-bearing manifests next to the video.

The proof commands remain fast technical and art-direction loops. The full Reel 1 draft uses `tools/animation/scenes/reel-01-full-animation.scene.json` and the `FullReelAnimation` Remotion composition. It reads the existing `REEL_ONE` narration, captions, and shot data without changing source/story text.

The full Reel 1 animation commands request Chatterbox narration explicitly. Use `--narration-adapter kokoro` or `--narration-adapter sapi` only for local fallback testing.

Use `render:animation:full-reel1` for a direct 60-second full-reel render into `tmp/renders/animation-proof/`.

Use `render:animation:reel1` when the API is running. It queues a `draft-video` render job, runs the worker with the `animation` adapter, persists the final MP4, visual-only MP4, narration mix, and animation manifest, then validates the persisted output.

Use `render:animation:style-test` for the shorter 12-second cinematic illustrated style loop. It is intended for art-direction review before scaling a look across a full reel.

Use `render:animation:style-review` to render the style test, extract representative stills, create a contact sheet, and write a checksum manifest plus Markdown review report under `tmp/renders/animation-style-review/`.

Use `render:animation:style-review:studio` when the API is running. It renders the style-review bundle, queues a draft-video job, persists the review artifacts as generated assets, and completes the job so the dashboard can review them.

Use `render:animation:motion-proof` for the next 18-second proof. It focuses on stronger animation language across three short shots: river approach, profile close-up, and city reveal.

Use `render:animation:motion-review` to render the motion proof, extract representative stills, create a contact sheet, and write a review report under `tmp/renders/animation-motion-review/`.
