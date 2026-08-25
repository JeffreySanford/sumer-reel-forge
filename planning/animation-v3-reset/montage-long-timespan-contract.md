# Montage and Long-Timespan Contract

Status: **final pre-implementation planning contract**

Chapters 2–3 cover journeys, labor, settlement growth and civilizational change that should not be represented by stretching one continuous animation. Montage is a first-class editorial data structure that compresses time while preserving narrative/source/world-state traceability.

## Core rule

A montage is an ordered authored sequence of semantic segments. It owns editorial compression, not hidden time acceleration inside child runtimes.

```ts
interface MontageDefinition {
  id: string;
  revision: number;
  segments: MontageSegment[];
  transitionProfileId: string;
  continuitySubjectIds: string[];
  sourceBindingIds: string[];
}

interface MontageSegment {
  id: string;
  order: number;
  semanticTimeLabel: string;
  sceneBindingId: string;
  durationFrames: number;
  worldStateIds: string[];
  continuityAnchorIds: string[];
  transitionIn?: string;
  transitionOut?: string;
}
```

## Time domains

Montage must distinguish:

```text
FRAME_TIME
FICTIONAL_ELAPSED_TIME
MYTHIC/LITERARY_TIME
EVIDENCE_DATE
```

A 20-frame transition may represent years of fictional development. The mapping is authored metadata, not inferred by render duration.

## Continuity anchors

Montages should name what persists across segments:

- same city identity;
- same canal/path;
- same hero actor;
- same architectural landmark;
- same work system;
- same object/route motif.

This avoids arbitrary generative jump cuts that accidentally redefine the world.

## Chapter 3 benchmark

`benchmark:city-growth-montage:v1` should prove a city can progress through:

```text
SPARSE_SETTLEMENT
CANAL_ACCESS
CONSTRUCTION
AGRICULTURAL_PRODUCTION
MATURE_CIVIC_CENTER
```

with exact segment ordering, reproducible transitions and continuity anchors.

## Transition policy

Allowed transitions include cut, dissolve, match-action, match-composition, time-lapse synthesis and explicitly approved mythic transformation. Transition implementation may evolve, but segment identity/order and source/world-state bindings remain canonical.

## Negative fixtures

```text
FAILURE-MONTAGE-001 duplicate-segment-order
FAILURE-MONTAGE-002 missing-continuity-anchor
FAILURE-MONTAGE-003 child-runtime-owns-time-compression
FAILURE-MONTAGE-004 world-state-regresses-without-authored-reason
FAILURE-MONTAGE-005 transition-reveals-unsupported-geometry
FAILURE-MONTAGE-006 fictional-time-confused-with-evidence-date
FAILURE-MONTAGE-007 segment-change-silently-mutates-release
```

## QA

Structural QA checks ordering, duration, exact child scene revisions and continuity references. Visual QA checks matching geography/identity across transitions. Human review decides whether compression is legible and emotionally/narratively coherent rather than a technology demo.

## Definition of Ready

Ready when one machine-readable Chapter 3 montage fixture exists, fictional elapsed time is explicit, and child Scene V3 scenes can remain independently reproducible while montage assembly changes.
