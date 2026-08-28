# React Forge + Local AI Roadmap

Status: **PLANNING ONLY**

This roadmap is intentionally separated from the persisted animation-job / Forge CLI work already landing on `master`.

## Why this is a separate capability track

The current automation work establishes production orchestration:

- persisted animation jobs in Postgres;
- local animation worker claim / heartbeat / logs / attempts / retry lifecycle;
- `forge` CLI as a thin API client;
- managed `start:all` ownership of the animation worker;
- shared cross-process GPU ownership through the existing runtime lease;
- managed Ollama planning and vision execution;
- explicit human promotion gates.

The React/Remotion Forge Lab is a different concern: **interactive cinematic authoring and live audition**. It should consume those production services rather than bypass or duplicate them.

## Product intent

Restore the React/Remotion side of Reel Forge as an active production surface rather than treating it only as a batch renderer.

Target interaction:

```text
structured shot state
  -> local AI proposal
  -> schema validation
  -> React/Remotion live audition
  -> human parameter adjustment
  -> tmp/ proposal/evidence persistence
  -> deterministic QA
  -> human review
  -> existing explicit promotion authority
```

AI remains advisory:

> AI proposes. Rules constrain. Human directs.

The Forge Lab MUST NOT write directly to `animation-v1` and MUST NOT implement its own promotion path.

## Architectural rules

1. **Do not add a second GPU lock or VRAM scheduler.** All GPU-capable local AI providers must participate in the existing `tools/runtime/gpu-resource-lease.mjs` / `gpu-ai-task.mjs` ownership model.
2. **Do not move production authority into React.** React owns live audition state and authoring UX. NestJS/API owns persisted jobs and server-side proposal orchestration. Existing deterministic scripts remain production authorities until deliberately generalized.
3. **Do not let provider abstraction erase capability differences.** Ollama, llama.cpp, LM Studio, and NVIDIA NIM may expose similar chat APIs, but lifecycle, model inventory, unload behavior, vision support, structured output, GPU residency, and setup requirements differ.
4. **Ollama remains the first managed provider.** It already participates in managed setup, model inventory, shared GPU ownership, unload-under-lease, runtime telemetry, and planning/vision workflows.
5. **Other providers begin as external/local endpoints.** The Forge may connect to them, but `start:all` should not automatically install or launch them until provider-specific lifecycle behavior is proven safe.
6. **Workers/API jobs remain non-interactive.** They use `SRF_NO_OPEN=1`; the Forge Lab is the interactive review surface.
7. **No generated proposal is canonical.** Motion proposals, prompt proposals, critic results, and experimental parameter sets remain under `tmp/` or another explicitly non-canonical evidence area.

## Provider abstraction

Introduce a server-side local AI provider contract. Do not put direct provider networking in the React client.

Conceptual interface:

```ts
interface LocalAiProvider {
  id: 'ollama' | 'llamacpp' | 'lmstudio' | 'nvidia-nim';
  capabilities(): LocalAiCapabilities;
  listModels(): Promise<ModelDescriptor[]>;
  chat(request: ManagedChatRequest): Promise<ManagedChatResult>;
}
```

Capabilities should be explicit, for example:

```ts
{
  text: true,
  vision: true,
  structuredOutput: true,
  modelInventory: true,
  managedUnload: true,
  managedStartup: false,
  openAiCompatible: false
}
```

The provider contract sits **above** the existing GPU-task wrapper. Provider adapters may describe how to invoke and clean up a backend; they do not own cross-process scheduling.

### Initial provider roles

**Ollama — primary managed provider**

- default text/vision planning backend;
- managed model inventory/setup;
- managed unload before lease release;
- runtime residency visible through existing GPU status telemetry.

**llama.cpp — optional external provider**

- useful for GGUF-based local inference and constrained workstation experiments;
- connect through its server API;
- do not assume Ollama-style model stop/unload semantics;
- lifecycle management is deferred until measured.

**LM Studio — optional workstation/provider-development surface**

- useful for interactive model evaluation and local OpenAI-compatible serving;
- treat as externally managed initially;
- do not make GUI/server availability a production dependency.

**NVIDIA NIM — optional accelerated provider**

- evaluate only against actual supported GPU/model profiles;
- treat container/runtime ownership separately from Ollama;
- no hard-coded claim that it is appropriate for a specific VRAM tier without support-matrix evidence.

## Forge Lab scope

Preferred location: the existing React/Remotion animation application, not a second animation engine.

The first useful screen should provide:

- shot selector and resolved shot identity;
- current canonical Scene V2/V3-derived state;
- Remotion Player live preview;
- editable bounded motion parameters;
- local-AI proposal action;
- proposal rationale and model/provenance display;
- current lane/style decisions supplied as evidence;
- deterministic QA summary;
- links to persisted animation jobs/logs/evidence;
- save proposal to `tmp/`;
- explicit handoff to existing review/promotion tooling.

