import 'dotenv/config';

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000/api';
const maxAgeSeconds = Number(process.env.RENDER_STALE_MAX_AGE_SECONDS ?? 900);
const intervalMs = Number(process.env.RENDER_WATCHDOG_INTERVAL_MS ?? 60000);
const runOnce = process.argv.includes('--once');

let stopping = false;

process.on('SIGINT', () => {
  stopping = true;
});

process.on('SIGTERM', () => {
  stopping = true;
});

async function main() {
  console.log(
    `Render watchdog polling ${apiBaseUrl}; stale threshold ${maxAgeSeconds}s`,
  );

  do {
    const failedJobs = await markStaleJobs();
    console.log(`Watchdog marked ${failedJobs.length} stale job(s).`);

    if (runOnce) {
      return;
    }

    await delay(intervalMs);
  } while (!stopping);
}

async function markStaleJobs() {
  const url = new URL(`${apiBaseUrl}/render-jobs/watchdog/stale`);
  url.searchParams.set('maxAgeSeconds', String(maxAgeSeconds));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'x-request-id': `render-watchdog-${Date.now()}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Watchdog request failed with HTTP ${response.status}`);
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
