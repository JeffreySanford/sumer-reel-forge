# Enki Character Bible v1 — Production Packet

Status: **concrete continuity packet / automation-first actor preparation**

Updated: **2026-08-26**

Character ID: `actor:enki`

This packet defines Enki independently from any animation backend. Rive, LivePortrait, Pixi, a baked template or a future rig may implement performance, but none of them defines Enki's identity.

## 1. Authority order

```text
1. Blessings of Sumer visual bible v1
2. approved Reel 1 editorial source frame(s)
3. approved source-faithful derived layers
4. approved reusable Enki source sheet / actor-prep packet
5. approved performance backend output
6. scene-specific performance clips
```

A `.riv`, ML-generated frame, segmented layer, motion template or character-state patch never outranks the approved visual source.

## 2. Canonical visual identity

Enki remains:

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
- compact restrained horned divine crown.

Continuity palette anchors remain deep water, lapis, copper, reed gold, clay, limestone, woven cream and bitumen as defined by the visual bible.

## 3. Source authority

Master visual baseline:

```text
assets/visual-bible/blessings-of-sumer-master-v1.png
```

Primary Reel 1 Shot 3 editorial source:

```text
assets/blessings-of-sumer/chapter-01/reel-01/editorial-v1/shot-03.png
```

Previously approved derived assets remain provenance/history, including the body and closed-eye overlays. The closed-eye asset is **not** the future definition of blinking.

## 4. Current accepted Shot 3 proof-lane actor source

The source currently used for automated actor-prep experiments is the human-accepted recovered Enki cutout:

```text
941x1672
sha256:d19ff6b4810a6fad5b8ce41232e07d7fc0f72923799e195df1596f53f4239f07
```

This hash is proof-lane evidence. It does not silently promote the recovered candidate into canonical production assets.

## 5. Current Shot 3 motion evidence

Accepted:

```text
camera drift
vessel heave/roll
Enki vessel carry
Enki local counter-sway/body-settle
```

Rejected/disabled:

```text
canonical blink overlay
stronger replacement blink overlay
whole-cutout breathe-calm
legacy water extraction
legacy/fresh rigging extraction
```

Technical green does not override those human normal-speed rejections.

## 6. Automation-first actor-prep package

The default Enki source-preparation package is generated headlessly from an approved source receipt.

Conceptual output:

```text
actor:enki:prep:v1/
  reference-full.png
  actor-prep.json
  source-receipt.json
  regions.json
  landmarks.json
  backend-compatibility.json
  evidence/
```

Semantic regions are discovered/validated automatically when source evidence supports them:

```text
head
face
hair-beard
eye-left
eye-right
crown
torso-robe
upper-arm-left/right
forearm-left/right
hand-left/right
```

Unsupported regions remain explicit `UNAVAILABLE`/`REJECTED`; they are not manually painted into existence merely to satisfy a rig schema.

Every region records source hash, registration, extraction method, source-pixel fidelity, confidence and review state.

Invisible/debug masks cannot become production regions.

## 7. Identity-sensitive regions

Highest-risk QA regions:

```text
face silhouette
eye shapes
brow/upper cheek transition
nose
beard/cheek boundary
crown/head silhouette
lapis/copper shoulder trim
hands during tiller contact
```

Face/crown identity has a stricter deformation tolerance than robe mass.

## 8. Automated capability ladder

### ENKI-ACTOR-0 — source identity

- source bytes/hash/dimensions verified;
- registration recorded;
- no backend-specific animation required.

Current status: **foundation proven for recovered Shot 3 source**.

### ENKI-ACTOR-1 — automated regions/landmarks

- face/head/torso/arm/hand regions proposed headlessly;
- semantic anchors proposed with confidence;
- source-fidelity/contamination checks;
- no manual GUI authoring required.

### ENKI-ACTOR-2 — facial performance

Target semantic channels:

```text
face.eye-left-open
face.eye-right-open
face.gaze-x
face.gaze-y
```

Backend may be deterministic source-region logic or an approved baked facial-motion backend. OPEN/CLOSED/RETURNED_OPEN and gaze states must preserve identity.

### ENKI-ACTOR-3 — body/secondary performance

Examples:

```text
body.breath
body.head-turn
body.shoulder-settle
```

Only source-supported local regions may deform. The rejected whole-cutout breathe-calm proof must not be recreated as a global zoom/pulse.

### ENKI-ACTOR-4 — helm/contact performance

Semantic channels/contacts:

```text
body.arm-left/body.arm-right
body.hand-left/body.hand-right
contact:tiller-grip
```

