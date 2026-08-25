# Crowd Archetype, Agent and Scheduling Contract

Status: **planning contract / deterministic population runtime**

Crowds in Sumer Reel Forge are authored deterministic populations. They are not autonomous agents, uncontrolled procedural simulations, or arrays of clones sharing one animation clock.

## 1. Core separation

```text
ArchetypeDefinition
  ↓ what kind of person/worker/background actor exists
CrowdDefinition
  ↓ how many, where, why
AgentAssignment
  ↓ deterministic individual variation
Schedule
  ↓ frame-addressed activities
Runtime representation
  ↓ Rive/Spine/cards/instancing
```

## 2. Archetype definition

Conceptual:

```ts
interface ActorArchetype {
  id: string;
  revision: number;
  label: string;
  periodProfileId: string;
  costumeProfileIds: string[];
  rigPoolIds: string[];
  allowedClipIds: string[];
  propPoolIds: string[];
  scaleRange: [number, number];
  evidenceApplicationIds: string[];
  semanticRoles: string[];
}
```

Examples:

```text
archetype:worker:canal:v1
archetype:worker:brickmaker:v1
archetype:attendant:formal:v1
archetype:guard:v1
archetype:herder:v1
```

## 3. Crowd definition

```ts
interface CrowdDefinition {
  id: string;
  revision: number;
  seed: number;
  count: number;
  regionId: string;
  archetypeWeights: WeightedRef[];
  behaviorProfileId: string;
  densityProfileId: string;
  scheduleWindow: FrameRange;
}
```

Scene V3 owns the scene timing window. Crowd runtime evaluates deterministic assignments for the requested frame.

## 4. Stable agent IDs

Generated agents get deterministic semantic instance IDs derived from crowd identity and stable ordinal assignment:

```text
agent:crowd-igigi-canal:0001
agent:crowd-igigi-canal:0002
```

The ID does not depend on screen sort order or runtime spawn order.

If an authored named worker later becomes a hero/supporting actor, that is a deliberate identity migration, not silent promotion of a random agent.

## 5. Variation dimensions

Permitted deterministic variation:

- archetype choice;
- rig/source variant;
- body scale within approved range;
- costume variant;
- tool/prop variant;
- activity/clip assignment;
- clip phase;
- rest interval;
- position/path offset;
- walk speed;
- facing;
- reaction delay.

Each dimension uses its own semantic seed purpose so adding one variation dimension cannot perturb all others.

## 6. Scheduling model

Agent schedules are frame-addressed segments:

```text
DIG
CARRY_SILT
WALK_EMPTY
REST
TOOL_ADJUST
```

Conceptual:

```ts
interface AgentScheduleSegment {
  startFrame: number;
  endFrameExclusive: number;
  activityId: string;
  clipId: string;
  pathId?: string;
  propBindingIds?: string[];
}
```

Segments cannot overlap incompatibly unless blending is explicitly supported.

## 7. Work-cycle grammar

Behavior profiles may describe allowed transitions:

```text
DIG → CARRY_SILT → DEPOSIT → WALK_EMPTY → DIG
DIG → REST → DIG
CARRY_SILT → TOOL_ADJUST → WALK_EMPTY
```

This is deterministic scheduling, not an AI decision loop.

## 8. Spatial placement

Crowd placement consumes CityKit/world regions and paths.

Runtime may not place bodies outside allowed region or through forbidden geometry merely to satisfy count.

If density constraints cannot be satisfied:

```text
BLOCK or WARN according to scene contract
```

Never silently overlap 100 bodies in the same patch.

## 9. Synchronization metric

The Igigi benchmark requires a measurable clone/synchronization detector.

Candidate metrics may inspect:

- same clip ID;
- same normalized clip phase;
- same orientation;
- same transition frame;
- same path speed;
- nearby-agent correlation.

Threshold is versioned by QA contract. The architecture requirement is stable even before the exact metric is selected.

## 10. Hero/background separation

Background crowds must not accidentally consume hero-only assets or clips.

Rules:

- `actor:enki` cannot enter a generic crowd pool;
- hero costume/rig IDs require explicit scene actor binding;
- crowd archetype sources have separate continuity/evidence requirements;
- LOD substitution cannot substitute a hero actor.

## 11. LOD policy

LOD changes representation, not semantic assignment.

Example:

```text
LOD0: full rig
LOD1: reduced rig
LOD2: animated card
LOD3: distant instanced silhouette
```

Agent role, schedule, path and identity remain stable where visible/needed.

LOD switches must not produce obvious pops in approved camera proof.

## 12. Deterministic count changes

Increasing crowd count from 20 to 100 should preserve existing agent assignments for the first stable agent IDs where practical.

This prevents changing one benchmark scale from completely reshuffling the scene.

Use semantic identity, not one sequential RNG stream whose consumption changes with count.

## 13. Igigi crew fixture

Primary fixture:

```text
benchmark:igigi-crew:v1
crowd:c03:igigi-canal:v1
```

Required modes:

```text
1_AGENT
5_AGENT
20_AGENT
100_AGENT
PERFECT_SYNC_NEGATIVE
OVERDENSITY_NEGATIVE
```

Behavior pool:

```text
dig
carry-silt
walk-load
walk-empty
rest
tool-adjust
```

## 14. Evidence and historical-fiction boundary

Archetype costume/tools/work staging may reference visual evidence applications.

The crowd system itself does not claim population counts or exact labor organization are historically proven unless a scene/source binding supports that claim.

`count: 100` may be a production benchmark, not an archaeological assertion.

## 15. Performance budget

Record for each benchmark:

```text
agent count
representation LOD
CPU evaluation time
GPU/render impact
memory
frame evaluation stability
machine profile
```

Performance optimization cannot disable variation or alter approved behavior silently.

## 16. Failure cases

```text
FAILURE-CROWD-001-perfect-sync
FAILURE-CROWD-002-agent-id-order-dependent
FAILURE-CROWD-003-region-overflow
FAILURE-CROWD-004-hero-in-crowd-pool
FAILURE-CROWD-005-unknown-clip
FAILURE-CROWD-006-overlapping-exclusive-schedule
FAILURE-CROWD-007-count-change-reshuffles-existing-agents
FAILURE-CROWD-008-wall-clock-phase
FAILURE-CROWD-009-LOD-changes-semantic-role
```

## 17. Storybook/Studio

```text
Crowd/Igigi/OneWorker
Crowd/Igigi/FiveWorkers
Crowd/Igigi/TwentyWorkers
Crowd/Igigi/HundredWorkers
Crowd/Igigi/PerfectSyncNegative
Crowd/Igigi/ScheduleDebug
Crowd/Igigi/RegionDebug
Crowd/Igigi/LODComparison
```

Debug stories are not promotion candidates.

## 18. Test IDs

```text
CONTRACT-CROWD-001-valid-definition
CONTRACT-CROWD-002-agent-id-stability
UNIT-CROWD-001-seed-isolation
UNIT-CROWD-002-schedule-generation
SEMANTIC-CROWD-001-no-cloned-motion
PERF-CROWD-001-100-agent
FAILURE-CROWD-001-perfect-sync
HUMAN-CROWD-001-work-naturalness
```

## 19. Definition of readiness

The crowd system is ready when the same seed and scene produce the same agents/schedules, variation is locally isolated, density/path constraints are respected, 100-agent proof fits budget, negative perfect-sync fixtures fail, and representation LOD can change without changing authored population meaning.