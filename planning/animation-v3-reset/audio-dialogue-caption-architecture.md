# Audio, Dialogue, Narration, Lip-Sync and Caption Architecture

Status: **planning contract**

Chapters 1–3 require more than visual animation. Chapter 2 in particular contains sustained dialogue, formal address, intimate conversation, messengers, ritual speech and crowd scenes. Audio therefore becomes a first-class Scene V3 concern rather than a final MP3 layered on after animation.

## 1. Ownership model

```text
Scene V3        semantic timing, speaker, cue IDs, transcript/caption bindings
Audio assets    narration/dialogue/ambience/music canonical bytes
Voice pipeline  creates candidates/bakes; does not own story timing
Performance rig consumes phoneme/viseme/emotion cues
Remotion        final deterministic audio/video assembly
QA              timing/loudness/caption/lip-sync evidence
Human review    performance, intelligibility, dramatic fit
```

## 2. Audio cue contract

Conceptual:

```ts
interface AudioCue {
  id: string;
  type: 'narration' | 'dialogue' | 'ambience' | 'music' | 'sfx';
  assetId: string;
  startFrame: number;
  endFrame: number;
  gainDb?: number;
  fadeInFrames?: number;
  fadeOutFrames?: number;
  speakerActorId?: string;
  transcriptId?: string;
  spatialBinding?: SpatialAudioBinding;
}
```

Integer frames remain canonical timing.

## 3. Transcript line

```ts
interface SpokenLine {
  id: string;
  speakerActorId?: string;
  text: string;
  sourceRelationship: AdaptationClass;
  startFrame: number;
  endFrame: number;
  performanceIntent?: string;
  captionPolicy: 'caption' | 'narration-caption' | 'omit-intentionally';
}
```

Narrative/source provenance can therefore reach spoken dialogue.

## 4. Voice asset lifecycle

```text
SCRIPT_READY
  ↓
VOICE_CANDIDATE
  ↓
AUDIO_QA
  ↓
HUMAN_PERFORMANCE_REVIEW
  ↓
APPROVED_AUDIO_ASSET
  ↓
SCENE_BINDING
```

Generated TTS is always candidate first.

## 5. Voice identity

A recurring character voice needs versioned identity similar to visual rig identity:

```text
voice:enki:v1
voice:enlil:v1
voice:ninlil:v1
```

Metadata:

- provider/model/workflow;
- prompt/voice preset provenance where applicable;
- approved sample hashes;
- pronunciation profile;
- style/pace range;
- license/use status;
- human approval.

Do not silently change Enki’s voice model halfway through a chapter.

## 6. Pronunciation dictionary

Ancient names require deliberate pronunciation consistency.

```text
Enki
Enlil
Ninhursag
Ereshkigal
Nisaba
Dilmun
Eridu
Nippur / Nibru
```

Store project pronunciation decisions separately from claims about reconstructed Sumerian pronunciation.

A pronunciation entry can include:

```text
display term
project spoken form
IPA/phonetic hint if useful
source/note
alternate accepted forms
```

## 7. Dialogue performance intent

Audio generation/recording gets semantic direction:

```text
FORMAL_ADDRESS
PRIVATE_CONVERSATION
WARM_GREETING
ANGER_CONTROLLED
ANGER_OPEN
AWE
GRIEF
HUMOR_DRY
RITUAL
NARRATION_REFLECTIVE
```

This maps to actor performance clips but does not directly prescribe every gesture.

## 8. Lip-sync representation

Lip-sync is not wall-clock audio analysis at render time.

Approved audio generates/binds a deterministic timeline:

```ts
interface VisemeCue {
  startFrame: number;
  endFrame: number;
  viseme: VisemeId;
  weight: number;
}
```

Potential pipeline:

```text
approved dialogue audio
  ↓
phoneme/viseme analysis
  ↓
manual/automatic correction
  ↓
versioned viseme track
  ↓
Rive/other actor performance
```

The generated viseme track is evidence-bound to exact audio hash.

## 9. Lip-sync realism target

For stylized painted characters, avoid uncanny hyper-detailed mouth animation.

Initial target:

- correct speech rhythm;
- major open/closed/rounded shapes;
- phrase emphasis;
- natural pauses;
- jaw/face movement restrained;
- listener reactions more important than perfect phoneme articulation in wider shots.

## 10. Audio-to-performance coupling

Audio drives semantic timing through approved tracks:

```text
spoken phrase start/end
  → mouth/viseme
  → gesture accents
  → gaze/listener reaction
```

Do not derive all body gestures automatically from waveform amplitude.

## 11. Multi-actor dialogue

Scene V3 needs speaker/listener state:

```text
speaker line
listener gaze
listener reaction clip
turn-taking pause
interruption overlap if authored
```

Chapter 2’s council/family conversations should become benchmark material.

## 12. Formal-address benchmark

`benchmark:enlil-council:v1` should eventually prove:

- approved Enlil voice/line;
- speech timing;
- modest viseme sync;
- formal gesture accents;
- council listener variation;
- captions;
- intelligibility over ambience/music;
- normal-speed human review.

## 13. Caption contract

Captions bind to transcript semantics, not OCR of final video.

