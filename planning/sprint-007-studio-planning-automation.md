# Sprint 007 - Studio Planning Automation

## Goal

Turn the successful Reel 1 planning/review process into a reusable Studio workflow so later reels can inherit approved style rules, generate structured direction packages, render benchmarks, capture review evidence, and turn human feedback into revision plans without rebuilding the process manually.

Sprint 006 remains the active visual-quality sprint. The provider/runtime foundation for Sprint 007 is now allowed to proceed in parallel because Ollama is already installed locally and the provider boundary can be implemented without freezing the still-evolving Reel 1 art direction. Persistence, style-rule promotion, automated critique, and UI workflow should still be driven by the approved Shot 3 / Shot 4 benchmark lessons rather than guessing ahead of them.

## Guiding Principle

Automate the workflow first. Use AI immediately where it adds proposal/critique value, but keep the workflow independent from AI.

The Studio must remain functional with `PLANNING_PROVIDER=deterministic` even when Ollama is unavailable.

## Current Implementation Slice

The first provider/runtime slice is implemented:

- [x] `PlanningProvider` abstraction.
- [x] deterministic planning provider.
- [x] local Ollama planning provider.
- [x] `GET /api/planning/capabilities`.
- [x] `POST /api/planning/shot-plan`.
- [x] Ollama `/api/tags` capability/model discovery.
- [x] Ollama `/api/chat` structured shot-plan proposal.
- [x] JSON-schema request contract plus application-side response validation.
- [x] inherited style rules are re-applied from Studio input rather than trusted from model output.
- [x] default camera-scale delta guardrail is enforced after model generation.
- [x] bounded Ollama request timeout.
- [x] `pnpm planning:ollama:check` local runtime command.
- [x] runtime/configuration documentation.
- [x] deterministic provider unit coverage.

This slice does not yet persist planning runs or apply proposals to Scene V2.

## Scope

### 1. Planning domain model

- [ ] Add persisted `PlanningRun` records.
- [ ] Add versioned planning artifacts.
- [ ] Add planning statuses: queued, running, proposal-ready, review, revision-requested, approved, rejected, failed, superseded.
- [ ] Record input hashes, source/style versions, provider/model metadata, timestamps, and approval history.
- [ ] Keep planning approval separate from reel publication approval.

### 2. Scene V2 and manifest validation

- [ ] Implement the `Animation Scene Schema V2` contract.
- [ ] Implement the animation asset manifest contract.
- [ ] Validate asset ids, paths, dimensions, checksums, alpha expectations, and required references.
- [ ] Validate shot timing and transition references.
- [ ] Validate camera requests against declared overscan where possible.
- [ ] Ensure source narration/story text remains immutable.

### 3. Deterministic planning provider

- [x] Add `PlanningProvider` abstraction.
- [x] Implement `deterministic` provider first.
- [ ] Load shot-intent context from reel production data server-side.
- [ ] Apply persisted inherited style decisions and motion-budget defaults.
- [ ] Scaffold Scene V2 and asset-manifest records.
- [ ] Select benchmark candidates using explicit rules rather than model judgment.

### 4. Style decision library

- [ ] Persist reusable approved style decisions.
- [ ] Support scope by project, chapter, reel, shot type, character, material, and transition type.
- [ ] Record source benchmark, rationale, and supersession history.
- [ ] Apply inherited rules to future planning runs.
- [ ] Surface conflicts/overrides for human review.

### 5. Studio planning workspace

- [ ] Add Reel Direction view.
- [ ] Add Shot Planner view.
- [ ] Add Asset Readiness view.
- [ ] Add keyframe checkpoint display.
- [ ] Add Candidate Review view with video, sampled frames, contact sheet, and scorecard.
- [ ] Add Revision Builder showing proposed before/after scene values.
- [ ] Add Style Decisions view with promote/override/supersede actions.
- [ ] Add Local Production Runtime status for Ollama, configured models, ComfyUI, FFmpeg, Whisper, Kokoro, Postgres, API, and renderer worker where practical.

