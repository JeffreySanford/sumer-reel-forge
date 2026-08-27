import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

const ROOT = resolve('.');
const OUTPUT_ROOT = resolve('tmp/animation-previews/shot03-recovered-motion-decision-packet');
const PROOFS = Object.freeze([
  {
    key: 'primary',
    label: 'Primary recovered motion',
    directory: 'tmp/animation-previews/pixi-shot03-recovered-motion-proof',
    report: 'pixi-shot03-recovered-motion-proof.json',
    proofType: 'pixi-shot03-recovered-primary-motion-proof',
    role: 'accepted lower-capability baseline candidate: camera + vessel + Enki as one recovered rigid group',
    activeArtifactKey: 'activeVideo',
    abArtifactKey: 'exposureAbVideo',
  },
  {
    key: 'counterSway',
    label: 'Primary + Enki counter-sway',
    directory: 'tmp/animation-previews/pixi-shot03-recovered-character-motion-proof',
    report: 'pixi-shot03-recovered-character-motion-proof.json',
    proofType: 'pixi-shot03-recovered-character-motion-proof',
    role: 'first useful improvement candidate: Enki local settle/counterbalance on top of primary motion',
    activeArtifactKey: 'characterActiveVideo',
    abArtifactKey: 'characterAbVideo',
  },
  {
    key: 'breath',
    label: 'Primary + counter-sway + breathing',
    directory: 'tmp/animation-previews/pixi-shot03-recovered-breath-motion-proof',
    report: 'pixi-shot03-recovered-breath-motion-proof.json',
    proofType: 'pixi-shot03-recovered-breath-motion-proof',
    role: 'optional improvement candidate: bounded breathe-calm deformation after counter-sway',
    activeArtifactKey: 'breathActiveVideo',
    abArtifactKey: 'breathAbVideo',
    secondaryAbArtifactKey: 'breathBodyAbVideo',
  },
]);

const DEFERRED_LANES = Object.freeze([
  {
    lane: 'blink',
    status: 'deferred',
    reason: 'Prior canonical blink was deterministic but human-invisible at normal speed; stronger replacement did not receive completed review.',
    nextCondition: 'Revisit only after reliable face/eye semantic localization or a clearly readable source-faithful eye state exists.',
  },
  {
    lane: 'water',
    status: 'deferred',
    reason: 'Shot 3 water extraction evidence was sparse/non-basin and not source-safe enough for useful local motion.',
    nextCondition: 'Revisit on a shot/source where water is decomposed as a trustworthy material region.',
  },
  {
    lane: 'rigging',
    status: 'deferred',
    reason: 'Legacy and bounded rigging ROI attempts did not produce a coherent source-safe survivor worth animating.',
    nextCondition: 'Revisit only if a visually complete rigging cluster can be localized without crossing Enki or unrelated scene fragments.',
  },
]);

void main();

