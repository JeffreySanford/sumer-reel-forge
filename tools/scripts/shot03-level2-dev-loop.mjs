import { spawn } from 'node:child_process';
import { access, readdir } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

const ROOT = resolve('.');
const PREVIEW_ROOT = resolve('tmp/animation-previews/shot03-level2-preview');
const EXPECTED_MILESTONE_FAILURE =
  'ACTIVE MILESTONE GATE: approved Shot 3 meets Level 2 Living Shot motion quality';

const focusedTests = [
  {
    id: 'candidate-audition',
    path: 'tools/renderer/level2-candidate-audition.test.mjs',
    expectedExitCode: 0,
  },
  {
    id: 'rigging-causality',
    path: 'tools/renderer/level2-rigging-causality-gate.test.mjs',
    expectedExitCode: 0,
  },
  {
    id: 'living-shot-milestone',
    path: 'tools/renderer/level2-living-shot-gate.test.mjs',
    expectedExitCode: 1,
    expectedFailureText: EXPECTED_MILESTONE_FAILURE,
  },
];

async function main() {
  const options = parseOptions(process.argv.slice(2).filter((arg) => arg !== '--'));
  const results = [];
  let unexpectedFailure = false;

  for (const test of focusedTests) {
    const result = await runCaptured('node', ['--test', test.path]);
    const expected =
      result.code === test.expectedExitCode &&
      (!test.expectedFailureText || result.output.includes(test.expectedFailureText));
    results.push({ ...test, ...result, expected });
    if (!expected) unexpectedFailure = true;
  }

  let preview = null;
  if (!options.skipPreview && !unexpectedFailure) {
    const before = await newestPreviewDirectory();
    const result = await runCaptured('node', [
      'tools/scripts/shot03-level2-rigging.mjs',
      'preview',
    ]);
    const after = await newestPreviewDirectory();
    preview = {
      ...result,
      directory: after && after !== before ? after : after,
    };
    if (result.code !== 0) unexpectedFailure = true;
  }

  printSummary(results, preview, unexpectedFailure);
  process.exitCode = unexpectedFailure ? 1 : 0;
}

function printSummary(results, preview, unexpectedFailure) {
  console.log('');
  console.log('Shot 3 Level 2 dev loop');
  console.log('-----------------------');
  for (const result of results) {
    if (result.id === 'living-shot-milestone' && result.expected) {
      const reasons = milestoneReasons(result.output);
      console.log(`[KNOWN RED] milestone gate${reasons.length ? `: ${reasons.join('; ')}` : ''}`);
      continue;
    }
    console.log(`${result.expected ? '[PASS]' : '[FAIL]'} ${result.id}`);
  }

  if (preview) {
    if (preview.code === 0) {
      console.log(`[PASS] rigging preview${preview.directory ? `: ${preview.directory}` : ''}`);
      if (preview.directory) {
        console.log(`       video: ${join(preview.directory, 'shot03-level2-candidate-preview.mp4')}`);
      }
    } else {
      console.log('[FAIL] rigging preview');
      printFailureTail(preview.output);
    }
  }

  if (unexpectedFailure) {
    console.log('STATUS: BLOCKED — unexpected Level 2 regression.');
    for (const result of results.filter((item) => !item.expected)) {
      printFailureTail(result.output);
    }
  } else {
    console.log('STATUS: CONTINUE — infrastructure green; milestone intentionally red until canonical Level 2 motion is approved.');
  }
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
