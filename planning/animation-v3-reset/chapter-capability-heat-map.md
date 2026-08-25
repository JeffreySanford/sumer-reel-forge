# Chapters 1–3 Capability Heat Map v1

Status: **planning prioritization model derived from the qualitative capability matrix**

This heat map answers a production question the architecture now makes possible:

> Which reusable capabilities unlock the most manuscript material across all three chapters?

It does **not** replace narrative judgment and it is not a scientific score. It converts the existing qualitative matrix into a coarse reuse weight so platform sequencing can favor capabilities with broad manuscript leverage.

## 1. Weighting

Existing qualitative demand is mapped only for planning visibility:

```text
none          0
low           1
low-medium    1.5
medium        2
medium-high   2.5
high          3
very high     4
```

Maximum cross-chapter reuse weight = 12.

This weight means “appears strongly across manuscript needs,” not “must be implemented first regardless of dependencies.” Historical provenance scores highest but does not replace the frame kernel; dependencies still govern execution order.

## 2. Cross-chapter heat map

| Capability | Ch. 1 | Ch. 2 | Ch. 3 | Reuse weight | Reuse band |
|---|---:|---:|---:|---:|---|
| Historical provenance | 4 | 4 | 4 | **12** | universal |
| Visual evidence registry | 4 | 4 | 4 | **12** | universal |
| Water / rivers / canals | 4 | 2 | 4 | **10** | core world |
| Spatial camera / depth | 3 | 3 | 4 | **10** | core world |
| Agriculture / work systems | 3 | 3 | 4 | **10** | core civilization |
| Architecture / temples | 3 | 3 | 4 | **10** | core world |
| Montage / long time | 2 | 4 | 4 | **10** | core narrative |
| Hero facial performance | 3 | 4 | 2 | **9** | core performance |
| Hero body performance | 3 | 4 | 2 | **9** | core performance |
| Cloth / hair / reeds | 3 | 3 | 3 | **9** | cross-runtime material |
| Workers / crowds | 2 | 3 | 4 | **9** | core civilization |
| Animals / herds | 2 | 4 | 3 | **9** | core population |
| City persistence / growth | 3 | 2 | 4 | **9** | core world |
| Processions / paths | 2 | 4 | 3 | **9** | core population |
| Mythic transformation | 3 | 2.5 | 3 | **8.5** | selective mythic |
| Multi-actor dialogue | 2 | 4 | 2 | **8** | performance expansion |
| Underworld / numinous FX | 3 | 2 | 3 | **8** | selective mythic |
| Boats / maritime motion | 4 | 1.5 | 2 | **7.5** | Chapter 1 accelerator |
| Physics / secondary motion | 3 | 2 | 2.5 | **7.5** | realism accelerator |
| Weather / particles | 3 | 2 | 2 | **7** | environmental accelerator |

## 3. What the heat map changes

It reinforces several architecture decisions already made:

### Provenance before spectacle

Historical provenance and visual evidence touch every chapter. Phase 1 therefore is not administrative overhead; it is a universal platform dependency.

### Spatial/world systems have unusually high leverage

Water, spatial camera, agriculture/work, architecture, montage, crowds and city persistence recur heavily. This justifies investing in reusable world semantics rather than continuing shot-specific layer scripts indefinitely.

### Character rigging is still foundation work

Hero face/body performance scores broadly because Chapter 2 is performance-heavy and Chapter 1 repeatedly returns to Enki. The Rive spike is not just a blink repair; it is the first reusable actor-system proof.

### The “fun” systems are not necessarily the first systems

Weather and physics are important but have less cross-chapter reuse than world/provenance/performance foundations. Kutu remains a critical benchmark because it tests architectural limits, not because hail should dominate implementation effort.

## 4. Reuse bands

### Universal — weight 12

```text
historical provenance
visual evidence registry
```

Required before historically confident production scales.

### Core cross-chapter — weight 9–10

```text
water/world systems
spatial camera/depth
agriculture/work
architecture
time montage
hero face/body
cloth/hair/reeds
crowds
animals/herds
city persistence
procession/path systems
```

These deserve reusable platform abstractions.

### Important specialist — weight 7–8.5

```text
multi-actor dialogue
mythic transformation
underworld/numinous FX
boats
physics
weather
```

These still require serious reusable systems where complexity warrants it, but they should consume the common foundation rather than dictate it.

## 5. Capability → first proving benchmark

