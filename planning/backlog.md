# Backlog

## Epic 1 - Studio Foundation

- [x] Choose and wire the persistence layer for the schema in `db/schema.sql`.
- [x] Add Postgres persistence for projects, chapters, reels, render jobs, assets, and audit logs.
- [x] Generate frontend API types from OpenAPI.
- [x] Add request ids and structured logging.
- [x] Add stale-job query groundwork.
- [x] Add command-driven stale-job watchdog automation.
- [ ] Add OS-level scheduled stale-job watchdog service.
- [x] Add CI workflow for security audit, lint, test, build, API e2e, Storybook build, and web e2e.
- [x] Add bounded CI timeouts for long-running steps.
- [x] Add `start:all` local stack script.
- [x] Add Windows Ctrl+C process and port cleanup for `start:all`.
- [x] Make normal startup seeding non-destructive and preserve the PostgreSQL volume on shutdown.
- [x] Isolate API e2e data in a dedicated `_e2e` database and temporary API process.

## Epic 2 - Blessings Of Sumer Pilot

- [x] Move Chapter 1 source metadata into persistent records.
- [x] Seed all 18 Chapter 1 reel records.
- [x] Expand all 18 Chapter 1 reels into detailed storyboard records.
- [x] Establish visual bible for Enki, Nammu, Dilmun, Martu, and the Stag of the Absu.
- [x] Render the first deterministic 60-second technical prototype locally.
- [x] Render the first editorial prototype with approved generated imagery and provisional narration.
- [x] Review the editorial baseline against platform safety and style consistency.
- [x] Replace Windows narration in the review candidate with project-local Kokoro.
- [x] Add and technically validate the deterministic ambience score candidate.
- [ ] Complete human voice/score listening approval and render the final-video candidate.
- [ ] Establish Reel 1 as the publication-quality animation benchmark before animating Reel 2.

## Epic 3 - Local Rendering Pipeline

- [x] Scaffold renderer worker script.
- [x] Add no-op render job claiming and heartbeat updates.
- [x] Integrate ComfyUI image generation adapter.
- [x] Add configurable command-driven TTS adapter.
- [x] Add Whisper caption timing adapter.
- [x] Add FFmpeg assembly.
- [x] Persist asset manifests.
- [x] Persist renderer stdout/stderr logs.
- [x] Persist retry attempts and failure history.
- [x] Add deterministic mock renderer and prerequisite preflight.
- [x] Add curated editorial renderer with motion, timed captions, title treatment, media validation, and persisted manifests.
- [x] Add locked Kokoro setup, voice auditions, checksum-verified model cache, and Python quality gates.
- [x] Bound verbose renderer failures to the API status-note contract while retaining full chunked logs.

## Epic 4 - Review Workflow

- [x] Add approval states: draft, review, approved, rendering, published.
- [x] Add editable narration and shot prompts.
- [x] Add per-shot asset review.
- [x] Add approve, reject, regenerate, review-note, preview, and failed-job retry controls.
- [x] Add export metadata for Facebook, X, TikTok, and YouTube Shorts.
- [x] Add copy/export controls for prompts and platform metadata.

## Epic 5 - Cinematic Animation Pipeline

### Technical proof - complete

- [x] Add Remotion proof renderer for vertical MP4 output.
- [x] Define initial layered cinematic scene schema.
- [x] Add animation adapter to the renderer worker.
- [x] Add short cinematic style-test render loop.
- [x] Add contact-sheet style-review artifact generation.
- [x] Add Markdown style-review report generation.
- [x] Persist cinematic style-review artifacts through generated-asset API.
- [x] Add second motion-proof review for shot-to-shot animation language.
- [x] Add complete 60-second Reel 1 Remotion animation draft.
- [x] Route full Reel 1 animation draft through the renderer worker.
- [x] Persist animation manifests with scene version and asset checksums.
- [x] Review animated generated assets in the existing studio dashboard.

### Reel 1 quality benchmark - active

- [x] Define Reel 1 animation style bible and motion grammar.
- [x] Define reel-wide cinematic direction, timing/attention map, asset-preparation workflow, and repeatable review scorecard.
- [x] Define Shot 3 keyframe checkpoints and Shot 4 Nammu as the contrasting benchmark.
- [ ] Use Shot 3, Enki at the helm, as the primary 8-12 second publication-quality benchmark.
- [ ] Create versioned layered `animation-v1` assets derived from or consistent with approved `editorial-v1` artwork.
- [ ] Replace procedural SVG character/environment art as the principal visual source for the benchmark.
- [ ] Implement reusable camera, parallax, atmosphere, lighting, water, boat, blink, breathing, and foreground primitives.
- [ ] Make benchmark scene data authoritative through Remotion input props or an equivalent single scene-data path.
- [ ] Add a fast benchmark render, sampled-frame, contact-sheet, and review-report loop.
- [ ] Tune independent camera, boat, character, foreground, water, light, and atmosphere timing.
- [ ] Score benchmark against art continuity, depth, motion restraint, camera, atmosphere/light, character life, and publishability.
- [ ] Require no rubric score below 4 and publishability 5 before scaling the style.
- [ ] Prove the contrasting visual grammar with Shot 4, Nammu beneath the water.
- [ ] Propagate the approved style across all eight Reel 1 shots.
- [ ] Render and review a complete 60-second Reel 1 animation-v1 candidate.
- [ ] Keep final publication as an explicit human approval gate.

