import 'dotenv/config';

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000/api';
const workerId =
  process.env.RENDER_WORKER_ID ?? `local-renderer-${process.pid}`;
const heartbeatIntervalMs = Number(
  process.env.RENDER_HEARTBEAT_INTERVAL_MS ?? 10000,
);
const mockRenderMs = Number(process.env.RENDER_MOCK_DURATION_MS ?? 15000);
const runOnce = process.argv.includes('--once');

let stopping = false;

process.on('SIGINT', () => {
  stopping = true;
});

process.on('SIGTERM', () => {
  stopping = true;
});

async function main() {
  console.log(`Renderer worker ${workerId} polling ${apiBaseUrl}`);

  do {
    const job = await claimJob();

    if (!job) {
      if (runOnce) {
        console.log('No queued render jobs.');
        return;
      }

      await delay(5000);
      continue;
    }

    await processJob(job);
  } while (!stopping && !runOnce);
}

async function claimJob() {
  const response = await fetch(`${apiBaseUrl}/render-jobs/claim`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-request-id': `${workerId}-claim-${Date.now()}`,
    },
    body: JSON.stringify({ workerId }),
  });

  if (!response.ok) {
    throw new Error(`Claim failed with HTTP ${response.status}`);
  }

  return response.json();
}

async function processJob(job) {
  console.log(`Claimed render job ${job.id} for episode ${job.episodeId}`);

  const heartbeat = setInterval(() => {
    void sendHeartbeat(job.id, 'Renderer scaffold heartbeat.').catch((error) =>
      console.error(error),
    );
  }, heartbeatIntervalMs);

  try {
    await sendHeartbeat(job.id, 'Renderer scaffold accepted job.');
    await delay(mockRenderMs);

    if (stopping) {
      await updateStatus(job.id, 'failed', 'Renderer worker stopped.');
      return;
    }

    const manifest = await createManifest(job);
    await updateStatus(
      job.id,
      'complete',
      `Renderer scaffold completed with manifest ${manifest.id}.`,
    );
  } catch (error) {
    await updateStatus(
      job.id,
      'failed',
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  } finally {
    clearInterval(heartbeat);
  }
}

async function sendHeartbeat(jobId, notes) {
  const response = await fetch(`${apiBaseUrl}/render-jobs/${jobId}/heartbeat`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      'x-request-id': `${workerId}-heartbeat-${Date.now()}`,
    },
    body: JSON.stringify({ notes }),
  });

  if (!response.ok) {
    throw new Error(`Heartbeat failed with HTTP ${response.status}`);
  }
}

async function updateStatus(jobId, status, notes) {
  const response = await fetch(`${apiBaseUrl}/render-jobs/${jobId}/status`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      'x-request-id': `${workerId}-status-${Date.now()}`,
    },
    body: JSON.stringify({
      status,
      heartbeat: status === 'running',
      notes,
    }),
  });

  if (!response.ok) {
    throw new Error(`Status update failed with HTTP ${response.status}`);
  }
}

async function createManifest(job) {
  const response = await fetch(`${apiBaseUrl}/generated-assets`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-request-id': `${workerId}-asset-${Date.now()}`,
    },
    body: JSON.stringify({
      renderJobId: job.id,
      assetType: 'manifest',
      uri: `file://tmp/renders/${job.id}/manifest.json`,
      metadata: {
        scaffold: true,
        workerId,
        episodeId: job.episodeId,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Manifest creation failed with HTTP ${response.status}`);
  }

  return response.json();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
