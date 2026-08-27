import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { maybeOpenReviewArtifacts } from './open-review-artifacts.mjs';
import {
  currentBaseline,
  loadReviewSet,
  resolveReviewCandidates,
} from '../animation/src/animation-review-set.mjs';

const ROOT = resolve('.');
const FFMPEG = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
const options = parseOptions(process.argv.slice(2));

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  if (!options.config) throw new Error('Use --config=<review-set.json>.');
  const { path: configPath, reviewSet } = await loadReviewSet(options.config);
  const allCandidates = await resolveReviewCandidates(reviewSet, ROOT);
  const candidates = allCandidates.filter((candidate) => candidate.includeInMontage !== false);
  if (candidates.length < 2 || candidates.length > 4) {
    throw new Error(`Review montage supports 2..4 candidates; got ${candidates.length}.`);
  }
  const baseline = currentBaseline(reviewSet, allCandidates);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDirectory = resolve(
    options.output ?? join('tmp/animation-previews/review-montages', reviewSet.reviewSetId, stamp),
  );
  await mkdir(outputDirectory, { recursive: true });

  const montagePath = join(outputDirectory, `${reviewSet.reviewSetId}-montage.mp4`);
  const contactSheetPath = join(outputDirectory, `${reviewSet.reviewSetId}-contact-sheet.png`);
  const indexPath = join(outputDirectory, `${reviewSet.reviewSetId}-index.md`);
  const receiptPath = join(outputDirectory, `${reviewSet.reviewSetId}-montage.json`);

  encodeMontage(candidates, montagePath);
  captureContactSheet(montagePath, contactSheetPath);

  const configSha256 = prefixedSha(await readFile(configPath));
  const receiptCandidates = [];
  for (const candidate of candidates) {
    receiptCandidates.push({
      id: candidate.id,
      label: candidate.label,
      role: candidate.role,
      humanStatus: candidate.humanStatus,
      reportPath: candidate.reportPath,
      reportSha256: prefixedSha(await readFile(candidate.reportPath)),
      videoPath: candidate.videoPath,
      currentBaseline: candidate.id === baseline.id,
    });
  }
  const receipt = {
    schemaVersion: 1,
    type: 'animation-candidate-review-montage',
    generatedAt: new Date().toISOString(),
    reviewSetId: reviewSet.reviewSetId,
    configPath,
    configSha256,
    currentBaselineId: baseline.id,
    candidates: receiptCandidates,
    artifacts: { montagePath, contactSheetPath, indexPath },
    humanReviewRequired: true,
    automaticPromotionAllowed: false,
    rejectedReferencesRemainRejected: true,
  };
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  await writeFile(indexPath, renderIndex(reviewSet, receipt), 'utf8');

  console.log(`Animation review montage: ${reviewSet.title}`);
  console.log(`Current baseline: ${baseline.label}`);
  console.log(`Montage: ${montagePath}`);
  console.log(`Contact sheet: ${contactSheetPath}`);
  console.log(`Index: ${indexPath}`);
  console.log(`Receipt: ${receiptPath}`);
  console.log('[STOP] Montage is a review aid only. Rejected references remain rejected and no candidate is promoted.');

  await maybeOpenReviewArtifacts([montagePath, contactSheetPath, indexPath], {
    enabled: !options.noOpen,
    delayMs: 120,
  });
}

function encodeMontage(candidates, outputPath) {
  const args = ['-y', '-hide_banner', '-loglevel', 'error'];
  for (const candidate of candidates) args.push('-i', candidate.videoPath);
  const filters = candidates.map((candidate, index) => {
    const label = safeLabel(`${candidate.id.toUpperCase()} ${candidate.role} ${candidate.humanStatus}`);
    return `[${index}:v]scale=540:960:force_original_aspect_ratio=decrease,pad=540:960:(ow-iw)/2:(oh-ih)/2,drawtext=text='${label}':x=(w-text_w)/2:y=24:fontsize=26:fontcolor=white:box=1:boxcolor=black@0.65:boxborderw=10[v${index}]`;
  });
  const inputs = candidates.map((_, index) => `[v${index}]`).join('');
  filters.push(`${inputs}hstack=inputs=${candidates.length}[outv]`);
  args.push(
    '-filter_complex', filters.join(';'),
    '-map', '[outv]',
    '-an',
    '-r', '30',
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-shortest',
    outputPath,
  );
  run(FFMPEG, args, 'review montage encode');
}

function captureContactSheet(montagePath, outputPath) {
  run(FFMPEG, [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-ss', '3.5', '-i', montagePath,
    '-frames:v', '1', '-update', '1', outputPath,
  ], 'review montage contact sheet');
}

function renderIndex(reviewSet, receipt) {
  return [
    `# ${reviewSet.title} — normal-speed review index`,
    '',
    `Current accepted baseline: **${receipt.currentBaselineId}**.`,
    '',
    'The montage includes rejected historical references for comparison only. Their presence does not reopen them as candidates.',
    '',
    '| panel | label | role | human status | authority |',
    '| --- | --- | --- | --- | --- |',
    ...receipt.candidates.map((candidate, index) =>
      `| ${String.fromCharCode(65 + index)} | ${candidate.label} | ${candidate.role} | ${candidate.humanStatus} | ${candidate.currentBaseline ? 'CURRENT BASELINE' : candidate.role === 'rejected-reference' ? 'REJECTED REFERENCE' : 'REFERENCE'} |`,
    ),
    '',
    `Montage: \`${receipt.artifacts.montagePath}\``,
    `Contact sheet: \`${receipt.artifacts.contactSheetPath}\``,
    '',
    '**Human normal-speed judgment remains authoritative. No automatic promotion.**',
    '',
  ].join('\n');
}

function run(command, args, label) {
  const result = spawnSync(command, args, { cwd: ROOT, encoding: 'utf8', windowsHide: true, shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${label} failed: ${result.stderr || result.stdout || `exit ${result.status}`}`);
}

function safeLabel(value) {
  return String(value).replace(/[^A-Za-z0-9 _-]/g, '').replace(/'/g, '').slice(0, 80);
}

function parseOptions(args) {
  const options = { config: null, output: null, noOpen: false };
  for (const arg of args) {
    if (arg.startsWith('--config=')) options.config = arg.slice('--config='.length);
    else if (arg.startsWith('--output=')) options.output = arg.slice('--output='.length);
    else if (arg === '--no-open') options.noOpen = true;
    else throw new Error(`Unknown option ${arg}`);
  }
  return options;
}

function prefixedSha(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}
