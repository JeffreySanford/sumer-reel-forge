# Render, Color Management and Delivery Technical Standard

Status: **planning contract**

V3 output must remain reproducible across Storybook/browser previews, Remotion proof renders and final delivery. This document defines technical image/video output policy separately from artistic lighting/color direction.

## 1. Core principle

Art direction defines intended appearance. The render pipeline must preserve that appearance without silent gamma, alpha, scaling, codec or browser differences.

## 2. Canonical composition defaults

Current reel target remains:

```text
orientation: vertical 9:16
resolution: 1080 x 1920
fps: 30
pixel aspect: 1.0
```

Scene V3 explicitly stores these values; render profile cannot silently substitute another semantic frame rate.

## 3. Resolution profiles

Planned profiles:

```text
STORYBOOK
  browser viewport / representative raster size

PREVIEW
  reduced resolution allowed for iteration

PROOF
  canonical fps; representative or canonical resolution according to benchmark

PRODUCTION
  canonical target resolution/quality

ARCHIVE
  optional higher-quality intermediate if future workflow needs it
```

Reduced preview resolution may alter nonsemantic LOD only when the policy is explicit.

## 4. Color-space policy

Before V3 production adoption, lock one canonical SDR working/output path compatible with Remotion/browser/FFmpeg.

Planning default:

```text
sRGB-like web authoring/texture expectations
Rec.709-compatible SDR video delivery
```

Exact FFmpeg color metadata/pixel-format choices must be benchmarked and then pinned.

Do not mix HDR/P3/linear/sRGB textures accidentally.

## 5. Linear rendering

Three/R3F materials may require linear-light calculations while source textures/artwork are authored/displayed in sRGB.

Adapter policy must explicitly distinguish:

```text
texture encoding/input transfer
shader working space
framebuffer/output transform
video encoding metadata
```

A runtime upgrade that changes color-management defaults triggers visual benchmark replay.

## 6. Browser/Storybook parity

Storybook is an authoring/proof surface, not final encoder.

We require reasonable visual parity at named proof frames, while golden screenshots are generated only in a pinned browser/environment.

Do not expect exact pixel identity across Chromium/Firefox/WebKit GPU stacks for complex WebGL shaders unless benchmark proves it practical.

## 7. Alpha policy

Asset alpha requirements:

- straight vs premultiplied alpha must be known at adapter boundary;
- transparent pixels must not contain debug fill that can leak under compositing;
- no accidental black/white fringe from mismatched premultiplication;
- alpha-only masks remain derived/debug assets and are not production visual assets unless explicitly material inputs.

The Shot 3 cyan-eye incident remains a required negative fixture class.

## 8. Texture filtering

Painterly source assets should avoid unwanted smoothing/sharpening.

Each runtime benchmark records relevant:

```text
minification/magnification filtering
mipmap behavior
anisotropy if used
pixel density/device scale
```

Do not optimize texture filtering per runtime independently without visual integration review.

## 9. Scaling policy

Canonical transforms, not ad-hoc image resize steps, determine subject placement.

Image preparation may generate runtime-friendly sizes but preserves:

- source registration;
- aspect ratio unless deliberate;
- content hash lineage;
- approved crop.

## 10. Codec profiles

Proof and production codecs are separate concerns.

Planned named profiles:

```text
proof-h264
production-h264
archive-lossless-or-mezzanine (future/selective)
```

Each profile pins:

- codec;
- pixel format;
- quality/bitrate method;
- audio codec;
- color metadata;
- fast-start/container options if relevant.

No scene JSON stores arbitrary FFmpeg flags.

## 11. Proof render requirements

A proof receipt records:

```text
profile ID/version
Remotion version
Chromium/browser renderer version where material
FFmpeg version
resolution/fps
codec/pixel format
runtime versions
output hash
```

## 12. Production render requirements

Production render additionally requires:

- current canonical Scene V3/reel assembly;
- canonical audio asset hashes;
- current proof/human receipts;
- no DEBUG/QA overlay mode;
- correct duration/frame count;
- final title/caption/audio mix checks;
- output hash.

## 13. Frame count is authoritative

Duration consistency:

```text
durationSeconds = durationFrames / fps
```

Do not accept encoder-reported duration drift as authoring truth.

Unit/receipt checks verify exact expected frame count.

## 14. Audio/video sync

Audio cue timing shares Scene V3 frame authority.

Finalizer verifies:

- no audio beyond composition bounds unless intentional tail contract;
- cue start/end frame mapping;
- caption timing parity;
- output mux duration within expected tolerance.

