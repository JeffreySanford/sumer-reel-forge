# Lighting, Color and Material Direction

Status: **planning/art-direction contract**

Level 2/3 introduces multiple render systems that can easily drift visually: Rive raster rigs, Pixi materials, Three/R3F worlds, Remotion compositing and occasional generative bakes. This document defines a shared visual-language contract so technical integration does not fragment the look.

## 1. Core principle

The approved editorial artwork remains the visual anchor.

New rendering technology should **extend the painting**, not replace it with a generic real-time 3D aesthetic.

## 2. Visual hierarchy

```text
editorial source palette/brush/material language
  ↓
approved character/world design
  ↓
runtime-specific representation
  ↓
lighting/material effects
```

Runtime defaults are never art direction.

## 3. Painterly preservation

Avoid by default:

- glossy PBR everywhere;
- ultra-sharp procedural textures inconsistent with source;
- synthetic neon bloom unless mythically intentional;
- overly clean 3D edges;
- physically perfect reflections that clash with painted environment;
- generative texture drift across frames.

Use shaders/lighting to reinforce the source’s softness, value grouping and material suggestion.

## 4. Color authority

Color authority order:

1. approved editorial/source art;
2. approved art-direction palette for world/character;
3. evidence-informed material color where relevant;
4. shot lighting transformation;
5. runtime display adjustments.

Do not infer original ancient color simply from an artifact’s current museum appearance.

## 5. Palette profiles

World/scene may reference reusable palette profiles:

```text
palette:gulf-calm:v1
palette:dilmun-luminous:v1
palette:kutu-storm:v1
palette:underworld:v1
palette:eridu-water:v1
palette:nippur-formal:v1
palette:uruk-urban:v1
```

A palette profile contains relationships/ranges rather than forcing every pixel to exact colors.

## 6. Lighting semantic roles

```text
NATURAL_DAY
DAWN_DUSK
INTERIOR_FIRE
INTERIOR_DIFFUSE
STORM
UNDERWATER
UNDERWORLD
DIVINE_ACCENT
VISION_MEMORY
```

The role is Scene V3/art-direction metadata; Three/Pixi/Remotion implement it appropriately.

## 7. Natural daylight

Default goals:

- readable faces/actions;
- broad value grouping;
- restrained specular response;
- atmosphere/depth without photoreal mismatch;
- sun direction consistent across layered/spatial elements.

## 8. Water scenes

Water should integrate source colors rather than become a separate photoreal simulation.

Possible layers:

- base painted water;
- mesh/displacement motion;
- controlled highlight/reflection modulation;
- wake/interaction;
- atmospheric tint.

Reflections need not be physically exact if painterly coherence is stronger.

## 9. Underwater/Nammu

Underwater language can use:

- depth-dependent value/color shift;
- softened contrast;
- particulate drift;
- caustic/refraction suggestion;
- slower environmental motion;
- selective divine clarity for Nammu.

Avoid universal blue filter that destroys skin/material identity.

## 10. Storm/Kutu

Storm should alter:

```text
value range
sky/water contrast
wind/material direction
visibility
highlight timing
impact flashes if any
```

Lightning/hail illumination must respect motion-safety rules; no repeated full-frame strobe as spectacle.

## 11. Underworld/Ereshkigal

Default hypothesis:

- reduced environmental motion;
- heavy values;
- controlled warm/cool contrast depending final art direction;
- limited bright accents;
- spatial depth through fog/occlusion rather than generic horror darkness.

This is project interpretation, not ancient-source fact.

## 12. Divine light

Divine presence is not one shared glow preset.

Potential differentiated languages:

- Enki: water/reflected luminosity;
- Enlil: air/height/clear directional authority;
- Utu: solar intensity and measured clarity;
- Inanna: high-contrast brilliance/ornamental power;
- Ninhursag: earth/vegetation/material warmth;
- Ereshkigal: negative space, controlled low-light authority.

These are artistic direction hypotheses and remain reviewable.

## 13. Material vocabulary

Reusable semantic materials:

```text
mudbrick
reed
wood
woven textile
stone
copper/bronze-context
silver
gold
lapis/shell-inlay
water
clay
bitumen
vegetation
```

Material definition should include evidence/period note where prominently historical.

## 14. Inlay/high-status material context

Early Dynastic objects such as the Standard/Game of Ur demonstrate visually rich shell/stone/inlay traditions in elite contexts. Use this as evidence for possible high-status material vocabulary, not as license to cover every palace/temple surface with Royal Cemetery motifs.

