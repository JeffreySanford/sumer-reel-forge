# Sumer Reel Forge

An Nx workspace for turning _Blessings of Sumer_ chapters into short-form video reels.

## Projects

- `web`: Angular storyboard/review dashboard.
- `api`: NestJS API for reel metadata and render-job orchestration.
- `reel-core`: shared TypeScript contracts and seed data.

## Local Development

Install dependencies:

```sh
pnpm install
```

Run the review dashboard:

```sh
pnpm web
```

Run the API:

```sh
pnpm api
```

Start the complete local studio runtime:

```sh
pnpm start:all
```

`start:all` profiles the workstation, starts or reuses the managed ComfyUI runtime when it is installed, starts Postgres through Docker Compose, starts the Angular/Nest dev servers on ports 4200 and 3000, and starts the managed renderer worker. It fails fast if workspace dependencies are missing or stale; run `pnpm install` yourself before retrying.

PostgreSQL data remains in the named `postgres-data` Docker volume when `start:all` is stopped. Startup migrations are additive, and the normal Chapter 1 seed only creates missing records. Existing reel edits, shots, jobs, assets, reviews, and audit rows are preserved. Use `pnpm db:seed:chapter1:refresh` only when you intentionally want to replace Chapter 1 reel and shot content with the repository seed.

## ComfyUI: Local Visual AI Engine

ComfyUI is the GPU-backed visual AI engine used by Reel Forge for operations such as segmentation, masking, depth estimation, background reconstruction, inpainting, image editing, and candidate layer generation. Reel Forge remains the production orchestrator: Angular/NestJS decides what should be produced, ComfyUI performs the GPU visual processing, and generated candidates still require human approval before they can become `animation-v1` assets.

The intended production flow is:

```txt
approved editorial painting
        ↓
Reel Forge layer-production plan
        ↓
ComfyUI workflow
        ↓
NVIDIA GPU / CUDA
        ↓
candidate masks, depth, transparent layers, reconstruction
        ↓
Reel Forge validation and human review
        ↓
approved animation-v1 material
```

### One-time setup

The managed setup currently targets NVIDIA CUDA workstations. Before running it, make sure `nvidia-smi`, Git, and `uv` are available on the command line.

Run once from the repository root:

```sh
pnpm comfyui:setup
```

The setup command now provisions the complete baseline visual-AI runtime needed for layer-production work:

- verifies the NVIDIA driver first;
- resolves the latest stable ComfyUI release rather than following unstable development commits;
- installs ComfyUI under ignored `.cache/comfyui/ComfyUI`;
- creates an isolated Python 3.13 environment under `.cache/comfyui/.venv`;
- installs NVIDIA-enabled PyTorch and the ComfyUI dependencies;
- verifies that PyTorch can actually see the CUDA GPU;
- downloads the curated Reel Forge vision models listed in `tools/comfyui/managed-models.json`;
- verifies every managed model with its pinned SHA-256 before it is accepted;
- writes an ignored `.cache/comfyui/managed-models-state.json` record of the verified local model state.

The baseline managed models are intentionally small and purpose-specific rather than a general collection of generative checkpoints:

| Model | Purpose | ComfyUI location | Approx. size |
| --- | --- | --- | ---: |
| `sam3.1_multiplex_fp16.safetensors` | text/box/point-guided semantic segmentation for water, subjects, props, masks | `models/checkpoints/` | 1.75 GB |
| `birefnet.safetensors` | foreground/background separation and clean alpha masks | `models/background_removal/` | 444 MB |

SAM 3.1 is distributed under its upstream `sam-license`; BiRefNet is MIT licensed. The source URLs, destination paths, and pinned hashes live in the tracked managed-model manifest so the installer is auditable and reproducible.

Downloads are atomic. Files are streamed to a `.part` file, verified, and only then renamed into ComfyUI's model directory. An interrupted or corrupt download is rejected. Re-running setup hashes an existing managed file and reuses it when it still matches the pinned artifact; it does not download the same multi-gigabyte file again.

For a machine like this one where the ComfyUI/Python runtime is already installed and only the curated models need to be added or reverified, use:

```sh
pnpm comfyui:models:setup
```

The full setup remains intentionally non-destructive. Re-running it uses an existing checkout and virtual environment instead of silently upgrading the ComfyUI source tree. Normal `start:all` startup never installs or updates ComfyUI or downloads models.

To provision only the runtime and deliberately skip the curated models:

```sh
pnpm comfyui:setup -- --runtime-only
```

or set `COMFYUI_INSTALL_MODELS=false`.

### Normal startup after setup

After the one-time setup, normal development is simply:

```sh
pnpm start:all
```

