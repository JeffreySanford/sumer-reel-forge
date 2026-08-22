# Reel 1 Shot 3 - Enki At The Helm Benchmark Plan

## Purpose

Define the first publication-quality animation benchmark precisely enough that asset preparation and Remotion implementation can proceed without inventing art direction during coding.

This shot is the first visual-quality gate for Reel 1. It must prove that layered illustrated assets, restrained motion, material-specific movement, and deliberate camera language can make the project feel cinematic without relying on full AI video or skeletal character animation.

## Story Function

Shot 3 establishes Enki as the human/divine visual anchor of the reel.

The audience should read:

- calm authority;
- practical travel rather than conquest;
- thoughtfulness rather than theatrical heroism;
- a man physically present on a working vessel;
- growing purpose before Nammu's presence changes the visual language.

The shot should not read as action, spectacle, or dialogue performance.

## Target Duration

Plan for approximately 7-9 seconds during benchmark iteration. The exact final duration remains tied to narration and Reel 1 timing.

The benchmark render may be extended to 8-12 seconds if extra lead-in/out frames help judge transition quality.

## Composition

### Primary eye target

Enki's eyes / upper face.

### Secondary eye target

His hands/helm relationship and enough vessel detail to establish that he is physically steering or standing aboard the Stag.

### Frame position

Preferred initial composition:

- Enki face around the upper-middle third rather than exact center;
- body occupying roughly 35-45% of frame height;
- enough negative space toward travel direction to imply movement;
- visible water plane below/behind him;
- one foreground vessel/rigging element crossing an edge of frame;
- distant coastline/horizon subdued enough not to compete.

Do not crop so tightly that the scene becomes a portrait disconnected from the vessel.

## Overscan Requirement

The source background should include enough extra image beyond the 1080x1920 final crop to permit a 2-4% push and restrained x/y travel without revealing transparent or repeated edges.

Target at least 8-10% safe overscan on the sides and top/bottom where practical.

## Layer Plan

Minimum desired layers:

1. `sky-background`
2. `distant-coast`
3. `far-water`
4. `stag-base`
5. `enki-body`
6. `enki-head-face`
7. `robe-or-cloth-response` if separation remains invisible
8. `foreground-rigging-or-vessel-edge`
9. `mist-atmosphere`
10. `water-reflection-light-mask`

Optional layers:

- hair edge response;
- jewelry/copper glint mask;
- near-water spray;
- distant bird only if composition needs it.

Every additional layer must justify the risk of seams and identity drift.

## Depth Ordering

Suggested normalized depth values for scene-data experiments:

- sky: `0.05`
- distant coast: `0.12`
- far water: `0.20`
- Stag base: `0.38`
- Enki body: `0.52`
- Enki head: `0.54`
- cloth overlay: `0.56`
- mist/light: semantic rather than strict physical depth; may straddle planes
- foreground rigging: `0.86`

These values are conceptual and should be tuned from visual review rather than treated as physics.

## Camera Plan

Primary camera move: `slowPush`.

First benchmark candidate:

- scale: `1.000 -> 1.025`
- x travel: approximately `0 -> -8 px` or toward the negative-space side only if composition benefits
- y travel: approximately `0 -> -10 px`
- no rotation
- long ease-in and soft settle during final 15-20% of shot

A/B candidate:

- compare 2.5% push with 3.5% push;
- reject the stronger push if Enki's face enlargement reveals layering or feels like a generic Ken Burns effect.

## Boat Motion

The boat must move independently from the camera.

Target:

- very low-amplitude vertical bob;
- slower irregular roll suggestion without visibly rotating Enki as a cutout;
- one soft settle rather than a mathematically perfect repeating sine loop.

The vessel should feel heavy.

Do not animate the entire scene with the same bob transform.

## Enki Performance Timeline

Exact frames should remain editable, but the emotional rhythm should be planned.

### Opening 0-20%

- Enki already alive, not appearing from a neutral pose.
- Eyes open.
- Gaze slightly toward travel direction.
- Breathing underway at low amplitude.
- Camera movement begins almost imperceptibly.

### Middle 20-65%

- One natural blink at an asymmetrical point, roughly 35-50% into the shot.
- Slight head or gaze adjustment after a narration thought boundary.
- Do not combine a blink, head turn, cloth movement peak, and camera acceleration at the same moment.

### Closing 65-100%

- Head/gaze settles.
- Camera decelerates.
- Reflected water light or atmosphere becomes slightly more noticeable as the shot prepares to move toward Nammu.
- End pose should feel calmer than opening pose.

## Breathing

Breathing should be almost subliminal.

Candidate amplitude:

- torso y-scale or position equivalent of only a few pixels;
- cycle duration longer than a typical obvious animation loop;
- slight asymmetry between inhale and exhale;
- head should not bob rigidly with the torso.

If breathing is consciously noticeable on first viewing, reduce it.

## Blink

Use one blink in the benchmark unless review proves it needs none.

Rules:

- avoid blinking exactly at the midpoint or on a round-second boundary;
- close quickly, hold minimally, reopen slightly slower;
- do not use repeated evenly timed blinks;
- preserve eye position and facial identity.

## Head / Gaze Motion

Prefer eye direction or a tiny head adjustment over a visible turn.

