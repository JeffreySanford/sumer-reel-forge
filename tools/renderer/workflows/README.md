# ComfyUI API Workflow

Export a ComfyUI workflow in API format and set `COMFYUI_WORKFLOW_PATH` to its local path. The renderer replaces these string tokens anywhere in the JSON document:

- `{{PROMPT}}`
- `{{NEGATIVE_PROMPT}}`
- `{{SEED}}`
- `{{OUTPUT_PREFIX}}`

Keep checkpoint names and machine-specific model paths out of source control. Validate a workflow directly in ComfyUI before queueing a studio `final-video` job.
