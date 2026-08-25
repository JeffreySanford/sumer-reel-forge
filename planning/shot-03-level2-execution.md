# Shot 3 Level 2 Execution Loop

## Current state

Shot 3 Level 1 is structurally healthy but intentionally fails the active Level 2 Living Shot milestone gate.

Current canonical gate evidence:

- non-camera motion channels: 5;
- distinct motion families: 4;
- independent vessel motion: present;
- visible character articulation beyond breathing: missing from the canonical approved asset set;
- secondary lag/inertia: missing from the canonical approved asset set.

The active gate must remain red until the canonical approved Shot 3 genuinely gains the missing motion classes. Do not lower the threshold or mark planned layers approved merely to satisfy the test.

## 2026-08-24 rigging checkpoint — implementation validated

The first Level 2 rigging candidate was generated and structurally verified locally:

- candidate dimensions: `941x1672`;
- hard alpha coverage: `0.392%`;
- source RGB under selected alpha: mean diff `0.0000`, changed `0.0000%`;
- structure QA: `PASS`;
- coverage advisory: `WITHIN_PREFERRED_RANGE`;
- canonical manifest/assets remained unchanged;
- candidate preview rendered successfully through the real Scene V2 renderer.

The original `riggingTension` renderer was found to be an independent oscillator rather than a true vessel-driven secondary response. Level 2 now rejects that behavior explicitly.

A shared deterministic motion model defines `heavyPhysical` as the vessel driver and makes `riggingTension` sample that same driver with a `0.24s` delay. The rigging response inherits vessel heave/roll and adds bounded lag/follow-through. A numerical causality regression verifies the shared driver, real delay, measurable secondary contribution, and restrained bounds.

Local validation on 2026-08-24 confirmed:

- `Level 2 rigging response numerically lags the shared heavyPhysical vessel driver` — PASS;
- `ACTIVE LEVEL 2 RIGGING GATE: renderer uses the vessel-driven delayed rigging response and no legacy oscillator` — PASS;
- focused renderer state: `94/95` with only the overall canonical Level 2 milestone intentionally red;
- compact Level 2 loop: candidate audition PASS, rigging causality PASS, rigging preview PASS.

The rigging asset remains **unpromoted pending human normal-speed visual approval**.

## First Level 2 slice — rigging

Rigging is the first safe addition because `shot03-rigging-v1` is already declared as a planned source-derived foreground layer with `riggingTension`, and the foreground production lane maps it to source-preserving SAM3 extraction plus structural QA.

Run the full production lane only when a new asset candidate is needed:

```bash
node tools/scripts/shot03-level2-rigging.mjs preflight &&
node tools/scripts/shot03-level2-rigging.mjs generate &&
node tools/scripts/shot03-level2-rigging.mjs verify &&
node tools/scripts/shot03-level2-rigging.mjs preview
```

After renderer-only motion changes, reuse the latest QA-passed candidate and rerender only the audition:

```bash
node tools/scripts/shot03-level2-rigging.mjs preview
```

Human review should confirm:

- rigging selection corresponds to existing source-supported rigging rather than unrelated foreground detail;
- no rigging crosses or obscures Enki's face;
- caption-safe regions remain usable;
- rigging visibly follows vessel motion with delayed tension/lag;
- the vessel still reads as heavy and physically coherent;
- the added motion makes the shot more alive without making it theatrical.

Rigging must not be promoted until both structure and assembled-motion review are satisfactory.

## Second Level 2 slice — Enki articulation

The character-state production lane for `shot03-enki-eyes-v1` is now implemented and awaiting local candidate generation.

The lane deliberately does **not** send the blink state through ordinary semantic extraction. Its production flow is:

1. use the approved checksum-backed `shot03-enki-body-v1` as the identity/localization anchor;
2. use SAM3 only to locate both eye/eyelid regions;
3. deterministically reject localization that is empty, too broad, outside Enki alpha, below the expected upper-face band, or too tall relative to the character;
4. crop the immutable editorial source around that tiny validated region;
5. run low-denoise (`0.42`) masked inpainting asking only for naturally closed eyelids;
6. return a full-canvas transparent character-state layer containing only the generated eye-state pixels;
7. run identity-delta QA requiring bounded alpha coverage, containment inside Enki, upper-face registration, a nontrivial visible change, and bounded RGB difference;
8. require human identity review before any promotion.

Hard invariants:

- only the eye-state region may contribute pixels;
- surrounding face, beard, skin tone, lighting, pose, expression and registration remain owned by the approved baseline;
- no beautification, gaze invention, expression change, face redraw or whole-face regeneration;
- automatic promotion is forbidden;
- the canonical animation manifest remains unchanged during generation/audition.

The renderer already activates `blinkOnce` only when the character-state asset is staged/approved for the audition. The blink window remains the existing Scene V2 interval (`0.46`–`0.51` progress), so the state persists for multiple frames and returns to the open-eye baseline.

## Compact development loop

Use the focused loop for normal Level 2 iteration instead of all renderer tests:

```bash
node tools/scripts/shot03-level2-dev-loop.mjs
```

It runs only the candidate-audition, rigging-causality, character-state-lane and active Living Shot milestone checks. The known milestone red is non-blocking, so the preview still renders.

For the first blink candidate, use one command:

```bash
node tools/scripts/shot03-level2-dev-loop.mjs --build-blink
```

That command captures the verbose production output, performs SAM localization, blink generation, identity QA and the combined rigging+blink audition, then prints only a compact summary. If a QA-passed blink candidate already exists, the ordinary dev loop automatically switches from a rigging-only preview to a combined `rigging+blink` preview.

The machine-readable status remains:

```text
tmp/animation-previews/shot03-level2-status.json
```

Full `pnpm renderer:test` and `pnpm quality` are milestone/release gates rather than the inner visual-development loop.

## Gate behavior

Expected progression:

1. **Current canonical Level 1** — milestone gate fails for missing articulation and secondary lag/inertia.
2. **Rigging candidate audition** — canonical gate remains red because candidates are not approved production assets.
3. **Blink candidate audition** — canonical gate remains red because candidates are not approved production assets.
4. **Human A/B review** — reject either candidate if motion/identity does not visibly improve the shot.
5. **Rigging + blink promoted after human approval** — declarative Level 2 gate may turn green if all required conditions are genuinely active.
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