function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDirectory = join(OUTPUT_ROOT, stamp);
  mkdirSync(outputDirectory, { recursive: true });

  const options = PROOFS.map(loadProofOption);
  const packet = {
    schemaVersion: 1,
    type: 'shot03-recovered-motion-decision-packet',
    generatedAt: new Date().toISOString(),
    sourceAuthority: 'existing proof receipts plus built-in Ollama advisory reviews; no automatic visual acceptance',
    goal: 'Choose the smallest Shot 3 Enki motion stack that improves Reel 1 at normal speed while preserving the accepted source-bound look.',
    reviewOrder: [
      'Watch primary.activeVideo to establish the current baseline.',
      'Watch counterSway.abVideo and decide whether Enki local counterbalance is visibly better without slipping or fragment exposure.',
      'Watch breath.abVideo and breath.secondaryAbVideo only after counter-sway is acceptable.',
      'Record a human accept/reject receipt for exactly one selected stack; do not revive blink, water, or rigging during this review.',
    ],
    recommendedDefault: 'counterSway',
    recommendationRationale: [
      'Counter-sway has strong technical evidence and built-in AI PASS_ADVISORY review.',
      'It adds visible character life without depending on the abandoned blink or fragile water/rigging masks.',
      'Breathing remains plausible but should be accepted only if it improves normal-speed viewing rather than creating a pulse.',
    ],
    options,
    deferredLanes: DEFERRED_LANES,
    acceptancePolicy: {
      humanReviewRequired: true,
      automaticPromotionAllowed: false,
      acceptableDecisions: ['primary', 'counterSway', 'breath', 'reject-all'],
      receiptTemplate: 'planning/acceptance/shot03-recovered-motion-stack-acceptance.pending.md',
    },
  };
  const jsonPath = join(outputDirectory, 'shot03-recovered-motion-decision-packet.json');
  const markdownPath = join(outputDirectory, 'shot03-recovered-motion-decision-packet.md');
  writeFileSync(jsonPath, `${JSON.stringify(packet, null, 2)}\n`, 'utf8');
  writeFileSync(markdownPath, renderMarkdown(packet), 'utf8');

  console.log('Shot 3 recovered motion decision packet');
  console.log(`JSON: ${jsonPath}`);
  console.log(`Review: ${markdownPath}`);
  console.log('');
  for (const option of options) {
    console.log(`${option.key}: ${option.status} · active=${option.artifacts.activeVideo}`);
    if (option.artifacts.abVideo) console.log(`  A/B: ${option.artifacts.abVideo}`);
  }
  console.log('');
  console.log('[STOP] This packet is evidence for human review only. It does not promote assets or create an acceptance receipt.');
}

function loadProofOption(config) {
  const reportPath = latestReport(config.directory, config.report);
  const report = readJson(reportPath);
  if (report.proofType !== config.proofType) {
    throw new Error(`${reportPath} has proofType ${report.proofType}, expected ${config.proofType}.`);
  }
  const aiReview = report.aiReviewPath && existsSync(report.aiReviewPath)
    ? readJson(report.aiReviewPath)
    : null;
  const technicalPass = report.technicalEvidence?.pass === true;
  const aiStatus = report.aiStatus ?? aiReview?.status ?? 'UNKNOWN';
  const disabled = disabledLanes(report);
  const status = technicalPass && aiStatus === 'PASS_ADVISORY' && disabled.ok
    ? 'review-ready'
    : 'blocked';
  return {
    key: config.key,
    label: config.label,
    role: config.role,
    status,
    reportPath,
    reportSha256: sha256File(reportPath),
    aiReviewPath: report.aiReviewPath ?? null,
    aiStatus,
    aiSummary: aiReview?.summary ?? null,
    technicalPass,
    promotionAllowed: report.promotionAllowed === true,
    automaticPromotionAllowed: false,
    disabledLanes: disabled,
    motion: summarizeMotion(report.motion),
    sourceAssets: report.sourceAssets ?? {},
    artifacts: {
      activeVideo: report.artifacts?.[config.activeArtifactKey] ?? null,
      abVideo: report.artifacts?.[config.abArtifactKey] ?? null,
      secondaryAbVideo: config.secondaryAbArtifactKey
        ? report.artifacts?.[config.secondaryAbArtifactKey] ?? null
        : null,
      stillEvidence: report.artifacts?.maxMotionPair ??
        report.artifacts?.breathVisiblePair ??
        report.artifacts?.maxExposurePair ??
        null,
    },
    humanQuestions: report.humanReview?.questions ?? [],
  };
}

function latestReport(root, reportName) {
  const absoluteRoot = resolve(root);
  if (!existsSync(absoluteRoot)) throw new Error(`Missing proof root: ${absoluteRoot}`);
  const candidates = readdirSync(absoluteRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(absoluteRoot, entry.name, reportName))
    .filter((path) => existsSync(path))
    .sort((left, right) => basename(dirname(right)).localeCompare(basename(dirname(left))));
  if (!candidates.length) throw new Error(`No ${reportName} found under ${absoluteRoot}.`);
  return candidates[0];
}