Reel Forge checks `http://127.0.0.1:8188` first. If ComfyUI is already running there, Reel Forge reuses it and does not own or stop that process. If the port is free and the managed installation exists, Reel Forge starts ComfyUI automatically and stops only that managed instance when Reel Forge shuts down. If ComfyUI is not installed, the rest of Reel Forge still starts and the Studio reports layer production as setup-required instead of incorrectly reporting the NVIDIA GPU as unavailable.

To opt out of managed startup and run ComfyUI yourself:

```env
COMFYUI_MANAGED=false
```

The main overrides are documented in `.env.sample`:

```env
COMFYUI_BASE_URL=http://127.0.0.1:8188
COMFYUI_DIRECTORY=.cache/comfyui/ComfyUI
COMFYUI_VENV_DIRECTORY=.cache/comfyui/.venv
COMFYUI_MANAGED=true
COMFYUI_INSTALL_MODELS=true
```

### Verify the ComfyUI host

With `pnpm start:all` running, inspect the live ComfyUI node/model inventory without queueing any GPU generation:

```sh
node tools/scripts/inventory-comfyui-layer-host.mjs --json
```

The inventory reports ComfyUI reachability, node types, likely segmentation/matting/background-removal/depth/inpaint capabilities, and model/resource selections. It does not submit a prompt and does not start a generation job.

You can also inspect the API directly:

```txt
GET http://localhost:3000/api/runtime/capabilities
GET http://localhost:3000/api/runtime/comfyui-inventory
```

The first production target is Reel 1 Shot 3 water, `shot03-water-v1`. The curated setup now supplies the SAM 3.1 and BiRefNet model prerequisites. The dedicated `COMFYUI_LAYER_WORKFLOW_PATH` remains a separate production contract: the first API-format workflow must be authored and validated specifically for preservation-first Shot 3 extraction before candidate generation is enabled.

### GPU memory note

ComfyUI and Ollama can both reserve substantial VRAM. On a workstation GPU, keep ComfyUI generation concurrency conservative and avoid keeping an unnecessary large Ollama model resident during heavier image processing. `ollama ps` shows currently loaded models; a specific model can be released with `ollama stop <model>` when GPU memory needs to be freed for ComfyUI.

Validate and run the renderer after the API is running:

```sh
pnpm renderer:preflight
pnpm renderer:worker -- --once
pnpm render:prototype:reel1
pnpm tts:kokoro:setup
pnpm tts:kokoro:audition
pnpm render:editorial:reel1
```

The final command is deliberately separate and requires the reel to be approved:

```sh
pnpm render:final:reel1
```

Run the stale-job watchdog once:

```sh
pnpm render:watchdog -- --once
```

Useful API routes:

```txt
GET  http://localhost:3000/api/health
GET  http://localhost:3000/api/docs
GET  http://localhost:3000/api/docs-json
GET  http://localhost:3000/api/runtime/capabilities
GET  http://localhost:3000/api/runtime/comfyui-inventory
GET  http://localhost:3000/api/chapters/1/reels
GET  http://localhost:3000/api/chapters/1/reels/1
POST http://localhost:3000/api/render-jobs
POST http://localhost:3000/api/render-jobs/claim
GET  http://localhost:3000/api/render-jobs/{jobId}/attempts
GET  http://localhost:3000/api/render-jobs/{jobId}/logs
POST http://localhost:3000/api/render-jobs/{jobId}/retry
PATCH http://localhost:3000/api/render-jobs/{jobId}/heartbeat
POST http://localhost:3000/api/render-jobs/watchdog/stale
POST http://localhost:3000/api/generated-assets
PATCH http://localhost:3000/api/generated-assets/{assetId}/review
POST http://localhost:3000/api/generated-assets/{assetId}/regenerate
```

Example render-job payload:

```json
{
  "episodeId": 1,
  "mode": "storyboard",
  "notes": "First local prototype"
}
```

## Docker

Start Postgres:

```sh
pnpm docker:dev
```

Open a database shell:

```sh
pnpm db:psql
```

Prepare the isolated API e2e database without touching development data:

```sh
pnpm db:prepare:e2e
```

The deterministic `mock` adapter is the default. Set `RENDER_ADAPTER=local` to use the configured ComfyUI, TTS, Whisper, and FFmpeg integrations. The `editorial` adapter consumes the versioned Reel 1 frames, uses locked project-local Kokoro or an explicit Windows SAPI fallback, generates an ambience bed and word timings, burns safe-area captions, adds a subtitle track, and persists a 60-second draft through the worker. See `documentation/studio/local-renderer-prerequisites.md`.

## Documentation

- Studio documentation: `documentation/studio`
- Blessings of Sumer documentation: `documentation/projects/blessings-of-sumer`
- Agile planning: `planning`
- Initial database schema: `db/schema.sql`

## Quality Gates

```sh
pnpm format
pnpm lint
pnpm test
pnpm build
pnpm e2e
pnpm storybook:build
```
