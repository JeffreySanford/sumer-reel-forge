# Chapter 1 Production Plan

The chapter is about 16,700 words and is best handled as a short-form series rather than one long video. The current seed data covers the full 18-reel outline and a detailed 60-second storyboard for episode 1.

## Episode Strategy

- Start with episode 1, "The Voyage Begins", as the benchmark reel.
- Use cinematic generated stills as the default mode.
- Use optional AI video only for hero shots after the still-image pipeline works.
- Keep adult fertility myth material symbolic for public social platforms.
- Normalize names and remove draft notes before generating final captions.

## Local Pipeline Target

1. Extract chapter text from `.docx`.
2. Adapt one section into narration, captions, and shot prompts.
3. Generate stills through ComfyUI.
4. Generate narration through Kokoro or another local TTS.
5. Time captions with Whisper.
6. Render a 9:16 MP4 through FFmpeg.
7. Review and approve in the Angular dashboard.

## Current Scope

This repository currently implements the review and orchestration slice:

- [x] Shared reel contracts and seed data in `libs/reel-core`.
- [x] Nest API endpoints for chapter outline, episode details, and queued render jobs.
- [x] Angular dashboard for reviewing the first storyboard.
- [x] Postgres persistence through Prisma migrations.
- [x] API e2e coverage for Chapter 1 reel loading.
- [x] Render-job queue/status/stale groundwork.
- [x] GitHub CI coverage for quality, Storybook, and Playwright.
- [ ] Editable production fields for narration, shot prompts, and export metadata.
- [ ] Real renderer worker.
- [ ] Generated media asset persistence.

Rendering services are intentionally stubbed. They should be added after the first storyboard and visual style are approved.
