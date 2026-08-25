# Character, Costume and Rig Bible

Status: **planning / continuity contract**

Hero characters recur across scenes, chapters and eventually multiple animation runtimes. This document defines how visual identity, costume, rig structure, performance capability and historical/mythic interpretation remain coherent while allowing deliberate revisions.

## 1. Core principle

A character is not a single PNG or `.riv` file.

A production character identity includes:

```text
narrative identity
visual design
historical/mythic evidence
approved editorial references
costume profile(s)
rig definition(s)
voice profile
performance vocabulary
continuity constraints
canonical revisions
```

Runtime assets implement the character; they do not define the character alone.

## 2. CharacterDefinition

Conceptual:

```ts
interface CharacterDefinition {
  id: string;
  revision: number;
  displayName: string;
  narrativeRole: string;
  chapterThreads: string[];

  literarySourceIds: string[];
  iconographicEvidenceIds: string[];

  visualIdentity: CharacterVisualIdentity;
  costumeProfileIds: string[];
  voiceProfileId?: string;
  rigProfileIds: string[];
  performanceVocabularyIds: string[];

  continuity: CharacterContinuityContract;
}
```

## 3. Visual identity contract

Hero identity should include approved references and measurable/semantic anchors without pretending identity can be reduced to face geometry alone.

Record:

- canonical editorial reference asset(s);
- silhouette cues;
- face/head proportions;
- hair/headdress identity;
- skin/value palette;
- distinguishing costume/jewelry;
- recurring symbolic attributes;
- height/relative scale convention;
- deliberate mythic exaggerations;
- identity-sensitive regions for QA.

## 4. Enki example identity

Planning hypothesis:

```text
character: actor:enki
role: water/knowledge/craft/civilizing force
visual continuity anchors:
  face identity
  horned/divine headdress profile as approved
  maritime/water associations
  costume silhouette
  approved palette/material motifs
```

The exact iconographic evidence relationship remains separate from manuscript characterization. An approved Enki design becomes project continuity even where archaeology cannot provide a portrait.

## 5. Enlil example identity

Planning hypothesis:

```text
character: actor:enlil
role: authority/order/air/assembly
motion identity:
  axial posture
  controlled gesture
  formal presence
visual identity:
  approved face/headdress/costume
  status markers
```

Again, motion language is project art direction, not a claim from ETCSL.

## 6. CostumeProfile

Conceptual:

```ts
interface CostumeProfile {
  id: string;
  revision: number;
  characterId: string;
  label: string;
  useContext: string[];
  sourceAssetIds: string[];
  visualEvidenceIds: string[];
  periodRelationships: string[];
  speculativeFeatures: string[];
  canonicalPaletteId: string;
  materialIds: string[];
  rigCompatibility: string[];
}
```

Examples:

```text
costume:enki:voyage:v1
costume:enki:formal-eridu:v1
costume:enlil:council:v1
costume:ninlil:formal:v1
```

## 7. Costume continuity rule

Costume changes require narrative or production reason.

Do not allow runtime regeneration to alter:

- headdress shape;
- jewelry count/placement;
- garment color family;
- sleeve/hem silhouette;
- divine/status markers;

between adjacent shots unless authored.

## 8. Costume revision

Historical research may improve a costume after production begins.

Process:

```text
new evidence/design proposal
  ↓
new costume revision
  ↓
Storybook identity/costume proof
  ↓
scene impact report
  ↓
human approval
  ↓
explicit migration
```

Existing approved scenes may remain pinned to old costume until intentionally migrated.

## 9. RigProfile

A rig profile binds character identity to one runtime implementation.

```ts
interface RigProfile {
  id: string;
  revision: number;
  characterId: string;
  runtime: 'rive' | 'spine' | 'layered-v2';
  runtimeAssetId: string;
  sourceAssetIds: string[];
  costumeProfileId: string;
  capabilities: string[];
  semanticChannelMapVersion: number;
  identityProofFixtureId: string;
}
```

## 10. Semantic channel vocabulary

Hero rigs expose common semantic channels where applicable:

```text
face.eye-left-open
face.eye-right-open
face.gaze-x
face.gaze-y
face.brow-left
face.brow-right
face.mouth-shape
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

The Rive internal input/bone name is adapter implementation detail.

## 11. Rig capability levels

```text
RIG_BASIC
  idle + blink + gaze

RIG_DIALOGUE
  basic + mouth/viseme + brows/head/listener reactions

RIG_FULL_BODY
  dialogue + torso/arms/hands + contact targets

RIG_HERO_ADVANCED
  full body + costume/hair secondary deformation + reusable interactions
