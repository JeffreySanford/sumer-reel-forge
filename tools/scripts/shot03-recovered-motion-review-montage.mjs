import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = resolve('.');
const PACKET_ROOT = resolve('tmp/animation-previews/shot03-recovered-motion-decision-packet');
const OUTPUT_ROOT = resolve('tmp/animation-previews/shot03-recovered-motion-review-montage');
const FONT = 'C\\:/Windows/Fonts/arial.ttf';
const STACKS = Object.freeze([
  { key: 'primary', label: 'PRIMARY' },
  { key: 'counterSway', label: 'COUNTER-SWAY' },
  { key: 'breath', label: 'BREATH' },
]);

void main();

function main() {
  const packetPath = latestPacket();
  const packet = readJson(packetPath);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDirectory = join(OUTPUT_ROOT, stamp);
  mkdirSync(outputDirectory, { recursive: true });

  const options = STACKS.map((stack) => {
    const option = packet.options?.find((candidate) => candidate.key === stack.key);
    if (!option) throw new Error(`Decision packet is missing option ${stack.key}.`);
    const activeVideo = resolveRequired(option.artifacts?.activeVideo, `${stack.key} active video`);
    const abVideo = resolveRequired(option.artifacts?.abVideo, `${stack.key} A/B video`);
    return { ...stack, option, activeVideo, abVideo };
  });

  const activeMontagePath = join(outputDirectory, 'shot03-recovered-motion-active-three-up.mp4');
  const activeContactSheetPath = join(outputDirectory, 'shot03-recovered-motion-active-three-up-contact-sheet.jpg');
  const abIndexPath = join(outputDirectory, 'shot03-recovered-motion-ab-index.md');

  renderThreeUpActiveMontage(options, activeMontagePath);
  renderContactSheet(activeMontagePath, activeContactSheetPath);
  writeFileSync(abIndexPath, renderAbIndex(packet, options), 'utf8');

  const receipt = {
    schemaVersion: 1,
    type: 'shot03-recovered-motion-review-montage',
    generatedAt: new Date().toISOString(),
    decisionPacketPath: packetPath,
    decisionPacketSha256: sha256File(packetPath),
    sourceAuthority: 'review montage only; does not change canonical assets, manifests, or acceptance receipts',
    videos: Object.fromEntries(
      options.map((item) => [
        item.key,
        {
          label: item.label,
          activeVideo: item.activeVideo,
          abVideo: item.abVideo,
          reportPath: item.option.reportPath,
          aiStatus: item.option.aiStatus,
        },
      ]),
    ),
    artifacts: {
      activeMontageVideo: activeMontagePath,
      activeContactSheet: activeContactSheetPath,
      abIndex: abIndexPath,
    },
    deferredLanesRemainDeferred: ['blink', 'water', 'rigging'],
    humanReviewRequired: true,
    automaticPromotionAllowed: false,
  };
  const receiptPath = join(outputDirectory, 'shot03-recovered-motion-review-montage.json');
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');

  console.log('Shot 3 recovered motion review montage');
  console.log(`Decision packet: ${packetPath}`);
  console.log(`Montage: ${activeMontagePath}`);
  console.log(`Contact sheet: ${activeContactSheetPath}`);
  console.log(`A/B index: ${abIndexPath}`);
  console.log(`Receipt: ${receiptPath}`);
  console.log('');
  console.log('[STOP] Review montage only. Human acceptance remains separate.');
}

function latestPacket() {
  if (!existsSync(PACKET_ROOT)) {
    throw new Error(`Missing decision packet root: ${PACKET_ROOT}. Run pnpm animation:shot3:motion-decision-packet first.`);
  }
  const candidates = readdirSync(PACKET_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(PACKET_ROOT, entry.name, 'shot03-recovered-motion-decision-packet.json'))
    .filter((path) => existsSync(path))
    .sort((left, right) => basename(dirname(right)).localeCompare(basename(dirname(left))));
  if (!candidates.length) {
    throw new Error(`No decision packet found under ${PACKET_ROOT}.`);
  }
  return candidates[0];
}

function renderThreeUpActiveMontage(options, outputPath) {
  const args = [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    ...options.flatMap((item) => ['-i', item.activeVideo]),
    '-filter_complex',
    [
      labeledPanel(0, options[0].label, 'a'),
      labeledPanel(1, options[1].label, 'b'),
      labeledPanel(2, options[2].label, 'c'),
      '[a][b][c]hstack=inputs=3[out]',
    ].join(';'),
    '-map',
    '[out]',
    '-an',
    '-r',
    '30',
    '-pix_fmt',
    'yuv420p',
    outputPath,
  ];
  runFfmpeg(args, 'three-up active montage');
}

function labeledPanel(index, label, name) {
  const escaped = label.replaceAll("'", "\\'");
  return `[${index}:v]scale=540:960:flags=lanczos,setsar=1,pad=540:1020:0:60:color=black,drawtext=fontfile='${FONT}':text='${escaped}':x=(w-text_w)/2:y=18:fontsize=32:fontcolor=white[out${name}];[out${name}]format=yuv420p[${name}]`;
}

function renderContactSheet(inputPath, outputPath) {
  const args = [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    inputPath,
    '-vf',
    'fps=1/1.75,scale=810:-1,tile=2x2',
    '-frames:v',
    '1',
    outputPath,
  ];
  runFfmpeg(args, 'active montage contact sheet');
}

function renderAbIndex(packet, options) {
  const lines = [
    '# Shot 3 Recovered Motion A/B Index',
    '',
    `Decision packet: \`${relative(packet.generatedAt ? latestPacket() : '')}\``,
    '',
    'Use these normal-speed A/B videos for the final human choice. Built-in AI reviews are advisory only.',
    '',
  ];
  for (const item of options) {
    lines.push(
      `## ${item.label}`,
      '',
      `- Key: \`${item.key}\``,
      `- A/B video: \`${relative(item.abVideo)}\``,
      `- Active video: \`${relative(item.activeVideo)}\``,
      `- AI review: \`${item.option.aiStatus}\``,
      '',
    );
  }
  lines.push('Deferred lanes remain deferred: `blink`, `water`, `rigging`.', '');
  return `${lines.join('\n')}\n`;
}

function runFfmpeg(args, label) {
  const result = spawnSync('ffmpeg', args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`FFmpeg ${label} failed: ${result.stderr || `exit ${result.status}`}`);
  }
}

function resolveRequired(path, label) {
  if (!path) throw new Error(`Decision packet is missing ${label}.`);
  const absolute = resolve(path);
  if (!existsSync(absolute)) throw new Error(`Missing ${label}: ${absolute}`);
  return absolute;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function sha256File(path) {
  return `sha256:${createHash('sha256').update(readFileSync(path)).digest('hex')}`;
}

function relative(path) {
  if (!path) return '';
  const absolute = resolve(path);
  return absolute.startsWith(ROOT) ? absolute.slice(ROOT.length + 1) : path;
}
