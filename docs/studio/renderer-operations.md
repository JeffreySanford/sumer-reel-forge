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

## Editorial Reel 1

Run the curated cut only after the API and Postgres are available:

```sh
pnpm renderer:preflight
pnpm render:editorial:reel1
```

Set `RENDER_ADAPTER=editorial` when running preflight directly. The render command sets it for its one-shot worker, queues a `draft-video` job, validates the final codecs and dimensions with FFprobe, and leaves every revision in job history. It never overwrites an earlier job or removes a Docker volume.

The editorial adapter is intentionally limited to Reel 1 and requires all eight files under `EDITORIAL_ASSET_DIRECTORY`. Use `pnpm tts:kokoro:setup` for the locked, checksum-verified narration runtime and `pnpm tts:kokoro:audition` for voice comparisons. Windows SAPI remains an explicit fallback.

`pnpm render:final:reel1` queues `final-video` and therefore fails unless the reel is already `approved`. A successful final render returns the reel to `approved` for the separate publish decision. Never use the final command to bypass voice, score, caption, or platform review.

External-process errors are retained in chunked renderer logs. The status note is bounded to the API DTO limit so even a verbose FFmpeg failure closes the job and its attempt instead of leaving it running.
