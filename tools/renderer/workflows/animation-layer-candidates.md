# ComfyUI animation-layer candidate workflow

Reel Forge uses a **separate ComfyUI workflow** for animation-layer candidates. Do not point `COMFYUI_LAYER_WORKFLOW_PATH` at the existing whole-shot image workflow unless it has explicitly been authored to satisfy this contract.

The layer workflow is local/machine-specific because checkpoint names, custom nodes, segmentation models, and filesystem model locations vary between hosts. Export the workflow from ComfyUI in API format and set:

```bash
export COMFYUI_LAYER_WORKFLOW_PATH=/path/to/animation-layer-workflow-api.json
```

The Reel Forge generator uploads the approved editorial source frame to ComfyUI before submitting each layer job and replaces these string tokens anywhere in the API workflow JSON:

- `{{SOURCE_IMAGE}}` — uploaded input filename returned by ComfyUI;
- `{{SOURCE_SUBFOLDER}}` — uploaded input subfolder, usually blank;
- `{{LAYER_PROMPT}}` — preservation-first extraction/derivation instruction;
- `{{PROMPT}}` — alias of `{{LAYER_PROMPT}}` for workflows that use the existing prompt token;
- `{{NEGATIVE_PROMPT}}` — identity/composition drift exclusions;
- `{{SEED}}` — randomized integer seed;
- `{{OUTPUT_PREFIX}}` — deterministic shot/layer-oriented output prefix;
- `{{SHOT_ID}}` — Scene V2 / animation manifest shot id;
- `{{LAYER_ID}}` — animation-v1 layer id;
- `{{LAYER_ROLE}}` — semantic layer role;
- `{{LAYER_MATERIAL}}` — material classification.

## Required behavior

A compatible workflow must:

1. load the uploaded `{{SOURCE_IMAGE}}` as the authoritative source;
2. derive/extract the requested layer rather than inventing a new composition;
3. output exactly one primary PNG candidate per prompt;
4. preserve the source canvas dimensions and pixel registration;
5. use transparency when the manifest layer is intended as an overlay/mask/subject extraction;
6. preserve source identity, historical design, palette, lighting direction, and perspective;
7. avoid automatic cropping or latent-size output that changes canvas dimensions;
8. write an ordinary ComfyUI output image so `/history/<prompt_id>` exposes it.

Reel Forge validates the returned PNG dimensions against the approved source frame. A mismatched candidate fails before it is written into the candidate review set.

## Safety / editorial boundary

Generated files are written only under:

```text
tmp/animation-assets/candidates/<manifest-id>/<timestamp>/
```

Candidate generation **never** writes directly to the approved `assets/.../animation-v1/...` paths and never modifies `manifest.json`.

The lifecycle remains:

```text
planned
  ↓
AI / ComfyUI candidate
  ↓
pending human review
  ↓
manual promotion to ready
  ↓
human approval
  ↓
approved manifest state
  ↓
Scene V2 layered activation
```

An AI-generated candidate cannot activate animation by itself.

## Shot 3 targets

Default generation (`--shot=3`) produces only layers required for activation:

- `shot03-background-v1` — clean distant environment/background plate;
- `shot03-water-v1` — water and reflection material only;
- `shot03-vessel-v1` — exact Stag of the Absu vessel extraction;
- `shot03-enki-body-v1` — exact Enki body/clothing identity extraction.

`--all-layers` additionally includes foreground rigging and the closed-eye reference state. Those should be attempted only after the required layer set is visually stable.

## Shot 4 targets

Default generation (`--shot=4`) produces:

- `shot04-deep-water-v1`;
- `shot04-mid-current-v1`;
- `shot04-surface-refraction-v1`;
- `shot04-nammu-coherence-mask-v1`.

Nammu remains environmental. The coherence workflow must not turn the mask into a hard woman-shaped cutout, mermaid, horror figure, glowing-eyed entity, aura, or fantasy particle effect.

## Commands

Check readiness without using the GPU:

```bash
node tools/scripts/animation-layer-candidates.mjs preflight --shot=3
node tools/scripts/animation-layer-candidates.mjs preflight --shot=4
```

Generate required candidates:

```bash
node tools/scripts/animation-layer-candidates.mjs generate --shot=3
node tools/scripts/animation-layer-candidates.mjs generate --shot=4
```

Generate one named layer:

```bash
node tools/scripts/animation-layer-candidates.mjs generate --shot=3 --layer=shot03-water-v1
```

Generate optional layers too:

```bash
node tools/scripts/animation-layer-candidates.mjs generate --shot=3 --all-layers
```

The generator reads `COMFYUI_MAX_PARALLEL` when explicitly set; otherwise it reuses the persisted `start:all` hardware profile's ComfyUI concurrency recommendation.
