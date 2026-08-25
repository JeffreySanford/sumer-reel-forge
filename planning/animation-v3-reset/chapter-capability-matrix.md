# Chapters 1–3 Animation Capability Matrix

Status: **planning contract derived from the manuscript requirements**

This matrix translates the narrative demands of Chapters 1–3 into reusable animation-platform capabilities. It is not a shot list and does not freeze the historical-fiction manuscript. Its purpose is to prove that the V3 architecture is driven by recurring story needs rather than technology enthusiasm.

Legend:

- **L2** — Living Illustration can satisfy the requirement without revealing unapproved unseen geometry.
- **L3** — Spatial Performance is preferred because the scene needs world space, crowds, persistent environment, physical simulation, or multi-actor blocking.
- **L2→L3** — useful first at L2, expected to migrate to L3 as the platform matures.

## 1. Cross-chapter capability summary

| Capability | Ch. 1 | Ch. 2 | Ch. 3 | Platform priority |
|---|---:|---:|---:|---|
| Hero facial performance | high | very high | medium | foundation |
| Hero body performance | high | very high | medium | foundation |
| Multi-actor dialogue | medium | very high | medium | foundation |
| Water / rivers / canals | very high | medium | very high | foundation |
| Boats / maritime motion | very high | low-medium | medium | foundation |
| Cloth / hair / reeds | high | high | high | foundation |
| Spatial camera / depth | high | high | very high | foundation L3 |
| Weather / particles | high | medium | medium | early L3 |
| Physics / secondary motion | high | medium | medium-high | early L3 |
| Workers / crowds | medium | high | very high | foundation L3 |
| Animals / herds | medium | very high | high | early L3 |
| City persistence / growth | high | medium | very high | foundation L3 |
| Agriculture / work systems | high | high | very high | foundation L3 |
| Processions / paths | medium | very high | high | early L3 |
| Architecture / temples | high | high | very high | foundation L3 |
| Montage / long time | medium | very high | very high | foundation L3 |
| Mythic transformation | high | medium-high | high | selective L3 |
| Underworld / numinous FX | high | medium | high | selective L3 |
| Historical provenance | very high | very high | very high | foundation |
| Visual evidence registry | very high | very high | very high | foundation |

## 2. Chapter 1 — Enki

### C1-A — Coastal voyage / Stag of the Absu

Narrative need:

- long maritime travel;
- Enki aboard a small but capable vessel;
- coastline navigation;
- contemplation over the Absu/Nammu;
- persistent wave and sail motion.

Capabilities:

```text
hero idle/breath/gaze
boat hierarchy
water material
sail/rigging secondary motion
coast depth cards
camera drift
weather states
```

Preferred level: **L2→L3**.

Reusable systems:

- Rive hero actor;
- Pixi water/rigging;
- Three/R3F spatial coast/boat;
- optional Rapier baked secondary response.

Tests:

- unit: vessel/rigging causality;
- Storybook: calm-water and roll proof states;
- visual: exact-frame boat/water states;
- motion proof: vessel vs camera independence;
- E2E: load proof scene / scrub / render receipt;
- human: motion reads naturally without puppet effect.

### C1-B — Nammu / Absu / underwater numinous imagery

Narrative need:

- water as living presence;
- underwater/deep-water imagery;
- divine maternal identity;
- refraction, depth and atmospheric motion.

Capabilities:

```text
underwater material
spatial fog
light caustics/refraction
slow character/environmental drift
particles
numinous color/light transitions
```

Preferred level: **L2→L3**.

Tests:

- material bounds;
- no face/identity distortion beyond limits;
- Storybook underwater states;
- visual proof of refraction without mask leakage;
- motion proof for independent current layers.

### C1-C — Dilmun receives water / fertility transformation

Narrative need:

- saline/barren environment becomes fertile;
- canals/wells/water introduced;
- seed sprouts and vegetation grows;
- goods/trade/settlement become possible.

Capabilities:

```text
world-state transitions
water network
vegetation growth
agriculture states
city/settlement growth
montage
mythic growth effect
```

Preferred level: **L3**.

Reusable systems:

- CityKit / WorldState;
- Pixi vegetation/material effects;
- Three terrain/water;
- montage runtime.

