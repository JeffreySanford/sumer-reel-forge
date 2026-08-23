# ComfyUI API workflows

Reel Forge deliberately uses separate local ComfyUI workflow contracts for different production jobs.

## Whole-shot image generation

Export a ComfyUI workflow in API format and set `COMFYUI_WORKFLOW_PATH` to its local path. The existing whole-shot renderer replaces these string tokens anywhere in the JSON document:

- `{{PROMPT}}`
- `{{NEGATIVE_PROMPT}}`
- `{{SEED}}`
- `{{OUTPUT_PREFIX}}`

## Animation-layer candidates

Animation-v1 layer separation/derivation uses a different workflow configured with `COMFYUI_LAYER_WORKFLOW_PATH`. It must accept the uploaded approved editorial source image and preserve full-canvas registration.

See [`animation-layer-candidates.md`](./animation-layer-candidates.md) for the complete token, output, safety, and review contract.

Do not silently reuse a whole-shot workflow for layer generation unless that workflow has explicitly been authored and validated for the layer-candidate contract.

Keep checkpoint names, custom-node paths, and machine-specific model locations out of source control. Validate local workflows directly in ComfyUI before using them through Reel Forge.
