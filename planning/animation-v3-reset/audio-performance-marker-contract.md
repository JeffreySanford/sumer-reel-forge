# Audio Performance Marker and Dialogue Timing Contract

Status: **final pre-implementation planning contract**

This contract narrows the broader audio/dialogue architecture into exact frame-addressed markers that can drive speech, visemes, gesture accents, listener reactions, captions and QA without analyzing waveforms during production render.

## Core rule

Approved audio is an immutable timed asset. Production animation consumes a versioned marker track derived from that exact audio hash.

```text
spoken line text + source relationship
  ↓
approved audio asset
  ↓
frame-bound marker track
  ├── word/phrase boundaries
  ├── viseme spans
  ├── emphasis markers
  ├── breath/pause markers
  ├── gesture opportunities
  └── listener reaction windows
  ↓
Scene V3 performance bindings
```

No runtime performs free-running speech analysis during render.

## Proposed contracts

```ts
interface DialogueMarkerTrack {
  id: string;
  revision: number;
  audioAssetId: string;
  audioSha256: string;
  transcriptLineId: string;
  speakerActorId: string;
  fps: number;
  startFrame: number;
  endFrameExclusive: number;
  markers: DialogueMarker[];
}

type DialogueMarker =
  | { type: 'PHRASE'; id: string; startFrame: number; endFrameExclusive: number }
  | { type: 'VISEME'; viseme: string; startFrame: number; endFrameExclusive: number; weight: number }
  | { type: 'EMPHASIS'; frame: number; strength: number; semantic: string }
  | { type: 'BREATH'; startFrame: number; endFrameExclusive: number }
  | { type: 'PAUSE'; startFrame: number; endFrameExclusive: number }
  | { type: 'GESTURE_WINDOW'; startFrame: number; endFrameExclusive: number; intent: string }
  | { type: 'LISTENER_REACTION_WINDOW'; startFrame: number; endFrameExclusive: number; intent: string };
```

Markers are semantic; Rive mouth-state names remain adapter-local.

## Invariants

- all persisted timing uses integer frames;
- marker range must remain within track range;
- all markers bind the exact audio hash they were derived from;
- changing approved audio bytes makes the marker track `AUDIO_STALE`;
- caption text is linked but not duplicated as authoritative speech text;
- a gesture window is permission/intent, not mandatory auto-gesture;
- listener reaction windows may overlap speaker speech intentionally;
- viseme spans may overlap only according to the chosen blend policy;
- silence never produces synthetic mouth motion unless explicitly authored.

## Chapter 2 benchmark

`benchmark:enlil-council:v1` becomes the first formal dialogue fixture.

Required named states:

```text
LINE_START
FIRST_EMPHASIS
FORMAL_GESTURE_WINDOW
MID_LINE_PAUSE
FINAL_EMPHASIS
LINE_END
LISTENER_REACTION
```

The same marker identities feed Storybook, Remotion proof, lip-sync QA and caption-alignment tests.

## Negative fixtures

```text
FAILURE-AUDIO-001 marker-audio-hash-mismatch
FAILURE-AUDIO-002 marker-outside-line-range
FAILURE-AUDIO-003 mouth-motion-during-authored-silence
FAILURE-AUDIO-004 caption-line-points-to-different-transcript
FAILURE-AUDIO-005 viseme-track-reused-after-audio-change
FAILURE-AUDIO-006 wall-clock-waveform-analysis-at-render
FAILURE-AUDIO-007 listener-reaction-owned-by-speaker-runtime
```

## QA layers

Structural QA verifies marker bounds, exact audio hash, transcript/speaker IDs and caption relationship. Visual/motion QA checks that mouth motion follows speech rhythm without becoming uncanny, emphasis does not produce mechanical whole-body bumps, and listener reactions remain independent. Human review decides voice fit, dramatic timing and whether gestures feel authored rather than waveform-driven.

## Versioning/staleness

A new audio take creates a new audio asset revision/hash. If timing changes, the old marker track remains reproducible but becomes stale for new scene resolution. A marker-only correction creates a new marker revision without changing the approved audio asset.

## Definition of Ready

This contract is implementation-ready when Phase 2 can represent marker tracks without audio-runtime types, one candidate Chapter 2 line exists in machine-readable planning data, and the Animation Lab can eventually select named marker proof states by exact frame.
