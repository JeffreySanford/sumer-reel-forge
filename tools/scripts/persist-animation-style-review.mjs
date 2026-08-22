import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { sha256, toFileUri, writeJson } from '../renderer/artifact-utils.mjs';
import { runProcess } from '../renderer/process-runner.mjs';

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000/api';
const episodeId = Number(process.env.ANIMATION_STYLE_REVIEW_EPISODE_ID ?? 1);
const outputDirectory = resolve(
  process.env.ANIMATION_STYLE_REVIEW_OUTPUT_DIRECTORY ??
    'tmp/renders/animation-style-review',
);
const reviewManifestPath = join(outputDirectory, 'style-review-manifest.json');
const persistedManifestPath = join(
  outputDirectory,
  'style-review-persisted-assets.json',
);

await runProcess(process.execPath, [
  resolve('tools/scripts/render-animation-style-review.mjs'),
]);

const reviewManifest = JSON.parse(await readFile(reviewManifestPath, 'utf8'));
const job = await request('/render-jobs', {
  method: 'POST',
  body: {
    episodeId,
    mode: 'draft-video',
    notes: 'Cinematic animation style-review artifact bundle.',
  },
});
console.log(`Queued style-review job ${job.id}.`);

await request(`/render-jobs/${job.id}/status`, {
  method: 'PATCH',
  body: {
    status: 'running',
    heartbeat: true,
    notes: 'Persisting cinematic animation style-review artifacts.',
  },
});

const assets = [];
for (const artifact of reviewArtifacts(reviewManifest)) {
  const persisted = await request('/generated-assets', {
    method: 'POST',
    body: {
      renderJobId: job.id,
      assetType: artifact.assetType,
      uri: toFileUri(artifact.path),
      checksum: artifact.checksum ?? (await sha256(artifact.path)),
      metadata: artifact.metadata,
    },
  });
  assets.push(persisted);
}

await writeJson(persistedManifestPath, {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  renderJobId: job.id,
  episodeId,
  sourceReviewManifest: reviewManifestPath,
  assets: assets.map((asset) => ({
    id: asset.id,
    assetType: asset.assetType,
    uri: asset.uri,
    contentUrl: asset.contentUrl,
    checksum: asset.checksum,
    metadata: asset.metadata,
  })),
});

const persistedManifestAsset = await request('/generated-assets', {
  method: 'POST',
  body: {
    renderJobId: job.id,
    assetType: 'manifest',
    uri: toFileUri(persistedManifestPath),
    checksum: await sha256(persistedManifestPath),
    metadata: {
      role: 'persisted-style-review-assets',
      adapter: 'animation-style-review',
      assetCount: assets.length,
    },
  },
});
assets.push(persistedManifestAsset);

await request(`/render-jobs/${job.id}/status`, {
  method: 'PATCH',
  body: {
    status: 'complete',
    notes: `Persisted ${assets.length} cinematic animation style-review assets.`,
  },
});

console.log(`Persisted ${assets.length} style-review assets to job ${job.id}.`);
console.log(`Persisted manifest: ${persistedManifestPath}`);

function reviewArtifacts(manifest) {
  const frames = Array.isArray(manifest.frames) ? manifest.frames : [];
  return [
    {
      assetType: 'video',
      path: manifest.sourceVideo.path,
      checksum: manifest.sourceVideo.checksum,
      metadata: {
        role: 'cinematic-style-review-video',
        adapter: 'animation-style-review',
        durationSeconds: manifest.sourceVideo.durationSeconds,
        reviewType: manifest.reviewType,
      },
    },
    {
      assetType: 'image',
      path: manifest.contactSheet.path,
      checksum: manifest.contactSheet.checksum,
      metadata: {
        role: 'cinematic-style-contact-sheet',
        adapter: 'animation-style-review',
        sampledFrameCount: frames.length,
      },
    },
    ...frames.map((frame) => ({
      assetType: 'image',
      path: frame.path,
      checksum: frame.checksum,
      metadata: {
        role: 'cinematic-style-sampled-frame',
        adapter: 'animation-style-review',
        seconds: frame.seconds,
      },
    })),
    {
      assetType: 'manifest',
      path: manifest.sourceManifest.path,
      checksum: manifest.sourceManifest.checksum,
      metadata: {
        role: 'cinematic-style-source-manifest',
        adapter: 'animation-style-review',
        sceneId: manifest.sourceManifest.sceneId,
        styleTarget: manifest.sourceManifest.styleTarget,
      },
    },
    {
      assetType: 'manifest',
      path: reviewManifestPath,
      checksum: undefined,
      metadata: {
        role: 'cinematic-style-review-manifest',
        adapter: 'animation-style-review',
        reviewType: manifest.reviewType,
      },
    },
    {
      assetType: 'other',
      path: manifest.report.path,
      checksum: undefined,
      metadata: {
        role: 'cinematic-style-review-report',
        adapter: 'animation-style-review',
        format: 'markdown',
      },
    },
  ];
}

async function request(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: options.body ? { 'content-type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    throw new Error(
      `${path} returned HTTP ${response.status}: ${await response.text()}`,
    );
  }
  return response.json();
}
