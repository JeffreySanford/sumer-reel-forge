# Renderer Operations

## Job Flow

1. The API queues a render job.
2. A worker atomically claims the oldest queued job and creates an attempt row.
3. The worker loads the persisted episode, writes heartbeats, and runs the selected adapter.
4. Every artifact is checksummed and persisted before the manifest.
5. Completion or failure closes the attempt; final-video reels return to `approved` for review.

## Approval Flow

`draft -> review -> approved -> rendering -> approved -> published`

Production edits always reset the reel to `draft`. A final-video job is rejected unless the reel is `approved`. Failed final jobs also return the reel to `approved` so they can be retried without bypassing editorial control.

## Failure Operations

- Inspect attempts and logs in the Angular dashboard or through `GET /api/render-jobs/{id}/attempts` and `/logs`.
- Requeue a failed job with `POST /api/render-jobs/{id}/retry`; attempt count and prior errors remain intact.
- Run `pnpm render:watchdog -- --once` to fail stale jobs immediately.
- Asset regeneration creates a new job linked through audit history rather than overwriting an existing file row.

## File Boundary

Local content streaming resolves every `file:` URI against `RENDER_OUTPUT_ROOT`. Paths outside that root and non-file URIs are rejected. This endpoint must still be protected by authentication before the API is exposed beyond localhost.