Do not add a Promote button in the first Forge Lab milestone. Promotion can be surfaced later only by calling the existing checksum-backed authority and requiring the exact `APPROVE_SHOT_X` confirmation.

## API boundary

Preferred endpoints are proposal-oriented and provider-neutral:

```text
GET  /api/local-ai/providers
GET  /api/local-ai/models
POST /api/ai/motion/propose
POST /api/ai/critic/review
POST /api/forge/proposals
GET  /api/forge/shots/:shot
```

A proposal response should include:

- schema version;
- provider;
- model;
- model digest/version when available;
- source shot id/number;
- exact Style Decision / lane / contract evidence supplied;
- proposed parameter values;
- bounded ranges;
- rationale;
- GPU task receipt reference when GPU-managed;
- timestamps;
- status=`proposal`.

Malformed or out-of-range model output fails closed and never reaches live runtime state until validated.

## Angular relationship

Angular remains the studio/operations/review dashboard. The React Forge Lab becomes the motion-authoring/audition surface.

Integration should begin with a simple deep link from Angular to a dedicated Forge Lab URL. Do **not** start with iframe or module federation unless there is a demonstrated UX need.

Possible later options:

1. deep-link into the React Forge Lab — preferred first step;
2. iframe/local composition — acceptable if same-origin/local routing is clean;
3. module federation — only if shared shell integration becomes worth the complexity.

## Delivery sequence

### PR A — provider contract + Ollama adapter

- introduce provider-neutral server-side types;
- wrap the existing managed Ollama runtime instead of replacing it;
- expose provider/model capability inventory;
- preserve existing Ollama planning callers;
- no UI change;
- no second GPU scheduler.

Acceptance:

- current Ollama planning/vision tests remain green;
- provider contract can represent Ollama and one mock OpenAI-compatible backend;
- Ollama still unloads before lease release;
- `/api/runtime/gpu-status` remains authoritative for live GPU state.

### PR B — React Forge Lab read-only live audition

- expose a shot-focused Forge Lab route;
- load current resolved production state through API;
- render the canonical Remotion/Scene V2 composition in a Player;
- show Style Decisions, lane maturity, readiness, and job/evidence links;
- no AI mutation yet;
- no filesystem writes.

Acceptance:

- Shot 3 and Shot 4 open as live canonical auditions;
- values shown in the Forge match existing scene/runtime authorities;
- React Forge does not become a second source of canonical state.

### PR C — local AI motion proposals

- add schema-constrained `motion/propose` endpoint;
- feed exact shot/lane/style context;
- validate bounded motion parameters;
- allow human apply/revert inside local Forge state;
- persist accepted-for-review proposals to `tmp/forge-proposals/`;
- no promotion.

Acceptance:

- Ollama proposal works through existing GPU lease;
- applying a proposal changes only live preview/local proposal state;
- reset returns exactly to canonical values;
- proposal provenance is persisted.

### PR D — optional provider adapters

Implement adapters one at a time:

1. llama.cpp;
2. LM Studio;
3. NVIDIA NIM.

Each adapter must declare capabilities and pass contract tests. Provider availability failure must degrade cleanly to the configured provider/default Ollama path.

### PR E — critic/evidence integration

- live/contact-sheet critic review;
- advisory scores/notes only;
- persist request/context/response evidence;
- never auto-approve, auto-reject canonical human approvals, or promote.

### PR F — Angular navigation integration

- add `Open in Forge Lab` from shot/review surfaces;
- return links to jobs/evidence/review state;
- choose deep link before iframe/module federation complexity.

## Deferred until measured

- automatically starting llama.cpp, LM Studio, or NIM from `start:all`;
- automatic provider switching during one task;
- provider-specific VRAM eviction heuristics outside the shared lease;
- Chroma/vector RAG;
- depth-map animation as part of the provider abstraction;
- generalized auto-tuning loops;
- automatic promotion.

## Success definition

This initiative succeeds when the React/Remotion Forge is again a first-class daily production surface without weakening the automation architecture already established:

```text
Forge CLI / Angular Studio -> API + persisted jobs
                              |
                              +-> local AI provider abstraction
                              |      -> existing shared GPU ownership
                              |
                              +-> React/Remotion Forge Lab
                                     -> live audition
                                     -> human-tuned proposal
                                     -> tmp/ evidence
                                     -> deterministic QA
                                     -> existing human promotion gate
```

The key outcome is not "support four LLM servers." The outcome is **one trustworthy local-AI production contract feeding one interactive cinematic Forge while preserving one canonical production authority**.
