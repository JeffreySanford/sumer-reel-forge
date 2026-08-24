# Shot 3 Level 2 Execution Loop

## Current state

Shot 3 Level 1 is structurally healthy but intentionally fails the active Level 2 Living Shot milestone gate.

Current gate evidence:

- non-camera motion channels: 5;
- distinct motion families: 4;
- independent vessel motion: present;
- visible character articulation beyond breathing: missing;
- secondary lag/inertia: missing.

The active gate must remain red until the canonical approved Shot 3 genuinely gains the missing motion classes. Do not lower the threshold or mark planned layers approved merely to satisfy the test.

## First Level 2 slice — rigging

Rigging is the first safe addition because `shot03-rigging-v1` is already declared as a planned source-derived foreground layer with `riggingTension`, and the production-lane registry already maps foreground alpha overlays to source-preserving SAM3 extraction plus structural QA.

Run:

```bash
node tools/scripts/shot03-level2-rigging.mjs preflight &&
node tools/scripts/shot03-level2-rigging.mjs generate &&
node tools/scripts/shot03-level2-rigging.mjs verify &&
node tools/scripts/shot03-level2-rigging.mjs preview
```

The preview path uses the approved canonical Shot 3 required layers as the baseline, verifies their stored SHA-256 checksums, and temporarily stages only the QA-passed rigging candidate. It writes under `tmp/animation-previews/shot03-level2-preview/` and does not modify or promote canonical animation assets.

Human review should confirm:

- rigging selection corresponds to existing source-supported rigging rather than unrelated foreground detail;
- no rigging crosses or obscures Enki's face;
- caption-safe regions remain usable;
- rigging movement visibly follows vessel motion with delayed tension/lag rather than moving as an unrelated sine loop;
- the vessel still reads as heavy and physically coherent;
- the added motion makes the shot more alive without making it busier or theatrical.

Rigging must not be promoted until both structure and assembled-motion review are satisfactory.

## Second Level 2 slice — Enki articulation

After rigging is visually accepted, add the character-state production lane needed for `shot03-enki-eyes-v1`.

Do not send the blink state through ordinary semantic extraction. A blink requires a minimal source-preserving character-state edit/inpaint operation with stronger identity checks than an ordinary foreground mask.

Required properties:

- only the eye-state region changes;
- surrounding face, beard, skin tone, lighting, pose, and registration remain stable;
- blink persists across multiple frames and returns cleanly to the open-eye source;
- no one-frame pop;
- no beautification, face redraw, gaze invention, or expression change;
- human identity review remains mandatory.

Once a reviewed blink candidate can be staged alongside rigging, render the same seven-second Level 2 audition with both optional layers.

## Gate behavior

Expected progression:

1. **Current Level 1** — milestone gate fails for missing articulation and secondary lag/inertia.
2. **Rigging candidate audition** — canonical gate remains red because candidates are not approved production assets.
3. **Rigging promoted after human approval** — gate should still fail for missing character articulation.
4. **Blink candidate audition** — canonical gate remains red until human approval/promotion.
5. **Rigging + blink promoted** — declarative Level 2 gate may turn green if all required conditions are genuinely active.
6. **Rendered perceptual gate** — must then prove that the declared motion is visible and useful at normal playback speed.

Passing the declarative gate is necessary but not sufficient for Level 2 approval.

## Next QA milestone

After the first human-approved Level 2 Shot 3 candidate exists, add rendered-motion evidence that distinguishes camera motion from subject/material motion and verifies:

- vessel movement after camera compensation;
- measurable rigging response delayed from vessel motion;
- blink state persistence and clean return;
- independent water/material motion;
- face and source registration stability;
- no alpha-edge excursions or one-frame state pops.

The Level 2 Shot 3 benchmark is complete only when a normal-speed A/B review clearly prefers the Level 2 treatment over Level 1 without a compensating loss of source fidelity or physical credibility.
