# Animation V3 Benchmark Specifications

Status: **planning contract**

The V3 reset succeeds only if reusable platform proofs demonstrate the capabilities Chapters 1–3 require. These are not promotional demos. Each benchmark exists to validate an architectural subsystem under deterministic QA, Storybook inspection, rendered motion proof and human review.

## 1. Benchmark policy

Each benchmark must provide:

- narrative/manuscript link;
- historical source classification;
- visual-evidence notes;
- exact scene duration/fps;
- deterministic seed;
- runtime ownership map;
- named animation key states;
- unit-test coverage;
- Storybook stories;
- fixed-frame visual proofs;
- short rendered motion proof;
- semantic QA where applicable;
- human acceptance criteria;
- negative/control variant.

A benchmark is not complete because it renders.

## 2. Benchmark A — Enki Facial Performance

### Purpose

Prove the hero-character performance system before Reel 1 resumes.

### Narrative need

Enki appears repeatedly across Chapter 1 and later material. A reusable face rig prevents blink/gaze/expression from becoming per-shot generated-image work.

### Runtime

- Rive primary;
- Remotion frame authority;
- optional Three placement only after 2D proof.

### Required channels

- `face.eyeLeftOpen`;
- `face.eyeRightOpen`;
- `face.gazeX`;
- `face.gazeY`;
- `body.breath`;
- optional brow/soft head motion.

### Named states

```text
OPEN
CLOSING
CLOSED
OPENING
OPEN
GAZE_LEFT
GAZE_CENTER
BREATH_PEAK
```

### Machine acceptance

- eyes close semantically at CLOSED;
- no iris/pupil/sclera at CLOSED;
- open state returns cleanly;
- no cyan/debug/mask artifact;
- left/right eye closure timing within 1 frame unless intentionally offset;
- gaze channel changes without moving the entire actor;
- breath channel changes torso independently from camera;
- same frame/seed produces same rig parameter state.

### Human acceptance

- blink visible but natural at normal speed;
- actor identity preserved;
- no puppet or sticker-patch appearance;
- gaze reads as gaze rather than face translation;
- breathing is subtle.

### Negative controls

- blink channel disabled;
- gaze disabled;
- deliberately wrong eye state fixture must fail semantic proof.

## 3. Benchmark B — Enki at the Helm

### Purpose

Prove Level 2 composition of hero performance + rigid vessel + material systems.

### Runtime ownership

- Rive: Enki body/face articulation;
- Pixi: rigging/reeds/water detail;
- Scene V3: timing/drivers;
- Remotion: render.

### Required channels

At least:

1. blink/gaze;
2. breath/body shift;
3. arm/tiller gesture;
4. vessel roll/heave;
5. rigging lag;
6. water motion;
7. camera.

### Acceptance

- at least four non-camera channels visibly contribute;
- vessel motion independent from camera;
- rigging causally trails vessel;
- Enki maintains hand/tiller contact where intended;
- subject remains source-faithful;
- no layer leaks or mask artifacts;
- normal-speed human preference over Level 1.

### Control renders

- Level 1 baseline;
- character frozen;
- vessel frozen;
- rigging frozen;
- camera frozen.

## 4. Benchmark C — Enlil Council Address

### Purpose

Prove formal acting, speech-like body performance and crowd reaction without lip-sync dependency.

### Narrative need

Chapter 2 contains council confrontation, formal speech and public authority.

### Runtime ownership

- Rive: Enlil;
- crowd runtime: council members;
- Three/R3F optional for room blocking;
- Pixi for cloth/banner secondary motion.

### Required performance

- formal address gesture;
- listening/rest state;
- anger/emphasis state;
- turn/exit or physical response;
- crowd reaction waves rather than synchronized clones.

### Acceptance

- Enlil reads as the focal speaker;
- crowd reactions are temporally staggered;
- no identical loop synchronization across all council members;
- camera supports but does not manufacture performance;
- gesture timing aligns with narration/dialogue markers.

