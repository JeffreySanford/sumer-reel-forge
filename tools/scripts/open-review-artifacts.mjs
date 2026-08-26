import { access, readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SUPPORTED = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.mp4',
  '.webm',
  '.mov',
]);
const SHOT03_ROI_ROOT = resolve(
  'tmp/animation-assets/resegmentation/shot03-roi-search',
);

export function shouldOpenReviewArtifacts(args = process.argv.slice(2)) {
  return !args.includes('--no-open');
}

export async function maybeOpenReviewArtifacts(paths, options = {}) {
  const enabled =
    options.enabled ?? shouldOpenReviewArtifacts(options.args ?? process.argv.slice(2));
  if (!enabled) {
    console.log('[OPEN] skipped (--no-open)');
    return [];
  }
  return openReviewArtifacts(paths, options);
}

export async function openReviewArtifacts(paths, options = {}) {
  const files = [];
  for (const value of paths ?? []) {
    if (!value) continue;
    const path = resolve(String(value));
    await access(path);
    const extension = extname(path).toLowerCase();
    if (!SUPPORTED.has(extension)) {
      throw new Error(
        `Unsupported review artifact ${path}. Expected one of: ${[...SUPPORTED].join(', ')}`,
      );
    }
    if (!files.includes(path)) files.push(path);
  }

  if (!files.length) {
    throw new Error('No review artifacts were supplied.');
  }

  for (const path of files) {
    const launcher = await openWithSystemViewer(path, options);
    console.log(`[OPEN] ${launcher}: ${path}`);
    if (options.delayMs) {
      await new Promise((resolvePromise) => setTimeout(resolvePromise, options.delayMs));
    }
  }

  return files;
}

export async function reviewArtifactsFromReport(reportPath) {
  const absoluteReportPath = resolve(reportPath);
  await access(absoluteReportPath);
  const report = JSON.parse(await readFile(absoluteReportPath, 'utf8'));

  if (report.type === 'shot03-roi-segmentation-autopilot' && report.finalReportPath) {
    return reviewArtifactsFromReport(report.finalReportPath);
  }

  const candidates = [
    report.artifacts?.alphaContactSheet,
    report.ranked?.vessel?.[0]?.registeredPath,
    report.ranked?.enki?.[0]?.registeredPath,
    report.artifacts?.activeVideo,
    report.artifacts?.abVideo,
    report.artifacts?.frozenControlVideo,
    report.artifacts?.frozenControlFrame,
  ].filter(Boolean);

  const media = [];
  for (const value of candidates) {
    const path = resolveReportArtifact(absoluteReportPath, value);
    if (!existsSync(path)) continue;
    if (!SUPPORTED.has(extname(path).toLowerCase())) continue;
    if (!media.includes(path)) media.push(path);
  }

  if (!media.length) {
    throw new Error(
      `Report ${absoluteReportPath} did not reference any existing supported review artifacts.`,
    );
  }
  return media;
}

export async function latestShot03RoiReport() {
  let entries;
  try {
    entries = await readdir(SHOT03_ROI_ROOT, { withFileTypes: true });
  } catch {
    throw new Error(`No Shot 3 ROI review runs found under ${SHOT03_ROI_ROOT}.`);
  }

  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(SHOT03_ROI_ROOT, entry.name))
    .sort((a, b) => b.localeCompare(a));

  for (const directory of directories) {
    const autopilot = join(directory, 'shot03-roi-autopilot.json');
    if (existsSync(autopilot)) return autopilot;
    const search = join(directory, 'shot03-roi-segmentation-search.json');
    if (existsSync(search)) return search;
  }
  throw new Error(`No completed Shot 3 ROI review report found under ${SHOT03_ROI_ROOT}.`);
}

async function openWithSystemViewer(path, options = {}) {
  if (process.platform === 'win32') {
    return openWithWindowsShell(path, options);
  }

  const command = process.platform === 'darwin' ? 'open' : 'xdg-open';
  await spawnDetached(command, [path]);
  return command;
}

