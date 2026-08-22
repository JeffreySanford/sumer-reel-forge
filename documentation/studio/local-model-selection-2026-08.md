# Local Ollama Model Selection - August 2026

## Purpose

Record the current local-model strategy for Sumer Reel Forge. Model names remain runtime configuration rather than domain data so this document can become stale without coupling the Studio to one vendor/model generation.

## Current Local Inventory

The workstation currently reports these Ollama models:

```text
qwen-coder-7b-8k:latest
qwen-coder-7b-4k:latest
qwen2.5-coder:7b
neural-chat:latest
llama2:latest
dscv2-16b-8k:latest
qwen2.5-coder:1.5b
deepseek-coder-v2:16b-lite-instruct-q4_0
mistral:7b
nomic-embed-text:latest
codellama:7b
deepseek-coder:6.7b
codellama:13b
```

This is enough to test text planning immediately, but the inventory is mostly older/code-oriented and contains no obvious vision-capable model for keyframe/contact-sheet review.

## Recommended Minimal Additions

Do not install a large catalog. Start with one general text planner and one vision reviewer.

### Text planning default

Recommended:

```bash
ollama pull qwen3:8b
```

Reason:

- general instruction/reasoning model rather than a code-specialized model;
- tool/thinking capable;
- about 5.2 GB in the current Ollama library default build;
- reasonable fit for a 10 GB GPU while leaving more headroom than 14B-class options.

Temporary no-download option:

```text
qwen2.5-coder:7b
```

This can exercise the provider now, but it is not the preferred long-term creative-direction model because its specialization is coding.

### Vision-review default

Conservative recommendation:

```bash
ollama pull qwen3-vl:4b-instruct
```

Reason:

- text + image input;
- about 3.3 GB default build;
- 256K advertised context;
- enough headroom for contact sheets/keyframes on a 10 GB GPU;
- safer when the same workstation also runs ComfyUI/other GPU workloads.

Stronger optional candidate:

```bash
ollama pull qwen3-vl:8b-instruct
```

The current default build is about 6.1 GB. It should be evaluated against the 4B model on the actual Reel 1 review rubric before becoming the default.

Qwen3-VL requires Ollama 0.12.7 or newer. `pnpm planning:ollama:check` now reports the detected Ollama version and warns when a configured Qwen3-VL model is paired with an older runtime.

## Alternate Multimodal Candidate

Gemma 4 is also a current multimodal family. `gemma4:12b` is currently listed around 7.6 GB with text/image input and a 256K context window. It may fit a 10 GB GPU, but weights plus KV cache/runtime overhead make it a tighter workstation choice than Qwen3-VL 4B/8B, especially if ComfyUI is active.

Avoid making a roughly 9.6 GB model the default on a 10 GB GPU unless measured runtime behavior shows it is acceptable.

## Recommended First Configuration

Git Bash:

```bash
export PLANNING_PROVIDER=ollama
export OLLAMA_BASE_URL=http://localhost:11434
export OLLAMA_TEXT_MODEL=qwen3:8b
export OLLAMA_VISION_MODEL=qwen3-vl:4b-instruct
export PLANNING_TIMEOUT_MS=45000
```

PowerShell:

```powershell
$env:PLANNING_PROVIDER="ollama"
$env:OLLAMA_BASE_URL="http://localhost:11434"
$env:OLLAMA_TEXT_MODEL="qwen3:8b"
$env:OLLAMA_VISION_MODEL="qwen3-vl:4b-instruct"
$env:PLANNING_TIMEOUT_MS="45000"
```

Important: `$env:NAME=...` is PowerShell syntax. It will fail in Git Bash. Git Bash uses `export NAME=value`.

Then run:

```bash
pnpm planning:ollama:check
pnpm start:all
```

## Model Evaluation Plan

Do not choose models from generic benchmarks alone. Evaluate them on our actual production tasks.

### Text-planner benchmark

Give each candidate the same Shot 3 and Shot 4 context and score:

- schema compliance;
- style-rule compliance;
- restrained motion proposals;
- number of unnecessary assets/effects;
- usefulness of unresolved questions;
- revision quality;
- latency;
- reproducibility across repeated low-temperature runs.

### Vision-review benchmark

Give each candidate the same approved/rejected keyframe sets and score:

- identifies deliberate camera excess;
- detects foreground competition;
- notices face/identity drift;
- notices caption obstruction;
- distinguishes physical from numinous motion intent;
- avoids inventing problems not visible in the evidence;
- proposes actionable Scene V2 changes rather than generic prose.

## Runtime Policy

- model choice is configurable;
- deterministic planning remains the baseline;
- text and vision may use different models;
- model output is always a proposal;
- AI-generated scores do not equal human approval;
- do not run large Ollama and ComfyUI workloads concurrently unless GPU memory behavior has been measured;
- record model/version/input hashes once PlanningRun persistence is implemented.
