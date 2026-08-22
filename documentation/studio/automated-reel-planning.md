# Automated Reel Planning And Review Workflow

## Purpose

Turn the current Reel 1 human/assistant planning loop into a repeatable studio workflow that can scale across many reels without losing visual quality, provenance, or human editorial control.

The studio should automate the process around creative decisions while preserving an explicit human approval gate. AI is an optional planning and critique provider, not the workflow itself.

## Core Principle

**Automation is required; an LLM is optional.**

The studio should be able to:

- create planning records from reel data and templates;
- scaffold shot intent cards and asset manifests;
- validate scene and asset contracts;
- queue benchmark renders;
- extract review frames and contact sheets;
- persist scorecards and A/B decisions;
- create revision requests;
- promote approved style decisions into reusable rules;
- repeat the workflow for the next reel.

A language or vision model can make this workflow faster by proposing plans and critiques, but the studio must remain usable when no model server is available.

## Target Workflow

```text
Source chapter / reel production record
        |
        v
Planning Run
        |
        +--> project visual bible
        +--> animation style bible
        +--> prior approved style decisions
        +--> source narration / shot data
        |
        v
Structured Shot Plan Proposal
        |
        v
Human Review / Edit / Approve
        |
        v
Scene V2 + Asset Manifest Scaffold
        |
        v
Asset Preparation / Generation
        |
        v
Pre-animation Validation
        |
        v
Benchmark Render
        |
        v
Frames + Contact Sheet + Technical Checks
        |
        +--> optional AI critique proposal
        |
        v
Human Scorecard
        |
   pass / revise
      /      \
     v        v
Style Rule   Revision Request
Library          |
                 +----> planning/render loop
```

## Planning Providers

Define a narrow provider interface rather than coding directly against one model runtime.

Conceptual interface:

```ts
interface PlanningProvider {
  id: string;
  capabilities: {
    text: boolean;
    vision: boolean;
    structuredOutput: boolean;
  };

  proposeShotPlan(input: ShotPlanningInput): Promise<ShotPlanProposal>;
  critiqueReview?(input: ReviewCritiqueInput): Promise<ReviewCritiqueProposal>;
  proposeRevision?(input: RevisionPlanningInput): Promise<RevisionProposal>;
}
```

Initial providers:

### `deterministic`

Required baseline.

Uses:

- templates;
- existing reel shot data;
- style rules;
- scene-schema defaults;
- approved camera/motion presets;
- deterministic validation.

It does not invent art direction. It ensures the studio workflow still functions without AI.

### `ollama`

Optional local provider.

Useful for:

- turning source/reel data into structured shot-intent proposals;
- proposing camera/motion/material treatments within the style bible;
- generating first-pass asset lists;
- analyzing review contact sheets with a compatible vision model;
- translating human notes such as `the foreground feels too busy` into structured revision proposals;
- summarizing A/B results into candidate reusable style decisions.

Ollama should be configured through environment/runtime settings, not hard-coded into the domain model.

### Future providers

The same interface may support other local or remote model APIs later. Provider choice should not change the persisted planning schema.

## Why Ollama Is Optional

The critical studio operations are deterministic:

- data loading;
- schema validation;
- manifest creation;
- file/checksum validation;
- render orchestration;
- frame extraction;
- contact sheets;
- score persistence;
- approval state transitions;
- decision history.

An LLM is strongest at judgment-support tasks:

- proposing;
- comparing;
- explaining;
- summarizing;
- translating free-form feedback into structured changes.

Those tasks should never be allowed to bypass validation or approval.

## Structured Output Requirement

AI provider output must validate against explicit schemas.

Do not accept free-form prose as the authoritative scene plan.

Examples:

- `ShotPlanProposalSchema`
- `AssetManifestProposalSchema`
- `ReviewCritiqueSchema`
- `RevisionProposalSchema`
- `StyleDecisionProposalSchema`

A provider may generate explanatory prose in addition to structured data, but only validated structured fields can be applied to project state.

## Planning Run

A planning run should be a persisted, auditable object.

Candidate fields:

```text
id
projectId
chapterId
reelId
provider
providerModel
status
inputHash
styleBibleVersion
visualBibleVersion
sourceVersion
createdAt
completedAt
approvedAt
approvedBy
```

Recommended statuses:

- queued
- running
- proposal-ready
- review
- revision-requested
- approved
- rejected
- failed
- superseded

## Planning Artifacts

A planning run can produce versioned artifacts such as:

- reel attention map;
- shot intent cards;
- keyframe checkpoints;
- Scene V2 proposal;
- animation asset manifest scaffold;
- benchmark selection rationale;
- review rubric instance;
- revision proposal;
- style-rule proposal.

Each artifact should record:

- schema version;
- source planning run;
- input hashes;
- provider/model if AI-generated;
- human edits;
- approval state;
- checksum where stored as a file.

## Style Decision Library

The current back-and-forth produces reusable knowledge. Do not leave that knowledge buried in Markdown review notes.

Create a persistent style-decision concept.

Examples:

```text
character-closeup.camera.maxPushPercent = 3
character-closeup.blink.count = 0..1
narratorOnly.lipSync = false
foregroundOcclusion.mustAvoid = face,captions
nammu.camera.motion = near-static
nammu.reveal.mode = environmental-coherence
material.water.motion = multi-frequency
material.rigid-vessel.motion = heavyPhysical
transition.waterToWater.preferred = material-handoff
```

Each decision should record:

- scope: project / chapter / reel / shot type / character / material;
- source benchmark;
- rationale;
- approved candidate/reference;
- active/superseded state.

Later reels can inherit these decisions automatically and only ask for review when they diverge.

## Human Feedback As Structured Revisions

The Studio should turn feedback into explicit changes.

Human note:

`The rigging is distracting and the zoom still feels like Ken Burns.`

Revision proposal:

```json
{
  "shotId": "enki-at-the-helm",
  "changes": [
    {
      "path": "camera.scaleTo",
      "from": 1.035,
      "to": 1.025,
      "reason": "reduce visible zoom"
    },
    {
      "path": "layers.foreground-rigging.motion.intensity",
      "from": 0.5,
      "to": 0.25,
      "reason": "keep foreground subordinate to face"
    }
  ]
}
```

The human can edit or approve the proposal before a new candidate renders.

This is the core automation loop the studio should eventually support.

## Studio UI Proposal

Add an `Animation Planning` or `Direction` workspace for a reel.

Suggested sections:

### Reel Direction

- emotional arc;
- color progression;
- narration/attention map;
- approved style rules inherited from project/chapter.

### Shot Planner

For selected shot:

- intent card;
- benchmark status;
- camera plan;
- layer/asset plan;
- motion budget;
- keyframe checkpoints;
- transitions;
- unresolved questions.

### Asset Readiness

- manifest layers;
- missing files;
- overscan status;
- alpha/checksum/dimension validation;
- human visual QC status.

### Candidate Review

- video preview;
- 0/25/50/75/100% frames;
- contact sheet;
- A/B candidate comparison;
- scorecard;
- optional AI critique;
- human notes.

### Revision Builder

- convert notes to proposed structured changes;
- show before/after values;
- approve changes;
- queue new benchmark render.

### Style Decisions

- promote successful benchmark decisions;
- show inherited rules;
- override rule with explanation;
- supersede outdated rules.

## API Direction

Illustrative endpoints:

```text
POST /reels/:reelId/planning-runs
GET  /planning-runs/:id
POST /planning-runs/:id/generate
POST /planning-runs/:id/review
POST /planning-runs/:id/revisions
POST /planning-runs/:id/apply

GET  /reels/:reelId/direction
PUT  /reels/:reelId/direction

GET  /shots/:shotId/animation-manifest
PUT  /shots/:shotId/animation-manifest

POST /shots/:shotId/benchmark-renders
GET  /shots/:shotId/review-candidates
POST /shots/:shotId/review-decisions

GET  /projects/:projectId/style-decisions
POST /projects/:projectId/style-decisions
```

Exact route design can be refined during implementation.

## Job Model

Planning generation and AI critique can use the same reliability ideas already proven by render jobs:

- queued;
- claimed;
- started;
- heartbeat;
- completed/failed;
- attempts;
- logs;
- bounded timeout;
- input hash;
- provider/model metadata.

Do not let a hung local model block the studio indefinitely.

## Context Assembly

For each AI-assisted planning request, assemble only relevant, versioned context:

- exact reel source/narration;
- shot data;
- current visual bible;
- current animation style bible;
- applicable style decisions;
- prior approved benchmark notes;
- asset availability;
- platform/caption constraints.

Do not provide the entire repository or entire book by default. Small, explicit context reduces drift and makes outputs easier to reproduce.

## Ollama Configuration

Example future environment settings:

```text
PLANNING_PROVIDER=deterministic
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_TEXT_MODEL=<configured-model>
OLLAMA_VISION_MODEL=<configured-model>
PLANNING_TIMEOUT_MS=<bounded-value>
```

Default provider should remain deterministic until the user explicitly enables a model provider.

## Model Selection Guidance

Do not bind the architecture to one model name.

For local planning, prioritize:

- reliable structured JSON output;
- sufficient context window for one reel plus style rules;
- good instruction following;
- low enough memory use for local hardware.

For visual critique, require a model/provider with image input. Text planning and vision critique may use different models.

## Safety And Editorial Guardrails

AI planning may not:

- alter source/story text silently;
- mark visual assets human-approved;
- publish a reel;
- overwrite approved source art;
- supersede style decisions without review;
- invent missing provenance;
- bypass cultural/world guardrails.

## Reel 1 As The Automation Pilot

Implement the automated planning workflow first against:

1. Shot 3 Enki physical benchmark;
2. Shot 4 Nammu numinous benchmark;
3. remaining Reel 1 shots;
4. full Reel 1 review.

Only after the workflow can reproduce those decisions should Reel 2 become the first mostly-template-driven production test.

## Success Metric

The long-term milestone is not `the AI can create a shot plan`.

It is:

> Given a new reel, the Studio can assemble approved project rules, create a structured first-pass direction package, identify required assets, render a benchmark, collect review evidence, turn feedback into a revision, and preserve successful decisions for the next reel — with the human acting as director rather than manually rebuilding the process each time.
