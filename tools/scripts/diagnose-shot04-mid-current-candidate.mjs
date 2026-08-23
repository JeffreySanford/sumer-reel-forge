import { spawnSync } from 'node:child_process';
import { accessSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';

const CANDIDATE_ROOT = resolve(
  'tmp/animation-assets/candidates/chapter-01-reel-01-animation-v1',
);
const OUTPUT_ROOT = resolve('tmp/animation-diagnostics/shot04-mid-current');
const LAYER_ID = 'shot04-mid-current-v1';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const candidateDirArg = args.find((arg) => arg.startsWith('--candidate-dir='));
const unknown = args.find((arg) => !arg.startsWith('--candidate-dir='));
if (unknown) throw new Error(`Unknown option ${unknown}`);

const runDirectory = candidateDirArg
  ? resolve(candidateDirArg.slice('--candidate-dir='.length))
  : newestCandidateDirectory();
assertInside(CANDIDATE_ROOT, runDirectory, 'Candidate run directory');
const candidatePath = resolveCandidatePng(runDirectory);
const dimensions = readDimensions(candidatePath);

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
    `color=c=${color}:s=${dimensions.width}x${dimensions.height}`,
    '-i',
    candidatePath,
    '-filter_complex',
    '[0:v][1:v]overlay=0:0:format=auto',
    '-frames:v',
    '1',
    outputPath,
  ]);
}

console.log('Shot 4 mid-current candidate diagnostics');
console.log(`Candidate: ${candidatePath}`);
console.log(`Dimensions: ${dimensions.width}x${dimensions.height}`);
console.log(`Alpha mask: ${alphaPath}`);
console.log(`On white: ${whitePath}`);
console.log(`On black: ${blackPath}`);
console.log('Interpretation: white alpha = selected/opaque current material; black alpha = transparent.');
console.log('Review for broad flowing-water regions, not a Nammu-shaped cutout or whole-frame selection.');
console.log('No candidate, animation-v1 asset, or manifest was modified.');

function newestCandidateDirectory() {
  const directories = readdirSync(CANDIDATE_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .map((entry) => join(CANDIDATE_ROOT, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));
  for (const directory of directories) {
    const direct = join(directory, 'shot-04', `${LAYER_ID}.png`);
    if (exists(direct)) return directory;
  }
  throw new Error(`No ${LAYER_ID} candidate found. Run its generate command first.`);
}

function resolveCandidatePng(runDirectory) {
  const manifestPath = join(runDirectory, 'candidate-run.json');
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const entry = (manifest.candidates ?? []).find((item) => item?.layerId === LAYER_ID);
    const rawPath = entry?.candidatePath ?? entry?.path ?? entry?.outputPath;
    if (typeof rawPath === 'string') {
      for (const candidate of isAbsolute(rawPath)
        ? [resolve(rawPath)]
        : [resolve(rawPath), resolve(runDirectory, rawPath)]) {
        if (isInside(runDirectory, candidate) && exists(candidate)) return candidate;
      }
    }
  } catch {
    // Fall through to the conventional path.
  }
  const direct = join(runDirectory, 'shot-04', `${LAYER_ID}.png`);
  if (exists(direct)) return direct;
  throw new Error(`Could not resolve ${LAYER_ID} under ${runDirectory}.`);
}

function readDimensions(path) {
  const buffer = readFileSync(path);
  if (
    buffer.length < 24 ||
    buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
    buffer.subarray(12, 16).toString('ascii') !== 'IHDR'
  ) {
    throw new Error(`${path} is not a valid PNG.`);
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function runFfmpeg(args) {
  const result = spawnSync(process.env.FFMPEG_COMMAND ?? 'ffmpeg', args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
    shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ffmpeg failed with exit code ${result.status ?? 'unknown'}.`);
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
  if (!isInside(parent, child)) throw new Error(`${label} must remain under ${parent}: ${child}`);
}

function isInside(parent, child) {
  const path = relative(resolve(parent), resolve(child));
  return path === '' || (!path.startsWith('..') && !isAbsolute(path));
}
