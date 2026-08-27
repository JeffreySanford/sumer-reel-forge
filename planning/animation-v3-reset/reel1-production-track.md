# Reel 1 production track

Use this guide when the goal is to advance Reel 1 rather than continue actor-articulation R&D.

## Shot 3 authority

Current motion baseline: **counter-sway/body-settle accepted**.

Do not reopen by default:

- blink;
- Shot 3 water extraction;
- Shot 3 rigging extraction;
- whole-cutout breathe-calm.

## Review evidence

```sh
pnpm animation:shot3:motion-decision-packet
pnpm animation:shot3:motion-review-montage
```

The decision packet and montage are review/evidence tools only. Breathing is shown, when present, as a rejected reference.

## Reel readiness

```sh
node tools/scripts/animation-reel-readiness.mjs
```

Work the next shot whose **required** manifest layers are not approved. Optional/planned layers and actor-articulation experiments remain visible but do not become blockers automatically.

## Separate R&D lane

```sh
node tools/scripts/shot03-enki-semantic-discovery-grouped-auto.mjs
```

Run this only when intentionally working actor articulation. Semantic success may unlock future face/body/hand capabilities; semantic failure does not invalidate the accepted Shot 3 baseline.
