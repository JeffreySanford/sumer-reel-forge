# Shot 3 Level 2 Execution Loop

## Current state

Shot 3 Level 1 is structurally healthy. Shot 3 now has promoted Level 2 rigging and blink-state layers, so the declarative motion-channel requirements are satisfied, but the active Level 2 Living Shot milestone still intentionally fails. The latest rendered A/B proof was rejected because the blink does not read on screen.

Current canonical gate evidence:

- non-camera motion channels: 7;
- distinct motion families: 6;
- independent vessel motion: present;
- visible character articulation beyond breathing: rejected; the current approved `blinkOnce` state is present numerically but not readable on screen;
- secondary lag/inertia: present through approved vessel-driven `riggingTension`;
- final rendered/human acceptance: still missing.

The active gate must remain red until the approved rendered proof and normal-speed Level 1 / Level 2 A/B review show that the motion is actually better on screen. Do not lower the threshold, accept only declarative manifest evidence, or treat promoted layers as sufficient by themselves.

## 2026-08-25 acceptance checkpoint — declarative gate green, milestone still red

The rigging and blink layers were human-promoted into the canonical `animation-v1` manifest. The focused Level 2 loop now reports the candidate, rigging causality, character-state lane, and localization checks as passing, while the milestone remains **known red** for the correct reason:

```text
[KNOWN RED] milestone: rendered Level 1 / Level 2 A/B human acceptance before Shot 3 is considered complete
```

This is intentional. The current task is no longer to prove that Shot 3 can declare Level 2 motion channels. The current task is to prove that those channels are visibly effective in the rendered shot and preferred by human review.

## 2026-08-25 rendered proof checkpoint — rejected blink readability

The rendered proof bundle was refreshed at:

```text
tmp/animation-previews/shot03-level2-proof/2026-08-25T14-48-31-261Z
```

Key artifacts:

- A/B video: `shot03-level1-vs-level2-ab.mp4`;
- proof report: `shot03-level2-rendered-proof.json`;
- A/B checksum: `sha256:163b10058eee3f8eef4c546e40d98882d72c18c08170fd8e80ad932ceca2e45d`.

Original deterministic rendered evidence reported:

- vessel contribution: `5/5` review beats;
- rigging contribution: `5/5` review beats;
- blink persistence: `8` active frames;
- blink return: clean.

Human review rejected the proof because the Level 2 side does not visibly blink. Pixel inspection confirmed the failure mode: the current closed-eye layer contributes only `55` opaque pixels and the rendered blink peak changes about `53` pixels in the `1080x1920` frame. The proof script now requires a readable changed-pixel floor before it can report blink pass.

This does **not** complete Shot 3 Level 2. The next task is to regenerate or replace `shot03-enki-eyes-v1` with a source-faithful closed-eye state that visibly reads as a blink, rerun the rendered proof, and only then request normal-speed A/B acceptance.

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

Local validation confirmed:

- `Level 2 rigging response numerically lags the shared heavyPhysical vessel driver` — PASS;
- `ACTIVE LEVEL 2 RIGGING GATE: renderer uses the vessel-driven delayed rigging response and no legacy oscillator` — PASS;
- focused renderer state had only the overall canonical Level 2 milestone intentionally red;
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

The character-state production lane for `shot03-enki-eyes-v1` is implemented and has now produced a QA-passed blink candidate plus a combined rigging+blink preview.

The lane deliberately does **not** send the blink state through ordinary semantic extraction. Its production flow is:

1. use the approved checksum-backed `shot03-enki-body-v1` as the identity/localization anchor;
2. derive a deterministic upper-face working region;
3. use SAM3 only as a semantic eye/eyelid locator;
4. prune fragmented SAM output to the strongest one/two compact eye components;
5. constrain the state edit to the deterministic eye band and bounded character geometry;
6. crop the immutable editorial source around the validated eye-state region;
7. run low-denoise (`0.42`) masked inpainting asking only for naturally closed eyelids;
8. return a full-canvas transparent character-state layer containing only the generated eye-state pixels;
9. run identity-delta QA requiring bounded alpha coverage, upper-face registration, a nontrivial visible change, and bounded RGB difference;
10. require human identity review before any promotion.

The first successful combined build reported:

- candidate audition — PASS;
- rigging causality — PASS;
- character-state lane — PASS;
- character-state localization — PASS;
- blink build — PASS;
- blink identity QA — PASS;
- combined rigging + blink preview — PASS;
- canonical milestone — still intentionally red because both Level 2 assets remain unpromoted.

Hard invariants:

- only the eye-state region may contribute pixels;
- surrounding face, beard, skin tone, lighting, pose, expression and registration remain owned by the approved baseline;
- no beautification, gaze invention, expression change, face redraw or whole-face regeneration;
- automatic promotion is forbidden;
- the canonical animation manifest remains unchanged during generation/audition.

The renderer activates `blinkOnce` only when the character-state asset is staged/approved for the audition. The blink window remains the existing Scene V2 interval (`0.46`–`0.51` progress), so the state persists for multiple frames and returns to the open-eye baseline.

## Compact development loop

Use the focused loop for normal Level 2 iteration instead of all renderer tests:

```bash
node tools/scripts/shot03-level2-dev-loop.mjs
```

For a blink candidate build:

```bash
node tools/scripts/shot03-level2-dev-loop.mjs --build-blink
```

The machine-readable status remains:

```text
tmp/animation-previews/shot03-level2-status.json
```

Full `pnpm renderer:test` and `pnpm quality` are milestone/release gates rather than the inner visual-development loop.

## Human review and promotion

The current combined preview is an audition only. Watch the exact MP4 at normal speed before approving either optional layer.

Review should confirm:

- rigging follows vessel motion with delayed tension rather than independent oscillation;
- rigging does not obscure Enki's face or caption-safe composition;
- the blink reads naturally at normal speed and returns cleanly to the open-eye state;
- Enki's identity, lighting, expression, beard, brow, nose and registration remain stable;
- no patch seam, one-frame pop or face redraw is visible;
- the Level 2 version feels more alive without becoming theatrical.

Before promotion, run the dry-run planner against the newest complete combined preview:

```bash
node tools/scripts/shot03-level2-promote-reviewed.mjs
```

Promotion is intentionally separate from generation and requires the exact watched preview directory plus an explicit confirmation token:

```bash
node tools/scripts/shot03-level2-promote-reviewed.mjs \
  --apply \
  --preview-dir="<exact reviewed shot03-level2-preview directory>" \
  --confirm=APPROVE_SHOT_3_LEVEL2
```

The promotion command:

- accepts only `shot03-rigging-v1` and `shot03-enki-eyes-v1`;
- verifies the reviewed MP4 checksum;
- verifies both candidate checksums and upstream QA PASS evidence;
- refuses automatic promotion and refuses `--apply` without an explicit reviewed preview path;
- copies only the two reviewed optional candidates to their canonical animation-v1 paths;
- marks only those optional layers approved in the manifest;
- writes a promotion receipt under `tmp/animation-assets/promotions/shot03-level2`;
- never modifies `editorial-v1`.

## Gate behavior

Expected progression:

1. **Current canonical Level 1** — milestone gate fails for missing articulation and secondary lag/inertia.
2. **Rigging candidate audition** — canonical gate remains red because candidates are not approved production assets.
3. **Blink candidate audition** — canonical gate remains red because candidates are not approved production assets.
4. **Human A/B review** — reject either candidate if motion/identity does not visibly improve the shot.
5. **Rigging + blink promoted after human approval** — declarative Level 2 channel requirements can be satisfied if all required conditions are genuinely active.
6. **Rendered perceptual gate** — active milestone remains red until the rendered proof and human A/B review prove that the declared motion is visible, useful, and preferred at normal playback speed.

Passing the declarative gate is necessary but not sufficient for Level 2 approval.

## Next QA milestone

After human approval and promotion, add rendered-motion evidence that distinguishes camera motion from subject/material motion and verifies:

- vessel movement after camera compensation;
- measurable rigging response delayed from vessel motion;
- blink state persistence and clean return;
- independent water/material motion;
- face and source registration stability;
- no alpha-edge excursions or one-frame state pops.

The Level 2 Shot 3 benchmark is complete only when a normal-speed A/B review clearly prefers the Level 2 treatment over Level 1 without a compensating loss of source fidelity or physical credibility.
