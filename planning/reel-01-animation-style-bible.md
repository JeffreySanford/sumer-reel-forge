# Reel 1 Animation Style Bible

## Purpose

Use Reel 1, `The Voyage Begins`, as the animation-quality laboratory for Sumer Reel Forge. The goal is not to add more animation features quickly. The goal is to establish a repeatable cinematic illustrated style that is strong enough to become the minimum quality bar for the rest of Chapter 1.

Sprint 005 proved the Remotion pipeline technically. This document defines the art-direction and motion language needed to move from technical proof to publication-quality animation.

## Quality Target

The desired result should feel like an illustrated historical documentary with mythic realism rather than a flat cartoon, animated infographic, or generic AI-video clip.

The finished Reel 1 should feel:

- tactile rather than synthetic;
- cinematic rather than busy;
- ancient and materially grounded rather than generic fantasy;
- atmospheric rather than effects-heavy;
- restrained in character motion;
- deliberate in camera movement;
- visually coherent with the existing Blessings of Sumer visual bible;
- alive in motion even when individual frames remain painterly and composed.

The primary test is simple: a representative 8-12 second scene should be strong enough to publish as a teaser by itself.

## Visual Foundation

The approved Reel 1 editorial frames under `assets/blessings-of-sumer/chapter-01/reel-01/editorial-v1` are the starting visual source. The next animation iteration should use layered versions or derived layers from those frames rather than relying primarily on procedural SVG characters and environments.

The existing visual bible remains authoritative for:

- Enki identity and clothing;
- the Stag of the Absu;
- Nammu;
- Dilmun;
- southern Mesopotamian material culture;
- palette and cultural guardrails.

This animation bible adds motion, depth, camera, lighting, transition, and asset rules.

## Core Motion Principles

### 1. The camera moves more than the characters

Characters should feel heavy, grounded, and human. Most energy should come from camera movement, parallax, atmosphere, lighting, water, cloth, and foreground occlusion.

Character animation should usually be limited to:

- breathing;
- blinking;
- gaze changes;
- subtle head turns;
- restrained hand or pose changes;
- cloth response;
- posture settling.

Avoid constant limb movement or puppet-like motion.

### 2. Every shot has one primary motion

Each shot receives one dominant visual movement and only a small number of supporting motions.

Default motion budget for a 6-9 second shot:

- 1 primary camera or subject movement;
- 1 restrained subject motion;
- 2 environmental motion channels;
- 1 lighting or atmosphere channel.

Additional motion requires an explicit story reason.

### 3. Foreground motion sells depth

Foreground reeds, rigging, mist, boat structure, spray, shadows, or other occluders should move faster than distant scenery. Backgrounds should remain comparatively stable.

Preferred depth ordering:

1. distant sky or horizon;
2. distant land or architecture;
3. water or terrain plane;
4. boat, building, or major prop;
5. character;
6. near prop or rigging;
7. foreground occluder;
8. atmosphere or lighting overlay where appropriate.

### 4. Motion has inertia

Avoid linear start/stop movement.

Camera, cloth, boat, reeds, and environmental effects should use eased acceleration and settling. Motion should feel as though the scene has mass.

### 5. Stillness is intentional

Not every frame needs movement. The strongest mythic moments may have very little animation.

A shot may hold almost still while only water, haze, reflected light, or breath moves. Stillness should be used to create awe, gravity, tension, or contemplation.

### 6. Supernatural motion follows different rules

Human, vessel, cloth, and environmental movement should obey physical inertia.

Divine or primordial imagery may use:

- drifting without obvious force;
- refracted movement;
- soft emergence;
- light moving independently of the physical source;
- water behaving almost like memory;
- dissolves between form and environment.

Nammu should never move like a monster, mermaid, or conventional animated character.

### 7. Do not animate because a channel exists

Remotion capabilities are not the style. A motion channel is only used when it improves depth, attention, story meaning, or atmosphere.

## Camera Language

The default camera should feel observational and patient.

Preferred moves:

- slow dolly in;
- slow lateral track;
- restrained vertical reveal;
- subtle drift from a boat-mounted viewpoint;
- controlled pullback for scale;
- foreground reveal through natural occlusion.

Avoid by default:

- whip pans;
- rapid zooms;
- repeated push-pull movement;
- handheld shake unless story-motivated;
- large artificial orbiting moves;
- simultaneous zoom, pan, tilt, and rotation.

Typical camera scale change should usually remain within roughly 2-5 percent during a short shot. Larger changes require a deliberate reveal.

Camera easing should favor long ease-in/ease-out curves and avoid mechanical constant-rate movement.

## Character Motion Grammar

### Enki

Enki should communicate calm authority, curiosity, and responsibility rather than theatrical power.

