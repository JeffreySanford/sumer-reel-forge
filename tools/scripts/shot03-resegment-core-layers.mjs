import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { maybeOpenReviewArtifacts } from './open-review-artifacts.mjs';

const ROOT = resolve('.');
const MANIFEST_PATH = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const RESEGMENT_ROOT = resolve('tmp/animation-assets/resegmentation/shot03');
const CANDIDATE_BASE = resolve(
  'tmp/animation-assets/candidates/shot03-core-resegmentation',
);
const FFMPEG = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
const DEFAULT_THRESHOLDS = [0.1, 0.2, 0.3];
const EXPECTED_WIDTH = 941;
const EXPECTED_HEIGHT = 1672;

const TARGETS = Object.freeze({
  vessel: Object.freeze({
    key: 'vessel',
    layerId: 'shot03-vessel-v1',
    query:
      'complete visible reed boat vessel, entire boat hull from prow to stern, gunwales, deck edge, hull sides, stern structure, all physically connected vessel body; one continuous vessel silhouette; exclude water, man, sky, shoreline and loose foreground reeds',
  }),
  enki: Object.freeze({
    key: 'enki',
    layerId: 'shot03-enki-body-v1',
    query:
      'complete visible Enki human figure, entire mature robed man including head, hair, beard, face, neck, torso, both shoulders, both arms, both hands, robe, belt and all visible lower clothing; one continuous person silhouette; exclude boat, water, sky and foreground rigging',
  }),
});

const command = process.argv[2] ?? 'preflight';
const options = parseOptions(process.argv.slice(3));

await main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  if (!['preflight', 'generate'].includes(command)) {
    throw new Error('Use preflight or generate.');
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const workDirectory = join(RESEGMENT_ROOT, stamp);
  const candidateDirectory = join(CANDIDATE_BASE, stamp);
  await Promise.all([
    mkdir(workDirectory, { recursive: true }),
    mkdir(candidateDirectory, { recursive: true }),
  ]);

  const canonical = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  const selectedTargets = selectTargets(options.layer);
  const temporaryManifest = structuredClone(canonical);
  const shot = temporaryManifest.shots?.find((item) => item.sourceShotNumber === 3);
  if (!shot) throw new Error('Shot 3 is missing from the animation manifest.');

  for (const target of selectedTargets) {
    const layer = shot.layers?.find((item) => item.id === target.layerId);
    if (!layer) throw new Error(`Missing ${target.layerId} from Shot 3 manifest.`);
    layer.state = 'pending';
    layer.review = {
      ...(layer.review ?? {}),
      status: 'pending-resegmentation-review',
    };
  }

  const tempManifestPath = join(workDirectory, 'temporary-animation-manifest.json');
  await writeFile(
    tempManifestPath,
    `${JSON.stringify(temporaryManifest, null, 2)}\n`,
    'utf8',
  );

  console.log('Shot 3 core-layer resegmentation sweep');
  console.log(`Mode: ${command}`);
  console.log(`Canonical manifest: ${MANIFEST_PATH}`);
  console.log(`Temporary manifest: ${tempManifestPath}`);
  console.log(`Targets: ${selectedTargets.map((item) => item.layerId).join(', ')}`);
  console.log(`Thresholds: ${options.thresholds.map((value) => value.toFixed(2)).join(', ')}`);
  console.log('Policy: canonical manifest/assets remain untouched; all outputs stay under tmp/.');

  const results = [];
  for (const target of selectedTargets) {
    for (const threshold of options.thresholds) {
      const suffix = threshold.toFixed(2).replace('.', 'p');
      const workflowPath = join(workDirectory, `${target.key}-threshold-${suffix}.json`);
      const outputRoot = join(candidateDirectory, `${target.key}-threshold-${suffix}`);
      await writeFile(
        workflowPath,
        `${JSON.stringify(buildWorkflow(target, threshold), null, 2)}\n`,
        'utf8',
      );

      console.log('');
      console.log(
        `[${target.key}] ${command} threshold=${threshold.toFixed(2)} -> ${outputRoot}`,
      );
      runCandidateCommand({
        command,
        manifestPath: tempManifestPath,
        layerId: target.layerId,
        workflowPath,
        outputRoot,
      });

      if (command === 'generate') {
        const candidatePath = join(
          outputRoot,
          'shot-03',
          `${target.layerId}.png`,
        );
        const analysis = analyzeAlpha(candidatePath);
        results.push({
          target: target.key,
          layerId: target.layerId,
          threshold,
          candidatePath,
          ...analysis,
        });
        printAnalysis(target.key, threshold, analysis, candidatePath);
      }
    }
  }

  const reportPath = join(workDirectory, 'shot03-core-resegmentation.json');
  const report = {
    schemaVersion: 1,
    type: 'shot03-core-layer-resegmentation-sweep',
    generatedAt: new Date().toISOString(),
    command,
    canonicalManifestPath: MANIFEST_PATH,
    temporaryManifestPath: tempManifestPath,
    canonicalManifestMutated: false,
    canonicalAssetsMutated: false,
    thresholds: options.thresholds,
    targets: selectedTargets.map(({ key, layerId, query }) => ({ key, layerId, query })),
    results,
    interpretation:
      'Candidate generation only. A useful major-prop/character extraction must form a coherent subject silhouette, not sparse edge fragments. Human review remains mandatory before background rebuilding or promotion.',
  };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log('');
  if (command === 'generate') {
    printRanking(results);
    console.log('');
    console.log('[STOP] Do not animate or promote these candidates yet.');
    console.log('[NEXT] Review the strongest vessel and Enki PNGs visually, then rebuild the background from their complete masks.');
  } else {
    console.log('[NEXT] If all preflights are green, rerun with:');
    console.log('       node tools/scripts/shot03-resegment-core-layers.mjs generate');
  }
  console.log(`[INFO] report: ${reportPath}`);

  if (command === 'generate') {
    await maybeOpenReviewArtifacts(bestCandidatePaths(results), { delayMs: 120 });
  }
}

