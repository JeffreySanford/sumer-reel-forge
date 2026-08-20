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

Start the local studio stack:

```sh
pnpm start:all
```

`start:all` starts Postgres through Docker Compose and starts the Angular/Nest dev servers on ports 4200 and 3000. It fails fast if dependencies are missing or stale; run `pnpm install` yourself before retrying.

Validate and run the renderer after the API is running:

```sh
pnpm renderer:preflight
pnpm renderer:worker -- --once
pnpm render:prototype:reel1
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

The deterministic `mock` adapter is the default. Set `RENDER_ADAPTER=local` to use the configured ComfyUI, TTS, Whisper, and FFmpeg integrations; see `docs/studio/local-renderer-prerequisites.md`.

## Documentation

- Studio docs: `docs/studio`
- Blessings of Sumer docs: `docs/projects/blessings-of-sumer`
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
