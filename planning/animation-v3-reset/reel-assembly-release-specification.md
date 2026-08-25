# Reel Assembly and Release Specification v1

Status: **planning contract / applies to Reel 1 migration and future reels**

This document defines the layer above individual Scene V3 shots: how approved scenes, narration, dialogue, music/effects, captions, titles and QC become one canonical vertical reel without losing shot-level provenance.

The current Reel 1 editorial baseline contains eight approved shot concepts. V3 may migrate their internal animation architecture, but reel assembly remains a separate, explicit production stage.

## 1. Core rule

A reel is not “whatever MP4 the last render command produced.”

A release candidate is a versioned assembly of exact approved inputs:

```text
reel definition
  + exact scene revisions
  + exact resolved-scene hashes
  + narration/dialogue revisions
  + music/SFX revisions
  + caption revision
  + title/end-card revision
  + render profile
  + assembly runtime versions
  ↓
release candidate
  ↓
technical QC
  + continuity QC
  + audio/caption QC
  + provenance verification
  + human normal-speed review
  ↓
canonical reel release
```

## 2. ReelDefinition

Conceptual:

```ts
interface ReelDefinition {
  id: string;
  revision: number;
  projectId: string;
  chapterId: string;
  episodeNumber: number;
  fps: number;
  width: number;
  height: number;

  scenes: ReelSceneBinding[];
  audioTimeline: ReelAudioBinding[];
  captionTrackIds: string[];
  titleTrackIds: string[];
  renderProfileId: string;
  qaProfileId: string;
}
```

Scene binding:

```ts
interface ReelSceneBinding {
  order: number;
  sceneId: string;
  sceneRevision: number;
  resolvedSceneHash: string;
  startFrame: number;
  endFrame: number;
  transitionIn?: string;
  transitionOut?: string;
}
```

Release assembly binds resolved hashes, not merely “latest scene.”

## 3. Reel 1 semantic sequence

The existing visual bible establishes this order:

```text
01 Black water before dawn
02 Stag under sail
03 Enki at the helm
04 Nammu implied beneath deep water
05 Traveler shrine / hospitality image
06 Practical-symbol montage
07 Dilmun through haze
08 Stag approaching land / final title space
```

A V3 migration may alter internal motion and shot duration only through a new ReelDefinition revision. Shot identity/order does not drift because one renderer happens to finish later.

## 4. Duration authority

Scene V3 owns each scene's frame duration. ReelDefinition owns placement on the reel timeline.

Rules:

- no fractional persisted frame boundaries;
- assembly does not time-stretch a rendered scene silently;
- narration edit that requires timing change creates a new reel/scene revision as appropriate;
- transition frames are authored and counted explicitly;
- the release receipt records total frame count.

If a scene is rendered as an intermediate clip, its expected frame count must match the assembly binding exactly.

## 5. Scene delivery modes

Two supported assembly strategies may coexist:

### Direct composition

One Remotion reel composition evaluates bound resolved Scene V3 scenes directly.

Advantages:

- one frame authority;
- fewer intermediate encodes;
- exact transition control.

### Approved intermediate clips

Approved scene clips are assembled as exact release inputs.

Use only when:

- expensive subsystem render/bake makes clip retention worthwhile;
- clip has an exact render receipt;
- frame count/fps/color profile match the reel contract;
- no extra resampling/time stretch occurs silently.

The release receipt records which mode each scene used.

## 6. Audio timeline

Audio tracks remain versioned independently from visuals.

At minimum:

```text
narration
on-camera dialogue when applicable
music
ambience
spot SFX
```

Each binding records:

```text
asset ID
revision/hash
startFrame
endFrame or natural duration
bus
level profile
fade/crossfade
source/voice profile where applicable
```

A narration change does not silently replace visual proof. It may stale reel timing/caption proof while leaving shot visual proof current.

## 7. Captions

Caption track is a release input, not text painted into source artwork.

Required properties:

- exact revision/hash;
- time/frame alignment;
- safe-area compliance;
- readable contrast;
- no critical visual coverage;
- speaker labeling policy where dialogue requires it;
- punctuation/text reviewed against approved narration/dialogue;
- reduced-motion/accessibility behavior in Studio preview.

Caption corrections create a new caption/reel release revision without forcing unrelated character-rig reapproval.

## 8. Titles and end cards

Title/end-card treatment must be versioned separately from editorial imagery.

Rules:

- generated source images must not contain authoritative final text;
- title text comes from production data;
- font/text/layout remains accessible and inside vertical safe area;
- final card duration is explicit frames;
- brand/project naming changes do not rewrite scene media.

## 9. Color/render contract

Release uses the approved render profile from `render-color-delivery-standard.md`.

Assembly checks:

```text
resolution consistent
fps consistent
alpha flattened intentionally for delivery
color tags/profile expected
no unintended range conversion
no scene clip with mismatched dimensions
no duplicate/re-encoded audio drift
```

Byte-identical encoding across arbitrary machines is not required. The canonical released file receives its own hash.

## 10. Transition policy

Transitions are semantic edits, not renderer defaults.

Allowed initial vocabulary may include:

```text
CUT
DISSOLVE_SHORT
DISSOLVE_LONG
DIP_TO_DARK
MATCH_MOTION
AUDIO_PRELAP
AUDIO_POSTLAP
```

Every transition has deterministic frame length.

Avoid using transitions to hide:

- identity drift;
- unapproved frame edges;
- broken motion settle;
- source discontinuity.

## 11. Cross-shot continuity QC

Shot approval alone is insufficient. Reel-level human review checks:

```text
Enki identity/costume continuity
Stag vessel continuity
water/weather progression
cool-open-water → warmer-Dilmun color journey
camera-motion rhythm
motion density rhythm
caption position consistency
narration pacing
music/ambience continuity
no repeated animation cycles becoming obvious across cuts
```