### 6. Benchmark automation

- [ ] Queue a selected benchmark from the planning workspace.
- [ ] Render from Scene V2 + asset manifest.
- [ ] Extract configured review-marker frames automatically.
- [ ] Generate contact sheet and checksum-bearing review manifest.
- [ ] Attach scorecard instance to candidate.
- [ ] Preserve candidate/revision lineage.

### 7. Structured revision loop

- [ ] Capture free-form human review notes.
- [ ] Allow manual structured changes without AI.
- [ ] Represent revisions as path/from/to/reason changes.
- [ ] Preview scene diff before applying.
- [ ] Queue a new benchmark candidate from approved revision changes.
- [ ] Preserve A/B comparison history.

### 8. Local Ollama provider

- [x] Add local Ollama adapter behind `PlanningProvider`.
- [x] Configure base URL/model through environment/runtime settings.
- [x] Require structured-output validation for actionable shot-plan responses.
- [x] Support text planning independently from vision critique.
- [x] Add bounded timeout around local model calls.
- [x] Discover local models through Ollama capability endpoint.
- [x] Preserve human-approved style rules as authoritative Studio input.
- [ ] Persist provider/model/input hash/output hash for reproducibility.
- [ ] Add attempt/log/retry persistence around local model calls.
- [ ] Add prompt-template version metadata.
- [ ] Never allow model output to bypass human approval or deterministic validation.

### 9. AI review assistant

- [ ] Add a vision-provider operation behind the same planning/review boundary.
- [ ] Send only selected review markers/contact sheets plus relevant intent/rules/rubric.
- [ ] Propose scorecard notes from contact sheets / frames when a vision-capable model is configured.
- [ ] Translate vague feedback into candidate structured revision changes.
- [ ] Propose reusable style-rule candidates from approved A/B decisions.
- [ ] Clearly label all model-generated review content as proposals.

### 10. Reel 1 automation proof

Run the automated workflow through:

- [ ] Shot 3 Enki benchmark.
- [ ] Shot 4 Nammu benchmark.
- [ ] one additional non-benchmark Reel 1 shot.
- [ ] full Reel 1 direction/review state.

### 11. Reel 2 readiness test

Sprint 007 is not proven until a new reel can:

- [ ] inherit visual/style decisions;
- [ ] scaffold a direction package;
- [ ] identify required animation assets;
- [ ] produce a Scene V2 proposal;
- [ ] queue a benchmark;
- [ ] collect review artifacts;
- [ ] accept human revisions;
- [ ] rerender without a new bespoke React composition.

## Non-Goals

- No autonomous publication.
- No model-driven source-story rewriting.
- No requirement that Ollama be running for the Studio to start.
- No requirement to use one specific LLM.
- No automatic visual approval.
- No broad multi-agent system before the single-provider workflow works.
- No attempt to replace the human director/editor role.
- No moving Ollama into Docker merely for architectural symmetry.

## Acceptance Criteria

- [x] Provider-level Studio planning works with no LLM configured.
- [ ] Persisted planning workflow works with no LLM configured.
- [ ] Scene V2 and manifest proposals are validated before use.
- [ ] Planning and review runs are auditable and reproducible.
- [ ] Human notes can become explicit structured revisions.
- [ ] Approved decisions become reusable rules for future reels.
- [x] Ollama shot-plan output is schema-constrained and treated as a proposal.
- [ ] Ollama vision critique is schema-constrained and treated as a proposal.
- [ ] Shot 3 and Shot 4 can complete the planning/review/revision loop through the Studio.
- [ ] Reel 2 can begin without duplicating the Reel 1 planning process manually.

## Definition Of Done

The Studio acts like a production assistant: it remembers the approved visual language, prepares the next decision, gathers the evidence needed to judge it, and preserves the result. The human remains the director.
