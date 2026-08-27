# Shot 3 Level 2 Rendered Acceptance - Rejected

## Current Proof

- Proof directory: `tmp/animation-previews/shot03-level2-proof/2026-08-25T14-48-31-261Z`
- A/B video: `tmp/animation-previews/shot03-level2-proof/2026-08-25T14-48-31-261Z/shot03-level1-vs-level2-ab.mp4`
- Proof report: `tmp/animation-previews/shot03-level2-proof/2026-08-25T14-48-31-261Z/shot03-level2-rendered-proof.json`
- A/B checksum: `sha256:163b10058eee3f8eef4c546e40d98882d72c18c08170fd8e80ad932ceca2e45d`

## Review Result

Rejected on human visual review. The Level 2 side should visibly blink during
the blink window, but the normal-speed A/B does not show a readable blink.

Follow-up pixel inspection found that the current closed-eye state contributes
only a tiny, non-readable rendered delta:

- opaque pixels in `shot03-enki-eyes-v1`: `55`;
- active rendered blink peak changed-pixel ratio: `0.00002797067901234568`;
- effective rendered difference: about `53` pixels in a `1080x1920` frame;
- visual finding: the changed pixels do not read as Enki blinking.

Do not create an accepted receipt for this proof.

## Original Deterministic Result

- Vessel contribution: PASS, `5/5` review beats.
- Rigging contribution: PASS, `5/5` review beats.
- Blink persistence: PASS, maximum active run `8` frames.
- Blink return: PASS, clean open-eye return.
- Blink readability: REJECTED by human review; the automated proof threshold was
  too weak and has been tightened.

## Human Review Required

The active Level 2 milestone remains red until a reviewer watches the A/B video at normal speed and records an accepted receipt at:

```text
planning/acceptance/shot03-level2-rendered-acceptance.json
```

The accepted receipt must record:

- `decision: "accepted"`;
- the rendered-motion proof type and deterministic pass;
- normal-speed A/B review;
- preference for Level 2 over Level 1;
- at least three meaningful motion improvements;
- no compensating loss of source fidelity, dignity, material realism, or composition.

If any of those conditions are not true, keep this milestone red and create a revision note instead of an acceptance receipt.
