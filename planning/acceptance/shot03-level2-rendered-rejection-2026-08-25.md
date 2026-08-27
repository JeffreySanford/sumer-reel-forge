# Shot 3 Level 2 Rendered Rejection - 2026-08-25

## Reviewed Proof

- Proof directory: `tmp/animation-previews/shot03-level2-proof/2026-08-25T14-48-31-261Z`
- A/B video: `tmp/animation-previews/shot03-level2-proof/2026-08-25T14-48-31-261Z/shot03-level1-vs-level2-ab.mp4`
- Proof report: `tmp/animation-previews/shot03-level2-proof/2026-08-25T14-48-31-261Z/shot03-level2-rendered-proof.json`
- A/B checksum: `sha256:163b10058eee3f8eef4c546e40d98882d72c18c08170fd8e80ad932ceca2e45d`

## Decision

Rejected.

The right-hand Level 2 render should show Enki blinking, but the blink does not
read at normal speed. The motion is therefore not acceptable even though the
previous deterministic proof reported blink persistence and clean return.

## Evidence

- Current closed-eye state layer: `assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/shot-03/character/enki-eyes-closed.png`
- Opaque pixels in the state layer: `55`
- Active rendered blink peak changed-pixel ratio: `0.00002797067901234568`
- Effective rendered difference at the peak frame: about `53` pixels in a `1080x1920` frame
- Visual diagnosis: the delta is too small and does not read as closed eyelids over Enki's visible eyes.

## Required Fix

Regenerate or replace `shot03-enki-eyes-v1` with a source-faithful, localized
closed-eye state that is visibly readable during the blink window and still
returns cleanly to the open-eye baseline.

The revised proof must pass the tightened readable-blink gate and then receive
normal-speed A/B human acceptance before Shot 3 can advance.
