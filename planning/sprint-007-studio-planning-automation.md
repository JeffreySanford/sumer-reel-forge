# Sprint 007 - Studio Planning Automation

## Goal

Turn the successful Reel 1 planning/review process into a reusable Studio workflow so later reels can inherit approved style rules, generate structured direction packages, render benchmarks, capture review evidence, and turn human feedback into revision plans without rebuilding the process manually.

Sprint 006 remains the active visual-quality sprint. Sprint 007 should begin after the Shot 3 and Shot 4 benchmark language is sufficiently stable to automate rather than prematurely automating a moving target.

## Guiding Principle

Automate the workflow first. Add AI as an optional planning provider second.

The Studio must remain functional with `PLANNING_PROVIDER=deterministic`.

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

- [ ] Add `PlanningProvider` abstraction.
- [ ] Implement `deterministic` provider first.
- [ ] Scaffold shot-intent cards from reel production data.
- [ ] Apply inherited style decisions and motion-budget defaults.
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

### 8. Optional Ollama provider

- [ ] Add local Ollama adapter behind `PlanningProvider`.
- [ ] Configure base URL/model through environment/runtime settings.
- [ ] Require structured-output validation for all actionable responses.
- [ ] Support text planning independently from vision critique.
- [ ] Add bounded timeout/retry/logging around local model calls.
- [ ] Persist provider/model/input hash/output hash for reproducibility.
- [ ] Never allow model output to bypass human approval or deterministic validation.

### 9. Optional AI review assistant

- [ ] Propose scorecard notes from contact sheets / frames when a vision-capable provider is configured.
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
- No requirement to install Ollama.
- No requirement to use one specific LLM.
- No automatic visual approval.
- No broad multi-agent system before the single-provider workflow works.
- No attempt to replace the human director/editor role.

## Acceptance Criteria

- [ ] Studio planning works with no LLM configured.
- [ ] Scene V2 and manifest proposals are validated before use.
- [ ] Planning and review runs are auditable and reproducible.
- [ ] Human notes can become explicit structured revisions.
- [ ] Approved decisions become reusable rules for future reels.
- [ ] Optional Ollama output is schema-constrained and treated as a proposal.
- [ ] Shot 3 and Shot 4 can complete the planning/review/revision loop through the Studio.
- [ ] Reel 2 can begin without duplicating the Reel 1 planning process manually.

## Definition Of Done

The Studio acts like a production assistant: it remembers the approved visual language, prepares the next decision, gathers the evidence needed to judge it, and preserves the result. The human remains the director.