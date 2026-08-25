# Animation V3 Reset — Planning Index

Status: **planning only — no implementation begins until these contracts are accepted together**.

This directory captures the architectural reset for Sumer Reel Forge after the Reel 1 Level 2 Shot 3 blink investigation demonstrated that the repository had begun re-implementing character-animation primitives one PNG state at a time.

The reset preserves what already works well:

- immutable editorial source as narrative authority;
- candidate-only generation under `tmp/`;
- checksum/provenance binding;
- deterministic frame evaluation;
- explicit promotion;
- independent structural and semantic QA;
- normal-speed human review as the final visual gate.

It changes the animation architecture underneath those rules.

## Core vision

Sumer Reel Forge V3 is a **deterministic historical-fiction animation platform**, not a collection of bespoke Remotion shot scripts.

The three manuscript chapters establish three complementary requirements:

- **Chapter 1 — Enki:** cinematic/environmental animation — water, boats, canals, storms, vegetation, temples, travel, mythic spaces.
- **Chapter 2 — Enlil:** acting/performance animation — councils, dialogue, private conversation, emotional reaction, ceremony, processions, herds.
- **Chapter 3 — The Cities:** persistent-world/civilization animation — cities, agriculture, construction, trades, crowds, animals, waterways, long time spans.

The literary/mythological source layer is anchored to the Oxford **Electronic Text Corpus of Sumerian Literature (ETCSL)** where applicable. The manuscripts remain historical fiction: connective narrative, characterization, chronology, staging, dialogue, and visual interpretation may evolve, but changes must not erase the source relationship that inspired them.

## Planning documents

1. [`narrative-source-map.md`](./narrative-source-map.md)
   - manuscript → ETCSL mapping;
   - source hierarchy;
   - historical-fiction adaptation policy;
   - visual/archaeological provenance model;
   - source-confidence rules.

2. [`level-2-specification.md`](./level-2-specification.md)
   - formal definition of Level 2 — Living Illustration;
   - Rive/Pixi responsibilities;
   - performance clips;
   - material deformation;
   - Level 2 test and exit gates.

3. [`level-3-architecture.md`](./level-3-architecture.md)
   - formal definition of Level 3 — Spatial Performance;
   - Scene V3 and `FrameContext`;
   - runtime-adapter architecture;
   - Three/R3F, Rapier, Spine, CityKit, crowds, montage, generative adapters;
   - repository/package boundaries.

4. [`testing-provenance-roadmap.md`](./testing-provenance-roadmap.md)
   - unit, Storybook, visual, motion-proof, E2E and human-review strategy;
   - historical-source tests;
   - CI tiers;
   - ten platform benchmark scenes;
   - phased implementation plan and migration rules.

## External authorities and technology references

### Literary / historical source authority

- Oxford ETCSL catalogue: https://etcsl.orinst.ox.ac.uk/edition2/etcslfullcat.php
- ETCSL narrative/mythological catalogue: https://etcsl.orinst.ox.ac.uk/cgi-bin/etcsl.cgi?text=c.1%2A

### Planned animation/runtime technologies

- Rive runtimes: https://rive.app/runtimes
- Rive meshes: https://www.rive.app/blog/intro-to-meshes
- PixiJS v8 Mesh: https://pixijs.com/8.x/guides/components/scene-objects/mesh
- PixiJS filters/displacement: https://pixijs.com/8.x/guides/components/filters
- `@remotion/three`: https://www.npmjs.com/package/@remotion/three
- React Three Fiber: https://r3f.docs.pmnd.rs/
- Rapier determinism: https://rapier.rs/docs/user_guides/javascript/determinism/
- Storybook Angular/Vite: https://storybook.js.org/docs/get-started/frameworks/angular-vite
- Storybook Vitest addon: https://storybook.js.org/docs/writing-tests/integrations/vitest-addon/index
- Playwright visual comparisons: https://playwright.dev/docs/test-snapshots
- Playwright traces: https://playwright.dev/docs/trace-viewer-intro
- Theatre.js: https://www.theatrejs.com/docs/latest/getting-started/with-react-three-fiber
- Spine Pixi runtime: https://esotericsoftware.com/spine-pixi

## Architectural non-negotiables

1. **The manuscript owns narrative intent.**
2. **ETCSL or another named ancient source owns myth/literary provenance where applicable.**
3. **Museum/archaeological evidence informs material and visual reconstruction; it does not silently become narrative fact.**
4. **Scene V3 owns production timing.** No child runtime owns the story clock.
5. **Remotion remains render authority.**
6. **Production animation is frame-driven, seeded, and reproducible.**
7. **AI produces candidates and critique, never automatic promotion.**
8. **Physics uses fixed steps and approved/baked results.**
9. **No visual reconstruction is presented as ETCSL fact.**
10. **No engine may grade its own output as the only acceptance mechanism.**
11. **Storybook states and rendered motion proofs are first-class animation tests.**
12. **Human visual review remains mandatory for production promotion.**

## Reset rule

Do not resume broad Reel 1 Level 2 production until the foundation benchmarks in `testing-provenance-roadmap.md` are green. Existing Reel 1 Scene V2 work remains valid evidence and can later migrate through a Scene V2 → Scene V3 compatibility adapter.