## 5. Benchmark D — Sud / Nisaba / Haia Three-Actor Scene

### Purpose

Prove close multi-actor emotional blocking.

### Requirements

- three independently rigged actors;
- eyelines/gaze targets;
- listening states;
- speaker state;
- emotional change;
- contact-safe spacing;
- deterministic shot/reverse-shot or single spatial composition.

### Acceptance

- current speaker is visually legible;
- listeners remain alive without competing;
- gaze directions make interpersonal sense;
- no identity or layer ordering drift;
- human reviewer can follow conversation with audio muted from body language alone at key moments.

## 6. Benchmark E — Stag on Water Spatial Proof

### Purpose

Prove Level 3 2.5D spatial world.

### Runtime ownership

- Three/R3F: camera, spatial placement, depth cards, boat placement;
- Pixi: water material/rigging detail;
- Rive: Enki if visible;
- Remotion: frame authority.

### Required spatial layers

At minimum:

```text
sky
far horizon
coast/mountains
far water
boat
hero
foreground reeds/mist
```

### Acceptance

- real perspective/depth effect visible;
- no hidden/unpainted geometry exposed;
- painted style preserved;
- camera path reproducible;
- no depth-card edge exposure in approved crop;
- water and boat occupy coherent spatial relation.

## 7. Benchmark F — Nammu Underwater

### Purpose

Prove numinous environmental animation distinct from ordinary surface physics.

### Runtime ownership

- Three: depth/fog/light volumes;
- Pixi: refraction/local distortion;
- Rive or source-safe actor treatment for Nammu;
- selective generative effect only if bounded.

### Acceptance

- underwater depth readable;
- Nammu remains coherent and not puppet-like;
- particles/refraction do not obscure face/identity;
- movement feels slow/otherworldly;
- supernatural departure from ordinary physics is deliberate, not random.

## 8. Benchmark G — Kutu Hail Storm

### Purpose

Prove fixed-step/baked physics plus weather.

### Runtime ownership

- Three: world/camera/particles;
- Rapier: hail/debris/boat secondary response;
- Pixi optional for rain/water surface;
- Remotion: bake playback/render.

### Required controls

- no-hail control;
- vessel-fixed control;
- same-seed repeat;
- different-seed comparison.

### Acceptance

- repeated supported-environment simulation yields same bake hash;
- hail trajectories/collisions are plausible;
- boat response remains bounded;
- no impossible tunneling through primary hull at benchmark scale;
- storm remains readable at normal speed;
- baked render equals approved simulation state.

## 9. Benchmark H — Igigi Canal Crew

### Purpose

Prove deterministic crowd/work runtime.

### Narrative need

Chapter 3 contains sustained collective canal labor and civilization-scale work.

### Required scales

Stories/tests at:

```text
1 worker
5 workers
20 workers
100 workers benchmark mode
```

### Behaviors

- dig;
- lift/carry silt;
- walk-load;
- rest;
- tool adjustment.

### Acceptance

- same seed gives same role/phase/path schedule;
- different seed produces meaningful variation;
- synchronization metric below agreed clone threshold;
- density does not create obvious overlapping bodies at benchmark camera;
- 100-agent benchmark fits performance budget.

## 10. Benchmark I — Marriage Herd Procession

### Purpose

Prove animals, procession paths, instancing/repeated rigs and dust.

### Runtime candidates

- Spine evaluation;
- Rive alternative;
- Three instancing for distant animals;
- crowd/path runtime;
- Pixi/Three dust.

### Required classes

At minimum:

- cattle/oxen;
- sheep/goats;
- one visually distinct large animal class;
- human attendants.

### Acceptance

- animals do not move in perfect synchronization;
- gait speed matches path movement;
- herd density readable;
- distant animals may simplify without distracting pops;
- procession direction remains coherent;
- dust supports movement rather than hiding rig flaws.

## 11. Benchmark J — City Growth

### Purpose

Prove CityKit and world-state transitions.

### Candidate city