### Deferred until Reel 1 style approval

- [ ] Add Rhubarb Lip Sync integration for mouth-shape timing when visible on-camera speech actually requires it.
- [ ] Add reusable character asset conventions for pose, eye, mouth, and expression layers beyond the minimal benchmark kit.
- [ ] Add broad skeletal rigging only if the approved Reel 1 style demonstrates a need.
- [ ] Begin Reel 2 animation production only after Reel 1 animation quality is approved.
- [ ] Consider PixiJS/WebGL only when a measured rendering or scene-complexity problem justifies it.

## Epic 6 - Data-Driven Animation Reuse

This epic begins with Reel 1 but exists to prevent later reels from requiring one-off animation code.

- [x] Define the planned Scene V2 contract for camera transforms, layer depth, motion presets, masks, easing, timing, transitions, review markers, and asset references.
- [x] Define a reusable animation asset manifest contract with source lineage, semantic roles, material tags, checksums, overscan, and review state.
- [ ] Implement Scene V2 validation.
- [ ] Implement animation asset-manifest validation.
- [ ] Pass scene JSON into a generic Remotion composition rather than mirroring the same scene in hard-coded React.
- [ ] Keep story/narration data sourced from the reel production record while animation scene data owns visual composition.
- [ ] Validate asset existence, dimensions, transparency expectations, and camera overscan before rendering.
- [ ] Record source editorial asset, derived layer checksum, semantic role, depth, and motion preset in animation manifests.
- [ ] Ensure a future Reel 2 can be produced primarily from new data and assets rather than a new `FullReel2Animation.tsx`.

## Epic 7 - Automated Reel Planning And Direction

The goal is to turn the Reel 1 planning/review conversation into a repeatable Studio workflow for many reels.

### Deterministic workflow - required

- [x] Document the automated planning/review architecture.
- [x] Plan Sprint 007 Studio Planning Automation.
- [x] Implement the first `PlanningProvider` abstraction in the Nest API.
- [x] Implement the deterministic/template provider baseline.
- [x] Expose planning runtime capabilities and structured shot-plan proposal endpoints.
- [x] Add a local runtime check command for Ollama model discovery.
- [ ] Persist `PlanningRun` and versioned planning artifacts.
- [ ] Add planning status, attempt, log, timeout, input-hash, and approval history.
- [ ] Load reel source, visual bible, style bible, and inherited decisions server-side for planning runs.
- [ ] Scaffold shot intent cards, keyframe markers, Scene V2, and asset-manifest proposals from reel data and approved style rules.
- [ ] Add a persistent style-decision library with project/chapter/reel/character/material/shot-type scopes.
- [ ] Inherit approved style decisions into later reels automatically.
- [ ] Add Studio Reel Direction, Shot Planner, Asset Readiness, Candidate Review, Revision Builder, and Style Decisions surfaces.
- [ ] Queue benchmark renders from the planning workspace.
- [ ] Extract configured review-marker frames and contact sheets automatically.
- [ ] Persist scorecard instances and A/B candidate lineage.
- [ ] Convert human feedback into explicit path/from/to/reason revision records.
- [ ] Preview scene diffs before applying revisions and rerendering.

### Optional local AI provider - implementation started

- [x] Add Ollama behind the same `PlanningProvider` interface without making it a required runtime dependency.
- [x] Configure base URL, text model, vision model, and bounded timeout through environment settings.
- [x] Use Ollama `/api/tags` for local model discovery.
- [x] Use schema-constrained `/api/chat` output for shot-plan proposals.
- [x] Validate actionable model responses before returning a proposal.
- [x] Preserve inherited Studio style rules even if model output attempts to change them.
- [x] Enforce the current default 5% camera-scale planning guardrail before accepting a model proposal.
- [x] Support text planning independently from the future vision-review path.
- [ ] Persist provider/model/input hash/output hash for reproducibility.
- [ ] Add retry/attempt/log persistence around local model calls.
- [ ] Add vision review against contact sheets and configured review-marker frames.
- [ ] Translate human review notes into structured revision proposals.
- [ ] Propose reusable style-rule candidates from approved A/B decisions.
- [ ] Never allow an AI provider to approve visual assets, alter source text silently, or publish a reel.

### Automation proof

- [ ] Run Shot 3 through planning -> assets -> benchmark -> review -> revision -> approval in the Studio.
- [ ] Run Shot 4 through the same workflow.
- [ ] Run one additional Reel 1 shot primarily from inherited rules.
- [ ] Use Reel 2 as the first proof that the process can be repeated without recreating the Reel 1 planning work manually.
