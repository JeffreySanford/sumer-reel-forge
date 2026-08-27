import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const ROOT = resolve('.');
const ACTOR_PREP_ROOT = resolve('tmp/animation-assets/actor-prep/enki/v1');
const THRESHOLDS = Object.freeze([1, 8, 24, 48, 96, 160, 224]);

const workspace = latestWorkspace();
const actorPrep = JSON.parse(readFileSync(join(workspace, 'actor-prep.json'), 'utf8'));
const sourcePath = join(workspace, 'source', 'reference-enki.png');
const width = Number(actorPrep?.source?.width);
const height = Number(actorPrep?.source?.height);
if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
  throw new Error('Actor-prep source dimensions are invalid.');
}

console.log('Shot 3 Enki alpha bbox profile');
console.log(`Source: ${sourcePath}`);
console.log(`Dimensions: ${width}x${height}`);
console.log('');

for (const threshold of THRESHOLDS) {
  const bounds = detectBounds(sourcePath, threshold);
  if (!bounds) {
    console.log(`alpha>=${String(threshold).padStart(3)} · no surviving pixels`);
    continue;
  }
  const coverage = (bounds.width * bounds.height) / (width * height);
  console.log(
    `alpha>=${String(threshold).padStart(3)} · bbox x=${bounds.x}, y=${bounds.y}, ${bounds.width}x${bounds.height} · bbox coverage ${(coverage * 100).toFixed(2)}%`,
  );
}

console.log('');
console.log('[STOP] Diagnostic only: no source mutation, no model call, no semantic threshold change.');

function latestWorkspace() {
  if (!existsSync(ACTOR_PREP_ROOT)) throw new Error(`Missing actor-prep root: ${ACTOR_PREP_ROOT}`);
  const entries = readdirSync(ACTOR_PREP_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(ACTOR_PREP_ROOT, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));
  for (const candidate of entries) {
    const receiptPath = join(candidate, 'evidence', 'packet-receipt.json');
    if (!existsSync(receiptPath)) continue;
    try {
      const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
      if (receipt.pass === true && existsSync(join(candidate, 'source', 'reference-enki.png'))) return candidate;
    } catch {
      // try older candidate
    }
  }
  throw new Error('No passing Enki actor-prep workspace is available.');
}

function detectBounds(sourcePath, threshold) {
  const result = spawnSync(
    'ffmpeg',
    [
      '-hide_banner', '-loglevel', 'info', '-i', sourcePath,
      '-vf', `alphaextract,bbox=min_val=${threshold}`,
      '-frames:v', '1', '-f', 'null', '-',
    ],
    { cwd: ROOT, encoding: 'utf8', windowsHide: true, shell: false },
  );
  if (result.error) throw result.error;
  const text = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const matches = [...text.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)];
  if (!matches.length) return null;
  const [, w, h, x, y] = matches.at(-1);
  return { x: Number(x), y: Number(y), width: Number(w), height: Number(h) };
}
