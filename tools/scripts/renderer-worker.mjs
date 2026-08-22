import 'dotenv/config';
import { join } from 'node:path';
import {
  prepareOutputDirectory,
  sha256,
  toFileUri,
  writeJson,
} from '../renderer/artifact-utils.mjs';
import { renderAnimationPipeline } from '../renderer/animation-adapter.mjs';
import { renderEditorialPipeline } from '../renderer/editorial-adapter.mjs';
import { renderLocalPipeline } from '../renderer/local-adapter.mjs';
import { renderMockPipeline } from '../renderer/mock-adapter.mjs';
import { RendererApi } from '../renderer/renderer-api.mjs';
import { loadRendererConfig } from '../renderer/renderer-config.mjs';
import { boundedStatusNote } from '../renderer/status-utils.mjs';

const config = loadRendererConfig();
const api = new RendererApi(config.apiBaseUrl, config.workerId);
const runOnce = process.argv.includes('--once');
let stopping = false;

process.on('SIGINT', requestStop);
process.on('SIGTERM', requestStop);

async function main() {
  console.log(
    `Renderer worker ${config.workerId} polling ${config.apiBaseUrl} with ${config.adapter} adapter.`,
  );

  do {
    const job = await api.claimJob();
    if (!job) {
      if (runOnce) {
        console.log('No queued render jobs.');
        return;
      }
      await delay(config.pollIntervalMs);
      continue;
    }

    const succeeded = await processJob(job);
    if (!succeeded && runOnce) {
      process.exitCode = 1;
    }
  } while (!stopping && !runOnce);
}

async function processJob(job) {
  const logger = createJobLogger(job.id);
  const heartbeat = setInterval(() => {
    void api
      .heartbeat(job.id, `Worker ${config.workerId} is active.`)
      .catch((error) => logger.log('stderr', 'error', error.message));
  }, config.heartbeatIntervalMs);

  try {
    await logger.log(
      'system',
      'info',
      `Claimed ${job.mode} job ${job.id} for episode ${job.episodeId}.`,
    );
    const episode = await api.getEpisode(job.episodeId);
    const outputDirectory = await prepareOutputDirectory(
      config.outputRoot,
      job.id,
    );
    const context = {
      episode,
      job,
      outputDirectory,
      config,
      log: logger.log,
    };
    const artifacts = await withTimeout(
      selectPipeline(config.adapter)(context),
      config.jobTimeoutMs,
      `Render job ${job.id}`,
    );

    const persistedAssets = [];
    for (const artifact of artifacts) {
      persistedAssets.push(await persistArtifact(job, artifact));
    }

    const manifestPath = join(outputDirectory, 'manifest.json');
    await writeJson(manifestPath, {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      adapter: config.adapter,
      workerId: config.workerId,
      job,
      episode: {
        chapter: episode.chapter,
        episode: episode.episode,
        title: episode.title,
      },
      assets: persistedAssets,
    });
    const manifest = await persistArtifact(job, {
      assetType: 'manifest',
      path: manifestPath,
      metadata: {
        schemaVersion: 1,
        adapter: config.adapter,
        assetCount: persistedAssets.length,
      },
    });
    await api.updateStatus(
      job.id,
      'complete',
      `Completed with manifest ${manifest.id}.`,
    );
    await logger.log(
      'system',
      'info',
      `Render completed with ${persistedAssets.length} artifacts.`,
    );
    logger.close();
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await logger.log('stderr', 'error', message);
    await api
      .updateStatus(job.id, 'failed', boundedStatusNote(message))
      .catch((statusError) => {
        console.error(
          `Could not mark job ${job.id} failed: ${statusError.message}`,
        );
      });
    logger.close();
    return false;
  } finally {
    clearInterval(heartbeat);
  }
}

function selectPipeline(adapter) {
  switch (adapter) {
    case 'mock':
      return renderMockPipeline;
    case 'local':
      return renderLocalPipeline;
    case 'editorial':
      return renderEditorialPipeline;
    case 'animation':
      return renderAnimationPipeline;
    default:
      throw new Error(
        `Unknown RENDER_ADAPTER '${adapter}'. Use mock, local, editorial, or animation.`,
      );
  }
}

async function persistArtifact(job, artifact) {
  return api.createAsset({
    renderJobId: job.id,
    assetType: artifact.assetType,
    shotNumber: artifact.shotNumber,
    uri: toFileUri(artifact.path),
    checksum: await sha256(artifact.path),
    metadata: artifact.metadata ?? {},
  });
}

function createJobLogger(jobId) {
  let closed = false;
  let pending = Promise.resolve();

  const log = async (stream, level, message) => {
    const normalized = String(message).trim();
    if (!normalized) {
      return;
    }
    const consoleMethod =
      level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
    console[consoleMethod](`[${jobId}] ${normalized}`);
    if (closed) {
      return;
    }
    for (const chunk of chunkMessage(normalized)) {
      pending = pending
        .then(() => api.createLog(jobId, { stream, level, message: chunk }))
        .catch((error) => {
          console.error(`Could not persist worker log: ${error.message}`);
        });
    }
    await pending;
  };

  return {
    log,
    close() {
      closed = true;
    },
  };
}

function chunkMessage(message) {
  const chunks = [];
  for (let index = 0; index < message.length; index += 3900) {
    chunks.push(message.slice(index, index + 3900));
  }
  return chunks;
}

function withTimeout(promise, timeoutMs, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(
        () =>
          reject(
            new Error(`${label} exceeded ${Math.round(timeoutMs / 1000)}s.`),
          ),
        timeoutMs,
      );
    }),
  ]).finally(() => clearTimeout(timer));
}

function requestStop() {
  stopping = true;
  console.log('Renderer worker will stop after the active operation.');
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