| Capability | First strong proving fixture |
|---|---|
| historical provenance | Phase 1 visual-evidence record packet |
| visual evidence | Standard of Ur / Met banquet / evidence application |
| hero facial | `benchmark:enki-facial:v1` |
| hero body | `benchmark:enki-helm:v1` |
| cloth/reeds | Enki Helm Pixi rigging proof |
| water | Enki Helm then Stag Spatial |
| spatial camera | `benchmark:stag-spatial:v1` |
| physics | `benchmark:kutu-storm:v1` |
| crowds/work | `benchmark:igigi-crew:v1` |
| city persistence | `benchmark:city-growth:v1` |
| architecture | Eridu/E-Absu research + CityKit proof |
| agriculture/work | Igigi/CityKit then Chapter 3 production units |
| animals/herds | marriage procession benchmark |
| multi-actor dialogue | Enlil Council then Sud/Nisaba/Haia |
| montage | long-journey benchmark |
| mythic/numinous | Nammu underwater / Dilmun transformation |

## 6. Capability dependency graph

Reuse score alone does not determine order. A high-leverage capability can depend on lower-level infrastructure.

```text
historical-sources/evidence
        │
        ├──────────────┐
        ↓              ↓
Scene V3 contracts   world/character definitions
        ↓              │
frame + seed kernel    │
        ↓              │
runtime registry ──────┘
        ↓
Animation Lab / proof fixtures
        ↓
  ┌─────┼────────┬─────────┐
  ↓     ↓        ↓         ↓
 Rive  Pixi    Three     world/crowd
  │     │        │         │
  └──┬──┘        ├────┬────┘
     ↓           ↓    ↓
 Enki Helm    Rapier CityKit
                    
        ↓
reel assembly / migration
```

## 7. Chapter 1 unlock path

Highest-leverage Chapter 1 sequence:

```text
provenance
→ Enki face/body
→ water/materials
→ Stag vessel hierarchy
→ spatial camera
→ Eridu world/architecture
→ crowd/work
→ physics/weather
→ numinous FX
```

This unlocks the voyage, Nammu, Dilmun transformation, canal work, Kutu and E-Absu without building each as unrelated technology.

## 8. Chapter 2 unlock path

```text
provenance
→ hero body/face
→ multi-actor blocking
→ gaze/listening
→ crowd reaction
→ paths/processions
→ animal/herd system
→ architecture/interiors
→ montage
→ dialogue/lip-sync when needed
```

Chapter 2 is why a reusable performance vocabulary and crowd timing system matter more than one perfect Enki blink.

## 9. Chapter 3 unlock path

```text
provenance
→ CityKit/world state
→ crowds/work clips
→ agriculture
→ water networks
→ architecture archetypes
→ paths/trade
→ animal population
→ montage/time compression
```

Chapter 3 is the architecture's graduation exam: persistent world semantics must replace background generation as the primary organizational model.

## 10. Reuse leverage vs runtime adoption

Do not map one capability to one vendor permanently.

Examples:

```text
hero face/body        Rive first; Spine remains fallback/series-scale option
cloth/reeds/water     Pixi first; Three shaders may own spatial materials later
spatial camera        Three/R3F
physics authoring     Rapier if Kutu benchmark earns adoption
crowd/world           project semantic runtime + Rive/Spine/Three representations
montage               Scene V3/platform concern, not a vendor timeline
```

The heat map tells us what to make reusable. Benchmark evidence tells us which runtime deserves to implement it.

## 11. A useful prioritization formula later

If the project eventually needs a more formal backlog model, use multiple dimensions rather than reuse alone:

```text
Production Priority =
  manuscript reuse
  × blocked production units
  × architectural dependency value
  × benchmark confidence
  ÷ implementation/risk cost
```

Do not implement this as a pseudo-precise score until real estimates and benchmark evidence exist. The current heat map intentionally remains coarse.

## 12. Planning consequence

The next implementation sequence remains sensible:

```text
Phase 1 evidence foundation
→ Phase 2 deterministic Scene V3 foundation
→ Animation Lab/fake adapter
→ Enki facial Rive spike
→ Pixi material spike
→ Enki Helm combined benchmark
→ Three/R3F spatial benchmark
→ Rapier/crowd/CityKit proofs
```

This is not technology enthusiasm driving the story. It is the opposite: the manuscript reuse map explains why those systems deserve to exist.