Tests:

- deterministic state transitions;
- no disappearing/reappearing world assets without defined transition;
- Storybook BARREN → WATERED → CULTIVATED → SETTLED;
- E2E city-state editing and reload persistence.

### C1-D — Martu encounter / hospitality

Narrative need:

- arrival/disembarkation;
- social reaction;
- humor when Enki falls into deep water;
- blankets/food/gifts;
- conversation between cultures.

Capabilities:

```text
multi-actor reaction
body gesture
water contact
prop handoff
crowd reaction variation
facial expression
```

Preferred level: **L2/L3** depending framing.

Tests:

- actor contact/prop binding;
- reaction timing variation;
- no synchronized crowd laughter;
- human review for comic readability.

### C1-E — Canal construction across Sumer

Narrative need:

- teams building canals city by city;
- dykes, gates and irrigation;
- workers carrying/digging;
- water released into channels/fields;
- long construction duration compressed narratively.

Capabilities:

```text
crowd/work runtime
path scheduling
work clips
water network
terrain modification states
montage
city-specific environments
```

Preferred level: **L3**.

Tests:

- crowd determinism;
- synchronization score;
- water-network graph validation;
- city transition fixtures;
- montage continuity.

### C1-F — Kutu storm / Enki battles violent water

Narrative need:

- massive storm;
- small and large hail;
- vessel trembling/rolling;
- aggressive waves;
- Enki remains at helm;
- storm stops abruptly after passage.

Capabilities:

```text
spatial weather
particle system
hail trajectories
collision events
baked boat response
wave states
hero contact with helm
state transition storm → calm
```

Preferred level: **L3**.

Primary runtime benchmark for Rapier.

Tests:

- fixed timestep;
- same-seed collision repeatability;
- hail bounds;
- boat response causality;
- hand/helm contact;
- no physics explosion;
- visual storm readability;
- normal-speed human review.

### C1-G — E-Absu / Eridu temple

Narrative need:

- water-edge sacred architecture;
- silver, lapis, gold;
- reeds, fish, orchard;
- music/instruments;
- numinous temple behavior.

Capabilities:

```text
architecture kit
water world
reeds/fish/vegetation
lighting
ceremonial crowd
music-reactive subtle motion
mythic architectural effects
```

Preferred level: **L3**.

Tests:

- architectural asset provenance;
- material palette constraints;
- world-depth correctness;
- visual-evidence panel.

### C1-H — Earth goddesses / animals / city spirits

Narrative need:

- Ninhursag/Nintu and associated animals;
- city identities introduced/born;
- animal presence and pastoral environments.

Capabilities:

```text
hero actor rigs
animal reusable rigs
herd/pasture population
city-state birth motif
mythic transformation
```

Preferred level: **L2→L3**.

## 3. Chapter 2 — Enlil

### C2-A — Grand Council confrontation

Narrative need:

- Enlil addresses an assembly;
- council members react;
- conflict escalates;
- guards/removal/physical staging;
- authority and embarrassment must read clearly.

Capabilities:

```text
hero formal-address performance
multi-actor blocking
crowd reaction clips
gaze targeting
body contact/escort
room/assembly spatial layout
```

Preferred level: **L3**.

Primary hero-performance benchmark for Enlil.

Tests:

- Storybook formal-address states;
- audience reaction distribution;
- contact constraints;
- camera blocking;
- semantic QA: speech/authority vs idle pose;
- human review.

### C2-B — Enlil / Enki private discussion

Narrative need:

- quieter two-person conversation;
- listening, thinking, subtle reactions;
- relationship conveyed through micro-performance.

Capabilities:

```text
two-actor dialogue
listening clips
subtle gaze
breath/weight shift
shot/reverse-shot camera grammar
```

Preferred level: **L2→L3**.

Tests:

- two-actor gaze targets;
- listening actor remains alive but restrained;
- no mirrored/synchronized breath;
- continuity across cuts.

### C2-C — Sud recounts events to Nisaba and Haia

Narrative need:

- three-character emotional conversation;
- recounting insult/proposal;
- family reactions;
- nuanced facial/body performance.

Capabilities:

```text
three-actor blocking
speaker/listener state machine
emotion clips
gaze graph
turn-taking
prop/background domestic scene
```

Preferred level: **L3**.

Primary three-actor benchmark.

Tests:

- turn ownership;
- listener gaze;
- speaker gesture not shared by listeners;
- continuity between proof states;
- Storybook speaker/listener permutations.

### C2-D — Nuska messenger / formal court business

Narrative need:

- arrival/departure;
- ritual hospitality;
- gifts/jewelry/beer;
- kneeling/kissing ground/formal reporting.

Capabilities:

```text
walk/path
formal gesture clips
prop handoff
seating
hierarchy/staging
```

Preferred level: **L2→L3**.

### C2-E — Marriage procession and gifts

Narrative need:

- enormous variety of animals;
- goods and food;
- movement toward city;
- noisy crowding;
- dust/scale/spectacle.

Capabilities:

```text
herd runtime
animal rig pool
procession paths
instancing/LOD
dust particles
crowd variation
cargo props
```

Preferred level: **L3**.

Primary Spine-or-Rive animal benchmark.

Tests:

- species/rig mapping;
- deterministic herd layout;
- phase variation;
- path occupancy;
- no exact clone synchronization;
- performance budget at increasing counts;
- human readability at phone scale.

### C2-F — Marriage / household / banquet / ceremony

Narrative need:

- family processions;
- E-kur/E-mah interiors;
- formal seating;
- food/drink;
- prayer and celebration.

Capabilities:

```text
architecture interiors
ceremonial crowd
banquet props
seating poses
small gesture library
music/celebration variation
```

Preferred level: **L3**.

### C2-G — Long migration / 144,000-year journey

Narrative need:

- enormous temporal compression;
- recurring travelers;
- changing lands/cultures/weather;
- continuity without pretending one continuous real-time shot.

Capabilities:

```text
montage runtime
continuity subjects
world presets
season/time transitions
route/path abstraction
historical-fiction source cards
```

Preferred level: **L3**.

Primary montage benchmark.

Tests:

- segment order;
- continuity subject identity;
- transition durations;
- same-seed visual choices;
- no hidden time stretch.

### C2-H — Agriculture / grain / measurement roles

Narrative need:

- furrows/grain/flax;
- water provision;
- scribal/measuring tools;
- boundaries/surveying.

Capabilities:

```text
field states
work clips
props/tool rigs
survey path/marker system
city industry bindings
```

Preferred level: **L3**.

## 4. Chapter 3 — The Cities

### C3-A — Ninhursag narrator / remembered old world

Narrative need:

- intimate narrator performance;
- memories/visions;
- telekinetic/thought-existence recollections;
- contrast between remembered world and current cities.

Capabilities:

```text
hero close performance
memory montage
visual-transition grammar
mythic FX
source/fiction provenance overlays
```

Preferred level: **L2→L3**.

### C3-B — Birth and toil of the Igigi

Narrative need:

- large labor force;
- canals/channels;
- carrying workload for long spans;
- fatigue and eventual dissatisfaction;
- large infrastructure development.

Capabilities:

```text
crowd/work runtime
work-role scheduling
tools
terrain/waterway states
fatigue clip variation
montage/time compression
```

Preferred level: **L3**.

Primary crowd/work benchmark.

Tests:

- 1/20/100 worker Storybook fixtures;
- role distribution;
- synchronization score;
- deterministic layout;
- performance budget;
- long-run loop seam.

### C3-C — Cities as living systems

Narrative need:

- settlements grow;
- city identity persists through change;
- households, agriculture, industry and water systems interrelate.

Capabilities:

```text
CityKit
persistent world definition
development states
population profiles
industry profiles
water networks
visual motifs
patron bindings
```

Preferred level: **L3**.

Primary CityKit benchmark.

### C3-D — Umma agriculture

Narrative need:

- ploughs/yokes/oxen;
- furrows;
- grain/pulses;
- ditches/dykes;
- storage.

Capabilities:

```text
animal work rigs
plough contact
field state machine
worker clips
water control
storage props
```

Preferred level: **L3**.

### C3-E — Shuruppak brickmaking / construction

Narrative need:

- clay/brick work;
- repeated labor;
- structures rise over time.