## 15. Runtime material ownership

```text
Rive    local raster/character deformation and authored shading inside rig
Pixi    2D surface/material deformation and local shader effects
Three   spatial lighting, depth, fog, world materials/geometry
Remotion final compositing/color-safe assembly
```

A character should not receive conflicting lighting transforms independently from three runtimes without a declared integration rule.

## 16. Lighting integration strategy

For hybrid shots, establish a scene-level lighting descriptor:

```ts
interface LightingIntent {
  role: LightingRole;
  keyDirection?: Vec3;
  keyStrength: number;
  ambientStrength: number;
  atmosphere: number;
  paletteProfileId: string;
  divineAccentIds?: string[];
}
```

Runtime adapters translate this into local implementation while proof frames confirm visual consistency.

## 17. Character relighting limits

Do not aggressively relight flattened painted character art beyond what source segmentation/depth supports.

Prefer:

- subtle value/color modulation;
- rim/accent layers;
- ambient integration;
- local approved rig shading.

Avoid fake 3D normals invented from one portrait unless explicitly approved as reconstruction.

## 18. Fog/atmosphere

Atmosphere is Level 3 depth glue:

- distance separation;
- dust;
- marsh humidity;
- storm visibility;
- underworld depth;
- city-scale haze.

It must not wash out captions/faces or become the universal “cinematic” effect.

## 19. Texture/detail LOD

Detail density follows screen relevance:

```text
hero face/hands      high
hero costume         high/medium
foreground props     medium/high
mid architecture     medium
far city/crowd       low/instanced
```

Higher resolution is not automatically higher fidelity if it introduces a different visual language.

## 20. Color consistency testing

Deterministic checks can detect gross failures:

- unexpected alpha/color-space change;
- debug cyan/magenta leak;
- extreme mean luminance shift;
- clipped highlight/shadow area;
- asset color-profile mismatch if metadata available.

Do not turn art direction into one brittle average-RGB threshold.

## 21. Storybook art-direction stories

```text
Look/Palette/GulfCalm
Look/Palette/KutuStorm
Look/Lighting/NaturalDay
Look/Lighting/Underwater
Look/Lighting/Underworld
Look/Lighting/DivineAccent
Look/Materials/Reed
Look/Materials/Mudbrick
Look/Materials/InlayContext
Look/Hybrid/RivePixiThreeIntegration
```

Use approved fixture art, not only synthetic colored boxes, for visual acceptance.

## 22. Visual regression

Goldens focus on:

- consistent hero skin/costume values;
- source color preservation;
- world/actor integration;
- no renderer-specific color shift;
- fog/lighting state;
- no debug/material fallback colors.

## 23. Failure fixtures

- missing texture produces hot-pink/debug material → must block production;
- wrong color space/gamma;
- actor brightness grossly inconsistent with environment;
- Three default material replaces painterly texture;
- missing shader falls back to visible debug state;
- overexposure erases facial features;
- lighting runtime version changes proof output unexpectedly.

## 24. E2E

Studio reviewer can:

- switch lighting intent/palette candidate;
- inspect evidence notes;
- compare source vs lit result;
- toggle runtime layers;
- inspect color/artifact QA;
- verify stale visual proof after material revision;
- approve/reject look candidate.

## 25. Accessibility

Art can remain atmospheric; UI/captions must remain independently readable.

Do not modify canonical artwork solely to fix Studio control contrast. Use accessible UI overlays/backplates.

Final reels should also maintain caption readability across lighting states.

## 26. Historical evidence relationship

Material/color records distinguish:

```text
archaeologically attested material
near-period visual analogue
reconstructed color
project palette choice
mythic symbolic exaggeration
```

## 27. Human look-development gate

Ask:

- Does this still look like the source/project?
- Does the new runtime call attention to itself?
- Are materials plausible without becoming pseudo-documentary?
- Is divine lighting distinctive rather than generic VFX?
- Do characters and environment inhabit the same lighting world?
- Does the frame remain readable on a phone?

## 28. Local-first testing

Look/runtime change:

```text
unit material/lighting contracts
lint/build
Storybook art-direction stories
fixed-frame visual regression
short rendered integration proof
applicable E2E
human look review
  ↓
push
  ↓
GitHub deterministic/browser checks
```

## 29. Definition of visual-style success

The style system succeeds when a Rive hero, Pixi water and Three city can share a frame without looking like three software packages layered together, while historical evidence remains distinguishable from deliberate art-direction invention.
