import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';
import { prepareBackgroundMaskCandidates } from './prepare-shot03-background-mask-candidates.mjs';

const CANDIDATE_ROOT = resolve(
  'tmp/animation-assets/candidates/chapter-01-reel-01-animation-v1',
);
const TARGETS = [
  {
    layerId: 'shot03-enki-body-v1',
    label: 'Enki',
    previewRoot: resolve('tmp/animation-previews/shot03-enki-body-preview'),
  },
  {
    layerId: 'shot03-vessel-v1',
    label: 'Vessel',
    previewRoot: resolve('tmp/animation-previews/shot03-vessel-preview'),
  },
];

const command = process.argv[2] ?? 'preflight';
if (!['preflight', 'generate'].includes(command)) {
  throw new Error('Use preflight or generate.');
}

const approvedInputs = TARGETS.map(resolveQaPassedCandidate);
console.log('Background foreground-mask gate');
for (const input of approvedInputs) {
  console.log(
    `[ok] ${input.label}: Motion QA PASS · ${input.candidateRunDirectory}`,
  );
}
console.log('');

// Background reconstruction needs a robust removal matte, not every tiny
// anti-aliased/noise pixel carried by the production candidates. Build
// temporary alpha-only derivatives from the QA-passed candidates; the original
// candidate PNGs and animation-v1 remain untouched.
const maskInputs = prepareBackgroundMaskCandidates(approvedInputs);
if (!maskInputs.enki || !maskInputs.vessel) {
  throw new Error('Could not prepare both Enki and vessel background mask inputs.');
}

const script = resolve('tools/scripts/shot03-background-layer.mjs');
const forwarded = process.argv.slice(3).filter((arg) => arg !== '--');
const result = spawnSync(
  process.execPath,
  [
    script,
    command,
    `--enki-candidate-dir=${maskInputs.enki.candidateRunDirectory}`,
    `--vessel-candidate-dir=${maskInputs.vessel.candidateRunDirectory}`,
    ...forwarded,
  ],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;

function resolveQaPassedCandidate(target) {
  if (!existsSync(target.previewRoot)) {
    throw new Error(
      `No ${target.label} preview root found at ${target.previewRoot}. Generate, preview, and verify ${target.layerId} first.`,
    );
  }
  const previewDirectories = readdirSync(target.previewRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(target.previewRoot, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));

  for (const previewDirectory of previewDirectories) {
    const qaPath = join(previewDirectory, 'motion-qa.json');
    const previewManifestPath = join(previewDirectory, 'preview-manifest.json');
    if (!existsSync(qaPath) || !existsSync(previewManifestPath)) continue;

    try {
      const qa = JSON.parse(readFileSync(qaPath, 'utf8'));
      const preview = JSON.parse(readFileSync(previewManifestPath, 'utf8'));
      if (qa.pass !== true || preview.layerId !== target.layerId) continue;

      const rawRunDirectory = preview.candidate?.runDirectory;
      const rawCandidatePath = preview.candidate?.path;
      if (typeof rawRunDirectory !== 'string' || typeof rawCandidatePath !== 'string') {
        continue;
      }
      const candidateRunDirectory = resolve(rawRunDirectory);
      const candidatePath = isAbsolute(rawCandidatePath)
        ? resolve(rawCandidatePath)
        : resolve(candidateRunDirectory, rawCandidatePath);
      assertInside(CANDIDATE_ROOT, candidateRunDirectory, `${target.label} candidate run`);
      assertInside(candidateRunDirectory, candidatePath, `${target.label} candidate PNG`);
      if (!existsSync(candidatePath)) continue;

      return {
        ...target,
        previewDirectory,
        qaPath,
        previewManifestPath,
        candidateRunDirectory,
        candidatePath,
      };
    } catch {
      // Ignore incomplete older previews and continue to the next verified run.
    }
  }

  throw new Error(
    `No QA-passed ${target.layerId} preview was found. Run its preview and verify commands before background reconstruction.`,
  );
}

function assertInside(parent, child, label) {
  const path = relative(resolve(parent), resolve(child));
  if (path.startsWith('..') || isAbsolute(path)) {
    throw new Error(`${label} must remain under ${parent}: ${child}`);
  }
}
