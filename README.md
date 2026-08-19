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

Useful API routes:

```txt
GET  http://localhost:3000/api/health
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

The compose file is a development convenience for the Angular and Nest apps:

```sh
docker compose up
```

The rendering stack is not wired yet. The intended next services are ComfyUI, local TTS, Whisper, and an FFmpeg renderer.

## Quality Gates

```sh
pnpm lint
pnpm test
pnpm build
```
