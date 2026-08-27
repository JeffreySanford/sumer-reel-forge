import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { evaluateReelAnimationReadiness } from '../animation/src/reel-animation-readiness.mjs';
import { loadReviewSet } from '../animation/src/animation-review-set.mjs';

const options = parseOptions(process.argv.slice(2));

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const manifestPath = resolve(options.manifest);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const motionBaselines = new Map();
  for (const reviewSetPath of options.reviewSets) {
    const { reviewSet } = await loadReviewSet(reviewSetPath);
    const baseline = reviewSet.candidates.find((candidate) => candidate.id === reviewSet.currentBaselineId);
    if (!baseline) continue;
    motionBaselines.set(reviewSet.shot, {
      reviewSetId: reviewSet.reviewSetId,
      candidateId: baseline.id,
      label: baseline.label,
      humanStatus: baseline.humanStatus,
      role: baseline.role,
      semanticResearchBlocking: false,
    });
  }

  const readiness = evaluateReelAnimationReadiness(manifest, { motionBaselines });
  readiness.generatedAt = new Date().toISOString();
  readiness.manifestPath = manifestPath;
  readiness.policy = {
    optionalLayersDoNotBlockRequiredAssetReadiness: true,
    semanticResearchDoesNotBlockAcceptedMotionBaseline: true,
    humanReviewStillRequiredForCinematicPublication: true,
    automaticPromotionAllowed: false,
  };

  const output = resolve(options.output);
  await mkdir(dirname(output), { recursive: true });
  const jsonPath = output.endsWith('.json') ? output : `${output}.json`;
  const markdownPath = jsonPath.replace(/\.json$/i, '.md');
  await writeFile(jsonPath, `${JSON.stringify(readiness, null, 2)}\n`, 'utf8');
  await writeFile(markdownPath, renderMarkdown(readiness), 'utf8');

  console.log(`Reel readiness: ${readiness.manifestId}`);
  for (const row of readiness.rows) {
    const motion = row.motionBaseline ? ` / motion=${row.motionBaseline.humanStatus}:${row.motionBaseline.candidateId}` : '';
    console.log(`Shot ${row.shotNumber}: ${row.releaseGate}${motion}`);
  }
  console.log(`JSON: ${jsonPath}`);
  console.log(`Markdown: ${markdownPath}`);
  console.log('[INFO] Optional/R&D lanes are visible but do not silently become production blockers.');
}

function renderMarkdown(readiness) {
  return [
    '# Reel animation readiness',
    '',
    `Manifest: \`${readiness.manifestId}\``,
    `Generated: ${readiness.generatedAt}`,
    '',
    '| shot | id | required assets | motion baseline | optional/deferred layers | release gate |',
    '| ---: | --- | --- | --- | ---: | --- |',
    ...readiness.rows.map((row) => {
      const motion = row.motionBaseline ? `${row.motionBaseline.candidateId} (${row.motionBaseline.humanStatus})` : 'not recorded';
      return `| ${row.shotNumber} | ${row.shotId} | ${row.requiredAssetsReady ? 'READY' : 'BLOCKED'} | ${motion} | ${row.optional.length} | ${row.releaseGate} |`;
    }),
    '',
    '## Policy',
    '',
    '- Required asset readiness is computed only from `activationPolicy.requiredLayerIds` plus approved review state.',
    '- Optional/planned layers remain visible but do not become blockers merely because they exist.',
    '- Accepted motion baselines remain authoritative while semantic/facial/articulation R&D continues separately.',
    '- This report never promotes assets and does not replace final human cinematic review.',
    '',
  ].join('\n');
}

function parseOptions(args) {
  const options = {
    manifest: 'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
    reviewSets: ['tools/animation/review-sets/shot03-recovered-motion.review-set.json'],
    output: 'tmp/animation-readiness/reel-01-readiness.json',
  };
  for (const arg of args) {
    if (arg.startsWith('--manifest=')) options.manifest = arg.slice('--manifest='.length);
    else if (arg.startsWith('--review-set=')) options.reviewSets.push(arg.slice('--review-set='.length));
    else if (arg === '--no-default-review-set') options.reviewSets = [];
    else if (arg.startsWith('--output=')) options.output = arg.slice('--output='.length);
    else throw new Error(`Unknown option ${arg}`);
  }
  return options;
}