function buildWorkflow(target, threshold) {
  return {
    '1': {
      inputs: { image: '{{SOURCE_IMAGE}}' },
      class_type: 'LoadImage',
      _meta: { title: 'Approved Shot 3 editorial source' },
    },
    '2': {
      inputs: { ckpt_name: 'sam3.1_multiplex_fp16.safetensors' },
      class_type: 'CheckpointLoaderSimple',
      _meta: { title: 'SAM 3.1 Multiplex FP16' },
    },
    '3': {
      inputs: {
        text: target.query,
        clip: ['2', 1],
      },
      class_type: 'CLIPTextEncode',
      _meta: {
        title: `Shot 3 ${target.key} complete-silhouette query`,
        source_contract: '{{LAYER_PROMPT}}',
      },
    },
    '4': {
      inputs: {
        model: ['2', 0],
        image: ['1', 0],
        conditioning: ['3', 0],
        threshold,
        refine_iterations: 4,
        individual_masks: false,
      },
      class_type: 'SAM3_Detect',
      _meta: { title: `Segment complete Shot 3 ${target.key}` },
    },
    '5': {
      inputs: {
        image: ['1', 0],
        alpha: ['4', 0],
      },
      class_type: 'JoinImageWithAlpha',
      _meta: { title: `Preserve source pixels under ${target.key} alpha` },
    },
    '6': {
      inputs: {
        filename_prefix: '{{OUTPUT_PREFIX}}',
        images: ['5', 0],
      },
      class_type: 'SaveImage',
      _meta: { title: `Save registered ${target.key} candidate` },
    },
  };
}

function runCandidateCommand({ command, manifestPath, layerId, workflowPath, outputRoot }) {
  const args = [
    resolve('tools/scripts/animation-layer-candidates.mjs'),
    command,
    `--manifest=${manifestPath}`,
    '--shot=3',
    `--layer=${layerId}`,
    `--workflow=${workflowPath}`,
  ];
  if (command === 'generate') args.push(`--output=${outputRoot}`);

  const result = spawnSync(process.execPath, args, {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `Layer candidate ${command} failed for ${layerId} (${workflowPath}) with exit ${result.status}.`,
    );
  }
}