Eridu is preferred because it connects water, quays, reeds, fisheries, settlement and E-Absu.

### Required states

```text
STATE 0 — terrain/water only
STATE 1 — sparse habitation
STATE 2 — organized water access
STATE 3 — agricultural/working settlement
STATE 4 — civic/temple expansion
STATE 5 — mature city identity
```

### Acceptance

- every state is deterministic;
- development is additive/traceable rather than prompt-regenerated;
- visual identity persists across states;
- source/evidence associations remain inspectable;
- montage between states reads as growth, not six unrelated images.

## 12. Benchmark K — Long Journey Montage

### Purpose

Prove mythic temporal compression and continuity.

### Requirements

- continuity subject(s) persist;
- landscapes/cultures change;
- time scale explicit;
- transitions authored;
- no implication that every depicted stop is a literal ancient-source event unless sourced.

### Acceptance

- viewer understands substantial time/distance passes;
- continuity survives transitions;
- source/adaptation labels remain distinct;
- no single clip is unnaturally stretched to represent millennia.

## 13. Benchmark L — E-Absu Architectural Reveal

### Purpose

Prove architecture + historical visual evidence + numinous reveal.

### Requirements

- 2.5D or modest 3D architectural reconstruction;
- water-edge context;
- reeds/fish/environment;
- precious-material visual language as literary interpretation;
- source/evidence panel documenting literary vs archaeological inputs.

### Acceptance

- building feels spatial;
- camera does not expose unmodeled geometry;
- literary ornament is clearly distinguished from archaeological reconstruction confidence;
- reveal retains painterly series identity.

## 14. Storybook requirements for every benchmark

Each benchmark has:

- `Overview` story;
- five named proof-state stories;
- `Debug` story;
- `Control` story;
- `Stress` story where applicable;
- source/evidence story or panel.

Example:

```text
Benchmarks/EnkiFacial/Overview
Benchmarks/EnkiFacial/Open
Benchmarks/EnkiFacial/Closing
Benchmarks/EnkiFacial/Closed
Benchmarks/EnkiFacial/Opening
Benchmarks/EnkiFacial/ReturnedOpen
Benchmarks/EnkiFacial/Debug
Benchmarks/EnkiFacial/NoBlinkControl
```

## 15. Required proof artifact bundle

Each benchmark produces:

```text
benchmark-id/
  resolved-scene.json
  runtime-versions.json
  source-receipt.json
  frame-start.png
  frame-anticipation.png
  frame-peak.png
  frame-settle.png
  frame-end.png
  motion-proof.mp4
  deterministic-qa.json
  semantic-qa.json
  human-review.json
  benchmark-receipt.json
```

Large MP4s may remain local/temporary unless deliberately retained; compact receipts and selected evidence frames may be tracked.

## 16. Promotion rule

A benchmark runtime can be marked `production-capable` only when:

- unit/contract tests green;
- Storybook interaction tests green;
- fixed-frame visual proof accepted;
- rendered motion proof accepted;
- negative/control tests behave correctly;
- semantic QA passes where required;
- human review explicitly approves;
- runtime/version/license evidence recorded.

## 17. Platform readiness gate before Reel 1

Reel 1 production does not resume until at minimum these are green:

1. Enki Facial Performance;
2. Enki at the Helm;
3. Stag on Water;
4. Kutu Hail or equivalent physics proof;
5. one crowd/work proof;
6. one city/world-state proof.

Enlil/Sud/procession/montage benchmarks may continue in parallel before Chapter 2 production, but the first six establish the core platform.

## 18. Benchmark failure philosophy

A failed benchmark is useful evidence.

Do not:

- lower thresholds merely to make the milestone green;
- silently replace the source artwork;
- hide failures behind camera motion;
- allow semantic QA to override deterministic artifact leakage;
- promote a runtime because another benchmark happens to look good.

The purpose of the benchmark suite is to discover architectural limits early, before those limits become dozens of bespoke shot implementations.