function disabledLanes(report) {
  const policy = report.compositionPolicy ?? {};
  const hidden = new Set(policy.hiddenLegacyLayers ?? []);
  const blinkDisabled = policy.blinkReactivated === false || hidden.has('shot03-enki-eyes-v1');
  const waterDisabled = policy.waterReactivated === false || hidden.has('shot03-water-v1');
  const riggingDisabled = policy.riggingReactivated === false || hidden.has('shot03-rigging-v1');
  return {
    ok: blinkDisabled && waterDisabled && riggingDisabled,
    blinkDisabled,
    waterDisabled,
    riggingDisabled,
  };
}

function summarizeMotion(motion = {}) {
  return {
    activeProfile: motion.activeProfile ?? null,
    controlProfile: motion.controlProfile ?? null,
    differingFrames: motion.differingFrames ?? motion.activeControlDifferingFrameCount ?? null,
    uniqueStates: motion.uniqueCharacterStates ?? motion.uniqueBreathStates ?? motion.activeUniqueResolvedStateCount ?? null,
    maxSignalFrame: motion.maxSignalFrame ?? motion.peakFrame ?? motion.maxExposureFrame ?? null,
    peakFrames: motion.peakFrames ?? null,
    neutralFrames: motion.neutralFrames ?? null,
    maxChangedFrameRatio: motion.maxLocalization?.changedFrameRatio ?? motion.peakLocalization?.changedFrameRatio ?? null,
  };
}

function renderMarkdown(packet) {
  const lines = [
    '# Shot 3 Recovered Motion Decision Packet',
    '',
    `Generated: ${packet.generatedAt}`,
    '',
    '## Goal',
    '',
    packet.goal,
    '',
    '## Recommendation',
    '',
    `Default review candidate: **${packet.recommendedDefault}**.`,
    '',
    ...packet.recommendationRationale.map((item) => `- ${item}`),
    '',
    '## Review Options',
    '',
  ];
  for (const option of packet.options) {
    lines.push(
      `### ${option.label}`,
      '',
      `- Key: \`${option.key}\``,
      `- Status: \`${option.status}\``,
      `- Technical pass: \`${option.technicalPass}\``,
      `- Built-in AI review: \`${option.aiStatus}\``,
      `- Report: \`${relative(option.reportPath)}\``,
      `- Active video: \`${relative(option.artifacts.activeVideo)}\``,
      `- A/B video: \`${relative(option.artifacts.abVideo)}\``,
    );
    if (option.artifacts.secondaryAbVideo) {
      lines.push(`- Secondary A/B video: \`${relative(option.artifacts.secondaryAbVideo)}\``);
    }
    if (option.aiSummary) {
      lines.push('', `AI advisory summary: ${option.aiSummary}`);
    }
    lines.push('', 'Human questions:');
    for (const question of option.humanQuestions) lines.push(`- ${question}`);
    lines.push('');
  }
  lines.push('## Deferred Lanes', '');
  for (const lane of packet.deferredLanes) {
    lines.push(`- **${lane.lane}**: ${lane.reason} Next condition: ${lane.nextCondition}`);
  }
  lines.push(
    '',
    '## Acceptance Rule',
    '',
    'This packet does not promote anything. A human reviewer must watch the normal-speed videos and create an accepted receipt for exactly one stack, or reject all options.',
    '',
  );
  return `${lines.join('\n')}\n`;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function sha256File(path) {
  return `sha256:${createHash('sha256').update(readFileSync(path)).digest('hex')}`;
}

function relative(path) {
  if (!path) return '';
  return resolve(path).startsWith(ROOT) ? resolve(path).slice(ROOT.length + 1) : path;
}
