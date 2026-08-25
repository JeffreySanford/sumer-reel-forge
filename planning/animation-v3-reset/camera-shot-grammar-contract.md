# Machine-Readable Camera Shot Grammar Contract

Status: **final pre-implementation planning contract**

This contract turns the cinematography language into versioned data so camera intent can be authored, inspected and tested without hard-coding arbitrary transforms per shot.

## Core model

```text
shot grammar intent
  ↓
camera preset/profile
  ↓
frame-addressed camera track
  ↓
Level 1/2 transform OR Level 3 spatial camera
```

The semantic intent survives runtime migration.

## Proposed contracts

```ts
interface CameraShotGrammar {
  id: string;
  revision: number;
  intent: 'HOLD' | 'SLOW_PUSH' | 'SLOW_PULL' | 'LATERAL_DRIFT' | 'FOLLOW' | 'REVEAL' | 'DEPTH_PUSH' | 'SPATIAL_REVEAL' | 'ARCHITECTURAL_REVEAL' | 'CROWD_SCALE_REVEAL';
  subjectIds: string[];
  startFrame: number;
  endFrameExclusive: number;
  framingProfileId: string;
  motionProfileId: string;
  constraints: CameraConstraint[];
}
```

Constraints may include maximum scale delta, maximum angular change, subject safe region, forbidden reveal region, horizon lock, camera-frozen proof requirement and minimum hold duration.

## Proof philosophy

Camera motion is never accepted as evidence that an actor/material/world capability works. Every benchmark with primary subject motion must support `CAMERA_FROZEN` or an equivalent control.

## Enki Helm fixture

The initial machine-readable fixture should use a restrained `HOLD` or `SLOW_PUSH` profile with face/tiller safe regions and explicit constraint that the camera cannot obscure the blink/helm proof windows.

Named states:

```text
CAMERA_START
PRIMARY_ACTION_READ
CAMERA_END
```

## Level 2 vs Level 3

Level 2 grammar may resolve to crop/pan/scale/depth-card transforms. Level 3 grammar may resolve to Three camera position/orientation/focal settings. The grammar ID is not a Three camera object.

## Negative fixtures

```text
FAILURE-CAMERA-001 camera-substitutes-for-primary-action
FAILURE-CAMERA-002 unsupported-backside-reveal
FAILURE-CAMERA-003 subject-leaves-safe-region
FAILURE-CAMERA-004 runtime-specific-camera-id-in-scene-contract
FAILURE-CAMERA-005 camera-track-wall-clock-driven
FAILURE-CAMERA-006 proof-state-differs-between-storybook-and-render
FAILURE-CAMERA-007 migration-changes-semantic-framing-silently
```

## Versioning

Changing semantic framing or timing creates a new camera grammar/profile revision and may stale shot visual/human proof. Changing only implementation math while preserving the approved canonical proof frames is an adapter/runtime revision with its own A/B evidence.

## Definition of Ready

Ready when at least one camera grammar planning fixture exists, constraints can be validated without Three/Remotion imports, and Storybook/Remotion can consume the same exact frame-addressed camera state later.
