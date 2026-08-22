# Reel 1 Creative And Design Test Strategy

## Purpose

Convert as much of Reel 1 art direction as possible into repeatable automated checks without pretending that software can prove a shot is beautiful.

The testing model has three layers:

1. deterministic hard gates for objective constraints;
2. visual/AI review as advisory evidence;
3. human editorial approval for taste, meaning, and publication readiness.

## Core Principle

Creative work can be tested when the creative decision has been expressed as a constraint, invariant, expected relationship, or measurable threshold.

Examples that are testable:

- duration and shot coverage;
- caption density and safe-area policy;
- camera amplitude limits;
- motion-budget limits;
- required stillness anchors;
- source-text immutability;
- required review markers;
- character continuity identifiers;
- asset lineage and checksums;
- overscan sufficiency;
- alpha expectations;
- narrator-only lip-sync prohibition;
- Nammu reveal mode and forbidden generic-fantasy treatments;
- human approval remaining mandatory.

Examples that remain editorial judgments:

- whether Enki feels thoughtful rather than stiff;
- whether Nammu is mysterious enough;
- whether the composition feels expensive;
- whether the color progression is emotionally satisfying;
- whether a transition feels poetic rather than merely correct;
- whether the final reel is worth publishing.

Automation should support those judgments, not silently replace them.

## Test Pyramid

### Level 1 - Repository and toolchain consistency

Run before Nx or rendering.

Checks:

- every Nx plugin configured in `nx.json` is explicitly declared in `package.json`;
- required script entrypoints exist;
- scene/policy files parse;
- package/lockfile remain compatible through frozen CI install.

The first implementation is `pnpm workspace:check`.

### Level 2 - Structural reel tests

Fast Node tests validate the current Reel 1 scene:

- 1080x1920;
- 30 fps;
- exactly 1800 frames;
- exactly eight shots;
- contiguous shot frame coverage;
- shot duration matches frame count;
- captions cover the reel without gaps;
- caption chunks remain within the configured word budget;
- safe-area captions remain enabled;
- source/story immutability is explicit.

These tests do not certify the current technical draft as visually approved.

### Level 3 - Direction-policy tests

A machine-readable Reel 1 quality policy defines constraints that future Scene V2 proposals and planning outputs can be checked against.

Global examples:

- human approval is always required;
- default camera scale change <= 5%;
- one primary motion per shot;
- no more than two default environment-motion channels;
- narrator-only scenes do not lip-sync;
- review markers exist at 0/25/50/75/100%.

Shot 3 examples:

- camera push <= 3%;
- at most one blink;
- `enki-facial-identity` remains the stillness anchor;
- foreground occlusion cannot target face/captions.

Shot 4 examples:

- camera change <= 1%;
- `camera-composition` remains the stillness anchor;
- reveal mode is `environmental-coherence`;
- generic treatments such as mermaid staging, glowing eyes, literal character fade, horror stinger, and particle explosion are rejected.

The first implementation is `pnpm creative:test`.

### Level 4 - Asset readiness tests

When `animation-v1` assets exist, automate:

- file existence;
- dimensions;
- alpha-channel expectation;
- checksums;
- source lineage;
- duplicate asset ids;
- overscan metadata;
- mask dimensions matching target layers;
- required hero layer presence;
- immutable `editorial-v1` source policy.

Future image-analysis checks may flag, but should not automatically reject solely on:

- edge halos;
- reconstruction artifacts;
- face drift;
- repeated generated textures.

Those findings should enter review as evidence.

### Level 5 - Scene V2 validation

Before rendering:

- validate JSON schema;
- validate all asset references;
- validate motion preset names;
- validate transition references;
- validate frame boundaries;
- validate camera amplitude against shot policy and overscan;
- validate required style decisions;
- validate review policy;
- validate story/narration immutability.

### Level 6 - Render technical tests

After rendering:

- expected duration;
- dimensions/fps/pixel format;
- audio stream present;
- caption stream present where expected;
- loudness/peak range;
- frame extraction succeeds;
- review contact sheet generated;
- render manifest/checksums persisted;
- no missing frames or zero-byte assets.