A scene can be individually excellent and still be wrong for the reel sequence.

## 12. Reel 1 A/B migration strategy

During V3 migration, preserve a reproducible reference:

```text
A = current approved/editorial/V2 reel baseline
B = V3 release candidate
```

Compare:

- same narrative order;
- equivalent narration revision unless deliberately changed;
- title/caption parity where applicable;
- normal-speed full reel;
- selected shot-by-shot proof states;
- overall pacing.

Do not migrate all eight shots and discover at the end that the series rhythm changed unintentionally.

Suggested staged assembly gates:

```text
Gate R1 — shots 1–3 contiguous
Gate R2 — shots 1–4 with Nammu contrast
Gate R3 — shots 1–7 through Dilmun reveal
Gate R4 — complete eight-shot reel
```

Each gate is a reel-level review candidate, not a canonical release.

## 13. Release-candidate directory

Conceptual local proof bundle:

```text
tmp/releases/<reel-id>/<candidate-id>/
  reel-definition.json
  scene-bindings.json
  source-receipts.json
  audio-bindings.json
  captions.json
  runtime-versions.json
  assembly-report.json
  qc-technical.json
  qc-caption.json
  qc-audio.json
  qc-continuity.json
  contact-sheet.png
  candidate.mp4
  human-review.json
  release-receipt.json
```

Retention policy determines which heavyweight artifacts are promoted/archived.

## 14. Technical QC

Required blocking checks:

- output exists and non-zero;
- expected frame count;
- expected fps/resolution;
- expected audio stream(s);
- no decode errors in validation pass;
- no missing/corrupt scene input;
- no stale resolved-scene hash;
- no zero-length transition;
- no black/missing frame caused by assembly gap unless authored;
- final output hash recorded.

Stable IDs:

```text
RECEIPT-RENDER-001-required-fields
FAILURE-RENDER-001-zero-byte-output
FAILURE-REEL-001-frame-count-mismatch
FAILURE-REEL-002-scene-hash-stale
FAILURE-REEL-003-timeline-gap
FAILURE-REEL-004-input-profile-mismatch
```

## 15. Audio QC

Checks:

- narration present where expected;
- clipping/invalid peaks detected;
- accidental silence detected;
- music does not obscure narration according to approved mix profile;
- scene boundary does not cut reverb/ambience accidentally;
- dialogue/viseme timing receipt current when visible speech exists;
- final audio duration matches reel timeline.

Stable IDs:

```text
CONTRACT-AUDIO-001-reel-binding-valid
FAILURE-AUDIO-001-missing-narration
FAILURE-AUDIO-002-duration-mismatch
HUMAN-AUDIO-001-full-reel-mix
```

## 16. Caption QC

Checks:

- every expected spoken segment covered according to caption policy;
- no caption extends beyond reel duration;
- line breaks/readability accepted;
- safe-area collision check;
- text content revision matches approved script.

Stable IDs:

```text
A11Y-CAPTION-001-safe-readable-caption
CONTRACT-CAPTION-001-track-frame-bounds
FAILURE-CAPTION-001-stale-script-revision
FAILURE-CAPTION-002-out-of-safe-area
HUMAN-CAPTION-001-full-reel-readability
```

## 17. Full-reel human review

Required normal-speed passes:

### Visual-only / muted

Can the reel's story progression and focus be followed visually?

### Audio-first

Does narration/audio pacing feel intentional without relying on visual novelty?

### Normal delivery

Does the complete reel feel like one authored work rather than eight technology demos?

### Phone-scale

Are Enki, the Stag, captions and major beats readable at intended viewing scale?

## 18. Release receipt

Conceptual:

```ts
interface ReelReleaseReceipt {
  reelId: string;
  reelRevision: number;
  commitSha: string;
  sceneBindings: Array<{
    sceneId: string;
    sceneRevision: number;
    resolvedSceneHash: string;
    renderReceiptHash?: string;
  }>;
  audioHashes: string[];
  captionHashes: string[];
  titleHashes: string[];
  renderProfileId: string;
  runtimeVersions: Record<string, string>;
  expectedFrames: number;
  actualFrames: number;
  outputSha256: string;
  qcReceiptHashes: string[];
  humanReviewId: string;
  approvedAt: string;
}
```

`approvedAt` belongs in the release evidence; it is not part of deterministic scene state/hash.

## 19. Promotion

Promotion is transactional:

```text
candidate exact bytes
+ exact release receipt
+ current scene/source/audio/caption bindings
+ technical QC green
+ applicable semantic/accessibility QC green
+ human approval
→ canonical release
```

If any bound scene/audio/caption revision changes between review and promotion, promotion fails stale.

## 20. Rollback

A previous canonical release remains identifiable by release ID/hash.

Rollback does not rebuild “the same” reel from latest inputs. It restores/reference-selects the previously approved exact release artifact and receipt.

## 21. Local-first release gate

Before release candidate is pushed/tagged/promoted:

```text
applicable unit/contract tests locally
lint/build locally
Storybook/a11y locally for changed authoring/review UI
E2E locally for changed reel workflow
scene render proofs locally for changed animation
full reel assembly locally
technical/audio/caption QC locally
human full-reel review
```

GitHub then independently verifies deterministic repository/receipt/provenance gates. Heavy local rendering remains honestly represented as local evidence unless CI actually performs it.

## 22. Definition of release readiness

A reel is release-ready when every frame, sound, caption and title can be traced to an exact approved revision; reel-level continuity has been reviewed at normal speed; the output passes delivery QC; and reconstructing why the released file exists does not require searching old terminal logs or chat history.