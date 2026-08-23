# Ollama Planning Runtime

## Purpose

Use the installed local Ollama runtime as an optional assistant-director and visual critic for Sumer Reel Forge while keeping deterministic planning, validation, rendering, review, and human approval independent from any model.

## Current Implementation

The API exposes:

```text
GET  /api/planning/capabilities
POST /api/planning/shot-plan
```

Planning providers:

- `deterministic` - always available, creates a safe planning scaffold without inventing art direction;
- `ollama` - calls the local Ollama HTTP API for a schema-constrained shot-plan proposal.

The Ollama provider uses:

- `GET /api/tags` for local model discovery;
- `POST /api/chat` for planning;
- `stream: false` so structured responses arrive as one JSON response;
- `think: false` for bounded shot-direction generation with Qwen3-class thinking models;
- `keep_alive` so the configured planner remains warm between proposals;
- a JSON Schema in the `format` field;
- bounded request timeouts;
- application-side validation before model output becomes a proposal.

Model output is never treated as human approval.

## Recommended Local Configuration

PowerShell example:

```powershell
$env:PLANNING_PROVIDER="ollama"
$env:OLLAMA_BASE_URL="http://localhost:11434"
$env:OLLAMA_TEXT_MODEL="qwen3:8b"
$env:OLLAMA_VISION_MODEL="qwen3-vl:4b-instruct"
$env:PLANNING_TIMEOUT_MS="120000"
$env:OLLAMA_KEEP_ALIVE="10m"
```

Git Bash example:

```bash
export PLANNING_PROVIDER=ollama
export OLLAMA_BASE_URL=http://localhost:11434
export OLLAMA_TEXT_MODEL=qwen3:8b
export OLLAMA_VISION_MODEL=qwen3-vl:4b-instruct
export PLANNING_TIMEOUT_MS=120000
export OLLAMA_KEEP_ALIVE=10m
```

These shell variables do not modify the Windows PATH.

## Normal Local Startup

With `PLANNING_PROVIDER=ollama`, the normal command is now:

```bash
pnpm start:all
```

`start:all` automatically performs the equivalent of:

```bash
pnpm planning:ollama:check
pnpm planning:ollama:warm
```

before starting the Docker infrastructure, Nest API, and Angular Studio. This provides fail-fast local runtime validation and preloads the configured text planner.

When `PLANNING_PROVIDER=deterministic`, the Ollama check and warm-up are skipped so deterministic development and CI do not depend on a local model runtime.

The standalone commands remain useful for diagnostics:

```bash
pnpm planning:ollama:check
pnpm planning:ollama:warm
pnpm planning:shot3
```

`planning:shot3` remains a developer smoke test. Normal creative work should use the Studio Direction panel.

## Direction Workspace

The Angular Studio includes a selected-shot **Direction** workspace. It reads the active planning capability and shows:

- provider availability;
- configured text planner;
- configured vision-review model;
- structured-output readiness;
- selected shot intent and motion;
- Generate Direction action;
- camera, performance, environment, and lighting proposal fields;
- deterministic PASS / REVIEW / FAIL checks;
- unresolved creative questions;
- model/runtime metadata;
- local human approve/reject controls.

Selecting another shot clears the previous proposal and rebuilds the planning request for the newly selected shot.

Reel 1 benchmark policies are stricter than the generic policy:

- Shot 3 `enki-at-the-helm` carries the 3% camera limit, Enki facial-identity stillness anchor, narrator-only lip-sync prohibition, water motion rule, and heavy vessel physics rule;
- Shot 4 `nammu-under-water` carries the 1% camera limit, environmental-coherence reveal rule, near-static camera requirement, and explicit anti-fantasy/horror constraints;
- the remaining shots use the general restrained documentary, material-weight, narration-preservation, and 5% camera policy.

Local approval is intentionally non-persistent. It must not be treated as a production approval until `PlanningRun` / approval-history persistence is implemented.

## Capability Response

A configured Ollama capability reports both planner and vision models:

```json
{
  "defaultProvider": "ollama",
  "providers": [
    {
      "id": "ollama",
      "available": true,
      "configuredModel": "qwen3:8b",
      "configuredVisionModel": "qwen3-vl:4b-instruct",
      "text": true,
      "vision": true,
      "structuredOutput": true
    }
  ]
}
```

## Shot 3 Smoke Test

The developer-only smoke test is:

```bash
pnpm planning:shot3
```

It sends the strict Shot 3 Enki direction package to the configured planning provider. The response is a proposal, not a render instruction that bypasses review.

The current UI additionally diagnoses proposal-level issues that can be stricter than the provider-wide schema guardrail. For example, the Ollama provider permits at most a 5% camera scale delta globally, while the Shot 3 Direction policy permits at most 3%.

A proposal using `linear` easing is marked REVIEW rather than automatically failed. A proposal whose primary motion says camera tilt while also changing camera scale is also marked REVIEW for semantic consistency. Missing inherited style rules or a shot-specific camera-limit violation are FAIL conditions.

