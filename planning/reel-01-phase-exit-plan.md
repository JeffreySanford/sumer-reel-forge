# Reel 1 Phase Exit Plan

## Purpose

Define the remaining Reel 1 work as explicit phases with evidence-based exit gates. The goal is to prevent either endless polishing or premature scaling to Reel 2.

Reel 1 is complete only when it proves both visual quality and repeatable production behavior.

## Phase A - Toolchain And Planning Stability

Exit when:

- local `pnpm install` and `pnpm start:all` succeed;
- GitHub Actions quality pipeline is green;
- workspace dependency consistency check passes;
- deterministic planning API tests pass;
- Ollama runtime/version/model discovery is visible;
- creative policy tests run in normal test/CI flow;
- no AI model is required for baseline Studio operation.

## Phase B - Shot 3 Source And Layer Readiness

Exit when:

- approved Shot 3 source composition is locked;
- overscan is sufficient for <=3% camera push;
- hidden background reconstruction passes inspection;
- Enki identity is stable;
- hero, vessel, water, foreground, atmosphere, and blink-state assets are versioned;
- asset manifest contains lineage, dimensions, alpha expectations, and checksums;
- caption-safe region is verified at phone scale.

Do not begin animation polish if the layered still is visibly weaker than the approved editorial source.

## Phase C - Shot 3 Physical Benchmark

Exit when:

- generic Scene V2 path drives the benchmark;
- camera <=3%;
- one primary motion;
- at most one blink;
- narrator-only lip sync disabled;
- Enki facial identity remains the stillness anchor;
- water, vessel, foreground, and character movement are independent;
- 0/25/50/75/100 review frames are generated;
- no deterministic creative-policy failures;
- human scorecard has no category below 4 and publishability is 5;
- benchmark clip is good enough to publish by itself.

## Phase D - Shot 4 Numinous Benchmark

Exit when:

- physical water remains credible;
- camera motion <=1%;
- Nammu uses environmental coherence rather than a literal fade/character entrance;
- forbidden generic fantasy treatments are absent;
- physical and numinous movement are visibly different;
- transition from Enki attention into water feels motivated;
- transition toward human water/hospitality preserves the thematic link;
- human review meets the publication benchmark.

## Phase E - Style Rule Promotion

After Shot 3 and Shot 4 approval:

- extract successful camera limits;
- extract motion budgets;
- extract material-to-motion mappings;
- extract character performance constraints;
- extract transition patterns;
- extract caption behavior;
- extract human-approved Nammu rules;
- persist them as StyleDecision records once that storage exists.

Every promoted rule needs scope, rationale, source benchmark, and supersession history.

## Phase F - Remaining Six Shots

For Shots 1, 2, 5, 6, 7, and 8:

1. inherit approved rules;
2. create shot intent and asset manifest;
3. validate source/layers;
4. render first candidate;
5. run structural/creative/render tests;
6. review keyframes/contact sheet;
7. revise only where the shot's story purpose requires divergence.

The objective is to learn whether approved rules reduce manual decision work.

## Phase G - Full Reel Integration

Exit when:

- all eight shots use the same Scene V2/generic composition path;
- transitions work as a sequence, not only in isolated shot previews;
- attention map survives final narration timing;
- cool-to-warm visual arc remains readable;
- no shot dominates motion merely because it contains more layers;
- title zone settles cleanly;
- captions remain legible across the complete reel;
- no source text has changed unintentionally.

## Phase H - Audio And Device Review

Review on:

- studio headphones;
- ordinary headphones/earbuds;
- phone speakers;
- desktop speakers if useful;
- phone-sized video display.

Exit when:

- narration remains intelligible;
- ambience and score remain subordinate;
- Nammu acoustic-space change reads as awe rather than horror;
- Dilmun rise feels earned;
- final audio/video tail is not abrupt;
- captions work when audio is muted.

## Phase I - Visual Regression Baseline

After human approval:

- store approved keyframes for Shot 3 and Shot 4;
- store complete Reel 1 contact sheet;
- store scene/asset hashes;
- store approved scorecard;
- store renderer/runtime version metadata;
- use these as future `REVIEW` triggers when renderer changes alter visual output materially.

Do not use pixel-perfect equality as the sole criterion.

## Phase J - Automation Readiness

Before Reel 2:

The Studio should be able to perform as much of this loop as practical:

```text
reel data
-> inherited style rules
-> shot-plan scaffold/proposal
-> human direction approval
-> Scene V2 + asset manifest
-> validation
-> benchmark render
-> review markers/contact sheet
-> human or AI-assisted critique
-> structured revision
-> rerender
-> approved style-decision promotion
```

Exit when Reel 2 can begin without creating a bespoke `FullReel2Animation.tsx` or manually reconstructing every planning artifact used for Reel 1.

## Reel 1 Final Exit Criteria

Reel 1 is ready to close when:

- CI/local quality gates are green;
- Shot 3 and Shot 4 publication benchmarks are human-approved;
- remaining shots inherit the established language successfully;
- full 60-second animation passes technical and creative review;
- voice/score receives final listening approval;
- final output receives explicit human publication approval;
- golden review artifacts are stored;
- reusable style decisions are identified;
- automation gaps discovered during Reel 1 are recorded for Sprint 007;
- Reel 2 can start from the Studio workflow rather than from a copy of Reel 1 code.
