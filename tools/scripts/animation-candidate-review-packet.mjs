import { createHash } from 'node:crypto';
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
const options = parseOptions(process.argv.slice(2));

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  if (!options.config) throw new Error('Use --config=<review-set.json>.');
  const { path: configPath, reviewSet } = await loadReviewSet(options.config);
  const candidates = await resolveReviewCandidates(reviewSet, ROOT);
  const baseline = currentBaseline(reviewSet, candidates);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDirectory = resolve(
    options.output ?? join('tmp/animation-previews/review-packets', reviewSet.reviewSetId, stamp),
  );
  await mkdir(outputDirectory, { recursive: true });

  const configSha256 = prefixedSha(await readFile(configPath));
  const normalizedCandidates = [];
  for (const candidate of candidates) {
    const reportSha256 = prefixedSha(await readFile(candidate.reportPath));
    const aiReviewExists = Boolean(candidate.aiReviewPath && existsSync(candidate.aiReviewPath));
    normalizedCandidates.push({
      id: candidate.id,
      label: candidate.label,
      role: candidate.role,
      humanStatus: candidate.humanStatus,
      selectable: candidate.selectable === true,
      includeInMontage: candidate.includeInMontage !== false,
      notes: candidate.notes ?? '',
      reportPath: candidate.reportPath,
      reportSha256,
      proofType: candidate.report.proofType,
      generatedAt: candidate.report.generatedAt ?? null,
      technicalPass: candidate.report.technicalEvidence?.pass === true,
      aiStatus: candidate.aiStatus,
      aiReviewPath: aiReviewExists ? candidate.aiReviewPath : null,
      videoPath: candidate.videoPath,
    });
  }

  const packet = {
    schemaVersion: 1,
    type: 'animation-candidate-review-packet',
    generatedAt: new Date().toISOString(),
    reviewSetId: reviewSet.reviewSetId,
    title: reviewSet.title,
    shot: reviewSet.shot,
    configPath,
    configSha256,
    currentBaselineId: baseline.id,
    humanSelectionRequired: reviewSet.humanSelectionRequired === true,
    policy: reviewSet.policy,
    candidates: normalizedCandidates,
    deferredOrRejectedChannels: reviewSet.deferredOrRejectedChannels ?? [],
    decision: {
      currentBaselineId: baseline.id,
      currentBaselineLabel: baseline.label,
      authority: 'existing human normal-speed acceptance',
      reopenRejectedReferenceAutomatically: false,
      promotionAllowed: false,
    },
  };

  const jsonPath = join(outputDirectory, `${reviewSet.reviewSetId}.json`);
  const markdownPath = join(outputDirectory, `${reviewSet.reviewSetId}.md`);
  await writeFile(jsonPath, `${JSON.stringify(packet, null, 2)}\n`, 'utf8');
  await writeFile(markdownPath, renderMarkdown(packet), 'utf8');

  console.log(`Animation review packet: ${reviewSet.title}`);
  console.log(`Current baseline: ${baseline.label} (${baseline.id})`);
  for (const candidate of normalizedCandidates) {
    console.log(`- ${candidate.id}: ${candidate.role} / human=${candidate.humanStatus} / technical=${candidate.technicalPass ? 'PASS' : 'FAIL'} / ai=${candidate.aiStatus ?? 'n/a'}`);
  }
  console.log(`Packet JSON: ${jsonPath}`);
  console.log(`Packet Markdown: ${markdownPath}`);
  console.log('[STOP] Review packet is evidence only. It cannot promote or reopen a human-rejected candidate.');

  await maybeOpenReviewArtifacts([markdownPath], { enabled: !options.noOpen, delayMs: 120 });
}

function renderMarkdown(packet) {
  const rows = packet.candidates.map((candidate) =>
    `| ${candidate.id} | ${candidate.label} | ${candidate.role} | ${candidate.humanStatus} | ${candidate.technicalPass ? 'PASS' : 'FAIL'} | ${candidate.aiStatus ?? 'n/a'} | ${candidate.selectable ? 'yes' : 'no'} |`,
  );
  const deferred = packet.deferredOrRejectedChannels.length
    ? packet.deferredOrRejectedChannels.map((item) => `- ${item}`).join('\n')
    : '- none';
  return [
    `# ${packet.title}`,
    '',
    `Generated: ${packet.generatedAt}`,
    `Review set: \`${packet.reviewSetId}\``,
    `Config SHA-256: \`${packet.configSha256}\``,
    '',
    '## Current authority',
    '',
    `Current baseline: **${packet.decision.currentBaselineLabel}** (\`${packet.decision.currentBaselineId}\`).`,
    '',
    'This packet does not reopen rejected motion. Existing human normal-speed acceptance remains authoritative; technical and AI results are advisory evidence only.',
    '',
    '| id | label | role | human status | technical | AI advisory | selectable |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows,
    '',
    '## Deferred / rejected channels',
    '',
    deferred,
    '',
    '## Evidence',
    '',
    ...packet.candidates.flatMap((candidate) => [
      `### ${candidate.label}`,
      '',
      `- report: \`${candidate.reportPath}\``,
      `- report SHA-256: \`${candidate.reportSha256}\``,
      `- video: \`${candidate.videoPath}\``,
      `- AI review: ${candidate.aiReviewPath ? `\`${candidate.aiReviewPath}\`` : 'not available'}`,
      `- notes: ${candidate.notes || 'none'}`,
      '',
    ]),
    '## Gate',
    '',
    '**No automatic promotion.** Human review owns cinematic acceptance. Rejected references remain rejected unless a new explicit human review changes that status.',
    '',
  ].join('\n');
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
