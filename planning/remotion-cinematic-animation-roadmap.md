# Remotion Cinematic Animation Roadmap

## Objective

Add a real cinematic illustrated animation path to the studio without replacing the existing reviewed still-frame editorial pipeline.

## Recommendation

Use Remotion as the first animation renderer. It is high enough quality for vertical short-form cinematic illustrated reels when paired with strong layered artwork, disciplined motion design, lip-sync timing, and FFmpeg validation.

## Current Status

The standalone Remotion proof is implemented under `tools/animation` and runs with `pnpm render:animation:proof`. It renders a 30-second 1080x1920 MP4, synthesizes timed narration clips, muxes AAC audio, validates duration with FFprobe when available, and writes a checksum-bearing manifest. The style and motion loops are also implemented with `pnpm render:animation:style-test`, `pnpm render:animation:style-review`, `pnpm render:animation:motion-proof`, and `pnpm render:animation:motion-review`.

The full Reel 1 animation draft is implemented with `FullReelAnimation` and `tools/animation/scenes/reel-01-full-animation.scene.json`. `pnpm render:animation:full-reel1` renders it directly, while `pnpm render:animation:reel1` queues a `draft-video` job through `RENDER_ADAPTER=animation`, persists the generated assets through the API, and validates the persisted 60-second MP4.

## Milestones

### Milestone 1 - Feasibility Spike

- Add Remotion dependencies behind a focused project or tool target.
- Render one static composition to MP4 locally.
- Validate output dimensions, codec, duration, and audio muxing.
- Document local setup and CI implications.

### Milestone 2 - Layered Cinematic Proof

- Define a JSON scene schema for layers, transforms, camera, and timing.
- Build a reusable Remotion vertical-video composition.
- Animate parallax, camera moves, blink states, atmosphere, water glints, cloth sway, and two pose swaps.
- Render one 20-30 second Reel 1 proof with existing narration.
- [x] Expand to a complete 60-second Reel 1 animation draft with existing narration, captions, and shot data.

### Milestone 3 - Lip Sync

- Add Rhubarb Lip Sync as an optional local tool.
- Generate mouth cues from narration audio.
- Map cue output to mouth-shape layers.
- Persist lip-sync metadata in the render manifest.

### Milestone 4 - Studio Integration

- [x] Add an `animation` adapter to the renderer worker.
- [x] Queue animation jobs through existing API render-job endpoints.
- [x] Persist animated outputs as generated assets.
- [x] Review animated outputs in the existing dashboard.

### Milestone 5 - Reusable Character Kit

- Define character asset folder conventions.
- Add pose, mouth, eye, and expression naming rules.
- Add validation for missing layers.
- Add one reusable character kit for the pilot style.

### Milestone 6 - Style Upgrade

- Replace flat proof shapes with layered cinematic illustrated assets.
- Add shot-level style controls for palette, texture, lighting, lens drift, and atmosphere.
- Add review notes that distinguish technical animation acceptance from art-direction acceptance.
- [x] Produce one 10-15 second style test before scaling the full Reel 1 animation.
- [x] Produce one complete 60-second full Reel 1 animation draft through the studio worker.

## Non-Goals

- No story/source text edits.
- No full custom animation engine.
- No frame-by-frame production workflow in the first pass.
- No replacement of current editorial still-frame renderer until the animation path proves itself.

## Open Questions

- Should character assets be SVG, transparent PNG, or both?
- Should Remotion run as a separate Nx project or under `tools/renderer`?
- Should lip-sync timing be generated per render or cached per narration asset?
- What is the minimum acceptable character motion for Reel 1 review?
