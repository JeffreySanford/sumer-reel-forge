import { resolve } from 'node:path';

process.env.ACTOR_SEMANTIC_GROUP_DEFINITION ??= resolve(
  'tools/animation/actors/enki-semantic-groups-v1.json',
);
process.env.ACTOR_SEMANTIC_VISION_PROXY_META ??=
  process.env.ENKI_SEMANTIC_VISION_PROXY_META;
process.env.ACTOR_SEMANTIC_VISION_PROXY_IMAGE ??=
  process.env.ENKI_SEMANTIC_VISION_PROXY_IMAGE;
process.env.ACTOR_SEMANTIC_GROUP_TIMEOUT_MS ??=
  process.env.ENKI_SEMANTIC_GROUP_TIMEOUT_MS;

await import('./actor-semantic-grouped-vision-hook.mjs');