function analyzeAlpha(path) {
  const pixels = EXPECTED_WIDTH * EXPECTED_HEIGHT;
  const expectedBytes = pixels * 4;
  const result = spawnSync(
    FFMPEG,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      path,
      '-frames:v',
      '1',
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgba',
      'pipe:1',
    ],
    {
      cwd: ROOT,
      encoding: null,
      maxBuffer: Math.max(32 * 1024 * 1024, expectedBytes + 1024),
      windowsHide: true,
      shell: false,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ffmpeg could not decode ${path}: ${String(result.stderr ?? '').trim()}`);
  }
  if (!Buffer.isBuffer(result.stdout) || result.stdout.length !== expectedBytes) {
    throw new Error(
      `${path} decoded to ${result.stdout?.length ?? 0} bytes; expected ${expectedBytes}.`,
    );
  }

  let anyAlpha = 0;
  let strongAlpha = 0;
  let alphaSum = 0;
  let minX = EXPECTED_WIDTH;
  let minY = EXPECTED_HEIGHT;
  let maxX = -1;
  let maxY = -1;
  let edgeStrong = 0;

  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const alpha = result.stdout[pixel * 4 + 3];
    if (alpha > 16) anyAlpha += 1;
    if (alpha <= 128) continue;
    strongAlpha += 1;
    alphaSum += alpha;
    const x = pixel % EXPECTED_WIDTH;
    const y = Math.floor(pixel / EXPECTED_WIDTH);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (x <= 1 || x >= EXPECTED_WIDTH - 2 || y <= 1 || y >= EXPECTED_HEIGHT - 2) {
      edgeStrong += 1;
    }
  }

  const bbox =
    strongAlpha > 0
      ? {
          x: minX,
          y: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
        }
      : null;
  const bboxArea = bbox ? bbox.width * bbox.height : 0;
  const strongCoverage = strongAlpha / pixels;
  const bboxFill = bboxArea ? strongAlpha / bboxArea : 0;
  const weightedCoverage = alphaSum / 255 / pixels;
  const edgeStrongRatio = strongAlpha ? edgeStrong / strongAlpha : 0;

  return {
    dimensions: { width: EXPECTED_WIDTH, height: EXPECTED_HEIGHT },
    anyAlphaPixels: anyAlpha,
    strongAlphaPixels: strongAlpha,
    strongCoverage,
    weightedCoverage,
    bbox,
    bboxFill,
    edgeStrongRatio,
    fragmentRisk:
      strongCoverage < 0.01 || bboxFill < 0.03 || edgeStrongRatio > 0.3
        ? 'HIGH'
        : strongCoverage < 0.02 || bboxFill < 0.06
          ? 'MEDIUM'
          : 'LOW',
  };
}

function printAnalysis(target, threshold, analysis, candidatePath) {
  console.log(
    `[RESULT] ${target} t=${threshold.toFixed(2)} alpha>128 ${(analysis.strongCoverage * 100).toFixed(3)}% · bbox-fill ${(analysis.bboxFill * 100).toFixed(2)}% · edge ${(analysis.edgeStrongRatio * 100).toFixed(2)}% · fragment-risk ${analysis.fragmentRisk}`,
  );
  console.log(
    `         bbox ${analysis.bbox ? `${analysis.bbox.x},${analysis.bbox.y} ${analysis.bbox.width}x${analysis.bbox.height}` : '<none>'}`,
  );
  console.log(`         ${candidatePath}`);
}

function rankResults(results) {
  const risk = { LOW: 0, MEDIUM: 1, HIGH: 2 };
  return [...results].sort((a, b) => {
    return (
      risk[a.fragmentRisk] - risk[b.fragmentRisk] ||
      b.bboxFill - a.bboxFill ||
      b.strongCoverage - a.strongCoverage ||
      a.threshold - b.threshold
    );
  });
}

function bestCandidatePaths(results) {
  const paths = [];
  for (const target of [...new Set(results.map((item) => item.target))]) {
    const best = rankResults(results.filter((item) => item.target === target))[0];
    if (best?.candidatePath) paths.push(best.candidatePath);
  }
  return paths;
}

function printRanking(results) {
  console.log('[RANKING] structural candidates (lower fragment risk, then higher bbox-fill):');
  for (const target of [...new Set(results.map((item) => item.target))]) {
    const ranked = rankResults(results.filter((item) => item.target === target));
    console.log(`  ${target}:`);
    for (const item of ranked) {
      console.log(
        `    t=${item.threshold.toFixed(2)} · risk ${item.fragmentRisk} · coverage ${(item.strongCoverage * 100).toFixed(3)}% · bbox-fill ${(item.bboxFill * 100).toFixed(2)}%`,
      );
    }
  }
}

function selectTargets(value) {
  if (!value || value === 'both') return [TARGETS.vessel, TARGETS.enki];
  if (value === 'vessel') return [TARGETS.vessel];
  if (value === 'enki') return [TARGETS.enki];
  throw new Error('--layer must be vessel, enki, or both.');
}

function parseOptions(args) {
  const result = { layer: 'both', thresholds: [...DEFAULT_THRESHOLDS] };
  for (const arg of args) {
    if (arg === '--no-open') {
      continue;
    }
    if (arg.startsWith('--layer=')) {
      result.layer = arg.slice('--layer='.length);
    } else if (arg.startsWith('--thresholds=')) {
      const values = arg
        .slice('--thresholds='.length)
        .split(',')
        .map((value) => Number(value.trim()));
      if (
        !values.length ||
        values.some((value) => !Number.isFinite(value) || value <= 0 || value >= 1)
      ) {
        throw new Error('--thresholds must be comma-separated numbers between 0 and 1.');
      }
      result.thresholds = values;
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  return result;
}
