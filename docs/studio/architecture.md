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
- Generated assets should be referenced by manifest rows, not hidden in ad hoc folders.

## Persistence

The first schema draft lives in `db/schema.sql`. It is intentionally SQL-first until the ORM/migration choice is made. The expected next implementation step is to introduce a typed persistence layer and migrations, then replace in-memory render jobs with database-backed records.

## Process Safety

Long-running render and model jobs should store:

- `queued_at`, `started_at`, `finished_at`
- `heartbeat_at`
- `status`
- `attempt_count`
- `input_hash`
- `stdout_log_path`
- `stderr_log_path`
- `output_asset_id`

A watchdog should mark jobs stale when `heartbeat_at` exceeds the allowed threshold for that job type.
