# Sprint 005 - Cinematic Animation Proof

## Goal

Prove that Sumer Reel Forge can render a short, reviewable cinematic illustrated animation through the existing studio pipeline.

## Scope

- Add a Remotion-based proof renderer.
- Use layered cinematic illustrated assets for one short Reel 1 segment.
- Reuse existing narration and caption timing where possible.
- Produce a real animated MP4 for dashboard review.
- Keep source/story text unchanged.

## Candidate Tasks

- [x] Add Remotion project/tool scaffold.
- [x] Define first animation scene JSON schema.
- [x] Create one layered scene asset convention.
- [x] Render a 20-30 second vertical animation locally.
- [x] Add FFprobe validation for Remotion output.
- [x] Add render manifest fields for animation engine, scene version, and asset checksums.
- [x] Document setup, limitations, and review criteria.

## Acceptance Criteria

- [x] The output contains visible frame-to-frame motion beyond static crossfades.
- [x] Audio, captions, and animation are synchronized.
- [x] The render is queued or reproducibly invoked through a documented script.
- [x] The generated asset is checksummed and reviewable.
- [x] Local quality gates pass.
- [x] Documentation and planning links are current.

## Follow-On Style Note

The initial proof validates the pipeline, but the art direction should move away from a flat cartoon look. The next iteration should focus on layered illustrated assets, stronger atmosphere, richer light, slower cinematic camera language, and more small independent motion channels.

`pnpm render:animation:style-test` now provides that shorter iteration loop. It renders a 12-second cinematic illustrated sample from `tools/animation/scenes/cinematic-style-test.scene.json` using the `CinematicStyleTest` composition.

`pnpm render:animation:motion-proof` is the next proof. It renders an 18-second, three-shot animation sample from `tools/animation/scenes/cinematic-motion-proof.scene.json` using the `CinematicMotionProof` composition. The emphasis is motion quality rather than source/story development: shot timing, parallax, boat drift, profile breathing, blink, cloth sway, gesture, light sweep, atmosphere, and city reveal.

`pnpm render:animation:motion-review` packages that proof with sampled stills, a contact sheet, manifest, and Markdown review report under `tmp/renders/animation-motion-review/`.

## Full-Reel Expansion

`pnpm render:animation:full-reel1` now renders a direct 60-second full Reel 1 animation draft using `tools/animation/scenes/reel-01-full-animation.scene.json` and the `FullReelAnimation` composition. `pnpm render:animation:reel1` routes that same full-reel draft through the API and renderer worker, then persists the final MP4, visual-only MP4, narration mix, and checksum manifest for studio review.

This expansion keeps the sprint's source policy intact: no story/source text is edited. The full-reel composition reads the existing `REEL_ONE` narration, captions, and shot records.

## Risks

- Remotion install/render dependencies may add CI runtime.
- Art assets may need manual layering before the renderer can demonstrate quality.
- Lip-sync quality may require more expression states than the first proof includes.
