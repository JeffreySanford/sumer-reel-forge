#!/usr/bin/env node

const apiBase = (process.env.API_BASE_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');
const rawArgs = process.argv.slice(2).filter((arg) => arg !== '--');
const jsonOutput = rawArgs.includes('--json');
const [command, ...args] = rawArgs.filter((arg) => arg !== '--json');

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  switch (command) {
    case 'status':
      return showStatus();
    case 'readiness':
      return showReadiness();
    case 'plan':
      return queue({ shot: shotOption(args), operation: 'plan' });
    case 'candidates':
      return queue({ shot: shotOption(args), operation: 'candidates' });
    case 'lane':
      return lane(args);
    case 'jobs':
      return showJobs();
    case 'job':
      return job(args);
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      return usage();
    default:
      throw new Error(`Unknown forge command: ${command}. Run forge help.`);
  }
}

async function showReadiness() {
  const readiness = await request('/runtime/animation-production');
  if (jsonOutput) return print(readiness);

  const shots = Array.isArray(readiness) ? readiness : readiness?.shots ?? readiness?.items ?? [];
  if (!Array.isArray(shots) || shots.length === 0) {
    console.log('No animation readiness records returned. Use --json to inspect the raw API response.');
    return;
  }

  console.log('Reel 1 animation readiness');
  console.log('--------------------------');
  for (const shot of shots) {
    const shotNumber = shot.sourceShotNumber ?? shot.shot ?? shot.shotNumber ?? '?';
    const name = shot.shotId ?? shot.id ?? 'unnamed-shot';
    const required = shot.requiredLayerCount ?? 0;
    const ready = shot.readyRequiredLayerCount ?? 0;
    const optional = shot.optionalLayerCount ?? 0;
    const activation = shot.activationState ?? shot.status ?? 'unknown';
    const requiredState = required === ready ? 'READY' : `${ready}/${required} READY`;
    console.log(`Shot ${shotNumber}: ${name} · ${activation} · required ${requiredState} · optional ${optional}`);
  }
  console.log('\nUse `forge readiness --json` for the full evidence graph.');
}

async function showStatus() {
  const [gpu, jobs] = await Promise.all([
    request('/runtime/gpu-status'),
    request('/animation-jobs'),
  ]);
  if (jsonOutput) return print({ gpu, animationJobs: jobs });

  const device = gpu?.nvidia?.devices?.[0];
  const lease = gpu?.lease?.state ?? 'UNKNOWN';
  const ollamaModels = gpu?.ollama?.loadedModels ?? [];
  const queued = jobs.filter((job) => job.status === 'queued').length;
  const running = jobs.filter((job) => job.status === 'running').length;
  const failed = jobs.filter((job) => job.status === 'failed').length;
  const complete = jobs.filter((job) => job.status === 'complete').length;

  console.log('Sumer Reel Forge status');
  console.log('-----------------------');
  console.log(`GPU lease: ${lease}`);
  if (device) {
    console.log(`GPU: ${device.name} · ${device.memoryFreeMb} MB free / ${device.memoryTotalMb} MB total · ${device.utilizationGpuPercent}% util`);
  } else {
    console.log('GPU: NVIDIA telemetry unavailable');
  }
  console.log(`Ollama loaded: ${ollamaModels.length ? ollamaModels.map((model) => model.name ?? model.model ?? String(model)).join(', ') : 'none'}`);
  console.log(`Animation jobs: ${queued} queued · ${running} running · ${failed} failed · ${complete} complete`);
  console.log('\nUse `forge status --json` for raw runtime telemetry.');
}

async function showJobs() {
  const jobs = await request('/animation-jobs');
  if (jsonOutput) return print(jobs);
  if (!jobs.length) {
    console.log('No animation jobs.');
    return;
  }

  console.log('Animation jobs');
  console.log('--------------');
  for (const job of jobs) {
    const target = job.layer ? `Shot ${job.shot} / ${job.layer}` : `Shot ${job.shot}`;
    console.log(`${job.id} · ${job.status.toUpperCase()} · ${job.operation} · ${target} · attempts ${job.attemptCount ?? 0}`);
  }
  console.log('\nUse `forge jobs --json` for full job records.');
}

async function lane(args) {
  const [operation, ...options] = args;
  if (!['preflight', 'generate', 'verify', 'run'].includes(operation)) {
    throw new Error('Use forge lane preflight|generate|verify|run --shot=<n> --layer=<id>.');
  }
  return queue({
    shot: shotOption(options),
    layer: requiredOption(options, 'layer'),
    operation,
  });
}

async function job(args) {
  const [action, jobId] = args;
  if (!jobId) throw new Error('A job id is required.');
  if (action === 'logs') return print(await request(`/animation-jobs/${jobId}/logs`));
  if (action === 'attempts') return print(await request(`/animation-jobs/${jobId}/attempts`));
  if (action === 'show') return print(await request(`/animation-jobs/${jobId}`));
  if (action === 'retry') {
    return print(
      await request(`/animation-jobs/${jobId}/retry`, {
        method: 'POST',
        body: { notes: option(args.slice(2), 'notes') },
      }),
    );
  }
  throw new Error('Use forge job show|logs|attempts|retry <id>.');
}

async function queue(body) {
  const job = await request('/animation-jobs', { method: 'POST', body });
  if (jsonOutput) {
    print(job);
  } else {
    console.log(`Queued ${job.operation} for Shot ${job.shot}${job.layer ? ` / ${job.layer}` : ''}.`);
    console.log(`Job: ${job.id}`);
  }
  console.error('A managed local animation worker executes the existing production authority.');
  console.error('Safety: this command cannot promote animation-v1.');
}

async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    method: options.method ?? 'GET',
    headers: options.body ? { 'content-type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(removeUndefined(options.body)) : undefined,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${options.method ?? 'GET'} ${path} failed (${response.status}): ${text}`);
  }
  return text.trim() ? JSON.parse(text) : null;
}

function shotOption(args) {
  const value = Number(requiredOption(args, 'shot'));
  if (!Number.isInteger(value) || value < 1) throw new Error('--shot must be a positive integer.');
  return value;
}

function requiredOption(args, name) {
  const value = option(args, name);
  if (!value) throw new Error(`--${name}=<value> is required.`);
  return value;
}

function option(args, name) {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function removeUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function usage() {
  console.log(`Sumer Reel Forge production CLI\n\n` +
    `  forge status [--json]\n` +
    `  forge readiness [--json]\n` +
    `  forge plan --shot=5 [--json]\n` +
    `  forge candidates --shot=5 [--json]\n` +
    `  forge lane preflight --shot=5 --layer=<id>\n` +
    `  forge lane generate --shot=5 --layer=<id>\n` +
    `  forge lane verify --shot=5 --layer=<id>\n` +
    `  forge lane run --shot=5 --layer=<id>\n` +
    `  forge jobs [--json]\n` +
    `  forge job show <id>\n` +
    `  forge job logs <id>\n` +
    `  forge job attempts <id>\n` +
    `  forge job retry <id> [--notes=<text>]\n\n` +
    `Human-readable summaries are the default; --json exposes the full API evidence.\n` +
    `All production commands are API-driven and stop before promotion.`);
}
