# Enki Character Bible v1 — Production Packet

Status: **concrete continuity packet / rig source planning**

Character ID: `actor:enki`

This document instantiates the generic character/costume/rig bible for the first production hero. It binds Enki to the already-approved Blessings of Sumer visual baseline and the current Shot 3 source/derived assets without making the existing blink-PNG implementation the future rig architecture.

## 1. Authority order

For visual identity decisions, use this order:

```text
1. Blessings of Sumer visual bible v1
2. approved Reel 1 editorial source frame(s)
3. approved source-faithful derived layers
4. approved future Enki character-source sheet
5. runtime rig implementation
6. scene-specific performance clips
```

A `.riv`, generated pose, segmented layer or character-state patch never outranks the visual bible/editorial source automatically.

## 2. Canonical project identity

The current visual bible establishes Enki as:

- mature Mesopotamian man;
- warm brown skin;
- long black wavy hair;
- full dark beard with subtle gray;
- cream woven robe;
- narrow lapis-blue and copper trim;
- broad copper belt;
- lapis/copper jewelry;
- leather sandals;
- calm, observant authority;
- traveler/builder rather than warrior in Reel 1;
- compact horned divine crown, restrained rather than theatrical.

Visual-direction palette references already established by the project:

```text
deep water  #082f42
lapis       #1d5f82
copper      #a6653a
reed gold   #c9a65b
clay        #9a6047
limestone   #d8c9aa
woven cream #e5d8bd
bitumen     #171918
```

These are continuity anchors, not a claim that every ancient source specifies these exact colors.

## 3. Current canonical visual sources

### Master visual baseline

```text
assets/visual-bible/blessings-of-sumer-master-v1.png
```

Project authority: production baseline for Reel 1 editorial continuity.

### Primary Reel 1 Enki source

```text
assets/blessings-of-sumer/chapter-01/reel-01/editorial-v1/shot-03.png
```

Shot identity:

```text
scene concept: Enki at the helm
manifest shotId: enki-at-the-helm
source shot number: 3
```

This remains the authoritative shot-local visual source until a dedicated approved Enki character-source sheet is promoted.

## 4. Approved derived Shot 3 assets

Current manifest evidence binds these source-faithful derivatives to Shot 3:

```text
asset: shot03-enki-body-v1
path: blessings-of-sumer/chapter-01/reel-01/animation-v1/shot-03/character/enki-body.png
sha256: 3c7cdfdbde7776f91cf4b3f81908443b56194931a74654ecdbdb5798917aa6f5
state: approved

asset: shot03-enki-eyes-v1
path: blessings-of-sumer/chapter-01/reel-01/animation-v1/shot-03/character/enki-eyes-closed.png
sha256: b1d40abaaa8a8d29d368f5063eab35d172f6e70158e97b4facba7142d407d9e7
state: approved
```

The closed-eye image is **historical implementation evidence**, not the future definition of a blink. Once a real character rig proves source-faithful eye deformation, the V3 rig should own the blink and the generated/derived character-state overlay can be retired from the active performance path while remaining retained for provenance/regression evidence.

## 5. Proposed CharacterDefinition v1

Conceptual record:

```ts
{
  id: 'actor:enki',
  revision: 1,
  displayName: 'Enki',
  narrativeRole: 'water, knowledge, craft, travel and civilizing work',
  chapterThreads: [
    'ch1-dilmun-water',
    'ch1-world-order-canals',
    'ch1-eridu-nibru',
    'ch1-martu-journey',
    'ch1-kutu-storm',
    'ch3-city-functions',
    'ch3-ninhursag-enki',
    'ch3-enki-ninmah'
  ],
  literarySourceIds: [
    'etcsl-1.1.1',
    'etcsl-1.1.2',
    'etcsl-1.1.3',
    'etcsl-1.1.4'
  ],
  iconographicEvidenceIds: [],
  costumeProfileIds: ['costume:enki:voyage:v1'],
  rigProfileIds: [],
  performanceVocabularyIds: ['performance-vocab:enki:calm-authority:v1']
}
```

