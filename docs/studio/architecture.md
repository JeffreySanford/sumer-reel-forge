# Studio Architecture

## Target Runtime

```txt
Angular review dashboard
        |
        v
NestJS API / orchestration layer
        |
        +--> Postgres: projects, chapters, episodes, jobs, assets, audit logs
        +--> Renderer worker: FFmpeg composition and process supervision
        +--> ComfyUI: local image/video generation
        +--> TTS service: narration
        +--> Whisper service: caption timing
```

## Data Ownership

- API owns persistence and job state.
- Frontend consumes DTOs generated from OpenAPI.
- Workers update job status through API endpoints rather than editing database records directly.
- Generated assets are referenced by checksum-bearing manifest rows and can only be streamed from the configured render root.

## Persistence

PostgreSQL is the durable store and Prisma owns migrations, generated persistence types, and the API database client. The SQL draft remains in `db/schema.sql` as a human-readable baseline, while `prisma/schema.prisma` is the executable schema for local development.

Primary commands:

- `pnpm db:generate` generates Prisma Client.
- `pnpm db:migrate` applies local migrations to the configured `DATABASE_URL`.
- `pnpm db:seed:chapter1` persists the Chapter 1 reel plan and writes an audit row.
- `pnpm db:psql` opens a psql shell inside the Docker database container.

## Process Safety

Long-running render and model jobs should store:

- `queued_at`, `started_at`, `finished_at`
- `heartbeat_at`
- `status`
- `attempt_count`
- `worker_id`
- `input_hash`
- structured stdout/stderr log rows
- `output_asset_id`

A watchdog should mark jobs stale when `heartbeat_at` exceeds the allowed threshold for that job type.

Current scaffold:

- [x] Render jobs persist `started_at`, `finished_at`, `heartbeat_at`, `attempt_count`, and `worker_id`.
- [x] `pnpm renderer:worker` claims queued jobs and sends heartbeat/status updates through the API.
- [x] `pnpm render:watchdog` marks stale queued/running jobs as failed through the API.
- [x] Generated asset manifests persist URI, type, checksum, metadata, and render-job linkage.
- [x] Render attempts and structured worker logs persist independently of the current job state.
- [x] ComfyUI, configurable TTS, Whisper, FFmpeg, and deterministic mock adapters are implemented.
- [x] Reel approval and generated-asset review transitions are audited.
- [ ] Authentication and role-based approval authorization are required before remote deployment.