Requires trustworthy separate regions/anchors and must preserve hand/prop contact.

## 9. Semantic contact anchors

Required intent:

```text
anchor:enki:hand-left
anchor:enki:hand-right
anchor:enki:gaze-origin
anchor:enki:head-center
anchor:enki:torso-root
anchor:enki:seat-or-stance-root
```

A scene binds these semantic anchors. It does not know Rive bone names, ML landmark indices or Pixi container IDs.

## 10. Performance vocabulary

```text
clip:enki:blink-natural:v1
clip:enki:breathe-calm:v1
clip:enki:gaze-port:v1
clip:enki:gaze-horizon:v1
clip:enki:helm-adjust:v1
clip:enki:reflective-stillness:v1
```

Clip semantics remain stable across backend changes.

## 11. Backend policy

### Native/source-preserving

Preferred first. Use source-backed regions and deterministic exact-frame transforms/deformation where visually sufficient.

### LivePortrait candidate

Optional bounded **baked facial-performance** candidate because its workflow can be headless and motion-template driven. It is not adopted until identity, determinism/bake and commercial-license gates pass. Production must not use bundled model components with unresolved commercial restrictions.

### Rive

**DEFERRED / OPTIONAL SPECIALIST.** The existing neutral-contract/prep work is retained as evidence. Manual `.riv` authoring is not the production critical path. Reconsider only if a reusable one-time rig clearly earns its authoring cost across many scenes.

## 12. Storybook / Animation Lab contract

Backend-neutral stories should expose:

```text
Characters/Enki/IdentityReference
Characters/Enki/PrepRegions
Characters/Enki/Neutral
Characters/Enki/BlinkOpen
Characters/Enki/BlinkClosed
Characters/Enki/BlinkReturnedOpen
Characters/Enki/GazeLeftRight
Characters/Enki/ContactAnchors
Characters/Enki/BackendEvidence
```

Debug masks/landmarks must be visibly debug-only and impossible to promote as production output.

## 13. Stable acceptance IDs

```text
CONTRACT-ACTOR-001-enki-prep
CONTRACT-ACTOR-002-enki-channel-map
VISUAL-ENKI-001-neutral
VISUAL-ENKI-002-blink-closed
VISUAL-ENKI-003-returned-open
MOTION-ENKI-001-natural-blink
SEMANTIC-ENKI-001-blink-readable
SEMANTIC-ENKI-002-identity-stable
FAILURE-ENKI-001-open-at-closed-frame
FAILURE-ENKI-002-debug-mask-leak
FAILURE-ENKI-003-one-eye-only
FAILURE-ENKI-004-no-return-open
FAILURE-ENKI-005-source-identity-drift
FAILURE-ENKI-006-manual-editor-required
HUMAN-ENKI-001-facial-performance
```

Historical `RIVE-*` test IDs may remain in old evidence for traceability but are no longer the production capability namespace.

## 14. Negative fixtures

Reject when:

- CLOSED still visibly contains open eyes;
- debug/localization masks leak;
- one eye changes unexpectedly;
- generated rectangular patches appear;
- skin tone/lighting/identity drifts;
- neutral/open state does not return cleanly;
- breath moves camera/whole actor rather than supported torso region;
- helm gesture breaks contact;
- source receipt/hash changes silently;
- backend needs recurring manual editor correction to produce a usable reel.

## 15. Promotion rule

An Enki actor-performance profile becomes `production-capable` only when:

```text
source receipt valid
automated prep repeatable
backend/model/version/license evidence valid
neutral identity proof green
required semantic states green
negative fixtures fail correctly
rendered motion proof green
normal-speed human approval green
reuse demonstrated without per-shot GUI authoring
```

An accepted backend implements `actor:enki`; it never rewrites Enki's identity.

## 16. Migration rule

A new Enki backend is evaluated A/B against the current accepted source-backed baseline at identical timing/camera/source conditions.

If it wins, old overlays/candidates remain historical provenance. If it loses, preserve the accepted baseline and record the backend as rejected/deferred. No destructive migration occurs before human approval.

## 17. Open items

- automate semantic region/landmark discovery for the accepted Enki source;
- establish actor-prep JSON/receipt contracts;
- decide commercially valid face/landmark detection dependencies;
- build reusable baked-performance template format;
- test a headless facial backend only after the license boundary is explicit;
- create multi-shot reuse proof before declaring the actor-performance pipeline production-ready.

## 18. Definition of readiness

Enki v1 is ready for scalable production when a new scene can request semantic performance from the approved Enki actor profile without knowing backend-local controls and without requiring a person to rebuild or repair the actor in a GUI editor.
