import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  console.log('Shot 3 Level 2 verified audition');
  console.log('[phase 1/2] pre-render candidate inspection + normal-speed audition');
  await runInherited('node', ['tools/scripts/shot03-level2-replacement-audition.mjs']);
  console.log('');
  console.log('[phase 2/2] rendered blink artifact proof');
  await runInherited('node', ['tools/scripts/shot03-level2-rendered-blink-proof.mjs']);
  console.log('');
  console.log('STATUS: VERIFIED AUDITION PIPELINE PASS — HUMAN review is still required before promotion.');
}

async function runInherited(command, args) {
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: resolve('.'),
      env: process.env,
      shell: process.platform === 'win32',
      stdio: 'inherit',
      windowsHide: true,
    });
    child.once('error', rejectPromise);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(
        new Error(
          `${command} failed with ${signal ? `signal ${signal}` : `exit code ${code ?? 'unknown'}`}.`,
        ),
      );
    });
  });
}