Initial candidate:

- 1-2 degree apparent change at most;
- occur after the blink rather than during it;
- settle before the transition toward Nammu.

If the separated head layer looks artificial, remove independent head motion and keep only gaze/blink.

## Cloth / Hair

Cloth and hair are optional secondary motion, not requirements.

If used:

- movement lags boat/wind slightly;
- amplitude remains small;
- avoid repeated waving;
- preserve garment silhouette and continuity.

The benchmark is allowed to omit cloth movement if the layer creates visible seams.

## Water

Water should have at least two independent scales of movement:

1. low-frequency plane movement / perspective drift;
2. higher-frequency reflection/glint movement.

Avoid horizontal repeating stripes or obvious procedural patterns.

Reflections should move differently from the boat.

## Lighting

Primary light concept:

- cool environmental water light;
- warm skin/copper accents;
- subtle reflected water light moving across lower robe/vessel rather than across the face constantly.

Optional edge light may help separate Enki from background, but it must remain plausible and restrained.

No fantasy glow around Enki.

## Atmosphere

Use one dominant atmospheric treatment:

- low dawn mist OR subtle suspended haze.

Secondary water glints are allowed.

Avoid stacking mist + dust + rays + particles + glow simultaneously.

## Foreground Rigging / Occlusion

Use one foreground element to create near-camera depth.

Preferred behavior:

- occupies a small edge region;
- moves slightly faster than Enki/background due to parallax;
- may partially enter/leave frame;
- never crosses Enki's eyes or captions;
- should feel attached to the vessel rather than like a decorative wipe.

## Transition In From Shot 2

Preferred transition concept:

Shot 2's vessel/rigging movement creates a foreground occlusion that motivates the closer Shot 3 composition.

Possible implementation:

- Shot 2 ends with rigging/sail edge moving across part of frame;
- Shot 3 begins with a visually compatible foreground vessel element already near that edge;
- use a cut or very short blend under the occlusion rather than a full crossfade.

The result should feel like the camera has moved aboard the Stag.

## Transition Out Toward Shot 4 / Nammu

Preferred concept:

Reflected light and water gradually become more visually important as Enki settles.

Possible sequence:

- camera push decelerates;
- Enki motion quiets;
- water/reflection layer rises in visual prominence;
- a reflection or water occlusion fills enough of frame to motivate Shot 4;
- Shot 4 begins with physical camera motion nearly stopped and the supernatural current language taking over.

This should feel like attention is moving from Enki to something beneath the water.

## Caption Zone

Keep caption-safe lower-middle area readable without covering:

- Enki's face;
- hand/helm relationship;
- important vessel details needed for scale.

Test captions during benchmark review rather than adding them only after visual approval.

## Audio Interaction

Candidate sync points:

- subtle boat creak or wood tension near one boat settle;
- water movement slightly more present near transition out;
- no sound effect for blink/head movement;
- narration remains dominant;
- score should not announce the character as a superhero.

## Stillness Anchor

The stillness anchor for this shot is **Enki's identity and calm facial presence**.

Everything else may move slightly around him. The face itself should remain visually stable enough that the audience trusts the character.

## Benchmark A/B Matrix

Change one main variable at a time.

### Test A — Camera push

- A1: 2.5%
- A2: 3.5%

### Test B — Foreground depth

- B1: no rigging foreground
- B2: restrained rigging foreground

### Test C — Character life

- C1: breath + blink
- C2: breath + blink + tiny gaze shift

### Test D — Atmosphere

- D1: no mist
- D2: subtle mist

### Test E — Reflection

- E1: very low reflected-water light
- E2: moderate reflected-water light

Do not combine all B2/C2/D2/E2 automatically. The best result may be the quieter version.

## Asset Review Before Animation

Before Remotion work begins, inspect separated layers at 100% and final phone scale.

Reject layers with:

- halos around hair/robe;
- missing background reconstruction behind Enki;
- inconsistent face geometry;
- transparent holes;
- lighting mismatch between separated components;
- repeated/inpainted texture artifacts exposed by camera movement;
- insufficient overscan.

A clean layered still is a prerequisite for clean animation.

## Benchmark Render Set

Each serious candidate should generate:

- MP4 with captions and audio;
- visual-only MP4 or preview;
- frames near 10%, 50%, and 90%;
- contact sheet;
- manifest with scene/layer checksums;
- review scorecard;
- A/B decision note when applicable.

## Pass Criteria

Shot 3 passes when:

- there are no scorecard hard fails;
- composition, camera, character continuity, depth, and publication readiness are at least 4/5;
- overall average is at least 4.0;
- beginning/middle/end frames work as intentional stills;
- the scene is readable and attractive on a phone;
- motion feels authored rather than procedural;
- the viewer notices Enki and the voyage, not the animation technique;
- we would willingly post the benchmark clip by itself.

## What This Shot Is Proving

Shot 3 is not merely proving that Enki can blink.

It is proving that Sumer Reel Forge can take a strong illustrated frame, prepare it as a versioned layered scene, apply disciplined reusable motion, preserve character identity, integrate camera and environment behavior, and create a short cinematic result that feels more expensive than its underlying animation complexity.

Once that is true, the project has a style worth scaling.