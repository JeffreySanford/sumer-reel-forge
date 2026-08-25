import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { analyzeEyeStateAsset } from '../animation/src/level2-eye-state-proof.mjs';

const MANIFEST_PATH = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const ASSET_ROOT = resolve('assets');
const PROOF_ROOT = resolve('tmp/animation-previews/shot03-level2-proof');

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  const shot = manifest.shots?.find((item) => item.sourceShotNumber === 3);
  if (!shot) throw new Error('Shot 3 is missing from the animation manifest.');

  const body = shot.layers?.find((item) => item.id === 'shot03-enki-body-v1');
  const eyes = shot.layers?.find((item) => item.id === 'shot03-enki-eyes-v1');
  if (!body?.path || !eyes?.path) {
    throw new Error('Shot 3 body/closed-eye canonical paths are incomplete.');
  }

  const stateProof = analyzeEyeStateAsset({
    bodyPath: resolve(ASSET_ROOT, body.path),
    statePath: resolve(ASSET_ROOT, eyes.path),
    referencePath: resolve(ASSET_ROOT, shot.sourceFrame),
  });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const diagnosticsDirectory = join(PROOF_ROOT, 'eye-state-preflight');
  await mkdir(diagnosticsDirectory, { recursive: true });
  const diagnosticsPath = join(
    diagnosticsDirectory,
    `${stamp}-shot03-enki-eyes-v1.json`,
  );
  await writeFile(
    diagnosticsPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        type: 'shot03-level2-eye-state-preflight',
        generatedAt: new Date().toISOString(),
        sourceShotNumber: 3,
        layerId: eyes.id,
        layerPath: eyes.path,
        layerChecksum: eyes.sha256 ?? null,
        ...stateProof,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  printStateProof(stateProof, diagnosticsPath);
  if (!stateProof.pass) {
    console.error(
      'STATUS: BLOCKED — canonical closed-eye state is not visually strong and registered enough for rendered proof.',
    );
    process.exitCode = 2;
    return;
  }

  const result = spawnSync(
    process.execPath,
    ['tools/scripts/shot03-level2-rendered-proof.mjs'],
    {
      cwd: resolve('.'),
      env: process.env,
      stdio: 'inherit',
      windowsHide: true,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
}

function printStateProof(result, diagnosticsPath) {
  const m = result.metrics;
  console.log('Shot 3 Level 2 closed-eye asset preflight');
  console.log(
    `[${result.pass ? 'PASS' : 'BLOCKED'}] in-eye-band alpha: ${(m.inEyeBandAlphaRatio * 100).toFixed(2)}%`,
  );
  console.log(
    `[${result.pass ? 'PASS' : 'BLOCKED'}] eye-band coverage: ${(m.eyeBandFillRatio * 100).toFixed(3)}% alpha · ${(m.opaqueEyeBandFillRatio * 100).toFixed(3)}% opaque`,
  );
  console.log(
    `[${result.pass ? 'PASS' : 'BLOCKED'}] visible eye-region delta: ${(m.compositeChangedEyeBandRatio * 100).toFixed(3)}% changed · ${(m.strongChangedEyeBandRatio * 100).toFixed(3)}% strong`,
  );
  console.log(
    `[INFO] alpha bbox: ${m.alphaBounds ? `${m.alphaBounds.minX},${m.alphaBounds.minY} → ${m.alphaBounds.maxX},${m.alphaBounds.maxY}` : 'empty'}`,
  );
  console.log(
    `[INFO] eye band: ${m.eyeBand.minX},${m.eyeBand.minY} → ${m.eyeBand.maxX},${m.eyeBand.maxY}`,
  );
  if (!result.pass) {
    for (const failure of result.failures) console.log(`[BLOCKED] ${failure}`);
  }
  console.log(`[INFO] eye-state preflight report: ${diagnosticsPath}`);
}
