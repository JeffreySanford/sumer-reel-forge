# Reel 1 consolidation — 2026-08-27

This checkpoint records the change from Shot-3-centric experimentation to reusable Reel 1 production infrastructure.

## Production baseline

Shot 3 current accepted motion baseline:

```text
recovered repaired background
+ recovered vessel
+ recovered Enki
+ cinematic camera
+ vessel heave/roll
+ Enki nested counter-sway/body-settle
```

Historical references and rejected/deferred channels:

- primary recovered motion — accepted earlier reference;
- breathe-calm — rejected reference; human preferred counter-sway;
- blink — rejected/deferred;
- Shot 3 water extraction — rejected/deferred;
- Shot 3 rigging extraction — rejected/deferred.

## Reusable review tooling

Tracked review-set data:

`tools/animation/review-sets/shot03-recovered-motion.review-set.json`

Generic tools:

- `tools/scripts/animation-candidate-review-packet.mjs`
- `tools/scripts/animation-candidate-review-montage.mjs`
- `tools/animation/src/animation-review-set.mjs`

Compatibility commands remain:

```sh
pnpm animation:shot3:motion-decision-packet
pnpm animation:shot3:motion-review-montage
```

The tools never promote automatically and never make a rejected reference selectable.

## Reel readiness

Generic required-layer readiness evaluator:

- `tools/animation/src/reel-animation-readiness.mjs`
- `tools/scripts/animation-reel-readiness.mjs`

Run:

```sh
node tools/scripts/animation-reel-readiness.mjs
```

Required production layers are separated from optional/planned layers. Accepted motion baselines are tracked independently from semantic/articulation R&D.

## Actor-articulation R&D

Semantic group definitions are now actor data rather than hard-coded Enki hook logic:

- `tools/animation/actors/enki-semantic-groups-v1.json`
- `tools/animation/src/actor-semantic-group-definition.mjs`
- `tools/scripts/actor-semantic-grouped-vision-hook.mjs`

`tools/scripts/enki-semantic-grouped-vision-hook.mjs` is retained as a compatibility adapter.

Hands/contact remains capability-specific and optional for core face/torso structural progress. Semantic discovery remains localization-only R&D and does not block the accepted Shot 3 motion baseline.

## Next local verification

```sh
node --test \
  tools/renderer/animation-review-set.test.mjs \
  tools/renderer/animation-review-command-wiring.test.mjs \
  tools/renderer/reel-animation-readiness.test.mjs \
  tools/renderer/enki-semantic-discovery-grouped-auto.test.mjs \
  tools/renderer/actor-semantic-geometry.test.mjs \
  tools/renderer/actor-semantic-vision-proxy.test.mjs

pnpm animation:shot3:motion-decision-packet -- --no-open
pnpm animation:shot3:motion-review-montage -- --no-open
node tools/scripts/animation-reel-readiness.mjs
```

The grouped semantic model run is optional R&D and should be run separately after the deterministic consolidation gate is green.
