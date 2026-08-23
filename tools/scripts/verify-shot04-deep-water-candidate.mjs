import { createHash } from 'node:crypto';
import { access, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

const MANIFEST_PATH = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const ASSET_ROOT = resolve('assets');
const CANDIDATE_ROOT = resolve(
  'tmp/animation-assets/candidates/chapter-01-reel-01-animation-v1',
);
const LAYER_ID = 'shot04-deep-water-v1';

await main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  const shot = manifest.shots?.find((item) => item.sourceShotNumber === 4);
  if (!shot) throw new Error('Shot 4 is missing from the animation manifest.');
  const sourcePath = resolve(ASSET_ROOT, shot.sourceFrame);
  const sourceBytes = await readFile(sourcePath);
  const sourceDimensions = readPngDimensions(sourceBytes, 'Shot 4 source');
  const sourceChecksum = sha256(sourceBytes);

  const runDirectory = await newestCandidateRun();
  const metadataPath = join(runDirectory, 'shot-04', `${LAYER_ID}.candidate.json`);
  const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
  const candidatePath = resolve(metadata.candidatePath);
  const candidateBytes = await readFile(candidatePath);
  const candidateDimensions = readPngDimensions(candidateBytes, LAYER_ID);
  const candidateChecksum = sha256(candidateBytes);

  const checks = [
    {
      id: 'dimensions',
      pass:
        candidateDimensions.width === sourceDimensions.width &&
        candidateDimensions.height === sourceDimensions.height,
      detail: `${candidateDimensions.width}x${candidateDimensions.height} (expected ${sourceDimensions.width}x${sourceDimensions.height})`,
    },
    {
      id: 'checksum-identity',
      pass: candidateChecksum === sourceChecksum,
      detail: candidateChecksum,
    },
    {
      id: 'byte-identity',
      pass: candidateBytes.equals(sourceBytes),
      detail: `${candidateBytes.length} bytes`,
    },
  ];
  const pass = checks.every((check) => check.pass);
  const reportPath = join(runDirectory, 'deep-water-qa.json');
  await writeFile(
    reportPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        type: 'shot04-deep-water-preservation-qa',
        generatedAt: new Date().toISOString(),
        pass,
        layerId: LAYER_ID,
        candidateRunDirectory: runDirectory,
        candidatePath,
        sourcePath,
        sourceDimensions,
        sourceChecksum,
        candidateChecksum,
        checks,
        policy: {
          exactSourcePreservationRequired: true,
          synthesisAllowed: false,
          humanReviewStillRequired: true,
        },
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  console.log('Shot 4 deep-water preservation verification');
  console.log(`Candidate: ${candidatePath}`);
  for (const check of checks) {
    console.log(`${check.pass ? '[ok]' : '[fail]'} ${check.id}: ${check.detail}`);
  }
  console.log(`Deep-water QA: ${pass ? 'PASS' : 'FAIL'}`);
  console.log(`Report: ${reportPath}`);
  console.log('Human review remains required before promotion.');
  if (!pass) process.exitCode = 2;
}

async function newestCandidateRun() {
  let entries;
  try {
    entries = await readdir(CANDIDATE_ROOT, { withFileTypes: true });
  } catch {
    throw new Error(`Candidate root does not exist: ${CANDIDATE_ROOT}`);
  }
  const directories = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .map((entry) => join(CANDIDATE_ROOT, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));

  for (const directory of directories) {
    const metadataPath = join(directory, 'shot-04', `${LAYER_ID}.candidate.json`);
    if (await exists(metadataPath)) return directory;
  }
  throw new Error(`No ${LAYER_ID} candidate found. Run its generate command first.`);
}

function readPngDimensions(buffer, label) {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length < 24 ||
    buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
    buffer.subarray(12, 16).toString('ascii') !== 'IHDR'
  ) {
    throw new Error(`${label} is not a valid PNG.`);
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function sha256(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
