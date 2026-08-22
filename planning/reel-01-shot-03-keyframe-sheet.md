# Reel 1 Shot 3 - Enki At The Helm Keyframe Sheet

## Purpose

Translate the Shot 3 benchmark plan into five directorial checkpoints that can be compared against real render frames. These are not rigid final frames; they define composition, attention, motion phase, and continuity targets at approximately 0%, 25%, 50%, 75%, and 100% of the shot.

The benchmark remains successful only if every checkpoint works as an intentional still image and the motion between checkpoints feels physically connected.

## Shot Intent

- Story function: establish Enki as the calm human/divine anchor of the voyage.
- Primary eye target: Enki's eyes and upper face.
- Secondary context: helm / working vessel / water.
- Physical rule: boat, water, cloth, and camera have weight and inertia.
- Stillness anchor: facial identity and calm presence.
- Transition goal: move viewer attention from Enki toward the water so Shot 4 can reveal Nammu.

## Keyframe A - Opening - 0%

### Composition

- Enki is already present and alive; no neutral setup pose.
- Face sits near the upper-middle third, slightly offset from center.
- Negative space remains in the direction of travel.
- Vessel context and water remain clearly legible.
- One foreground rigging / vessel element may frame an edge but must not dominate.

### Motion state

- Camera at scale `1.000`.
- Boat near a neutral vertical position, not exactly at a mathematical loop origin.
- Breathing already underway.
- Eyes open; gaze toward travel direction.
- Mist/reflection treatment at low intensity.

### Viewer read

`This is Enki aboard a real vessel.`

### Reject if

- it reads as a portrait disconnected from the Stag;
- the face is already too large for the later push;
- foreground depth obscures the subject;
- source layer seams are visible before motion starts.

## Keyframe B - Establishing Life - 25%

### Composition

- Camera push has become barely perceptible, not obvious.
- Parallax begins to separate coast, water, vessel, Enki, and foreground.
- Face remains visually stable.

### Motion state

- Camera approximately one quarter of total planned travel.
- Boat has completed part of one heavy settle.
- Breathing remains subliminal.
- No blink yet unless narration timing strongly motivates one.
- Water reflection begins to create small independent visual life.

### Viewer read

`He is traveling, thinking, and physically present.`

### Reject if

- every layer appears attached to one transform;
- the camera move is already noticeable as a zoom effect;
- Enki visibly bobs with the boat like a cardboard cutout.

## Keyframe C - Character Beat - 50%

### Composition

- This should be the strongest representative still of the benchmark.
- Enki remains dominant without losing vessel/environment context.
- Warm skin/copper accents balance the cooler water environment.

### Motion state

- Camera around half travel.
- One natural blink occurs near, but not necessarily exactly at, this region.
- Optional gaze adjustment begins after the blink.
- Boat motion and reflected light remain asynchronous.
- Cloth/hair response, if present, lags physical movement subtly.

### Viewer read

`Calm authority, not theatrical divinity.`

### Reject if

- blink state changes identity;
- separated head/eyes appear pasted on;
- multiple motion channels peak simultaneously;
- reflected light competes with the face.

## Keyframe D - Attention Shift - 75%

### Composition

- Enki remains the anchor, but water/reflection becomes slightly more visually important.
- Camera push begins to decelerate.
- Foreground rigging may move out of prominence to clear the transition path.

### Motion state

- Gaze/head adjustment, if used, has mostly settled.
- Breathing remains quiet.
- Water/reflection treatment increases slightly.
- Audio may begin to favor water over vessel detail.

### Viewer read

`Something beneath or beyond the water is drawing attention.`

### Reject if

- Enki suddenly performs a visible acting cue to announce Nammu;
- the transition is created only by an opacity fade;
- reflected light becomes fantasy glow.

## Keyframe E - Handoff - 100%

### Composition

- Camera has nearly or fully settled.
- Enki ends calmer than he began.
- A water/reflection/foreground shape provides a visual bridge into Shot 4.
- The final frame still works on its own even though it prepares a transition.

### Motion state

- Camera near final scale target, initially `~1.025` candidate.
- Boat settles rather than stopping mechanically.
- Character motion is minimal.
- Water remains alive and becomes the dominant transition material.

### Viewer read

`The voyage is about to become something stranger.`

### Reject if

- final pose looks frozen;
- camera movement continues just because frames remain;
- the transition obscures Enki too early;
- the scene cannot cut cleanly into a near-static underwater composition.

## Keyframe Comparison Requirements

For every serious Shot 3 candidate, export frames nearest these five checkpoints and compare them side-by-side.

Review:

- face scale and identity consistency;
- eye target;
- depth progression;
- foreground movement;
- camera amplitude;
- water/reflection prominence;
- caption clearance;
- color consistency;
- whether the final frame naturally prepares Shot 4.

## Motion Between Keyframes

Keyframes define intent, not linear interpolation.

Use named motion curves:

- camera: `cinematicSlow`;
- vessel: `heavyPhysical`;
- cloth/hair: `clothLag`;
- water/reflection: `waterPulse` or equivalent multi-frequency treatment.

Avoid identical easing across all channels.

## Pass Rule

Do not approve the motion merely because the endpoints are correct. The interpolation must preserve mass, asymmetry, and visual hierarchy. If a frame between checkpoints looks weaker than both neighboring checkpoints, revise the motion rather than hiding the problem with faster timing.