# Ollama Planning Runtime

## Purpose

Use the installed local Ollama runtime as an optional assistant-director provider for Sumer Reel Forge while keeping deterministic planning, validation, rendering, review, and human approval independent from any model.

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

## Planned Vision Review

The next AI-assisted review slice should pass selected render evidence to the configured vision-capable model:

```text
shot intent
+ approved style rules
+ 0 / 25 / 50 / 75 / 100% frames
+ contact sheet
+ review rubric
```

The model should return a structured critique proposal. It may identify issues and suggest Scene V2 changes, but it may not approve the candidate.

## Docker Boundary

Ollama does not need to move into Docker merely because the rest of the local production stack uses Docker. Keeping the installed host Ollama service is simpler for GPU access on Windows.

If a future Docker-hosted API cannot reach host Ollama, use the Docker host gateway appropriate to the environment rather than duplicating model storage inside the application stack. The provider base URL remains configurable through `OLLAMA_BASE_URL` for this reason.

## Reliability Rules

- Ollama outages must not break deterministic planning.
- Local model calls have bounded timeouts.
- Model names are configuration, not domain data.
- Model output is treated as untrusted structured input until validated.
- Planning source/style versions should be persisted when PlanningRun storage is implemented.
- No AI provider may mark a shot or reel human-approved.
- No AI provider may silently rewrite source story text.

## Next Implementation Slice

1. persist `PlanningRun` and planning artifact records;
2. load reel source/style context server-side instead of requiring it all in the request body;
3. implement Scene V2 validation and persistence;
4. connect approved Shot 3 direction -> Scene V2 -> benchmark render;
5. add Qwen3-VL critique for review frames/contact sheets;
6. turn approved A/B decisions into reusable StyleDecision records.