## Provider Responsibilities

### Deterministic provider

Responsible for:

- preserving the planning contract;
- carrying inherited style decisions forward;
- identifying unresolved human decisions;
- allowing the Studio to function when Ollama is stopped.

It deliberately does not invent art direction.

### Ollama provider

Responsible for proposing:

- eye target and stillness anchor refinement;
- camera preset and restrained scale range;
- one primary movement;
- subject/environment/light motion budget;
- required semantic assets;
- unresolved creative questions;
- rationale that can be reviewed by a person.

All actionable output must validate against the planning schema.

## Automated Candidate Review

The local review command is:

```bash
pnpm animation:shot:review -- --shot=5
```

It performs the current review pipeline in one command:

```text
exact required candidate set
-> Scene V2 layered render
-> upstream QA verification
-> media metadata verification
-> aggregate Scene V2 frame-difference verification
-> optional Ollama vision critique
-> shot-review.json
-> human review state
```

The review command never promotes candidates and never records human approval.

The deterministic motion verifier now identifies its scope as **aggregate scene motion**. When the Scene V2 camera moves, it records that camera motion contributes to the measured frame difference and explicitly states that an aggregate PASS does not independently prove material-local motion. Material-local ROI/baseline differential QA remains a separate hardening step.

### Vision evidence package

When `OLLAMA_VISION_MODEL` is configured and installed, the review command sends a bounded evidence package to the local vision model:

```text
approved editorial source
+ review contact sheet
+ selected early/middle/late review frames
+ required/optional layer contract
+ stillness anchor and eye target
+ approved/provisional style decisions
+ deterministic QA results
+ review rubric
```

The vision model returns schema-constrained JSON with one of:

```text
PASS_ADVISORY
REVIEW_REQUIRED
FAIL_ADVISORY
```

It also returns confidence, findings, per-material assessments, and recommendations. The resulting `ollama-vision-review.json` is advisory evidence only.

The reviewer is specifically asked to look for:

- camera motion being mistaken for material motion;
- translated-card motion;
- mask bleed and edge ghosts;
- diagonal streak/glint artifacts;
- identity drift;
- caption or eye-target competition;
- implausible physical behavior;
- intended material motion that remains perceptually static;
- optional/deferred layers being incorrectly treated as mandatory.

Shot 5 established the first review knowledge captured from this workflow: contained water keeps a fixed basin boundary, uses readable broad ripple plus fine refraction, forbids diagonal glint bands above the basin, and does not require smoke when source evidence is too sparse to support a meaningful smoke layer.

### Review command options

```bash
pnpm animation:shot:review -- --shot=5 --skip-ai
pnpm animation:shot:review -- --shot=5 --skip-render
pnpm animation:shot:review -- --shot=5 --require-ai
pnpm animation:shot:review -- --shot=5 --review-guides
```

`--require-ai` fails the command if the configured vision review cannot run. Without it, Ollama outages or missing models do not break deterministic review.

## Quality Commands

The source-code and creative/animation quality surfaces are intentionally separated:

```bash
pnpm quality
pnpm quality:creative
pnpm quality:animation
pnpm animation:shot:review -- --shot=N
```

- `quality` remains the full repository quality command;
- `quality:creative` runs creative/style decision tests;
- `quality:animation` runs Scene V2 and renderer tests;
- `animation:shot:review` is the expensive local evidence/render review path and may use Ollama.

This keeps normal CI independent from GPU/model availability while making local production review repeatable.

## Docker Boundary

Ollama does not need to move into Docker merely because the rest of the local production stack uses Docker. Keeping the installed host Ollama service is simpler for GPU access on Windows.

If a future Docker-hosted API cannot reach host Ollama, use the Docker host gateway appropriate to the environment rather than duplicating model storage inside the application stack. The provider base URL remains configurable through `OLLAMA_BASE_URL` for this reason.

## Reliability Rules

- Ollama outages must not break deterministic planning or deterministic review unless `--require-ai` is explicitly requested.
- Local model calls have bounded timeouts.
- Model names are configuration, not domain data.
- Model output is treated as untrusted structured input until validated.
- Planning/review source and style versions should be persisted when run-history storage is implemented.
- No AI provider may mark a shot or reel human-approved.
- No AI provider may promote candidates.
- No AI provider may silently rewrite source story text.

## Next Implementation Slice

1. add material-local ROI or baseline-differential render QA so camera motion cannot satisfy a material-motion gate;
2. persist `PlanningRun` / review artifact records and model/input hashes;
3. expose `shot-review.json` and Ollama critique in the Production Cockpit;
4. benchmark Qwen3-VL 4B versus 8B on approved/rejected Reel 1 evidence;
5. promote proven benchmark decisions into reusable lane-level quality contracts only after enough human-reviewed examples exist.