Capabilities:

```text
construction work clips
brick prop instancing
building state transitions
crowd paths
montage
```

Preferred level: **L3**.

### C3-F — Larsa surveying / standards / solar identity

Narrative need:

- boundaries and measuring;
- survey tools;
- trade/standards;
- strong Utu/solar visual identity.

Capabilities:

```text
survey path system
measurement props
city visual motif
sun/light system
market/trade crowd
```

Preferred level: **L3**.

### C3-G — Lagash uplands / goats / ibex / pasture

Narrative need:

- ecological change;
- grasses/herbs;
- animal populations;
- upland spatial identity.

Capabilities:

```text
terrain profiles
vegetation population
herd runtime
season/ecology states
```

Preferred level: **L3**.

### C3-H — Uruk livestock / dairy / weaving

Narrative need:

- sheepfolds/cow pens;
- cattle/sheep;
- fat/cream/dairy;
- textile fiber/weaving.

Capabilities:

```text
animal populations
pen/fold architecture
work clips
weaving rig
industry profile
crowd scheduling
```

Preferred level: **L3**.

### C3-I — Ur foundations / construction / metalwork

Narrative need:

- city foundations;
- bricks;
- purification/ritual;
- metalworking.

Capabilities:

```text
construction states
forge/fire material
hammering clips
metal props
ritual actor clips
architecture kit
```

Preferred level: **L3**.

### C3-J — Eridu fisheries / quays / E-Absu

Narrative need:

- water identity;
- fishing;
- boats/quays;
- reeds;
- sacred architecture.

Capabilities:

```text
water network
boats
fish population
quay architecture
reeds
hero/ceremonial actors
```

Preferred level: **L3**.

### C3-K — Inana / underworld / life-giving plant and water motifs

Narrative need:

- underworld aesthetics;
- death/revival transformation;
- plant/water ritual effects.

Capabilities:

```text
mythic state transition
character state transition
spatial lighting/fog
ritual props
selective generative effect if needed
```

Preferred level: **L3 selective**.

## 5. Reusable subsystem priority derived from narrative

The narrative matrix implies this build order:

1. provenance/source registry;
2. deterministic frame/Scene V3 contracts;
3. Animation Lab/testing harness;
4. hero performance runtime;
5. material/water runtime;
6. spatial world/camera;
7. physical secondary motion;
8. crowds/work;
9. animals/herds;
10. CityKit/world states;
11. montage;
12. authoring tools;
13. selective generative specialty effects.

## 6. What not to overbuild

The manuscripts do **not** currently justify building these as foundation requirements:

- full character lip-sync phoneme system before basic acting works;
- fully procedural 3D human generation;
- autonomous AI crowd agents;
- general-purpose game-engine combat/AI;
- physically exact fluid simulation;
- unrestricted camera orbit around 2D paintings;
- universal skeletal rig editor from scratch;
- broad I2V whole-shot generation as default.

These may be evaluated later only if a narrative requirement repeatedly demands them.

## 7. Chapter-level readiness gates

### Chapter 1 production-ready when

- Enki hero performance proven;
- water/boat/rigging proven;
- spatial environment proven;
- storm physics proven;
- CityKit/world transition can support Dilmun/Eridu;
- Reel 1 V2→V3 migration path proven.

### Chapter 2 production-ready when

- Enlil hero rig proven;
- multi-actor blocking proven;
- three-actor dialogue proven;
- procession/herd runtime proven;
- montage runtime proven;
- ceremony/interior environments proven.

### Chapter 3 production-ready when

- crowd/work runtime proven at target count;
- CityKit mature;
- agriculture/construction/industry states exist;
- animal populations proven;
- long-duration montage proven;
- multiple city profiles have historical/visual evidence bindings.

## 8. Testing rule for every matrix row

A row is not considered supported because a package claims the feature.

It becomes supported only when the repository has:

```text
unit fixture
Storybook proof state(s)
fixed-frame visual proof when visual
E2E workflow coverage when user-facing
rendered motion proof when temporal
negative fixture for the main failure mode
human acceptance for production-quality motion
```

This matrix should be updated whenever manuscript revisions create a genuinely new recurring capability demand.
