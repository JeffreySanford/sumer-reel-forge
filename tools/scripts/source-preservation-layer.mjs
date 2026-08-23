import { createHash } from 'node:crypto';
import {
  access,
  copyFile,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

const DEFAULT_MANIFEST = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const ASSET_ROOT = resolve('assets');
const CANDIDATE_BASE = resolve('tmp/animation-assets/candidates');

const action = process.argv[2] ?? 'preflight';
const options = parseOptions(process.argv.slice(3).filter((arg) => arg !== '--'));
if (!['preflight', 'generate', 'verify'].includes(action)) {
  throw new Error('Use preflight, generate, or verify.');
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const manifestPath = resolve(options.manifest ?? DEFAULT_MANIFEST);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const shot = manifest.shots?.find(
    (item) => item.sourceShotNumber === options.shotNumber,
  );
  const layer = shot?.layers?.find((item) => item.id === options.layerId);
  if (!shot || !layer) {
    throw new Error(
      `Could not resolve Shot ${options.shotNumber} / ${options.layerId}.`,
    );
  }
  if (layer.hasAlpha !== false) {
    throw new Error(
      `${layer.id} is not eligible for exact-source preservation because hasAlpha is not false.`,
    );
  }

  const sourcePath = resolve(ASSET_ROOT, shot.sourceFrame);
  if (!(await exists(sourcePath))) {
    throw new Error(`Editorial source not found: ${sourcePath}`);
  }
  const sourceBytes = await readFile(sourcePath);
  const sourceDimensions = readPngDimensions(sourceBytes, 'Editorial source');
  const sourceChecksum = sha256(sourceBytes);

  if (action === 'verify') {
    const candidate = await newestCandidate(manifest.manifestId, layer.id);
    const candidateBytes = await readFile(candidate.path);
    const candidateDimensions = readPngDimensions(candidateBytes, layer.id);
    const candidateChecksum = sha256(candidateBytes);
    const dimensionsMatch =
      candidateDimensions.width === sourceDimensions.width &&
      candidateDimensions.height === sourceDimensions.height;
    const checksumMatch = candidateChecksum === sourceChecksum;
    const bytesMatch = candidateBytes.equals(sourceBytes);
    const passed = dimensionsMatch && checksumMatch && bytesMatch;
    const report = {
      schemaVersion: 1,
      type: 'exact-source-preservation-qa',
      generatedAt: new Date().toISOString(),
      manifestId: manifest.manifestId,
      shotId: shot.shotId,
      sourceShotNumber: shot.sourceShotNumber,
      layerId: layer.id,
      sourcePath,
      candidatePath: candidate.path,
      sourceDimensions,
      candidateDimensions,
      sourceChecksum,
      candidateChecksum,
      sourceBytes: sourceBytes.length,
      candidateBytes: candidateBytes.length,
      checks: {
        dimensionsMatch,
        checksumMatch,
        bytesMatch,
      },
      qaStatus: passed ? 'PASS' : 'FAIL',
      humanReviewRequired: true,
    };
    const reportPath = join(candidate.runDirectory, `${safeName(layer.id)}-preservation-qa.json`);
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    console.log(`Exact-source preservation verification — ${layer.id}`);
    console.log(`Candidate: ${candidate.path}`);
    console.log(`${dimensionsMatch ? '[ok]' : '[blocked]'} dimensions: ${candidateDimensions.width}x${candidateDimensions.height}`);
    console.log(`${checksumMatch ? '[ok]' : '[blocked]'} checksum identity: ${candidateChecksum}`);
    console.log(`${bytesMatch ? '[ok]' : '[blocked]'} byte identity: ${candidateBytes.length} bytes`);
    console.log(`Preservation QA: ${report.qaStatus}`);
    console.log(`Report: ${reportPath}`);
    console.log('Human review remains required before promotion.');
    if (!passed) process.exitCode = 2;
    return;
  }

  console.log(`Exact-source preservation ${action} — Shot ${shot.sourceShotNumber} / ${layer.id}`);
  console.log(`Manifest: ${manifest.manifestId} / ${layer.state}`);
  console.log(`[ok] Editorial source: ${sourcePath}`);
  console.log(`[ok] Source dimensions: ${sourceDimensions.width}x${sourceDimensions.height}`);
  console.log(`[ok] Source checksum: ${sourceChecksum}`);
  console.log('[ok] Policy: exact editorial-byte preservation / no synthesis / no manifest mutation');
  console.log('* candidate remains pending human review');

  if (action === 'preflight') return;

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputRoot = resolve(CANDIDATE_BASE, manifest.manifestId, stamp);
  const shotDirectory = join(
    outputRoot,
    `shot-${String(shot.sourceShotNumber).padStart(2, '0')}`,
  );
  await mkdir(shotDirectory, { recursive: true });
  const candidatePath = join(shotDirectory, `${safeName(layer.id)}.png`);
  await copyFile(sourcePath, candidatePath);

  const copiedBytes = await readFile(candidatePath);
  if (!copiedBytes.equals(sourceBytes)) {
    throw new Error('Exact-source candidate copy does not match editorial bytes.');
  }

  const metadata = {
    schemaVersion: 1,
    state: 'pending-human-review',
    manifestId: manifest.manifestId,
    shotId: shot.shotId,
    sourceShotNumber: shot.sourceShotNumber,
    layerId: layer.id,
    role: layer.role,
    material: layer.material,
    sourceFrame: shot.sourceFrame,
    intendedApprovedPath: layer.path ?? null,
    expectedAlpha: false,
    sourceDimensions,
    candidateDimensions: sourceDimensions,
    candidatePath,
    sha256: sourceChecksum,
    generatedAt: new Date().toISOString(),
    generationMethod: 'exact-editorial-source-copy',
    manifestMutated: false,
    automaticPromotionAllowed: false,
    preservationPolicy: {
      sourceBytesMustMatchExactly: true,
      sourcePixelsAuthoritative: true,
      synthesisAllowed: false,
      cropAllowed: false,
      resizeAllowed: false,
    },
  };
  await writeFile(
    join(shotDirectory, `${safeName(layer.id)}.candidate.json`),
    `${JSON.stringify(metadata, null, 2)}\n`,
    'utf8',
  );
  await writeFile(
    join(outputRoot, 'candidate-run.json'),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        type: 'animation-layer-candidates',
        generatedAt: metadata.generatedAt,
        sourceManifestId: manifest.manifestId,
        sourceManifestPath: manifestPath,
        outputRoot,
        candidates: [metadata],
        approvalPolicy: {
          manifestMutated: false,
          candidateState: 'pending-human-review',
          automaticPromotionAllowed: false,
        },
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  console.log('');
  console.log('Generated 1 exact-source preservation candidate.');
  console.log(`Candidate workspace: ${outputRoot}`);
  console.log(`Candidate PNG: ${candidatePath}`);
  console.log('The animation-v1 manifest was NOT modified.');
}

async function newestCandidate(manifestId, layerId) {
  const root = resolve(CANDIDATE_BASE, manifestId);
  const entries = await readdir(root, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .map((entry) => join(root, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));
  for (const runDirectory of directories) {
    const runPath = join(runDirectory, 'candidate-run.json');
    if (!(await exists(runPath))) continue;
    try {
      const run = JSON.parse(await readFile(runPath, 'utf8'));
      const entry = (run.candidates ?? []).find(
        (candidate) => candidate.layerId === layerId,
      );
      if (entry?.candidatePath && (await exists(entry.candidatePath))) {
        return { path: resolve(entry.candidatePath), runDirectory };
      }
    } catch {
      // Ignore malformed or unrelated runs and continue backwards.
    }
  }
  throw new Error(
    `No candidate run containing ${layerId} was found under ${root}.`,
  );
}

function parseOptions(args) {
  const result = { shotNumber: undefined, layerId: undefined, manifest: undefined };
  for (const arg of args) {
    if (arg.startsWith('--shot=')) {
      const value = Number(arg.slice('--shot='.length));
      if (!Number.isInteger(value) || value < 1) throw new Error(`Invalid ${arg}`);
      result.shotNumber = value;
    } else if (arg.startsWith('--layer=')) {
      result.layerId = arg.slice('--layer='.length);
    } else if (arg.startsWith('--manifest=')) {
      result.manifest = arg.slice('--manifest='.length);
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  if (!result.shotNumber || !result.layerId) {
    throw new Error('--shot=<number> and --layer=<id> are required.');
  }
  return result;
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

function safeName(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]+/g, '-');
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
