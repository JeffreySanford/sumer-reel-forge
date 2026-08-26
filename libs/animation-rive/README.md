# animation-rive

Rive-specific adapter boundary for Animation V3 hero-character performance.

Current gate: `ENKI-RIG-0` neutral identity only.

The library intentionally does **not** import a Rive runtime yet. The current adoption candidate is `@rive-app/webgl2@2.40.1` (MIT), but the dependency remains deferred until an approved `enki-neutral-v1.riv` candidate exists so the repository lockfile and runtime adoption happen together.

## Authority

```text
Scene V3 / FrameContext
        ↓
engine-neutral actor performance state
        ↓
animation-rive
        ↓
Rive runtime
```

Rive must not own story time. Production autoplay, autonomous browser clocks, and hidden state-machine advancement are forbidden.

## ENKI-RIG-0

The first Rive gate proves only neutral identity:

- exact accepted Enki source bytes and SHA remain provenance-bound;
- no generated pixels are introduced by rig prep;
- no canonical source or manifest is mutated;
- no animation/state-machine channel is active;
- rig time remains frozen at zero for every Scene V3 frame;
- neutral render must survive technical identity comparison and human identity review;
- blink, gaze, breath, helm gesture, hair/robe response, and other motion stay blocked until neutral identity is accepted.

This is deliberately stricter and smaller than a motion spike. A green neutral gate earns permission to begin real rig authoring; it does not make a Rive rig production-capable.