`iconographicEvidenceIds` intentionally remains empty until Phase 1 visual-evidence research establishes defensible named/type analogues. Project character continuity does not require pretending archaeology gives us a portrait of Enki.

## 6. Costume profile — voyage v1

ID:

```text
costume:enki:voyage:v1
```

Required continuity:

- cream woven robe remains dominant garment mass;
- lapis/copper trim stays narrow and practical;
- copper belt remains broad enough to read at reel scale;
- jewelry supports status without becoming fantasy armor;
- crown remains compact;
- footwear remains practical;
- clothing must permit believable helm/arm movement.

Disallowed silent mutations:

- Egyptian crown silhouette;
- oversized fantasy horns;
- armor plates;
- bright synthetic-blue fabric;
- weapon-centered silhouette;
- unexplained jewelry count/placement changes between adjacent shots.

## 7. Rig-source preparation v1

The first Rive spike should derive from a **rig-prep source package**, not directly mutilate the canonical editorial PNG.

Proposed package:

```text
source:actor:enki:rig-prep:v1/
  reference-full.png
  head-base.png
  beard-hair.png
  eye-left.png
  eye-right.png
  eyelid-left.png          optional if source-faithful mesh solution does not need it
  eyelid-right.png         optional
  torso-robe.png
  upper-arm-left.png
  forearm-left.png
  hand-left.png
  upper-arm-right.png
  forearm-right.png
  hand-right.png
  crown.png                only if independent deformation is necessary
  jewelry-accessories.png  only if secondary response is necessary
  registration.json
  source-receipt.json
```

Every region must record:

- source asset ID/hash;
- source-pixel crop/registration;
- alpha-generation method;
- whether pixels were copied, inpainted or generated;
- reviewer approval.

Invisible debug masks are never production regions.

## 8. Identity-sensitive regions

Highest-risk regions for visual QA:

```text
face silhouette
left/right eye shapes
brow/upper cheek transition
nose
beard/cheek boundary
crown/head silhouette
lapis/copper trim near shoulders
hands during tiller contact
```

The rig may deform robe mass more freely than face identity.

## 9. Rive spike capability ladder

### Gate ENKI-RIG-0 — neutral identity

Prove import/render with no intended motion.

Required result: the rigged neutral frame is visually indistinguishable in identity from the approved reference within the accepted rig-preparation tolerance.

### Gate ENKI-RIG-1 — blink

Channels:

```text
face.eye-left-open
face.eye-right-open
```

States:

```text
OPEN
CLOSING
CLOSED
OPENING
RETURNED_OPEN
```

No generated closed-eye patch should be required in the final candidate.

### Gate ENKI-RIG-2 — gaze

Channels:

```text
face.gaze-x
face.gaze-y
```

Gaze must not translate the whole head or face.

### Gate ENKI-RIG-3 — breath

Channel:

```text
body.breath
```

Must preserve crown/face stability and remain subtle at normal speed.

### Gate ENKI-RIG-4 — helm gesture

Channels/contact:

```text
body.arm-left/body.arm-right
body.hand-left/body.hand-right
contact:tiller-grip
```

Only after facial identity is green.

## 10. Semantic contact anchors

Required for the helm benchmark:

```text
anchor:enki:hand-left
anchor:enki:hand-right
anchor:enki:gaze-origin
anchor:enki:head-center
anchor:enki:torso-root
anchor:enki:seat-or-stance-root
```

The Stag defines corresponding prop anchors such as `anchor:stag:tiller-grip`.

A scene binds semantic anchors; it does not know Rive bone names.

## 11. Performance vocabulary v1

Initial reusable clips:

```text
clip:enki:blink-natural:v1
clip:enki:breathe-calm:v1
clip:enki:gaze-port:v1
clip:enki:gaze-horizon:v1
clip:enki:helm-adjust:v1
clip:enki:reflective-stillness:v1
```

Do not start with dozens of emotional clips. Reel 1 needs controlled subtle performance first.

## 12. Storybook contract

Minimum stories:

```text
Characters/Enki/IdentityReference
Characters/Enki/VoyageCostume
Characters/Enki/RigNeutral
Characters/Enki/BlinkOpen
Characters/Enki/BlinkClosed
Characters/Enki/BlinkReturnedOpen
Characters/Enki/GazeLeftRight
Characters/Enki/Breath
Characters/Enki/ContactAnchors
Characters/Enki/DebugMesh
```

The DebugMesh story must be unmistakably debug-only and impossible to promote as a production render source.

## 13. Stable acceptance IDs

Planned minimum:

```text
CONTRACT-RIVE-001-enki-channel-map
STORY-RIVE-001-enki-neutral
STORY-RIVE-002-enki-open
STORY-RIVE-003-enki-closed
VISUAL-ENKI-001-neutral
VISUAL-ENKI-002-blink-closed
VISUAL-ENKI-003-returned-open
MOTION-ENKI-001-natural-blink
MOTION-ENKI-002-breathe-calm
SEMANTIC-ENKI-001-blink-readable
SEMANTIC-ENKI-002-identity-stable
FAILURE-ENKI-001-open-at-closed-frame
FAILURE-ENKI-002-cyan-eye-debug-leak
FAILURE-ENKI-003-one-eye-only
FAILURE-ENKI-004-no-return-open
PERF-RIVE-001-hero-preview
HUMAN-ENKI-001-facial-performance
```

## 14. Negative fixtures are part of Enki identity

Required failures:

- eyes remain open at `CLOSED`;
- cyan/localization mask reaches final output;
- only one eye closes when two are required;
- closed state uses a visibly pasted rectangular patch;
- eye state changes skin tone/lighting unexpectedly;
- face identity drifts during blink;
- reopen frame does not return to approved open identity;
- breath moves camera instead of actor torso;
- helm gesture breaks hand/tiller contact;
- generated rig-prep source silently replaces editorial identity.

## 15. Promotion rule

A future Enki Rive rig may become `production-capable` only when:

```text
source receipt valid
neutral identity proof green
blink proof green
gaze proof green
breath proof green
negative fixtures fail correctly
Storybook green
rendered motion proof green
performance budget green
human identity approval green
runtime/license/version receipt current
```

The first accepted rig becomes a new runtime implementation of `actor:enki`; it does **not** rewrite who Enki is.

## 16. Migration from current Shot 3 blink

Migration should be A/B, not destructive:

```text
A = current approved layered V2/V2-style Shot 3
B = same source scene with Enki Rive facial rig
```

Compare at identical timing/camera/source conditions.

If B wins:

- retain old `enki-eyes-closed.png` and receipts as historical proof;
- remove it from the active V3 blink path;
- do not delete regression history;
- update Shot 3 V3 fixture/promotion receipt explicitly.

If B loses, Rive remains a failed/deferred spike and the source architecture remains untouched.

## 17. Open items before rigging

- produce/approve a dedicated Enki neutral character-source sheet independent of one shot if needed for multi-shot reuse;
- classify any archaeological/iconographic analogues without overclaiming identity;
- decide whether beard/hair needs independent mesh deformation in the first spike;
- decide whether arms are required for the facial benchmark or held for Enki-at-Helm benchmark;
- capture source-pixel anatomical landmarks and registration data;
- establish exact visual-delta thresholds after real Rive render evidence exists rather than inventing them now.

## 18. Definition of Enki v1 readiness

Enki Character Bible v1 is ready for implementation when a developer can build the first rig spike without choosing Enki's identity, costume, source authority, semantic channels, contacts, proof states or negative cases ad hoc inside a component.