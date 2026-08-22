# Ollama Planning Runtime

## Purpose

Use the already-installed local Ollama runtime as an optional assistant-director provider for Sumer Reel Forge while keeping deterministic planning, validation, rendering, review, and human approval independent from any model.

## Current Implementation

The API now exposes:

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
- a JSON Schema in the `format` field;
- bounded request timeouts;
- application-side validation before model output becomes a proposal.

Model output is never treated as human approval.

## Configuration

PowerShell example:

```powershell
$env:PLANNING_PROVIDER="ollama"
$env:OLLAMA_BASE_URL="http://localhost:11434"
$env:OLLAMA_TEXT_MODEL="<your-installed-text-model>"
$env:OLLAMA_VISION_MODEL="<your-installed-vision-model>"
$env:PLANNING_TIMEOUT_MS="45000"
```

Git Bash example:

```bash
export PLANNING_PROVIDER=ollama
export OLLAMA_BASE_URL=http://localhost:11434
export OLLAMA_TEXT_MODEL='<your-installed-text-model>'
export OLLAMA_VISION_MODEL='<your-installed-vision-model>'
export PLANNING_TIMEOUT_MS=45000
```

`OLLAMA_VISION_MODEL` is reserved for the upcoming contact-sheet / keyframe critique path. Text planning works without it.

## Check The Local Runtime

Run:

```bash
pnpm planning:ollama:check
```

The command lists the models reported by Ollama and warns when a configured model is not installed.

Then start the Studio/API normally and inspect:

```text
GET http://localhost:3000/api/planning/capabilities
```

Expected conceptual response:

```json
{
  "defaultProvider": "ollama",
  "providers": [
    {
      "id": "deterministic",
      "available": true,
      "structuredOutput": true
    },
    {
      "id": "ollama",
      "available": true,
      "configuredModel": "<model>",
      "models": ["<model>"]
    }
  ]
}
```

## First Reel 1 Planning Call

The first live pilot should be Shot 3, Enki at the helm.

Example request body:

```json
{
  "provider": "ollama",
  "shotId": "enki-at-the-helm",
  "storyFunction": "Establish Enki as the human and divine visual anchor of the voyage.",
  "emotionalPurpose": "calm authority",
  "eyeTarget": "enki-face",
  "stillnessAnchor": "enki-facial-identity",
  "styleRules": [
    "character-closeup.camera.maxPushPercent = 3",
    "narratorOnly.lipSync = false",
    "foregroundOcclusion.mustAvoid = face,captions",
    "material.water.motion = multi-frequency",
    "material.rigid-vessel.motion = heavyPhysical"
  ],
  "constraints": [
    "Do not rewrite narration.",
    "Use one primary movement.",
    "Prefer restrained character motion.",
    "Preserve the approved Enki identity."
  ],
  "availableAssets": [
    "assets/blessings-of-sumer/chapter-01/reel-01/editorial-v1/shot-03.png"
  ]
}
```

The response is a proposal, not a render instruction that bypasses review. The next Studio slice will persist and display these proposals before they are applied to Scene V2.

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

The next AI-assisted review slice should pass selected render evidence to a configured vision-capable model:

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
2. load Reel 1 source/style context server-side instead of requiring it all in the request body;
3. implement Scene V2 validation and persistence;
4. add the Angular Direction workspace;
5. connect Shot 3 proposal -> human edit -> Scene V2 -> benchmark render;
6. add vision critique for review frames/contact sheets;
7. turn approved A/B decisions into reusable StyleDecision records.