## 15. Safe areas

Output profile defines semantic safe areas for:

- captions;
- titles;
- platform UI risk margins;
- key faces/action.

Safe-zone metadata is testable in OUTPUT_PIXEL space.

## 16. Frame extraction

Proof frame extraction must identify source frame exactly.

No approximate `-ss` seek as sole evidence when exact frame number matters; tooling should use frame-index-aware extraction/filtering.

Proof metadata records requested/extracted frame numbers.

## 17. Contact sheets

Contact sheet generator uses benchmark proof states rather than arbitrary equal intervals for semantic review.

It may also include normal interval sampling for temporal diagnostics.

Every panel label includes frame/proof-state identity.

## 18. Image evidence formats

Preferred:

```text
PNG for exact-frame/golden/proof images
JPEG only for lightweight non-pixel-exact diagnostic sheets when appropriate
JSON for metrics/receipts
MP4 for normal-speed human proof
```

Avoid recompression of pixel-exact golden evidence.

## 19. Color bars/test fixture

Before real R3F/Pixi adoption, create a small render calibration fixture containing:

- grayscale steps;
- saturated primaries/secondaries;
- alpha edges;
- semi-transparent warm/cool paint samples;
- source texture;
- Three/Pixi/Rive rendered patches.

This detects color/gamma/alpha divergence early.

## 20. Render calibration tests

Unit/contract:

- profile schemas;
- fps/frame count;
- safe zones;
- no debug profile in production.

Visual:

- calibration fixture golden;
- alpha edge checks;
- color-space gross-drift checks;
- hybrid runtime appearance comparison.

E2E:

- choose proof profile;
- render fixture;
- inspect receipt;
- production mode blocks debug overlays;
- profile mismatch marks proof stale.

## 21. Encoder failure injection

- FFmpeg unavailable;
- unsupported codec;
- disk full/interrupted render;
- truncated MP4;
- wrong output frame count;
- missing audio stream;
- wrong dimensions;
- wrong pixel format;
- render process succeeds but output file missing/zero bytes.

No partial output can become promotion evidence.

## 22. Determinism expectations

Exact encoded MP4 bytes may differ across encoder/platform versions even when frames are semantically identical.

Therefore distinguish:

```text
SCENE_DETERMINISM
FRAME_VISUAL_DETERMINISM
ENCODE_BYTE_IDENTITY
```

Canonical release hash records exact produced file, while platform foundation primarily guarantees scene/frame semantics. If byte-identical encode is required later, that becomes a separate pinned-environment contract.

## 23. Render concurrency

Concurrency affects performance only, not semantic state.

Benchmark selected concurrency profiles. If frame output changes based on concurrency, this is a blocking nondeterminism bug.

## 24. Hardware acceleration

Hardware/WebGL mode may affect performance/visuals.

Production profile records renderer backend/mode where relevant. A backend change triggers benchmark comparison if visual differences exceed tolerance.

## 25. Thumbnail/social derivatives

Thumbnails, square crops and alternate platform derivatives are separate delivery transformations and cannot silently become canonical scene composition.

Future derivative recipe records source final hash + crop/resize/text treatment.

## 26. Captions and title rendering

Text rendering is sensitive to fonts/environment.

Production fonts/versions must be deterministically available and licensed. Proof/golden environment uses same font path/version policy.

Missing font fallback is a blocking proof fixture, not an acceptable silent substitution.

## 27. Output QC receipt

Example categories:

```text
frameCount PASS
resolution PASS
fps PASS
codec PASS
colorMetadata PASS
alpha/debugLeak PASS
audioStream PASS
audioPeak PASS
captionSafe PASS
titleSafe PASS
outputHash recorded
```

## 28. Storybook relevance

Storybook does not validate final codec, but it does validate:

- visual color/alpha fixture in pinned browser;
- output composition guides;
- safe zones;
- debug vs production overlay state;
- exact frame semantics.

## 29. Local-first gate

Render pipeline change:

```text
unit/profile tests
lint/build
Storybook calibration if visual
local short proof render
output QC
applicable render E2E/CLI integration
human compare if color/appearance changed
  ↓
push
  ↓
GitHub deterministic profile/schema/browser checks
```

GitHub default PR jobs need not encode full production reels.

## 30. Definition of render readiness

The render pipeline is ready when one named Scene V3 proof state produces predictably composed/color-managed frames in Storybook and Remotion, proof receipts capture the technical environment, encoder failures cannot yield valid evidence, and production output can be verified without relying on visual guesswork alone.
