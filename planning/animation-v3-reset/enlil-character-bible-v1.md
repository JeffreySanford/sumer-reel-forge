# Enlil Character Bible v1 — Pre-Source Production Packet

Status: **concrete narrative/performance contract; visual source pending**

Character ID: `actor:enlil`

This packet deliberately stops short of inventing Enlil's face, costume or exact headdress. Chapter 2 makes Enlil one of the platform's most demanding performance actors, but the repository does not yet contain an approved Chapter 2 visual baseline equivalent to Reel 1 Enki. That absence is a production state, not an invitation to improvise identity inside the rig spike.

## 1. Readiness state

```text
narrative identity        READY
literary provenance       READY for known ETCSL bindings
performance vocabulary    READY for benchmark planning
visual identity source    SOURCE_PENDING
costume source            SOURCE_PENDING
rig source                BLOCKED_BY_VISUAL_SOURCE
voice profile             NOT_REQUIRED_FOR_FIRST_SILENT_BENCHMARK
production rig            NOT_STARTED
```

No runtime asset may be called `actor:enlil` production-ready until the visual-source gate is cleared.

## 2. Narrative identity

Current Chapter 2 source map binds relevant Enlil material to:

```text
etcsl-1.2.1  Enlil and Ninlil
etcsl-1.2.2  Enlil and Sud
```

The manuscript also contains explicitly authored bridges, including the Grand Council framing. The character system must preserve that distinction: source-linked Enlil and project-authored characterization can coexist without labeling the latter as ancient-source fact.

Proposed conceptual definition:

```ts
{
  id: 'actor:enlil',
  revision: 1,
  displayName: 'Enlil',
  narrativeRole: 'authority, order, air and assembly; major Chapter 2 dramatic actor',
  chapterThreads: [
    'ch2-grand-council',
    'ch2-sud-courtship',
    'ch2-marriage-gifts',
    'ch2-enlil-ninlil'
  ],
  literarySourceIds: ['etcsl-1.2.1', 'etcsl-1.2.2'],
  iconographicEvidenceIds: [],
  costumeProfileIds: [],
  rigProfileIds: [],
  performanceVocabularyIds: ['performance-vocab:enlil:formal-authority:v1']
}
```

## 3. Motion identity before visual identity

We can responsibly define how Enlil should **perform** before deciding exactly how he looks.

Project motion direction:

- axial, controlled posture;
- economical formal gesture;
- authority communicated through stillness and timing rather than constant motion;
- anger/emphasis expressed through authored changes in posture, gaze and gesture rather than exaggerated cartoon motion;
- strong speaker/listener contrast;
- deliberate turns and exits;
- reactions should feel socially consequential, not melodramatic by default.

This is project art direction, not a claim about ETCSL stage directions.

## 4. First benchmark use — Grand Council Address

Benchmark ID:

```text
benchmark:enlil-council:v1
```

Narrative capabilities required:

```text
formal address
rest/listen
controlled emphasis
anger escalation
turn/exit
speaker focality
crowd reaction wave
spatial authority
```

The first benchmark may run without lip sync. Gesture and body language should remain legible with audio muted at key proof moments.

## 5. Required semantic channels

Minimum rig target once visual source exists:

```text
face.eye-left-open
face.eye-right-open
face.gaze-x
face.gaze-y
face.brow-left
face.brow-right
body.breath
body.head-turn
body.torso-turn
body.shoulder-left
body.shoulder-right
body.arm-left
body.arm-right
body.hand-left
body.hand-right
```

Dialogue/viseme channels are deferred until the silent formal-performance benchmark is green.

## 6. Performance vocabulary v1

Planned clips:

```text
clip:enlil:formal-rest:v1
clip:enlil:listen-contained:v1
clip:enlil:formal-address:v1
clip:enlil:open-hand-emphasis:v1
clip:enlil:controlled-anger:v1
clip:enlil:gaze-council-left:v1
clip:enlil:gaze-council-right:v1
clip:enlil:turn-dismiss:v1
clip:enlil:exit-deliberate:v1
```

A scene composes clips/channels explicitly. There is no opaque `emotion='angry'` switch that secretly drives half the rig.

## 7. Grand Council proof states

```text
REST
ADDRESS_OPEN
EMPHASIS
CONTROLLED_ANGER
REACTION_HOLD
TURN_AWAY
EXIT_START
```

The crowd benchmark must include a corresponding reaction schedule so the scene proves interaction, not a solo puppet in front of wallpaper.

## 8. Visual-source acquisition gate

Before any production rig work:

1. create Chapter 2 Enlil editorial concept candidates from the project's approved visual language;
2. bind each candidate to manuscript/source/evidence notes;
3. review character silhouette, face, age, hair/beard, status markers, costume, headdress and palette;
4. reject accidental reuse of Enki facial identity;
5. approve one visual identity baseline;
6. create an Enlil source receipt and immutable baseline path;
7. only then prepare segmented rig source.