```

Not every character needs hero-advanced complexity.

## 12. Rig source preparation

Prepared source may separate:

```text
head/face
left/right eyes
hair/headdress
neck/torso
upper/lower arms
hands
robe/costume panels
jewelry/accessories
```

Preparation is derivative source work, not permission to repaint identity freely.

Every prepared region remains source-hash/registration bound.

## 13. Character scale convention

Character definitions should record relative scale units independent from pixel crop dimensions.

Example:

```text
reference adult human height = 1.0 character-height unit
Enki approved scene scale = authored relative scale, not inferred from source PNG pixels
```

Three/R3F world placement later maps this into world units using explicit conversion.

## 14. Contact anchors

Reusable hero rigs define semantic contact anchors:

```text
hand-left
hand-right
foot-left
foot-right
seat
head-center
gaze-origin
```

Props define matching anchors:

```text
tiller-grip
cup-handle
door-handle
seat-position
```

Contact QA operates on semantic anchors, not Rive bone names.

## 15. Performance vocabulary

Character-specific clips inherit generic semantic actions where useful:

```text
blink-natural
breathe-calm
gaze-left
gaze-right
listen-attentive
formal-address
open-hand-gesture
point
turn
sit
stand
walk
embrace
```

A clip may be character-specific even if semantic action is shared.

## 16. Emotional state

Do not create one giant `emotion=angry` control that changes arbitrary rig properties invisibly.

Use authored performance profiles/clips:

```text
emotion:enlil:controlled-anger:v1
emotion:sud:embarrassed-recount:v1
emotion:enki:reflective:v1
```

Each resolves to explicit semantic channels.

## 17. Voice/visual linkage

CharacterDefinition can reference approved voice profile. Voice revision is separate from rig revision but can stale dialogue/lip-sync proof.

Visual identity does not depend on current TTS provider.

## 18. Historical/iconographic evidence

Character evidence classes:

```text
NAMED_ICONOGRAPHY_SECURE
NAMED_ICONOGRAPHY_PROBABLE
DIVINE_TYPE_ANALOGUE
PERIOD_COSTUME_CONTEXT
PROJECT_MYTHIC_SYNTHESIS
```

Avoid claiming an ambiguous ancient figure is definitely the character unless source scholarship supports it.

## 19. Storybook character bible

Stories:

```text
Characters/Enki/IdentityReference
Characters/Enki/CostumeVoyage
Characters/Enki/RigNeutral
Characters/Enki/FacialProofStates
Characters/Enki/ContactAnchors
Characters/Enki/DebugRig
Characters/Enlil/IdentityReference
Characters/Enlil/CouncilCostume
Characters/Enlil/FormalPerformance
```

Each hero gets an identity overview before scene-specific stories multiply.

## 20. Unit tests

- character IDs unique;
- costume references known character;
- rig references approved costume/source;
- semantic channel map complete for declared capabilities;
- contact anchor IDs unique;
- unsupported performance clip rejected for rig;
- rig revision change marks dependent proofs stale;
- voice-only change does not stale silent visual proof unnecessarily;
- costume revision does not silently mutate scene pin;
- source hash mismatch blocks rig promotion.

## 21. Visual regression

Canonical hero identity goldens use selected views/proof frames:

```text
neutral
blink closed/open
three-quarter/head turn if supported
formal costume
key gesture
```

Do not generate dozens of brittle goldens for every bone position.

## 22. Motion proof

Hero rig benchmark proves:

- identity remains stable through deformation;
- eye/mouth motion does not patch/pop;
- body joints do not tear visibly;
- clothing/hair secondary motion returns cleanly;
- contact anchors remain meaningful;
- normal-speed action reads naturally.

## 23. E2E

- open character bible from scene actor;
- inspect approved costume/rig/source hashes;
- switch authorized costume candidate and see proof stale;
- inspect rig capabilities;
- select performance clip compatible/incompatible;
- candidate rig review and promotion;
- reload scene pinned to exact rig/costume revision.

## 24. Crowd/background characters

Background workers may use archetype definitions instead of hero bible depth:

```text
archetype:worker:canal:v1
archetype:guard:v1
archetype:attendant:v1
```

They still need period/costume constraints, rig compatibility and deterministic variation.

## 25. Character duplication prevention

Generative asset workflows must not accidentally create multiple incompatible Enki identities.

Any new Enki visual candidate references `actor:enki` and declares whether it is:

```text
source extension
costume revision
rig preparation
scene-specific pose candidate
identity revision
```

`identity revision` is consequential and requires explicit review.

## 26. Definition of character-bible readiness

A hero character is production-ready when narrative identity, visual references, costume, rig, voice where applicable, semantic channels, contact anchors, performance vocabulary, provenance, Storybook identity states, negative fixtures and human identity approval are all explicit enough that individual scenes do not reinvent who the character is.
