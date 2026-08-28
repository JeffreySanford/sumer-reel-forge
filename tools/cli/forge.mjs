#!/usr/bin/env node

const apiBase = (process.env.API_BASE_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');
const [command, ...args] = process.argv.slice(2).filter((arg) => arg !== '--');

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  switch (command) {
    case 'status':
      return showStatus();
    case 'readiness':
      return print(await request('/runtime/animation-production'));
    case 'plan':
      return queue({ shot: shotOption(args), operation: 'plan' });
    case 'candidates':
      return queue({ shot: shotOption(args), operation: 'candidates' });
    case 'lane':
      return lane(args);
    case 'jobs':
      return print(await request('/animation-jobs'));
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

async function showStatus() {
  const [gpu, jobs] = await Promise.all([
    request('/runtime/gpu-status'),
    request('/animation-jobs'),
  ]);
  print({ gpu, animationJobs: jobs });
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
  print(job);
  console.error('Queued only. A local animation worker will execute the existing production authority.');
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
    `  forge status\n` +
    `  forge readiness\n` +
    `  forge plan --shot=5\n` +
    `  forge candidates --shot=5\n` +
    `  forge lane preflight --shot=5 --layer=<id>\n` +
    `  forge lane generate --shot=5 --layer=<id>\n` +
    `  forge lane verify --shot=5 --layer=<id>\n` +
    `  forge lane run --shot=5 --layer=<id>\n` +
    `  forge jobs\n` +
    `  forge job show <id>\n` +
    `  forge job logs <id>\n` +
    `  forge job attempts <id>\n` +
    `  forge job retry <id> [--notes=<text>]\n\n` +
    `All production commands are API-driven and stop before promotion.`);
}
