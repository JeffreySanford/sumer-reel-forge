import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve('.');
const REPLACEMENT_SCRIPT = resolve('tools/scripts/shot03-level2-enki-blink-replacement.mjs');
const PROOF_SCRIPT = resolve('tools/scripts/pixi-shot03-recovered-blink-replacement-proof.mjs');
const options = parseOptions(process.argv.slice(2));

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  console.log('Shot 3 stronger blink replacement autopilot');
  console.log('Goal: source-faithful closed-eye replacement -> recovered-primary blink-only proof.');
  console.log('Policy: candidate generation and review only; no canonical mutation or promotion.');
  console.log('');

  console.log('===== PHASE A: REPLACEMENT CANDIDATE =====');
  runNode(REPLACEMENT_SCRIPT, ['all']);

  console.log('');
  console.log('===== PHASE B: RECOVERED MOTION BLINK PROOF =====');
  const proofArgs = [];
  if (options.noOpen) proofArgs.push('--no-open');
  if (options.noAiReview) proofArgs.push('--no-ai-review');
  if (options.requireAiReview) proofArgs.push('--require-ai-review');
  runNode(PROOF_SCRIPT, proofArgs);

  console.log('');
  console.log('[DONE] Stronger blink candidate reached the human normal-speed review gate.');
  console.log('[STOP] Do not promote the eye-state candidate or add rigging/water until the blink is visibly accepted.');
}

function runNode(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${script} failed with exit ${result.status ?? 1}.`);
  }
}

function parseOptions(args) {
  const result = { noOpen: false, noAiReview: false, requireAiReview: false };
  for (const arg of args) {
    if (arg === '--no-open') result.noOpen = true;
    else if (arg === '--no-ai-review') result.noAiReview = true;
    else if (arg === '--require-ai-review') result.requireAiReview = true;
    else throw new Error(`Unknown option ${arg}.`);
  }
  return result;
}