function openWithWindowsShell(path, options = {}) {
  // UseShellExecute=true asks Windows itself to resolve the registered handler
  // for the artifact. This avoids cmd.exe `start` quoting/association behavior,
  // which can emit a system beep while still returning a successful spawn.
  const powershell = process.env.POWERSHELL_COMMAND ?? 'powershell.exe';
  const script = [
    `$path = ${powershellSingleQuoted(path)}`,
    '$psi = New-Object System.Diagnostics.ProcessStartInfo',
    '$psi.FileName = $path',
    '$psi.UseShellExecute = $true',
    '$process = [System.Diagnostics.Process]::Start($psi)',
    'if ($null -eq $process) { throw "Windows ShellExecute returned no process." }',
  ].join('; ');
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  const result = spawnSync(
    powershell,
    ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', encoded],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      windowsHide: true,
      shell: false,
      stdio: options.diagnose ? 'pipe' : ['ignore', 'pipe', 'pipe'],
    },
  );

  if (options.diagnose) {
    console.log(`[OPEN-DIAG] platform=${process.platform}`);
    console.log(`[OPEN-DIAG] launcher=${powershell} / Windows ShellExecute`);
    console.log(`[OPEN-DIAG] extension=${extname(path).toLowerCase()}`);
    console.log(`[OPEN-DIAG] exit=${result.status ?? '<null>'}`);
    if (result.stdout?.trim()) console.log(`[OPEN-DIAG] stdout=${result.stdout.trim()}`);
    if (result.stderr?.trim()) console.log(`[OPEN-DIAG] stderr=${result.stderr.trim()}`);
  }

  if (result.error) {
    throw new Error(`Windows viewer launch failed to start ${powershell}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(
      `Windows ShellExecute failed with exit ${result.status ?? 'unknown'} for ${path}: ${result.stderr?.trim() || result.stdout?.trim() || 'no diagnostic output'}`,
    );
  }
  return 'Windows ShellExecute';
}

function resolveReportArtifact(reportPath, value) {
  const text = String(value);
  if (/^[a-zA-Z]:[\\/]/.test(text) || text.startsWith('/') || text.startsWith('\\\\')) {
    return resolve(text);
  }
  return resolve(dirname(reportPath), text);
}

function powershellSingleQuoted(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function spawnDetached(command, args) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      shell: false,
    });
    child.once('error', rejectPromise);
    child.once('spawn', () => {
      child.unref();
      resolvePromise();
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.includes('--help') || args.includes('-h')) {
    console.log('Open generated PNG/MP4 review artifacts in the OS-associated viewer.');
    console.log('Usage:');
    console.log('  node tools/scripts/open-review-artifacts.mjs <file> [file ...]');
    console.log('  node tools/scripts/open-review-artifacts.mjs --latest-shot03-roi');
    console.log('  node tools/scripts/open-review-artifacts.mjs --from-report=<report.json>');
    console.log('  node tools/scripts/open-review-artifacts.mjs --diagnose-open <file>');
    console.log('  node tools/scripts/open-review-artifacts.mjs --no-open <file> [file ...]');
    return;
  }

  const diagnose = args.includes('--diagnose-open');
  const reportArg = args.find((arg) => arg.startsWith('--from-report='));
  let files = [];

  if (args.includes('--latest-shot03-roi')) {
    const reportPath = await latestShot03RoiReport();
    console.log(`[OPEN] latest Shot 3 ROI report: ${reportPath}`);
    files.push(...(await reviewArtifactsFromReport(reportPath)));
  }
  if (reportArg) {
    const reportPath = reportArg.slice('--from-report='.length);
    console.log(`[OPEN] report-driven review: ${resolve(reportPath)}`);
    files.push(...(await reviewArtifactsFromReport(reportPath)));
  }

  files.push(
    ...args.filter(
      (arg) =>
        arg !== '--no-open' &&
        arg !== '--diagnose-open' &&
        arg !== '--latest-shot03-roi' &&
        !arg.startsWith('--from-report='),
    ),
  );

  files = [...new Set(files)];
  await maybeOpenReviewArtifacts(files, { args, diagnose, delayMs: 120 });
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  await main().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });
}
