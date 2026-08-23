import { spawnSync } from 'node:child_process';
import { accessSync, readdirSync, readFileSync, mkdirSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';

const CANDIDATE_ROOT = resolve(
  'tmp/animation-assets/candidates/chapter-01-reel-01-animation-v1',
);
const OUTPUT_ROOT = resolve('tmp/animation-diagnostics/shot03-water');
const LAYER_ID = 'shot03-water-v1';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const candidateDirArg = args.find((arg) => arg.startsWith('--candidate-dir='));
const unknown = args.find((arg) => !arg.startsWith('--candidate-dir='));
if (unknown) throw new Error(`Unknown option ${unknown}`);

const runDirectory = candidateDirArg
  ? resolve(candidateDirArg.slice('--candidate-dir='.length))
  : newestCandidateDirectory();
assertInside(CANDIDATE_ROOT, runDirectory, 'Candidate run directory');

const candidatePath = resolveCandidatePng(runDirectory);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputDirectory = join(OUTPUT_ROOT, stamp);
mkdirSync(outputDirectory, { recursive: true });

const alphaPath = join(outputDirectory, 'alpha-mask.png');
const whitePath = join(outputDirectory, 'candidate-on-white.png');
const blackPath = join(outputDirectory, 'candidate-on-black.png');

runFfmpeg([
  '-y',
  '-hide_banner',
  '-loglevel',
  'error',
  '-i',
  candidatePath,
  '-vf',
  'alphaextract,format=gray',
  '-frames:v',
  '1',
  alphaPath,
]);

for (const [color, outputPath] of [
  ['white', whitePath],
  ['black', blackPath],
]) {
  runFfmpeg([
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'lavfi',
    '-i',
    `color=c=${color}:s=1080x1920`,
    '-i',
    candidatePath,
    '-filter_complex',
    '[0:v][1:v]overlay=0:0:format=auto',
    '-frames:v',
    '1',
    outputPath,
  ]);
}

console.log('Shot 3 water candidate diagnostics');
console.log(`Candidate: ${candidatePath}`);
console.log(`Alpha mask: ${alphaPath}`);
console.log(`On white: ${whitePath}`);
console.log(`On black: ${blackPath}`);
console.log('Interpretation: white alpha = selected/opaque water; black alpha = transparent.');
console.log('No candidate, animation-v1 asset, or manifest was modified.');

function newestCandidateDirectory() {
  const directories = readdirSync(CANDIDATE_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(CANDIDATE_ROOT, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));
  if (!directories.length) {
    throw new Error(
      `No candidate runs found under ${CANDIDATE_ROOT}. Run pnpm comfyui:water:generate first.`,
    );
  }
  return directories[0];
}

function resolveCandidatePng(runDirectory) {
  const manifestPath = join(runDirectory, 'candidate-run.json');
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    for (const entry of manifest.candidates ?? []) {
      const layerId = entry.layerId ?? entry.layer?.id;
      const rawPath = entry.candidatePath ?? entry.path ?? entry.outputPath;
      if (
        typeof rawPath === 'string' &&
        (layerId === LAYER_ID || rawPath.toLowerCase().includes('water'))
      ) {
        for (const candidate of isAbsolute(rawPath)
          ? [resolve(rawPath)]
          : [resolve(rawPath), resolve(runDirectory, rawPath)]) {
          if (isInside(runDirectory, candidate) && exists(candidate)) return candidate;
        }
      }
    }
  } catch {
    // Fall through to filesystem discovery so older candidate manifests remain usable.
  }

  const pngs = collectPngs(runDirectory);
  const water = pngs.filter((path) => basename(path).toLowerCase().includes('water'));
  const selected = water.length === 1 ? water[0] : pngs.length === 1 ? pngs[0] : undefined;
  if (!selected) {
    throw new Error(`Could not identify a single water candidate PNG under ${runDirectory}.`);
  }
  return selected;
}

function collectPngs(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectPngs(path));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) files.push(path);
  }
  return files;
}

function runFfmpeg(ffmpegArgs) {
  const result = spawnSync(process.env.FFMPEG_COMMAND ?? 'ffmpeg', ffmpegArgs, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
    shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed with exit code ${result.status ?? 'unknown'}.`);
  }
}

function exists(path) {
  try {
    accessSync(path);
    return true;
  } catch {
    return false;
  }
}

function assertInside(parent, child, label) {
  if (!isInside(parent, child)) {
    throw new Error(`${label} must remain under ${parent}: ${child}`);
  }
}

function isInside(parent, child) {
  const path = relative(resolve(parent), resolve(child));
  return path === '' || (!path.startsWith('..') && !isAbsolute(path));
}
