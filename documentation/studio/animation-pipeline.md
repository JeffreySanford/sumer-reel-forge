# Cinematic Animation Pipeline

## Goal

Move beyond still-image reels by adding a code-driven cinematic illustrated animation renderer that can produce real motion while preserving the current studio review, approval, audit, and render-job flow.

## Quality Answer

Remotion is high enough quality for this use case if we treat it as the composition/render engine, not as the whole animation discipline. It can render deterministic frame-accurate MP4 output from React components, SVG, CSS, Canvas, WebGL, image layers, audio, and captions. The final quality will depend more on art direction, layered assets, motion design, timing, and audio than on Remotion itself.

Remotion is a good fit for:

- Cinematic illustrated motion.
- Layered parallax scenes.
- Character pose swaps.
- Eye, mouth, and expression states.
- Camera moves, zooms, pans, and shakes.
- Captions, titles, lower thirds, and overlays.
- Programmatic batch rendering from studio data.

Remotion is not enough by itself for:

- Complex hand-drawn acting.
- Advanced skeletal rig authoring.
- Painterly frame-by-frame animation.
- Automated character performance without a rig or asset library.

## Recommended First Slice

Build a 20-30 second proof of concept using one approved Reel 1 segment:

- One visual-bible-consistent cinematic illustrated style frame.
- Layered background, midground, character, prop, foreground, and atmosphere assets.
- Simple character pose library: idle, gesture, glance, emphasis.
- Mouth-shape swaps from narration timing.
- Blink and eye-direction cycles.
- Camera motion and parallax.
- Atmospheric motion such as light rays, dust, water glints, cloth sway, and foreground reed sway.
- Existing studio narration settings, with Chatterbox as the production voice path.
- FFmpeg validation and generated-asset persistence through the current worker flow.

## Current Status

The Remotion animation work now has three review loops:

- Short technical proof: `ReelAnimation` with `tools/animation/scenes/reel-01-proof.scene.json`.
- Style and motion proofs: `CinematicStyleTest` and `CinematicMotionProof` for art-direction and shot-language review.
- Full Reel 1 draft: `FullReelAnimation` with `tools/animation/scenes/reel-01-full-animation.scene.json`.

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

The proof command renders `tmp/renders/animation-proof/reel-animation-proof.mp4`, validates duration with FFprobe when available, and writes `tmp/renders/animation-proof/animation-proof-manifest.json` with the scene data and SHA-256 checksum. This proof demonstrates real frame-to-frame animation using camera drift, parallax, water shimmer, water glints, light rays, atmospheric particles, boat bobbing, character gesture, breathing, cloth sway, eye blink, mouth-shape channels, and foreground sway.

The proof renderer can synthesize narration with Chatterbox, Kokoro, or Windows SAPI. Chatterbox is the intended production voice path for animation; SAPI remains only a fallback. The renderer places narration clips at the same frame windows used by the animation, mixes them into a WAV, and muxes that track into the final MP4 as AAC audio. The manifest records the narration adapter, voice/model metadata, clip timings, clip checksums, narration mix checksum, and final MP4 checksum.

The full Reel 1 animation draft renders the complete 60-second sequence with Chatterbox narration by default. `pnpm render:animation:full-reel1` runs it directly, and `pnpm render:animation:reel1` queues a `draft-video` job, processes it with the animation adapter, persists the generated assets through the API, and validates the final MP4. The full-reel scene manifest records that no source/story text is changed and the composition reads existing `REEL_ONE` source data.

The shorter style test uses the `CinematicStyleTest` Remotion composition and `tools/animation/scenes/cinematic-style-test.scene.json`. It is the preferred loop for art direction because it renders a 12-second clip with slower camera motion, profile character treatment, mural-style silhouettes, foreground occlusion, atmospheric dust, and light sweeps without waiting for the full worker proof.

The style-review command wraps the style test with extracted stills, a contact sheet, a checksum manifest, and a Markdown review report. Use it when comparing art-direction iterations or recording review decisions.

The style-review studio command requires the API to be running. It creates a draft-video render job, persists the review video, contact sheet, sampled frames, manifests, and report through the generated-asset API, then marks the job complete for dashboard review.

The second motion proof uses the `CinematicMotionProof` Remotion composition and `tools/animation/scenes/cinematic-motion-proof.scene.json`. It is an 18-second review clip split into river approach, profile close-up, and city reveal shots. Its purpose is to test stronger animation language before investing in final assets: shot-timed camera moves, multi-plane parallax, boat drift, profile breathing, blink, cloth sway, gesture arc, reed sway, temple reveal, light sweep, dust motes, and cut fades.

Use `pnpm render:animation:motion-review` to create its review bundle under `tmp/renders/animation-motion-review/`.

## Proposed Tooling

- Remotion for frame-accurate video composition and rendering.
- React components for reusable scene, character, caption, and camera primitives.
- Rhubarb Lip Sync for phoneme/mouth-cue extraction from narration audio.
- Existing FFmpeg validation and manifest persistence.
- Optional PixiJS later if sprite-heavy WebGL scenes outgrow SVG/CSS composition.

## Asset Strategy

Start with layered raster or SVG assets. Avoid full skeletal animation until the style and timing are proven.

Required asset types:

- Background plates.
- Foreground occluders.
- Character body poses.
- Head/eye/mouth overlays.
- Prop overlays.
- Atmosphere loops such as mist, water shimmer, dust, or light rays.

## Acceptance Criteria

- Rendered output is a true MP4 animation, not a still-image slideshow.
- Output remains 1080x1920, 30 fps, and platform-safe.
- Narration, ambience, captions, and visual motion stay synchronized.
- The animation job is queued, claimed, logged, checksummed, and persisted through existing API endpoints.
- The proof of concept can be reviewed in the existing studio dashboard.
- A shorter style-test render exists for fast art-direction decisions before full-reel expansion.
- A motion-proof review exists for evaluating shot-to-shot animation language before full-reel expansion.
- A complete 60-second Reel 1 animation draft can render directly and through the studio worker.
- No story/source text is altered as part of the animation infrastructure work.

## Risks

- Art quality becomes the bottleneck if assets are not layered consistently.
- Lip sync can look mechanical without a small set of expression and head-motion rules.
- Remotion rendering may add Node/browser dependencies to CI and local setup.
- Custom rigging can sprawl if we skip a narrow first character schema.

## Decision

Use Remotion as the studio animation composition/render engine. Keep the studio-specific animation layer narrow and data-driven rather than building a full custom animation engine from scratch.
