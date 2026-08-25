import { spawn } from 'node:child_process';
import { access, mkdir, readdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

const ROOT = resolve('.');
const PREVIEW_ROOT = resolve('tmp/animation-previews/shot03-level2-preview');
const STATUS_PATH = resolve('tmp/animation-previews/shot03-level2-status.json');
const EXPECTED_MILESTONE_FAILURE =
  'ACTIVE MILESTONE GATE: approved Shot 3 meets Level 2 Living Shot motion quality';

const focusedTests = [
  {
    id: 'candidate-audition',
    path: 'tools/renderer/level2-candidate-audition.test.mjs',
    mode: 'must-pass',
  },
  {
    id: 'rigging-causality',
    path: 'tools/renderer/level2-rigging-causality-gate.test.mjs',
    mode: 'must-pass',
  },
  {
    id: 'living-shot-milestone',
    path: 'tools/renderer/level2-living-shot-gate.test.mjs',
    mode: 'milestone',
  },
];

async function main() {
  const options = parseOptions(process.argv.slice(2).filter((arg) => arg !== '--'));
  const results = [];
  let unexpectedFailure = false;

  for (const test of focusedTests) {
    const result = await runCaptured('node', ['--test', test.path]);
    const classified = classifyTest(test, result);
    results.push({ ...test, ...result, ...classified });
    if (!classified.expected) unexpectedFailure = true;
  }

  let preview = null;
  if (!options.skipPreview && !unexpectedFailure) {
    const result = await runCaptured('node', [
      'tools/scripts/shot03-level2-rigging.mjs',
      'preview',
    ]);
    const directory = await newestPreviewDirectory();
    preview = {
      ...result,
      directory,
      videoPath: directory
        ? join(directory, 'shot03-level2-candidate-preview.mp4')
        : null,
    };
    if (result.code !== 0) unexpectedFailure = true;
  }

  const milestone = results.find((item) => item.id === 'living-shot-milestone');
  await writeStatus({ results, preview, milestone, unexpectedFailure });
  printSummary(results, preview, milestone, unexpectedFailure);
  process.exitCode = unexpectedFailure ? 1 : 0;
}

function classifyTest(test, result) {
  if (test.mode === 'must-pass') {
    return {
      expected: result.code === 0,
      state: result.code === 0 ? 'pass' : 'unexpected-failure',
      reasons: [],
    };
  }

  if (test.mode === 'milestone') {
    if (result.code === 0) {
      return { expected: true, state: 'green', reasons: [] };
    }
    if (
      result.code === 1 &&
      result.output.includes(EXPECTED_MILESTONE_FAILURE)
    ) {
      return {
        expected: true,
        state: 'known-red',
        reasons: milestoneReasons(result.output),
      };
    }
  }

  return {
    expected: false,
    state: 'unexpected-failure',
    reasons: [],
  };
}

function printSummary(results, preview, milestone, unexpectedFailure) {
  console.log('');
  console.log('Shot 3 Level 2');
  for (const result of results.filter((item) => item.id !== 'living-shot-milestone')) {
    console.log(`${result.state === 'pass' ? '[PASS]' : '[FAIL]'} ${result.id}`);
  }

  if (milestone?.state === 'green') {
    console.log('[GREEN] milestone gate');
  } else if (milestone?.state === 'known-red') {
    console.log(
      `[KNOWN RED] milestone: ${milestone.reasons.length ? milestone.reasons.join('; ') : 'canonical Level 2 acceptance not reached yet'}`,
    );
  } else {
    console.log('[FAIL] milestone gate produced an unexpected result');
  }

  if (preview) {
    console.log(
      preview.code === 0
        ? `[PASS] preview: ${preview.videoPath ?? 'rendered; output path unavailable'}`
        : '[FAIL] preview',
    );
  }

  console.log(`STATUS FILE: ${STATUS_PATH}`);
  console.log(
    unexpectedFailure
      ? 'STATUS: BLOCKED — paste this summary plus the failure tail.'
      : milestone?.state === 'green'
        ? 'STATUS: LEVEL 2 DECLARATIVE GATE GREEN — proceed to rendered/human acceptance.'
        : 'STATUS: CONTINUE — paste only this summary; attach the preview/contact sheet when visual review is needed.',
  );

  if (unexpectedFailure) {
    for (const result of results.filter((item) => !item.expected)) {
      printFailureTail(result.output);
    }
    if (preview && preview.code !== 0) printFailureTail(preview.output);
  }
}

async function writeStatus({ results, preview, milestone, unexpectedFailure }) {
  await mkdir(resolve('tmp/animation-previews'), { recursive: true });
  const payload = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    shotNumber: 3,
    milestoneState: milestone?.state ?? 'unknown',
    milestoneReasons: milestone?.reasons ?? [],
    checks: results.map((result) => ({
      id: result.id,
      state: result.state,
      exitCode: result.code,
    })),
    preview: preview
      ? {
          pass: preview.code === 0,
          directory: preview.directory,
          videoPath: preview.videoPath,
        }
      : null,
    unexpectedFailure,
  };
  await writeFile(STATUS_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function milestoneReasons(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- needs '))
    .map((line) => line.replace(/^- needs /, ''));
}

function printFailureTail(output) {
  const lines = output.trim().split(/\r?\n/);
  for (const line of lines.slice(-18)) console.log(`  ${line}`);
}

async function newestPreviewDirectory() {
  try {
    const entries = await readdir(PREVIEW_ROOT, { withFileTypes: true });
    const directories = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(PREVIEW_ROOT, entry.name))
      .sort((a, b) => basename(b).localeCompare(basename(a)));
    for (const directory of directories) {
      try {
        await access(join(directory, 'shot03-level2-candidate-preview.mp4'));
        return directory;
      } catch {
        // Keep looking for the newest complete preview.
      }
    }
    return null;
  } catch {
    return null;
  }
}

function runCaptured(command, args) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env: process.env,
      shell: process.platform === 'win32',
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.once('error', (error) => {
      resolvePromise({ code: 1, output: error.stack ?? error.message });
    });
    child.once('exit', (code, signal) => {
      resolvePromise({
        code: code ?? 1,
        output: signal ? `${output}\nStopped by signal ${signal}.` : output,
      });
    });
  });
}

function parseOptions(args) {
  const result = { skipPreview: false };
  for (const arg of args) {
    if (arg === '--skip-preview') result.skipPreview = true;
    else throw new Error(`Unknown option ${arg}`);
  }
  return result;
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