Proposed future path:

```text
assets/blessings-of-sumer/chapter-02/character-bible/enlil-v1/
```

Suggested contents after approval:

```text
identity-front.png
identity-three-quarter.png
council-costume.png
expression-reference.png
palette.json
registration.json
source-receipt.json
```

Do not create these files merely to satisfy this path plan; the approved artwork comes first.

## 9. Costume profile placeholder

Future ID:

```text
costume:enlil:council:v1
```

Known semantic requirements:

- immediately legible formal/status role;
- compatible with restrained arm/torso performance;
- no visual confusion with Enki's voyage costume;
- no generic fantasy-king silhouette;
- period/evidence relationships documented;
- mythic/divine markers classified separately from archaeological certainty.

Exact colors, headdress shape, jewelry and garment construction remain **UNDECIDED** until evidence/design review.

## 10. Identity-separation test — Enlil is not recolored Enki

A specific regression is warranted because reusable rig workflows make duplication easy.

Required failure fixture:

```text
FAILURE-ENLIL-001-enki-identity-reuse
```

It fails when a proposed Enlil rig/source is merely Enki's approved source with palette/headdress changes that leave the same face/body identity unintentionally intact.

Shared project style is desirable; cloned hero identity is not.

## 11. Council spatial/contact anchors

Future semantic anchors:

```text
anchor:enlil:gaze-origin
anchor:enlil:head-center
anchor:enlil:torso-root
anchor:enlil:hand-left
anchor:enlil:hand-right
anchor:enlil:stance-root
```

Scene/world targets:

```text
target:council:center
target:council:left-benches
target:council:right-benches
target:council:exit
target:enki:conversation-partner
```

Gaze targets are scene semantics, not hard-coded screen coordinates.

## 12. Storybook contract

Stories can be staged in two waves.

### Before visual source approval

Documentation/data stories only:

```text
Characters/Enlil/NarrativeIdentity
Characters/Enlil/SourceBindings
Characters/Enlil/PerformanceVocabulary
Characters/Enlil/SourcePending
```

### After visual source approval

```text
Characters/Enlil/IdentityReference
Characters/Enlil/CouncilCostume
Characters/Enlil/RigNeutral
Characters/Enlil/FormalRest
Characters/Enlil/FormalAddress
Characters/Enlil/ControlledAnger
Characters/Enlil/TurnExit
Characters/Enlil/ContactAnchors
Characters/Enlil/DebugRig
```

The `SourcePending` state should be a real supported Studio/Storybook condition rather than a broken-image placeholder.

## 13. Planned stable acceptance IDs

```text
CONTRACT-ENLIL-001-source-required-before-rig
CONTRACT-RIVE-010-enlil-channel-map
STORY-RIVE-010-enlil-formal-rest
STORY-RIVE-011-enlil-formal-address
VISUAL-ENLIL-001-neutral
VISUAL-ENLIL-002-formal-emphasis
MOTION-ENLIL-001-formal-address
MOTION-ENLIL-002-controlled-anger
SEMANTIC-ENLIL-001-speaker-authority-readable
SEMANTIC-ENLIL-002-identity-stable
FAILURE-ENLIL-001-enki-identity-reuse
FAILURE-ENLIL-002-source-pending-promoted
FAILURE-CROWD-001-perfect-sync
PERF-RIVE-010-enlil-preview
HUMAN-ENLIL-001-council-performance
```

## 14. Negative benchmark cases

- Enlil source missing but rig marked production-ready;
- Enlil visually indistinguishable from Enki;
- formal-address gesture plays on every council member simultaneously;
- crowd reacts at identical frame;
- anger is represented only by camera shake/zoom;
- body gesture breaks spatial focality;
- gaze targets arbitrary screen point instead of council subject;
- costume changes between proof states;
- runtime silently swaps a source revision;
- speaker animation continues after authored rest state.

## 15. Dialogue/lip-sync boundary

The first Council benchmark intentionally proves **performance without depending on lip sync**.

After that gate:

```text
voice profile
  ↓
dialogue asset
  ↓
word/phoneme timing
  ↓
viseme performance
  ↓
caption timing
```

becomes a separate capability. This prevents lip-sync complexity from hiding whether Enlil's body acting works.

## 16. Human acceptance questions

- Does Enlil read as a distinct recurring hero identity?
- Does formal authority come through without constant motion?
- Does escalation feel intentional rather than generated?
- Can the audience tell when he is speaking versus listening with audio muted?
- Does crowd response reinforce the moment without becoming synchronized noise?
- Does the character remain inside the established Blessings of Sumer visual world without becoming a copy of Enki?

## 17. Exit condition

This packet becomes implementation-ready only after `SOURCE_PENDING` is cleared with an approved visual identity baseline. Until then, it is intentionally ready for data contracts, Storybook source-pending states, test IDs and benchmark planning—but **not** for a production Rive rig.