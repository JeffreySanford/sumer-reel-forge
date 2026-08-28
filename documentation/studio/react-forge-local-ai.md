# React Forge + Local AI Architecture

Status: **PROPOSED**

This document describes the intended relationship between the existing Angular Studio, NestJS API, React/Remotion animation runtime, persisted animation jobs, and local AI providers.

It does not describe shipped behavior unless explicitly marked current.

## Current system

Current production responsibilities are already separated:

- Angular Studio: review, production state, readiness, queue interaction, operational visibility;
- NestJS API: validated application boundary, persistence, job orchestration, runtime status;
- React/Remotion animation runtime: canonical Scene V2 animation execution and proof/render compositions;
- animation worker: persisted job execution through existing deterministic planner/lane scripts;
- local Ollama: managed text/vision inference through the shared GPU ownership path;
- ComfyUI: managed/local candidate generation through the same GPU ownership policy;
- `animation-v1`: canonical promoted animation assets guarded by explicit human confirmation and checksum provenance.

The React/Remotion side remains technically central to rendering, but its interactive authoring role is underused. The proposed Forge Lab restores that role without moving canonical authority out of the API/deterministic production pipeline.

## Target responsibility split

### Angular Studio

Owns:

- chapter/reel/shot navigation;
- readiness and production status;
- persisted job status/logs;
- evidence/review navigation;
- human approval workflow;
- links into the Forge Lab.

Does not own Remotion motion execution.

### React/Remotion Forge Lab

Owns:

- frame-accurate live audition;
- bounded motion parameter editing;
- local proposal comparison;
- visual A/B exploration;
- human-directed motion tuning;
- temporary proposal state.

Does not own:

- direct database writes;
- canonical manifest mutation;
- promotion logic;
- GPU scheduling;
- provider credentials/lifecycle;
- deterministic QA authority.

### NestJS API

Owns:

- local-AI provider selection and capability reporting;
- schema-constrained AI requests;
- assembly of shot/style/lane context;
- proposal validation;
- persisted animation jobs;
- proposal/evidence references;
- access to authoritative runtime status.

The React client should call the API rather than contact Ollama, LM Studio, llama.cpp, or NIM directly.

## Local AI provider model

The provider layer must be capability-driven.

Example capabilities:

- text inference;
- vision inference;
- structured JSON output;
- model inventory;
- model digest/version reporting;
- managed unload;
- managed startup;
- OpenAI-compatible transport;
- GPU-backed execution.

Similar HTTP APIs do not imply identical lifecycle behavior.

### Ollama

**Current / managed.**

Ollama is the default local provider because Reel Forge already has:

- managed model inventory;
- setup/check scripts;
- managed text planning;
- managed vision calls;
- unload before GPU lease release;
- runtime residency telemetry.

The provider abstraction must reuse the existing managed Ollama primitive.

### llama.cpp

**Proposed / external initially.**

`llama-server` provides a local server suitable for provider-adapter integration, including OpenAI-style endpoints. It is attractive for GGUF experimentation and workstation-specific quantization choices.

Initial policy:

- user starts/manages the server;
- Reel Forge probes capabilities;
- tasks still acquire the shared Reel Forge GPU lease before invoking GPU-backed inference;
- provider cleanup is adapter-specific;
- no assumption of Ollama `stop` semantics.

### LM Studio

**Proposed / external initially.**

LM Studio exposes local API serving, including OpenAI-compatible endpoints and structured output support. It is useful as a model experimentation/developer workstation backend.

Initial policy:

- treat the server as externally managed;
- no GUI dependency in core production startup;
- do not require it for CI or default local startup;
- use the same provider contract as other local backends.

### NVIDIA NIM

**Proposed / optional.**

NVIDIA NIM exposes OpenAI-compatible inference APIs for supported deployments. It should be evaluated through NVIDIA's current model/hardware support matrix rather than through hard-coded assumptions about VRAM or expected speed.

Initial policy:

- external/container-managed;
- capability-probed;
- provider-specific runtime requirements documented separately;
- not part of default `start:all` until a concrete supported local deployment is validated.

## GPU ownership remains singular

The provider abstraction MUST NOT introduce another in-process promise queue as the GPU authority.

Current authority remains:

```text
tools/runtime/gpu-resource-lease.mjs
  -> tools/runtime/gpu-ai-task.mjs
  -> provider-specific managed inference
```

This matters because Reel Forge has multiple processes:

- NestJS API;
- animation worker;
- renderer worker;
- CLI scripts;
- ComfyUI;
- optional local AI servers.

An in-memory scheduler cannot coordinate those processes. The existing atomic cross-process lease can.

Provider adapters are responsible for invocation and provider-specific cleanup. The shared lease is responsible for Reel Forge execution ownership.

## Proposal flow

A live Forge proposal should look like:

```text
Forge Lab requests proposal
  -> API resolves shot + style + lane + constraints
  -> API selects configured local AI provider
  -> managed GPU task acquires shared lease when required
  -> provider performs inference
  -> provider-specific cleanup completes
  -> lease released
  -> API validates strict proposal schema
  -> Forge Lab receives proposal
  -> user applies proposal to live local preview state
  -> optional save writes proposal/evidence under tmp/
```

The AI does not write production art or canonical scene state.

## Suggested first motion proposal schema

The schema should reference named semantic controls rather than a universal set of arbitrary sliders.

Example:

```json
{
  "schemaVersion": 1,
  "shot": 3,
  "proposal": {
    "vesselHeaveScale": 0.9,
    "vesselRollScale": 0.8,
    "enkiCounterSwayScale": 1.05
  },
  "rationale": "...",
  "warnings": [],
  "status": "proposal"
}
```

Each field must have deterministic bounds defined by the shot/runtime contract. Unknown fields fail validation.

Do not standardize on fields such as `heave`, `roll`, `counterSway`, and `refractionStrength` for every shot. Shot 4 and later scenes have different semantic motion grammars.

## Canonical-state rule

The Forge Lab should always distinguish three values:

1. **canonical** — current resolved production value;
2. **proposal** — AI-proposed value;
3. **working** — current human-edited live audition value.

Reset must restore canonical exactly.

Saving a working state persists review/proposal evidence only. It does not mutate `animation-v1`.

## Artifact and evidence UX

The live Forge should link directly to:

- persisted animation jobs;
- job logs/attempts;
- production plans;
- candidate contact sheets;
- exact-frame proofs;
- GPU task receipts;
- critic responses;
- canonical readiness.

Interactive local rendering may open primary artifacts by default. Worker/API execution remains `--no-open` / `SRF_NO_OPEN=1`.

## Navigation strategy

First integration should be a stable route/deep link, for example:

```text
Angular Studio / shot review
  -> Open in Forge Lab
  -> http://localhost:<animation-lab-port>/forge/shot/3
```

A deep link keeps Angular and React ownership clean while the interface stabilizes.

Embedding through iframe or module federation is a later UX decision, not a prerequisite for making the React Forge useful again.

## Non-goals for the first implementation

- replacing Scene V2;
- making V3 contracts optional;
- changing promotion semantics;
- direct browser-to-model calls;
- adding a second GPU scheduler;
- auto-installing all provider runtimes;
- automatic model/provider switching mid-task;
- automatic canonical motion tuning;
- RAG/vector infrastructure;
- depth-map motion work;
- automatic promotion.

## Operational principle

The React Forge should become a better **human directing instrument**, not a more permissive automation path.

The desired system is:

> local AI proposes bounded cinematic choices; React/Remotion makes them immediately visible; deterministic QA constrains them; persisted evidence explains them; the human remains the authority that decides what becomes production state.
