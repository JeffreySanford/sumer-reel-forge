# Chapter 1 Capability-to-Scene Dependency Graph

Status: **final pre-implementation production-planning contract**

This graph converts Chapter 1 from a narrative inventory into an explicit dependency network. It answers which platform capabilities unlock which production units, which units can proceed at Level 2 while Level 3 matures, and which failures should block only a subset of the chapter.

## Capability nodes

```text
C-SOURCE     historical/literary provenance
C-EVIDENCE   visual evidence applications
C-ENKI       Enki source sheet + rig/performance
C-STAG       Stag identity + anchors
C-WATER      semantic water profiles
C-RIGGING    rope/sail/material deformation
C-CAMERA     shot grammar
C-LIGHT      lighting profiles
C-PHYSICS    approved fixed-step bakes
C-GROWTH     vegetation/agriculture states
C-CROWD      deterministic worker scheduling
C-CITY       CityKit topology
C-ARCH       architecture/temple kit
C-MONTAGE    long-timespan compression
C-AUDIO      narration/dialogue markers
C-INGEST     canonical asset ingest/receipts
C-TRACE      proof/promotion/release traceability
```

## Production-unit graph

### CH1-A — Voyage / Stag of the Absu

Hard dependencies:

```text
C-SOURCE
C-ENKI
C-STAG
C-WATER
C-CAMERA
C-INGEST
C-TRACE
```

Enhancement dependencies:

```text
C-RIGGING
C-LIGHT
C-PHYSICS
```

Level 2 can proceed with approved layered Stag/Enki/water behavior before full spatial physics.

### CH1-B — Nammu / Absu / deep water

Hard:

```text
C-SOURCE
C-EVIDENCE
C-WATER
C-LIGHT
C-CAMERA
C-TRACE
```

Optional/advanced:

```text
spatial depth / Three runtime
particles
numinous actor rig
```

A failed hero-character runtime does not block environmental deep-water proof.

### CH1-C — Dilmun transformation

Hard:

```text
C-SOURCE
C-EVIDENCE
C-WATER
C-GROWTH
C-MONTAGE
C-CAMERA
C-LIGHT
C-TRACE
```

Later settlement/city growth may additionally require `C-CITY` and `C-ARCH`.

### CH1-D — Canal/civilization work

Hard:

```text
C-SOURCE
C-EVIDENCE
C-WATER
C-CROWD
C-CAMERA
C-TRACE
```

Advanced:

```text
C-CITY
C-MONTAGE
work-prop rigs
```

### CH1-E — Kutu storm

Hard:

```text
C-SOURCE
C-STAG
C-WATER
C-LIGHT
C-CAMERA
C-TRACE
```

Level 3 graduation dependency:

```text
C-PHYSICS
```

If Rapier bake admission fails, a deterministic authored-response fallback may preserve the story while physics remains deferred; the benchmark decides whether that fallback meets visual needs.

### CH1-F — Ninhursag / earth-life material

Hard:

```text
C-SOURCE
C-EVIDENCE
C-GROWTH
C-CAMERA
C-LIGHT
C-TRACE
```

Character performance depends on a separately approved Ninhursag identity/rig and must not be fabricated from Enki assets.

### CH1-G — Eridu / E-Absu

Hard:

```text
C-SOURCE
C-EVIDENCE
C-CITY
C-ARCH
C-WATER
C-CAMERA
C-LIGHT
C-INGEST
C-TRACE
```

Advanced:

```text
C-CROWD
C-MONTAGE
hero divine performance
```

## Critical path

The highest-reuse Chapter 1 path is:

```text
SOURCE/EVIDENCE
  ↓
INGEST/TRACEABILITY
  ↓
FRAME/SCENE V3 FOUNDATION
  ↓
ENKI + STAG + WATER
  ↓
CAMERA + LIGHTING
  ↓
GROWTH / CROWD / CITY / ARCH
  ↓
PHYSICS + MONTAGE graduation
```

This supports the platform strategy: prove deterministic source-bound fundamentals first, then add expensive runtimes only where they unlock manuscript demand.

## Failure isolation

Examples:

- Rive rejected → blocks Enki facial/body upgrade, not water/city research;
- Pixi material spike rejected → water implementation reopens, but semantic water profile remains valid;
- Rapier rejected → Kutu physics deferred, not entire Chapter 1;
- CityKit topology incomplete → Eridu/Dilmun settlement blocked, Voyage unaffected;
- historical evidence stale → affected design applications stale, not unrelated runtime tests;
- camera grammar bug → visual shot proofs stale, source/asset identity remains current.

## Readiness matrix

Each production unit should eventually expose:

```text
NARRATIVE
SOURCE
EVIDENCE
ASSET
CAPABILITY
SCENE
LOCAL_QUALITY
CI_QUALITY
RENDER_PROOF
HUMAN
PROMOTION
```

No aggregate percentage replaces these dimensions.

## Implementation priority consequence

After Phase 1B, the most valuable implementation order remains:

```text
Phase 2 contracts/frame/compiler
→ Animation Lab
→ Enki facial benchmark
→ water/material benchmark
→ Enki Helm/Stag integration
→ spatial Stag
→ Kutu physics
→ crowd/growth/CityKit/architecture
```

## Definition of Ready

This graph is ready when each Chapter 1 production unit has named hard/optional capabilities, failure isolation is explicit, and the production board can later compute blockers from typed dependency edges rather than manually maintained status prose.
