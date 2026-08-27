import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve('.');
const BACKGROUND_AUTO = resolve('tools/scripts/shot03-roi-background-auto.mjs');
const STATIC_AUTO = resolve('tools/scripts/shot03-roi-static-recomposition-auto.mjs');
const options = parseOptions(process.argv.slice(2));

try {
  console.log('Shot 3 ROI recovery autopilot');
  console.log('Goal: validated foreground decomposition -> repaired background -> static full recomposition.');
  console.log('Policy: no canonical mutation, promotion, or motion activation.');
  console.log('');

  console.log('===== PHASE A: BACKGROUND RECOVERY =====');
  const backgroundArgs = ['--no-open'];
  if (options.noAiReview) backgroundArgs.push('--no-ai-review');
  if (options.requireAiReview) backgroundArgs.push('--require-ai-review');
  if (options.seed !== undefined) backgroundArgs.push(`--seed=${options.seed}`);
  if (options.padding !== undefined) backgroundArgs.push(`--padding=${options.padding}`);
  runNode(BACKGROUND_AUTO, backgroundArgs);

  console.log('');
  console.log('===== PHASE B: STATIC FULL RECOMPOSITION =====');
  const staticArgs = [];
  if (options.noOpen) staticArgs.push('--no-open');
  if (options.noAiReview) staticArgs.push('--no-ai-review');
  if (options.requireAiReview) staticArgs.push('--require-ai-review');
  runNode(STATIC_AUTO, staticArgs);

  console.log('');
  console.log('[DONE] Shot 3 recovery pipeline reached the static human-review gate.');
  console.log('[STOP] Do not promote assets or reactivate Pixi motion until the opened static recomposition is visually accepted.');
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
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
    throw new Error(`${script} failed with exit ${result.status}.`);
  }
}

function parseOptions(args) {
  const result = {
    noOpen: false,
    noAiReview: false,
    requireAiReview: false,
    seed: undefined,
    padding: undefined,
  };
  for (const arg of args) {
    if (arg === '--no-open') result.noOpen = true;
    else if (arg === '--no-ai-review') result.noAiReview = true;
    else if (arg === '--require-ai-review') result.requireAiReview = true;
    else if (arg.startsWith('--seed=')) {
      const value = Number(arg.slice('--seed='.length));
      if (!Number.isSafeInteger(value) || value < 0) {
        throw new Error('--seed must be a non-negative safe integer.');
      }
      result.seed = value;
    } else if (arg.startsWith('--padding=')) {
      const value = Number(arg.slice('--padding='.length));
      if (!Number.isInteger(value) || value < 0 || value > 256) {
        throw new Error('--padding must be an integer between 0 and 256.');
      }
      result.padding = value;
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  return result;
}