Preferred actions:

- quiet breathing;
- one blink during a medium or close shot;
- slow gaze shift;
- slight head turn toward a horizon, sound, or supernatural presence;
- robe edge or hair responding to wind;
- one controlled hand gesture when narratively justified;
- subtle shift of weight on the vessel.

Avoid:

- repeated gesturing;
- exaggerated facial movement;
- idle head bobbing;
- constant mouth movement under third-person narration;
- heroic action poses.

### Background people

Background people should be simplified and low-frequency in motion. One or two actions are enough: carrying, tending water, passing bread, turning, walking slowly, or standing in conversation.

### Lip sync policy

Lip sync is not a priority for Reel 1 polish.

Use mouth animation only when a visible character is clearly speaking on camera. Narrated passages should normally use breathing, gaze, blink, posture, and environmental motion instead.

Rhubarb Lip Sync remains a future optional capability, not a Sprint 006 acceptance dependency.

## Environmental Motion Grammar

### Water

Water should provide continuous low-amplitude life without appearing like a repeating game texture.

Use combinations of:

- slow multi-plane drift;
- restrained highlight movement;
- reflected light;
- shoreline or hull interaction;
- localized ripple masks;
- occasional foreground spray.

### Reeds and vegetation

Use asynchronous sway. Foreground reeds may move more strongly than distant reeds. Avoid having every plant follow the same sine wave.

### Cloth and rigging

Cloth should lag behind body or boat movement. Rigging should respond subtly to vessel motion and wind.

### Mist, dust, smoke, and haze

Atmosphere should move slowly across depth planes, not simply fade in and out. Use it to create scale, hide transitions, separate foreground from background, and direct attention.

### Birds

Birds are optional accent motion for Dilmun reveals. They should remain small and sparse rather than becoming decorative loops.

## Lighting Language

Lighting should create depth and transition from dark water toward Dilmun warmth.

Preferred techniques:

- moving water reflections;
- subtle warm light sweeps;
- cool foreground / warm background separation;
- volumetric haze;
- soft edge light on Enki;
- passing shadow from rigging or foreground reeds;
- very restrained bloom around divine imagery.

Avoid broad screen-wide pulsing, glow-heavy fantasy effects, and lighting changes with no environmental cause.

## Texture Language

The goal is to prevent the result from feeling like clean SVG animation or sterile generated art.

Useful texture channels:

- restrained film grain;
- painted or watercolor surface variation;
- paper or plaster-like low-frequency texture;
- mist and atmospheric grain;
- imperfect edge transitions;
- water reflection breakup;
- small material variation in cloth, reed, timber, stone, and clay.

Texture should remain subtle enough that captions and faces stay readable.

## Transition Language

Prefer transitions motivated by visual material already present in the scene.

Examples:

- foreground reed crosses frame and reveals the next shot;
- mist thickens until it becomes the next environment;
- water fills the frame and resolves into another water surface;
- sail, rigging, or dark timber creates an occlusion wipe;
- sunlight blooms briefly into a warm Dilmun reveal;
- a reflected shape becomes a symbolic object in the next shot;
- matched lateral movement carries through a cut.

Generic crossfades are acceptable as fallback transitions but should not become the primary visual grammar.

## Caption And Title Rules

Narration remains primary. Captions should support comprehension without dominating the artwork.

- Preserve the lower-middle safe area.
- Avoid covering faces, hands, key symbolic objects, or the boat silhouette.
- Keep caption blocks visually stable while the environment moves behind them.
- Avoid decorative motion on every caption.
- Use a restrained fade or short positional settle only when needed.
- Final title treatment should have a deliberate compositional hold rather than appearing over a busy transition.

## Sound And Motion Relationship

Motion should occasionally respond to audio structure without becoming music-visualizer animation.

Possible synchronized cues:

- hull settle or water shift under a low drum accent;
- camera reveal aligned to a major narration clause;
- light rise as Dilmun is named or revealed;
- ambience change when moving from open water to land;
- restrained symbolic reveal on `Water. Bread. Truth. Justice. Freedom.`;
- final approach and title resolving with the score's final rise.

## Layered Asset Convention

The next animation pass should favor transparent PNG layers derived from approved illustrated frames. SVG remains useful for masks, procedural atmosphere, typography, and simple effects, but should not be the main character-art solution.

Recommended Reel 1 shot layout:

```text
assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/
  shot-01/
    background/
    midground/
    character/
    foreground/
    atmosphere/
    masks/
  shot-02/
  ...
  shot-08/
```

A character-bearing shot may contain:

```text
shot-03/
  background/
    sky.png
    coast.png
  midground/
    water-far.png
    boat.png
  character/
    enki-body.png
    enki-head.png
    enki-eyes-open.png
    enki-eyes-blink.png
    enki-robe-overlay.png
  foreground/
    rigging.png
    spray.png
  atmosphere/
    mist.png
    light-rays.png
  masks/
    water-reflection-mask.png
```

Rules:

- Do not overwrite `editorial-v1` source assets.
- Create versioned animation-specific derived assets.
- Preserve original aspect ratio and enough overscan for camera motion.
- Use transparent backgrounds where layers need independent motion.
- Record the source editorial frame for each derived layer.
- Checksums should be persisted in animation manifests once the asset pipeline is implemented.

## Data-Driven Scene Direction

The current full Reel 1 composition still contains significant hard-coded React/SVG scene logic. Reel 1 polish should also serve as the test case for making scene JSON more authoritative.

The target relationship is:

```text
Reel production data
        |
        v
Scene builder
        |
        v
Versioned scene JSON
        |
        v
Generic Remotion composition + input props
        |
        v
Rendered animation
```

A shot definition should eventually express concrete camera and layer behavior instead of only descriptive labels such as `slow dolly forward`.

Illustrative target:

```json
{
  "id": "enki-at-the-helm",
  "startFrame": 390,
  "durationFrames": 210,
  "camera": {
    "scaleFrom": 1.0,
    "scaleTo": 1.035,
    "xFrom": 0,
    "xTo": -18,
    "yFrom": 0,
    "yTo": -12,
    "easing": "cinematicSlow"
  },
  "layers": [
    { "asset": "background/sky.png", "depth": 0.05 },
    { "asset": "background/coast.png", "depth": 0.12 },
    { "asset": "midground/water-far.png", "depth": 0.2, "motion": "waterDrift" },
    { "asset": "midground/boat.png", "depth": 0.4, "motion": "boatBob" },
    { "asset": "character/enki-body.png", "depth": 0.55, "motion": "breathing" },
    { "asset": "character/enki-head.png", "depth": 0.58, "motion": "subtleHeadTurn" },
    { "asset": "foreground/rigging.png", "depth": 0.85, "motion": "riggingSway" }
  ]
}
```

The renderer should ultimately consume this data through Remotion input props rather than maintaining a separate hard-coded composition for each reel.

## Reel 1 Shot-By-Shot Motion Plan

### Shot 1 - Black Water Before Dawn

- Duration: about 6 seconds.
- Emotional purpose: mystery and scale.
- Primary movement: extremely slow camera push over black-blue water.
- Secondary movement: low mist drifting laterally; sparse water glints.
- Lighting: faint gold horizon slowly becoming visible.
- Transition idea: dark foreground water or mist resolves into the hull/water of Shot 2.
- Avoid: large waves, lightning, dramatic fantasy glow.

### Shot 2 - Stag Of The Absu Under Sail

- Duration: about 7 seconds.
- Emotional purpose: journey and practical expedition.
- Primary movement: vessel travels laterally while camera tracks more slowly.
- Secondary movement: boat bob; rigging/sail response; water separation at hull.
- Foreground: optional rigging or reed occlusion to establish depth.
- Lighting: dawn side light catching timber and cargo edges.
- Transition idea: rigging or sail crosses frame into Shot 3.

### Shot 3 - Enki At The Helm

- Duration: about 7 seconds.
- Emotional purpose: introduce Enki as calm, thoughtful, and purposeful.
- Primary movement: slow dolly toward Enki.
- Secondary movement: boat bob; restrained breathing; robe/hair wind response; one blink; one small gaze/head shift.
- Foreground: rigging or sail edge for parallax.
- Lighting: reflected water light and soft warm edge light.
- Transition idea: Enki looks or turns toward the water; camera follows into Shot 4.
- Benchmark status: primary Sprint 006 quality scene.

### Shot 4 - Nammu Beneath The Water

- Duration: about 8 seconds.
- Emotional purpose: awe, memory, origin.
- Primary movement: almost-still descent or slow drift into deep water.
- Secondary movement: suspended particles; refraction; faint light-form emergence.
- Nammu treatment: implied feminine presence formed from water and light; no literal mermaid anatomy required.
- Lighting: cool depth with restrained luminous contours.
- Transition idea: water refraction opens into the shrine spring of Shot 5.
- Avoid: horror motion, rapid apparition, glowing fantasy face.

### Shot 5 - Traveler Shrine Vision

- Duration: about 8 seconds.
- Emotional purpose: hospitality and social purpose.
- Primary movement: push through foreground toward spring, bread, and travelers.
- Secondary movement: cloth; steam/smoke; person passing bread or water.
- Lighting: warm practical light contrasted against remaining cool environmental tones.
- Transition idea: circular basin, bread, or bowl becomes first symbol in Shot 6.

