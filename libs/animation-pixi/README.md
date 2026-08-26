# Animation Pixi Adapter

`animation-pixi` is the engine boundary between Sumer Reel Forge's deterministic exact-frame preview model and PixiJS.

## Rules

- PixiJS imports live in this library, not in `apps/animation-lab`.
- Scene V3 and shared frame state remain authoritative.
- Pixi's application ticker is configured not to auto-start and is explicitly stopped after initialization.
- Rendering is manual: callers provide one immutable `PixiRenderFrame`, then the adapter issues one renderer pass.
- A preview surface is bound to one exact viewport size. A mismatched frame fails instead of resizing implicitly.
- This foundation renderer uses diagnostic primitives only; it does not claim final art or production render authority.
- Remotion remains the production frame/render authority.

The uninstall path is intentionally simple: consumers depend only on `PixiPreviewSurface` and `PixiRenderFrame`, so a later engine can replace Pixi without changing Scene V3 or runtime-evaluation contracts.
