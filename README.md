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

Useful API routes:

```txt
GET  http://localhost:3000/api/health
GET  http://localhost:3000/api/docs
GET  http://localhost:3000/api/docs-json
GET  http://localhost:3000/api/chapters/1/reels
GET  http://localhost:3000/api/chapters/1/reels/1
POST http://localhost:3000/api/render-jobs
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

The rendering stack is not wired yet. The intended next services are ComfyUI, local TTS, Whisper, and an FFmpeg renderer.

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
