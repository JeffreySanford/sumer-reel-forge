import { access } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
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
    files.push(path);
  }

  if (!files.length) {
    throw new Error('No review artifacts were supplied.');
  }

  for (const path of files) {
    await openWithSystemViewer(path);
    console.log(`[OPEN] ${path}`);
    if (options.delayMs) {
      await new Promise((resolvePromise) => setTimeout(resolvePromise, options.delayMs));
    }
  }

  return files;
}

function openWithSystemViewer(path) {
  let command;
  let args;

  if (process.platform === 'win32') {
    // `start` is a cmd.exe built-in. Pass the complete /c command as one
    // argument so paths with spaces are parsed by cmd rather than Node's argv
    // quoting rules. The first empty quoted string is the required window title.
    const escaped = path.replaceAll('"', '""');
    command = 'cmd.exe';
    args = ['/d', '/s', '/c', `start "" "${escaped}"`];
  } else if (process.platform === 'darwin') {
    command = 'open';
    args = [path];
  } else {
    command = 'xdg-open';
    args = [path];
  }

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
    console.log('  node tools/scripts/open-review-artifacts.mjs --no-open <file> [file ...]');
    return;
  }
  const files = args.filter((arg) => arg !== '--no-open');
  await maybeOpenReviewArtifacts(files, { args, delayMs: 120 });
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  await main().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });
}