### Level 7 - Golden-frame visual regression

After Shot 3 and Shot 4 are human-approved, store approved review frames as golden references.

Compare future renderer changes against them using multiple signals rather than one pixel-perfect threshold:

- perceptual image similarity;
- subject bounding-region stability;
- face/identity region change;
- luminance/color histogram drift;
- caption-safe-zone overlap;
- major composition shifts.

A visual-regression change should normally request review rather than fail automatically, because intentional artistic improvements can legitimately change pixels.

### Level 8 - AI-assisted visual critique

When a vision model is configured, provide:

- shot intent;
- inherited style rules;
- keyframes at 0/25/50/75/100%;
- contact sheet;
- technical results;
- review rubric.

Require structured findings with:

- category;
- severity;
- observation;
- evidence marker/frame;
- proposed Scene V2 path change if applicable;
- confidence.

AI critique is advisory. It cannot set human approval or publication state.

### Level 9 - Human publication gate

Human review remains mandatory for:

- emotional read;
- historical/material plausibility;
- character continuity as perceived by a viewer;
- pacing;
- mystery versus clarity;
- whether motion is distracting;
- whether sound increases meaning;
- whether the shot/reel is genuinely worth publishing.

## Test Categories To Add During Reel 1

### Composition

Automate:

- intended subject/eye-target metadata exists;
- caption avoidance targets exist;
- review frames can be extracted.

Advisory/human:

- visual hierarchy works instantly;
- negative space feels intentional;
- foreground framing improves rather than obscures.

### Camera

Automate:

- scale/travel/rotation bounds;
- approved preset names;
- settle timing;
- overscan compatibility.

Human:

- camera feels almost invisible;
- no Ken Burns impression;
- move supports the narration thought.

### Character Performance

Automate:

- blink count;
- narrator-only lip-sync rule;
- max number of performance events;
- known state assets only.

Human:

- Enki feels alive but restrained;
- face identity remains trustworthy;
- motion does not read as puppet animation.

### Material Motion

Automate:

- material tag maps to allowed motion preset families;
- rigid vessel cannot receive cloth/reed presets;
- Nammu/divine light can use numinous presets;
- environment-channel count remains bounded.

Human:

- water feels physical;
- cloth has weight;
- rigging tension reads correctly;
- supernatural motion feels meaningfully different.

### Color And Lighting

Automate later:

- broad luminance/temperature progression targets;
- no clipped highlights beyond threshold;
- title/caption contrast.

Human:

- cool-to-warm progression feels coherent;
- divine light is restrained;
- Dilmun earns the warmest/openest visual release.

### Transitions

Automate:

- transition references resolve;
- material-handoff source/target assets exist;
- transition duration remains bounded.

Human:

- transition feels motivated;
- viewer attention is handed cleanly between scenes.

### Audio

Automate:

- integrated loudness and peak range;
- narration intelligibility proxy checks;
- silence/tail duration;
- required audio layers present.

Human:

- voice feels intimate and serious;
- score does not become trailer music;
- Nammu acoustic shift creates awe without horror.

## Failure Semantics

Use three outcomes rather than pass/fail for everything:

- `FAIL` - deterministic invariant broken; render or approval blocked.
- `REVIEW` - meaningful visual/creative change or advisory concern; human review required.
- `PASS` - objective checks pass; this still does not imply publication approval.

## Immediate Implementation

Implemented now:

- `pnpm workspace:check`;
- `pnpm creative:test`;
- machine-readable `tools/creative/reel-01-quality-policy.json`;
- structural tests for the current 60-second Reel 1 scene;
- Enki physical-motion guardrail tests;
- Nammu numinous-motion guardrail tests;
- negative tests proving excessive zoom, lip sync, excess motion, broken stillness anchors, and generic fantasy Nammu treatments are rejected.

## Definition Of Success

Reel 1 testing succeeds when a renderer or planning change cannot accidentally violate an already-approved creative rule without producing a clear machine-readable failure or review request, while the human director remains responsible for deciding whether the result is actually good.
