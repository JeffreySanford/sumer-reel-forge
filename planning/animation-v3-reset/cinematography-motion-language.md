# Cinematography and Motion Language

Status: **planning/art-direction contract**

Multiple animation runtimes can technically succeed while producing reels that feel unrelated. This document defines a common cinematic and motion language so Level 2/3 work supports the manuscript rather than becoming a technology showcase.

## 1. Core principle

Motion has narrative hierarchy:

```text
story action
  > actor intention
  > environmental response
  > camera support
  > decorative motion
```

Camera movement must not be used to fake subject animation or hide a failed performance gate.

## 2. Overall tone

Desired default:

- deliberate;
- painterly;
- grounded;
- restrained rather than hyperactive;
- mythic when story requires it;
- readable on a phone-sized vertical frame;
- motion serves narration/emotion;
- gods feel powerful because of control, not constant particle explosions.

## 3. Motion classes

```text
PRIMARY_ACTION
SECONDARY_ACTION
MATERIAL_RESPONSE
ENVIRONMENTAL_MOTION
CAMERA_MOTION
MYTHIC_MOTION
TRANSITION_MOTION
```

Every animated channel should belong to a class for review/QA prioritization.

## 4. Primary action

Examples:

- Enki adjusts tiller;
- Enlil addresses council;
- Sud reacts/recounts;
- workers dig/carry;
- boat takes hail impact;
- crowd procession advances.

Primary action must read at normal speed without debug overlays.

## 5. Secondary action

Examples:

- breath;
- weight shift;
- gaze;
- robe/hair lag;
- hand follow-through;
- listener reaction;
- rigging inertia.

Secondary action should reinforce primary action and can be subtle.

## 6. Environmental motion

Default environment should rarely be perfectly dead if scene is outdoors:

- water movement;
- reed/vegetation sway;
- smoke/fire;
- distant crowd/animal life;
- dust/fog;
- light variation when narratively appropriate.

But only a few channels need visible motion at once. Avoid “everything wiggles.”

## 7. Camera vocabulary

Preferred reusable moves:

```text
HOLD
SLOW_PUSH
SLOW_PULL
LATERAL_DRIFT
FOLLOW
REVEAL
ORBIT_RESTRAINED
CRANE_RESTRAINED
HANDHELD_NONE_BY_DEFAULT
```

Each move gets versioned presets/constraints rather than bespoke arbitrary curves everywhere.

## 8. Level 1 camera

Purpose:

- create cinematic interest from still composition;
- preserve source composition;
- no reveal of unsupported geometry.

Typical range is conservative pan/zoom/parallax.

## 9. Level 2 camera

Camera supports living subject but should be removable in controls to prove actor/material motion exists independently.

Benchmark controls therefore include `CAMERA_FROZEN`.

## 10. Level 3 camera

Three/R3F permits real spatial camera, but camera must obey approved geometry/depth.

Do not orbit behind a depth card merely because Three can.

Level 3 camera categories:

```text
DEPTH_PUSH
PARALLAX_TRAVEL
SPATIAL_REVEAL
FOLLOW_ACTOR
ARCHITECTURAL_REVEAL
CROWD_SCALE_REVEAL
```

## 11. Camera motion budget

For 60-second vertical reels, avoid sustained continuous camera motion in every shot. Use holds as punctuation.

A useful rhythm:

```text
movement → hold/read → movement → hold/reveal
```

The exact values remain shot-specific rather than one rigid timing formula.

## 12. Hero facial shots

For blink/dialogue/facial proof:

- camera should be stable enough to read face;
- avoid aggressive push during semantic blink proof;
- proof controls include camera-frozen state;
- actor identity/facial motion cannot be judged solely during camera scale change.

## 13. Dialogue coverage

Chapter 2 suggests reusable blocking grammar:

```text
ESTABLISHING_TWO_OR_GROUP
SPEAKER_MEDIUM
LISTENER_REACTION
TWO_SHOT
INSERT_OBJECT_IF_NARRATIVE
RETURN_GROUP
```

This is a storytelling library, not an obligation to mimic live-action shot/reverse-shot mechanically.

## 14. Formal council scenes

Enlil’s authority can be expressed via:

- centered/stable composition;
- slower camera movement;
- controlled gesture;
- listener reaction waves;
- spatial hierarchy;
- selective push on decision/emotional pivot.

Avoid constant camera floating that weakens formal weight.

## 15. Divine motion language

Divine characters should not all move identically.

Potential default distinction:

- Enki: fluid, measured, water-associated responsiveness;
- Enlil: controlled, axial, authoritative gesture;
- Ninhursag: grounded, organic, nurturing/forceful depending scene;
- Inanna: dynamic, decisive, high contrast of stillness/action;
- Ereshkigal: minimal, heavy, spatially commanding.

These are project art-direction hypotheses, not claims from ETCSL. They can evolve with manuscript characterization and human review.

## 16. Human/worker motion

Workers/crowds:

- practical center of gravity;
- clear labor cycle;
- varied rest/phase;
- no cartoon bounce unless style intentionally calls for it;
- tool contact/weight matters;
- environmental heat/fatigue can affect posture/pace.

## 17. Animal motion

Herd motion must preserve species-specific gait/weight where practical.

Avoid one generic quadruped loop scaled to every animal if the procession uses visibly different species.

Spine/Rive evaluation should include gait plausibility and instancing variation.

## 18. Boat motion

Boat hierarchy:

```text
world/current driver
  → vessel heave/roll/yaw
  → actor parent/root compensation as authored
  → rigging/rope lag
  → local cloth/material response
```

No independent sine wave for every component.

## 19. Water motion

Water has scale layers:

```text
macro travel/current
meso wave pattern
micro surface/reflection
interaction wake/splash
```

Not every shot requires all four.

## 20. Storm language

Kutu hail/storm should escalate in authored stages:

```text
CALM_WARNING
WIND_BUILD
SMALL_HAIL
HEAVY_IMPACT
WAVE_ATTACK
PEAK
SUDDEN_RELEASE / AFTERMATH
```

This gives physics/particles narrative structure rather than randomized chaos.

## 21. Mythic transformation

Transformation categories:

```text
GROWTH
MANIFESTATION
BLESSING
CURSE
DESCENT/UNDERWORLD
DIVINE_REVEAL
ENVIRONMENTAL_CREATION
```

Prefer readable progression and symbolic continuity over generic glow/disintegration templates.

## 22. Motion easing philosophy

Use ease/physical lag according to material/action:

- deliberate gesture: shaped ease with hold;
- heavy object: slower acceleration/deceleration;
- rigging: delayed/inertial response;
- blink: biologically readable close/hold/reopen;
- camera: smooth unless narrative shock;
- hail impact: fast impulse with physical response.

Named easing/driver IDs make this testable and reusable.

## 23. Stillness is allowed

A successful Level 3 shot can contain deliberate stillness.

Do not judge complexity by motion count. Some divine/ritual moments should become more powerful when environment quiets and one action dominates.

## 24. Motion density metric

Studio may eventually report active semantic channels by frame to reveal accidental overload:

```text
primary actions: 1
secondary: 3
environment: 4
camera: 1
mythic FX: 0
```

This is diagnostic, not a hard artistic threshold.

## 25. Vertical composition

Camera and actor blocking must account for:

- 9:16 frame;
- captions/title safe zones;
- platform UI crops/safe margins;
- face readability;
- hands/tools not constantly cut off;
- depth motion not causing subject to leave safe composition.

## 26. Storybook motion stories

Every core motion primitive has:

```text
Still/Start
Anticipation
Peak
Settle
End
NormalSpeed
CameraFrozen
DebugChannels
ReducedMotionStudio
```

The production animation itself is not reduced because Studio prefers reduced motion; preview autoplay/UI behavior changes.

## 27. Unit tests

- camera track frame bounds;
- driver causality;
- parent-child motion ownership;
- easing endpoints;
- no wall-clock evaluation;
- channel activation windows;
- proof-state frame mapping;
- camera-frozen control removes only camera contribution;
- primary action remains active under camera-frozen control.

## 28. Visual/motion tests

- exact-frame proof states;
- trajectory continuity;
- no pop at clip transitions;
- material lag direction;
- actor/camera contribution isolation;
- safe-zone containment;
- final rendered semantic action.

## 29. E2E

Studio workflow should allow reviewer to:

- scrub named motion states;
- freeze camera/material/actor contributions;
- inspect channel ownership;
- compare L1/L2/L3;
- run normal-speed proof;
- see motion-density/diagnostic overlays;
- approve/reject based on benchmark criteria.

## 30. Human review

Questions:

- What is the shot asking me to notice?
- Does motion help that?
- Is anything moving simply because the engine can move it?
- Does the camera support or compete with performance?
- Does the character retain weight and intention?
- Does the final result still feel like one visual world?

## 31. Definition of motion-language success

The system succeeds when an Enki boat shot, Enlil council speech, Igigi work scene and city-growth montage can use different runtimes and complexity while still feeling directed by the same filmmaker rather than generated by four unrelated animation demos.