### Shot 6 - Water, Bread, Truth, Justice, Freedom

- Duration: about 8 seconds.
- Emotional purpose: transform abstract ideals into practical civilization.
- Primary movement: controlled multi-plane symbolic reveal rather than rapid montage.
- Secondary movement: light crossing tablet/scales; water movement; subtle road depth.
- Composition: basin, bread, tablet, scales, and open road should feel tangible rather than iconographic.
- Transition idea: road perspective or light line leads into Dilmun horizon.

### Shot 7 - Dilmun Reveal

- Duration: about 9 seconds.
- Emotional purpose: discovery and abundance.
- Primary movement: slow vertical or foreground reveal exposing the luminous coast.
- Secondary movement: haze drift; sparse birds; distant reeds/palms.
- Lighting: warmest scene so far, but still naturalistic.
- Transition idea: match boat direction and horizon into final approach.

### Shot 8 - Approach To Dilmun / Title

- Duration: about 7 seconds.
- Emotional purpose: resolution and beginning rather than ending.
- Primary movement: Stag approaches land while camera gently pushes or holds.
- Secondary movement: boat bob; water; rigging; final warm light.
- Title: allow a calm compositional hold for the final words and series identity.
- Final beat: motion should settle rather than abruptly stop.

## Benchmark Scene: Shot 3

Shot 3, Enki at the helm, is the primary quality benchmark because it exercises the most important capabilities in one scene:

- character continuity;
- boat continuity;
- water;
- foreground parallax;
- breathing and blink;
- cloth or hair motion;
- atmosphere;
- lighting;
- restrained camera work.

### Benchmark acceptance criteria

The benchmark passes only when:

- the artwork reads as cinematic illustrated material rather than procedural vector art;
- Enki remains visually consistent with the project visual bible;
- the camera move feels intentional and physically plausible;
- at least four depth planes are perceptible without obvious layer sliding;
- character motion is subtle enough not to look puppeted;
- water and boat movement do not share identical timing;
- foreground motion improves depth rather than distracting from Enki;
- light and atmosphere add dimensionality without looking like overlays;
- a still frame from the middle of the shot could pass as approved editorial artwork;
- the full 8-12 second clip feels strong enough to publish as a teaser;
- the implementation can be represented largely through reusable scene data and motion primitives rather than one-off SVG drawing code.

## Review Rubric

Score each benchmark render from 1 to 5.

### Art continuity

- 1: inconsistent or generic.
- 3: recognizable but visibly compromised by animation treatment.
- 5: consistent with the approved visual bible and editorial frames.

### Depth

- 1: flat movement.
- 3: visible parallax but obvious layer separation.
- 5: convincing cinematic depth with natural occlusion.

### Motion restraint

- 1: busy, mechanical, or puppet-like.
- 3: mostly restrained with occasional artificial motion.
- 5: every motion appears intentional and story-motivated.

### Camera

- 1: arbitrary or mechanical.
- 3: functional.
- 5: deliberate cinematic framing and easing.

### Atmosphere and light

- 1: decorative overlay.
- 3: improves the image.
- 5: materially contributes to depth, mood, and attention.

### Character life

- 1: static cutout or over-animated puppet.
- 3: credible with minor artifacts.
- 5: subtle, grounded, and believable for illustrated animation.

### Publishability

- 1: technical proof only.
- 3: acceptable internal review material.
- 5: strong enough to publish as a standalone teaser.

Sprint 006 should target no category below 4 and publishability 5 before propagating the style to all eight Reel 1 shots.

## Definition Of Done For Reel 1 Animation Style

The Reel 1 animation style is considered established when:

- Shot 3 passes the benchmark rubric;
- a second contrasting scene, preferably Shot 4 or Shot 7, proves the style works beyond one character shot;
- the asset folder convention is in use;
- layered editorial artwork replaces procedural SVG as the principal visual source for benchmark scenes;
- reusable camera, parallax, atmosphere, lighting, and character-motion primitives exist;
- scene JSON drives the benchmark composition through input data rather than duplicating the scene in hard-coded React;
- review artifacts include sampled stills and a motion-quality report;
- the complete Reel 1 can be rebuilt using the approved style without inventing a different animation language per shot;
- final publication remains a human approval decision.

## Explicit Non-Goals During Style Polish

Do not expand into the following until the benchmark style is approved:

- Reel 2 animation production;
- Chapter 2 production;
- generalized skeletal rigging;
- full facial animation;
- mandatory Rhubarb lip sync;
- large WebGL or custom animation-engine work;
- adding motion merely to increase technical complexity.

The priority is quality, coherence, and repeatability.