```ts
interface CaptionCue {
  id: string;
  spokenLineId: string;
  startFrame: number;
  endFrame: number;
  text: string;
  speakerLabel?: string;
  placement: 'default-safe' | 'top-safe' | 'custom';
}
```

## 14. Caption safe zones

QA checks:

- caption not outside frame;
- no collision with required title/CTA safe zones;
- no excessive occlusion of hero face/action where avoidable;
- readable contrast/backplate independent from art palette;
- timing aligns with line.

## 15. Subtitle vs burned captions

Scene data remains capable of exporting timed text separately even if reels initially burn captions into video.

Future outputs may include:

```text
SRT
WebVTT
platform caption payload
```

Canonical transcript/timing is upstream of delivery format.

## 16. Narration architecture

Narration remains common for reels.

Narration cue owns:

- exact asset hash;
- source/script revision;
- frame window;
- no forced time-stretch beyond approved quality policy;
- ducking relationship to music/ambience.

Current finalizer lessons should migrate into generic audio contracts rather than remain Reel 1-only scripts.

## 17. Time-stretch policy

Do not make every line fit by aggressive playback-speed manipulation.

Preferred order:

1. script edit;
2. performance pacing;
3. scene timing adjustment;
4. modest high-quality time correction if allowed;
5. reject/re-record when quality suffers.

Audio naturalness is a human gate.

## 18. Ambience system

Reusable ambience definitions:

```text
ocean-calm
marsh-reeds
city-market
canal-work
interior-temple
storm
underworld
night-camp
```

Ambience is layered and loop-seam tested.

## 19. SFX system

Examples:

```text
rope tension
water hull slap
hail impact
footsteps
brick/tool impact
animals
crowd reaction
fire
```

SFX events are frame-bound and seeded where variation/sample selection is procedural.

## 20. Music system

Music is editorial, not automatically driven by animation engine.

Scene/reel binding stores:

- music asset/segment;
- start/end/fades;
- mix gain;
- dramatic purpose;
- source/license/generated provenance.

Historical instrument evidence may inspire orchestration without claiming reconstructed authentic performance unless supported.

## 21. Mix buses

Planned logical buses:

```text
DIALOGUE
NARRATION
MUSIC
AMBIENCE
SFX
```

Finalizer can implement ducking/limits consistently.

## 22. Loudness/peak QA

Define project delivery targets later by platform, but tests should support:

- clipping detection;
- true/sample peak guard;
- integrated/short-term loudness reporting;
- dialogue/narration intelligibility checks;
- silence/missing cue detection;
- unexpected duration mismatch.

Do not hard-code one platform loudness target into Scene V3 semantic data.

## 23. Audio deterministic tests

Unit:

- cue frame ranges;
- overlap policy;
- fade bounds;
- asset resolution/hash;
- caption timing;
- viseme/audio hash binding;
- seeded SFX sample selection stability;
- mix graph cycle rejection.

## 24. Storybook/Animation Lab audio stories

```text
Audio/Narration/Cue
Audio/Dialogue/SingleActor
Audio/Dialogue/TwoActorTurnTaking
Audio/LipSync/VisemeProofStates
Audio/Captions/Default
Audio/Captions/TopSafe
Audio/Mix/DialogueMusic
Audio/Failure/MissingAsset
Audio/Failure/StaleVisemeTrack
```

Playback stories must still expose exact-frame inspection.

## 25. Visual proof states for dialogue

Named states might include:

```text
REST
PHRASE_START
MOUTH_OPEN_PEAK
GESTURE_ACCENT
LISTENER_REACTION
PHRASE_END
RETURN_TO_REST
```

These same fixture states feed screenshot/motion tests.

## 26. E2E workflows

- select spoken line → jump to cue;
- inspect transcript/source relationship;
- swap voice candidate → old viseme track becomes stale;
- preview captions;
- keyboard toggle captions;
- run audio proof → inspect loudness/missing cues;
- approve voice candidate;
- reload exact audio revision.

## 27. Failure injection

- missing audio file;
- wrong hash;
- line beyond scene end;
- stale viseme track;
- zero-length cue;
- overlapping dialogue disallowed by policy;
- caption outside bounds;
- clipping mix;
- ambience loop seam pop;
- unavailable TTS service leaves canonical unchanged.

## 28. Accessibility

- captions planned from transcript source;
- no information-critical dialogue omitted without intentional policy;
- Studio audio controls keyboard accessible;
- waveform is not sole representation of cue state;
- transcript remains readable without audio playback;
- future audio-description compatibility preserved.

## 29. Local-first quality gate

Audio implementation slice:

```text
unit
lint
build
Storybook interaction/audio states
caption/accessibility tests
applicable E2E
local short audio/video proof
human performance review where canonical voice changes
  ↓
push
  ↓
GitHub repeats deterministic non-heavy checks
```

## 30. Definition of audio readiness

The subsystem is ready when narration/dialogue/audio assets, captions and actor performance can all be traced to exact frame/source/hash state; a voice change invalidates dependent lip-sync correctly; Storybook and final Remotion evaluate the same cue state; and final human review judges natural speech rather than a test suite merely proving waveform existence.
