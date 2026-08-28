import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';
import { checkWorkflowHostCompatibility } from '../renderer/comfyui-workflow-doctor.mjs';

const MANIFEST_PATH = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const ASSET_ROOT = resolve('assets');
const CANDIDATE_ROOT = resolve(
  'tmp/animation-assets/candidates/chapter-01-reel-01-animation-v1',
);
const INPUT_BASE_ROOT = resolve('tmp/animation-assets/background-inputs');
const DEFAULT_WORKFLOW_PATH = resolve(
  'tools/renderer/workflows/shot03-background-inpaint-api.json',
);
const CROP_ALIGNMENT = 8;
const DEFAULT_CROP_PADDING = 64;
const MASK_BOUNDARY_THRESHOLD = 8;

const command = process.argv[2] ?? 'preflight';
const options = parseOptions(process.argv.slice(3).filter((arg) => arg !== '--'));

await main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  if (!['preflight', 'generate'].includes(command)) {
    throw new Error('Use preflight or generate.');
  }

  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  const shot = manifest.shots?.find(
    (item) => item.sourceShotNumber === options.shotNumber,
  );
  if (!shot) throw new Error(`Shot ${options.shotNumber} is not present in animation-v1.`);

  const background = shot.layers?.find((item) => item.id === options.backgroundLayerId);
  const foreground = shot.layers?.find((item) => item.id === options.foregroundLayerId);
  if (!background || !foreground) {
    throw new Error(
      `Could not resolve background ${options.backgroundLayerId} and foreground ${options.foregroundLayerId} for Shot ${options.shotNumber}.`,
    );
  }
  if (background.hasAlpha) {
    throw new Error(`${background.id} must be an opaque repaired background layer.`);
  }
  if (background.source?.type !== 'painted-repair') {
    throw new Error(`${background.id} must declare source.type=painted-repair.`);
  }
  if (!foreground.hasAlpha) {
    throw new Error(`${foreground.id} must be an alpha foreground overlay.`);
  }

  const sourcePath = resolve(ASSET_ROOT, shot.sourceFrame);
  const sourceDimensions = readPngDimensions(
    await readFile(sourcePath),
    `Shot ${options.shotNumber} editorial source`,
  );
  const verifiedForeground = await resolveVerifiedForegroundCandidate(
    shot,
    foreground,
    options.foregroundCandidateDir,
  );
  const input = await prepareInpaintInputs({
    shot,
    sourcePath,
    sourceDimensions,
    background,
    foreground,
    verifiedForeground,
  });

  const workflowPath = resolve(options.workflowPath ?? DEFAULT_WORKFLOW_PATH);
  const baseUrl = (process.env.COMFYUI_BASE_URL ?? 'http://127.0.0.1:8188').replace(/\/$/, '');
  const checks = [
    await fileCheck('Animation manifest', MANIFEST_PATH),
    await fileCheck(`Shot ${options.shotNumber} source`, sourcePath),
    await fileCheck('QA-passed foreground candidate', verifiedForeground.path),
    await fileCheck('Foreground structure QA', verifiedForeground.qaPath),
    await fileCheck('Removal mask', input.maskPath),
    await fileCheck('Cropped editorial source', input.sourceCropPath),
    await fileCheck('Cropped removal mask', input.maskCropPath),
    {
      ok:
        input.maskCoverageRatio >= options.minMaskRatio &&
        input.maskCoverageRatio <= options.maxMaskRatio,
      name: 'Removal-mask coverage',
      detail: `${(input.maskCoverageRatio * 100).toFixed(3)}% of editorial canvas (allowed ${(options.minMaskRatio * 100).toFixed(3)}%–${(options.maxMaskRatio * 100).toFixed(1)}%)`,
    },
    await httpCheck('ComfyUI', `${baseUrl}/system_stats`),
  ];
  const compatibility = await checkWorkflowHostCompatibility({
    workflowPath,
    baseUrl,
  });

  printPreflight({
    manifest,
    shot,
    background,
    foreground,
    verifiedForeground,
    input,
    sourceDimensions,
    workflowPath,
    checks,
    compatibility,
  });
  const ready = checks.every((check) => check.ok) && compatibility.ok;

  if (command === 'preflight') {
    if (!ready) process.exitCode = 2;
    return;
  }
  if (!ready) {
    throw new Error(
      `Shot ${options.shotNumber} background repair is blocked by preflight or workflow compatibility.`,
    );
  }

  const seed = options.seed ?? randomSeed();
  const [sourceUpload, maskUpload] = await Promise.all([
    uploadImage(
      baseUrl,
      input.sourceCropPath,
      `srf-${manifest.manifestId}-shot-${pad2(options.shotNumber)}-${safeName(background.id)}-source-crop.png`,
    ),
    uploadImage(
      baseUrl,
      input.maskCropPath,
      `srf-${manifest.manifestId}-shot-${pad2(options.shotNumber)}-${safeName(background.id)}-removal-mask-crop.png`,
    ),
  ]);

  const template = JSON.parse(await readFile(workflowPath, 'utf8'));
  const contractNotes = (background.review?.notes ?? [])
    .map((note) => String(note).trim())
    .filter(Boolean)
    .join(' ');
  const layerPrompt = [
    'Use the supplied cropped editorial image as the visual authority.',
    `Reconstruct only the background hidden by the removed ${foreground.id} footprint.`,
    'Continue immediately adjacent source material, brushwork, palette, lighting, perspective, water, ground, architecture, haze, or landscape as appropriate.',
    `Do not reintroduce, duplicate, redraw, or replace the extracted ${foreground.id}.`,
    'Do not introduce new subjects, symbols, landmarks, text, narrative events, or modern objects.',
    'The crop is only a working window; preserve surrounding painted context and make the repair disappear into the approved source.',
    contractNotes ? `Layer-specific contract guidance: ${contractNotes}` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const negativePrompt = [
    'duplicate object',
    'reintroduced extracted object',
    'new subject',
    'new composition',
    'new symbol',
    'text',
    'watermark',
    'logo',
    'modern object',
    'fantasy redesign',
  ].join(', ');
  const workflow = replaceTokens(template, {
    '{{SOURCE_IMAGE}}': sourceUpload.name,
    '{{AUXILIARY_IMAGE}}': maskUpload.name,
    '{{LAYER_PROMPT}}': layerPrompt,
    '{{PROMPT}}': layerPrompt,
    '{{NEGATIVE_PROMPT}}': negativePrompt,
    '{{SEED}}': seed,
    '{{OUTPUT_PREFIX}}': `srf-layer-${pad2(options.shotNumber)}-${safeName(background.id)}-crop`,
  });

  console.log('');
  console.log(`Generating Shot ${options.shotNumber} localized background repair...`);
  console.log(`Editorial source: ${sourceDimensions.width}x${sourceDimensions.height}`);
  console.log(`Working crop: ${formatCrop(input.crop)}`);
  console.log(`Seed: ${seed}`);

  const queued = await fetchJson(baseUrl, '/prompt', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      prompt: workflow,
      client_id: `sumer-reel-forge-repair-${crypto.randomUUID()}`,
    }),
    signal: AbortSignal.timeout(timeoutMs()),
  });
  if (!queued.prompt_id) {
    throw new Error(`ComfyUI did not return a prompt id for ${background.id}.`);
  }

  const image = await waitForImage(baseUrl, queued.prompt_id, background.id);
  const response = await fetch(`${baseUrl}/view?${new URLSearchParams(image)}`, {
    signal: AbortSignal.timeout(timeoutMs()),
  });
  if (!response.ok) {
    throw new Error(`ComfyUI repair download returned HTTP ${response.status}.`);
  }
  const generatedCropBytes = Buffer.from(await response.arrayBuffer());
  const generatedCropDimensions = readPngDimensions(
    generatedCropBytes,
    `${background.id} generated crop`,
  );
  if (
    generatedCropDimensions.width !== input.crop.width ||
    generatedCropDimensions.height !== input.crop.height
  ) {
    throw new Error(
      `Generated repair crop is ${generatedCropDimensions.width}x${generatedCropDimensions.height}; expected ${input.crop.width}x${input.crop.height}.`,
    );
  }
  const generatedCropPath = join(input.directory, 'generated-background-crop.png');
  await writeFile(generatedCropPath, generatedCropBytes);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputRoot = options.outputRoot
    ? resolve(options.outputRoot)
    : join(CANDIDATE_ROOT, stamp);
  assertInside(CANDIDATE_ROOT, outputRoot, 'Background candidate output');
  const shotDirectory = join(outputRoot, `shot-${pad2(options.shotNumber)}`);
  await mkdir(shotDirectory, { recursive: true });
  const candidatePath = join(shotDirectory, `${safeName(background.id)}.png`);

  composeFullCanvasCandidate({
    sourcePath,
    generatedCropPath,
    maskCropPath: input.maskCropPath,
    crop: input.crop,
    outputPath: candidatePath,
  });
  const candidateBytes = await readFile(candidatePath);
  const candidateDimensions = readPngDimensions(candidateBytes, background.id);
  assertSameDimensions('background candidate', candidateDimensions, sourceDimensions);

  const candidate = {
    schemaVersion: 1,
    state: 'pending-human-review',
    manifestId: manifest.manifestId,
    shotId: shot.shotId,
    sourceShotNumber: shot.sourceShotNumber,
    layerId: background.id,
    role: background.role,
    material: background.material,
    sourceFrame: shot.sourceFrame,
    intendedApprovedPath: background.path ?? null,
    expectedAlpha: false,
    sourceDimensions,
    candidateDimensions,
    candidatePath,
    sha256: sha256(candidateBytes),
    comfyPromptId: queued.prompt_id,
    seed,
    layerPrompt,
    generatedAt: new Date().toISOString(),
    manifestMutated: false,
    automaticPromotionAllowed: false,
    backgroundInputs: {
      sourcePath,
      foregroundLayerId: foreground.id,
      foregroundCandidatePath: verifiedForeground.path,
      foregroundStructureQaPath: verifiedForeground.qaPath,
      foregroundSha256: sha256(await readFile(verifiedForeground.path)),
      maskPath: input.maskPath,
      maskCropPath: input.maskCropPath,
      sourceCropPath: input.sourceCropPath,
      generatedCropPath,
      crop: input.crop,
      cropPadding: input.padding,
      maskCoverageRatio: input.maskCoverageRatio,
      inputManifestPath: input.manifestPath,
      sourceUpload,
      maskUpload,
      policy: {
        useQaPassedForegroundAlpha: true,
        resegmentForegroundForBackground: false,
        inpaintOnlyCroppedWorkingRegion: true,
        compositeOnlyThroughValidatedMask: true,
        preserveFullCanvasOutsideMask: true,
      },
    },
  };
  await writeFile(
    join(shotDirectory, `${safeName(background.id)}.candidate.json`),
    `${JSON.stringify(candidate, null, 2)}\n`,
    'utf8',
  );

  const runManifest = {
    schemaVersion: 1,
    type: 'animation-layer-candidates',
    generatedAt: new Date().toISOString(),
    sourceManifestId: manifest.manifestId,
    sourceManifestPath: MANIFEST_PATH,
    workflowPath,
    comfyBaseUrl: baseUrl,
    outputRoot,
    candidates: [candidate],
    approvalPolicy: {
      manifestMutated: false,
      candidateState: 'pending-human-review',
      automaticPromotionAllowed: false,
    },
  };
  await writeFile(
    join(outputRoot, 'candidate-run.json'),
    `${JSON.stringify(runManifest, null, 2)}\n`,
    'utf8',
  );

  console.log('');
  console.log(`Generated 1 Shot ${options.shotNumber} repaired background candidate.`);
  console.log(`Candidate workspace: ${outputRoot}`);
  console.log(`Candidate PNG: ${candidatePath}`);
  console.log(`Removal mask: ${input.maskPath}`);
  console.log('Pixels outside the removal mask were rebuilt directly from editorial-v1.');
  console.log('The animation-v1 manifest was NOT modified.');
  console.log('The candidate remains pending deterministic QA and human review.');
}

async function resolveVerifiedForegroundCandidate(shot, layer, configuredDirectory) {
  const directories = configuredDirectory
    ? [resolve(configuredDirectory)]
    : await candidateDirectoriesNewestFirst();
  for (const runDirectory of directories) {
    assertInside(CANDIDATE_ROOT, runDirectory, `${layer.id} candidate directory`);
    const qaPath = join(runDirectory, `${safeName(layer.id)}-structure-qa.json`);
    if (!(await exists(qaPath))) continue;
    try {
      const qa = JSON.parse(await readFile(qaPath, 'utf8'));
      if (qa.qaStatus !== 'PASS' || qa.layerId !== layer.id) continue;
      const run = JSON.parse(await readFile(join(runDirectory, 'candidate-run.json'), 'utf8'));
      const entry = (run.candidates ?? []).find((item) => item?.layerId === layer.id);
      if (!entry?.candidatePath) continue;
      const path = isAbsolute(entry.candidatePath)
        ? resolve(entry.candidatePath)
        : resolve(runDirectory, entry.candidatePath);
      assertInside(runDirectory, path, `${layer.id} candidate PNG`);
      if (!(await exists(path))) continue;
      const dimensions = readPngDimensions(await readFile(path), layer.id);
      const sourcePath = resolve(ASSET_ROOT, shot.sourceFrame);
      const sourceDimensions = readPngDimensions(await readFile(sourcePath), 'Editorial source');
      assertSameDimensions(layer.id, dimensions, sourceDimensions);
      return { runDirectory, path, qaPath, qa };
    } catch {
      // Ignore incomplete or stale runs and continue to the next candidate.
    }
  }
  throw new Error(
    `No structurally QA-passed ${layer.id} candidate was found. Generate and verify the foreground layer first.`,
  );
}

async function prepareInpaintInputs({
  shot,
  sourcePath,
  sourceDimensions,
  background,
  foreground,
  verifiedForeground,
}) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const inputRoot = join(INPUT_BASE_ROOT, safeName(background.id));
  const directory = join(inputRoot, stamp);
  await mkdir(directory, { recursive: true });

  const maskPath = join(directory, 'foreground-removal-mask.png');
  runFfmpeg(
    [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      verifiedForeground.path,
      '-vf',
      'alphaextract,format=gray',
      '-frames:v',
      '1',
      maskPath,
    ],
    `extract ${foreground.id} alpha mask`,
  );

  const maskDimensions = readPngDimensions(await readFile(maskPath), 'removal mask');
  assertSameDimensions('removal mask', maskDimensions, sourceDimensions);
  const maskPixels = decodeGrayMask(
    maskPath,
    sourceDimensions.width,
    sourceDimensions.height,
  );
  const maskAnalysis = analyzeMask(
    maskPixels,
    sourceDimensions.width,
    sourceDimensions.height,
  );
  const crop = paddedAlignedCrop(
    maskAnalysis.bounds,
    options.padding,
    sourceDimensions.width,
    sourceDimensions.height,
  );
  const sourceCropPath = join(directory, 'editorial-source-crop.png');
  const maskCropPath = join(directory, 'removal-mask-crop.png');
  cropPng(sourcePath, sourceCropPath, crop);
  cropPng(maskPath, maskCropPath, crop);

  const inputManifest = {
    schemaVersion: 1,
    type: 'verified-overlay-background-repair-inputs',
    generatedAt: new Date().toISOString(),
    shotId: shot.shotId,
    sourceShotNumber: shot.sourceShotNumber,
    backgroundLayerId: background.id,
    foregroundLayerId: foreground.id,
    sourcePath,
    sourceDimensions,
    foregroundCandidate: {
      runDirectory: verifiedForeground.runDirectory,
      candidatePath: verifiedForeground.path,
      structureQaPath: verifiedForeground.qaPath,
      sha256: sha256(await readFile(verifiedForeground.path)),
    },
    maskPath,
    maskSha256: sha256(await readFile(maskPath)),
    maskCoverageRatio: maskAnalysis.coverageRatio,
    crop,
    cropPadding: options.padding,
    sourceCropPath,
    maskCropPath,
    policy: {
      useQaPassedForegroundAlpha: true,
      resegmentForegroundForBackground: false,
      preservePixelsOutsideMask: true,
      inpaintOnlyCroppedWorkingRegion: true,
    },
  };
  const manifestPath = join(directory, 'background-inputs.json');
  await writeFile(manifestPath, `${JSON.stringify(inputManifest, null, 2)}\n`, 'utf8');

  return {
    inputRoot,
    directory,
    maskPath,
    sourceCropPath,
    maskCropPath,
    manifestPath,
    crop,
    padding: options.padding,
    maskCoverageRatio: maskAnalysis.coverageRatio,
  };
}

function analyzeMask(mask, width, height) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let selected = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = mask[y * width + x];
      if (value > 0) selected += 1;
      if (value < MASK_BOUNDARY_THRESHOLD) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) {
    throw new Error('Foreground removal mask contains no selected pixels.');
  }
  return {
    coverageRatio: selected / (width * height),
    bounds: {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    },
  };
}

function paddedAlignedCrop(bounds, padding, frameWidth, frameHeight) {
  const left = alignDown(Math.max(0, bounds.x - padding), CROP_ALIGNMENT);
  const top = alignDown(Math.max(0, bounds.y - padding), CROP_ALIGNMENT);
  const rawRight = Math.min(
    frameWidth,
    alignUp(bounds.x + bounds.width + padding, CROP_ALIGNMENT),
  );
  const rawBottom = Math.min(
    frameHeight,
    alignUp(bounds.y + bounds.height + padding, CROP_ALIGNMENT),
  );
  let width = rawRight - left;
  let height = rawBottom - top;
  let x = left;
  let y = top;
  if (width % CROP_ALIGNMENT) {
    width = alignDown(width, CROP_ALIGNMENT);
    x = Math.max(0, rawRight - width);
  }
  if (height % CROP_ALIGNMENT) {
    height = alignDown(height, CROP_ALIGNMENT);
    y = Math.max(0, rawBottom - height);
  }
  const crop = { x, y, width, height };
  if (crop.width <= 0 || crop.height <= 0) {
    throw new Error(`Invalid background repair crop: ${formatCrop(crop)}`);
  }
  if (crop.width % CROP_ALIGNMENT || crop.height % CROP_ALIGNMENT) {
    throw new Error(
      `Background repair crop must align to ${CROP_ALIGNMENT}px: ${formatCrop(crop)}`,
    );
  }
  return crop;
}

function cropPng(sourcePath, outputPath, crop) {
  runFfmpeg(
    [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      sourcePath,
      '-vf',
      `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}`,
      '-frames:v',
      '1',
      outputPath,
    ],
    `crop ${basename(sourcePath)}`,
  );
}

function decodeGrayMask(path, width, height) {
  const result = spawnSync(
    process.env.FFMPEG_COMMAND ?? 'ffmpeg',
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
      'gray',
      'pipe:1',
    ],
    {
      cwd: process.cwd(),
      env: process.env,
      encoding: null,
      maxBuffer: Math.max(8 * 1024 * 1024, width * height + 1024),
      windowsHide: true,
      shell: false,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ffmpeg could not decode removal mask: ${String(result.stderr ?? '').trim()}`);
  }
  const expected = width * height;
  if (!Buffer.isBuffer(result.stdout) || result.stdout.length !== expected) {
    throw new Error(
      `Removal mask decoded to ${result.stdout?.length ?? 0} bytes; expected ${expected}.`,
    );
  }
  return result.stdout;
}

function composeFullCanvasCandidate({
  sourcePath,
  generatedCropPath,
  maskCropPath,
  crop,
  outputPath,
}) {
  const filter = [
    '[1:v]format=rgb24[generated]',
    '[2:v]format=gray[mask]',
    '[generated][mask]alphamerge[foreground]',
    '[0:v]format=rgb24[base]',
    `[base][foreground]overlay=${crop.x}:${crop.y}:format=rgb[out]`,
  ].join(';');
  runFfmpeg(
    [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      sourcePath,
      '-i',
      generatedCropPath,
      '-i',
      maskCropPath,
      '-filter_complex',
      filter,
      '-map',
      '[out]',
      '-frames:v',
      '1',
      outputPath,
    ],
    'composite reconstructed crop into editorial frame',
  );
}

async function candidateDirectoriesNewestFirst() {
  try {
    return (await readdir(CANDIDATE_ROOT, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(CANDIDATE_ROOT, entry.name))
      .sort((a, b) => basename(b).localeCompare(basename(a)));
  } catch {
    return [];
  }
}

async function uploadImage(baseUrl, path, uploadName) {
  const form = new FormData();
  form.append('image', new Blob([await readFile(path)], { type: 'image/png' }), uploadName);
  form.append('type', 'input');
  form.append('overwrite', 'true');
  const response = await fetch(`${baseUrl}/upload/image`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    throw new Error(`ComfyUI image upload returned HTTP ${response.status}: ${await response.text()}`);
  }
  const payload = await response.json();
  return {
    name: payload.name ?? uploadName,
    subfolder: payload.subfolder ?? '',
    type: payload.type ?? 'input',
  };
}

async function waitForImage(baseUrl, promptId, layerId) {
  const deadline = Date.now() + timeoutMs();
  while (Date.now() < deadline) {
    const history = await fetchJson(baseUrl, `/history/${promptId}`, {
      signal: AbortSignal.timeout(15_000),
    });
    const result = history[promptId];
    const images = Object.values(result?.outputs ?? {})
      .flatMap((output) => output.images ?? [])
      .filter((candidate) => candidate.type === 'output' || candidate.filename);
    if (images.length > 1) {
      throw new Error(
        `Background workflow returned ${images.length} images for ${layerId}; exactly one primary PNG is required.`,
      );
    }
    if (images[0]?.filename) {
      return {
        filename: images[0].filename,
        subfolder: images[0].subfolder ?? '',
        type: images[0].type ?? 'output',
      };
    }
    if (result?.status?.status_str === 'error') {
      throw new Error(`ComfyUI reported an error while reconstructing ${layerId}.`);
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 2_000));
  }
  throw new Error(`ComfyUI timed out while reconstructing ${layerId}.`);
}

function replaceTokens(value, replacements) {
  if (typeof value === 'string') {
    if (Object.prototype.hasOwnProperty.call(replacements, value)) return replacements[value];
    return Object.entries(replacements).reduce(
      (current, [token, replacement]) => current.split(token).join(String(replacement)),
      value,
    );
  }
  if (Array.isArray(value)) return value.map((item) => replaceTokens(item, replacements));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, replaceTokens(item, replacements)]),
    );
  }
  return value;
}

function printPreflight({
  manifest,
  shot,
  background,
  foreground,
  verifiedForeground,
  input,
  sourceDimensions,
  workflowPath,
  checks,
  compatibility,
}) {
  console.log(`Shot ${shot.sourceShotNumber} verified-overlay background repair preflight`);
  console.log(`Manifest: ${manifest.manifestId} / ${background.id} / ${background.state}`);
  for (const check of checks) {
    console.log(`${check.ok ? '[ok]' : '[blocked]'} ${check.name}: ${check.detail}`);
  }
  console.log(
    `${compatibility.ok ? '[ok]' : '[blocked]'} Host workflow compatibility: ${compatibility.nodeCount} API node(s) / ${compatibility.nodeTypes.length} node type(s)`,
  );
  for (const nodeType of compatibility.missingNodeTypes) console.log(`  missing node type: ${nodeType}`);
  for (const item of compatibility.unavailableSelections) {
    console.log(
      `  unavailable selection: node ${item.nodeId} ${item.nodeType}.${item.inputName} = ${item.configuredValue}`,
    );
  }
  for (const error of compatibility.errors) console.log(`  ${error}`);
  console.log('');
  console.log(`Foreground authority: ${foreground.id}`);
  console.log(`QA-passed candidate: ${verifiedForeground.path}`);
  console.log(`Structure QA: ${verifiedForeground.qaPath}`);
  console.log(`Removal mask: ${input.maskPath}`);
  console.log(`GPU working crop: ${formatCrop(input.crop)}`);
  console.log(
    `Crop area: ${((input.crop.width * input.crop.height) / (sourceDimensions.width * sourceDimensions.height) * 100).toFixed(1)}% of editorial frame`,
  );
  console.log(`Workflow: ${workflowPath}`);
  console.log('* foreground must pass structural QA before it can define a repair mask.');
  console.log('* ComfyUI sees only the localized crop; final pixels outside the exact mask remain editorial-v1.');
}

function parseOptions(args) {
  const parsed = {
    shotNumber: undefined,
    backgroundLayerId: undefined,
    foregroundLayerId: undefined,
    foregroundCandidateDir: undefined,
    outputRoot: undefined,
    workflowPath: undefined,
    seed: undefined,
    padding: DEFAULT_CROP_PADDING,
    minMaskRatio: 0.001,
    maxMaskRatio: 0.65,
  };
  for (const arg of args) {
    if (arg.startsWith('--shot=')) {
      parsed.shotNumber = Number(arg.slice('--shot='.length));
    } else if (arg.startsWith('--background-layer=')) {
      parsed.backgroundLayerId = arg.slice('--background-layer='.length);
    } else if (arg.startsWith('--foreground-layer=')) {
      parsed.foregroundLayerId = arg.slice('--foreground-layer='.length);
    } else if (arg.startsWith('--foreground-candidate-dir=')) {
      parsed.foregroundCandidateDir = arg.slice('--foreground-candidate-dir='.length);
    } else if (arg.startsWith('--output=')) {
      parsed.outputRoot = arg.slice('--output='.length);
    } else if (arg.startsWith('--workflow=')) {
      parsed.workflowPath = arg.slice('--workflow='.length);
    } else if (arg.startsWith('--seed=')) {
      parsed.seed = Number(arg.slice('--seed='.length));
    } else if (arg.startsWith('--padding=')) {
      parsed.padding = Number(arg.slice('--padding='.length));
    } else if (arg.startsWith('--min-mask-ratio=')) {
      parsed.minMaskRatio = Number(arg.slice('--min-mask-ratio='.length));
    } else if (arg.startsWith('--max-mask-ratio=')) {
      parsed.maxMaskRatio = Number(arg.slice('--max-mask-ratio='.length));
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  if (!Number.isInteger(parsed.shotNumber) || parsed.shotNumber < 1) {
    throw new Error('--shot=<positive integer> is required.');
  }
  if (!parsed.backgroundLayerId || !parsed.foregroundLayerId) {
    throw new Error('--background-layer=<id> and --foreground-layer=<id> are required.');
  }
  if (!Number.isInteger(parsed.padding) || parsed.padding < 0 || parsed.padding > 256) {
    throw new Error('--padding must be an integer between 0 and 256.');
  }
  if (!Number.isFinite(parsed.seed ?? 0) || (parsed.seed !== undefined && (!Number.isSafeInteger(parsed.seed) || parsed.seed < 0))) {
    throw new Error('--seed must be a non-negative safe integer.');
  }
  if (!(parsed.minMaskRatio > 0 && parsed.maxMaskRatio > parsed.minMaskRatio && parsed.maxMaskRatio <= 1)) {
    throw new Error('Mask ratio bounds are invalid.');
  }
  return parsed;
}

async function fileCheck(name, path) {
  return (await exists(path))
    ? { ok: true, name, detail: path }
    : { ok: false, name, detail: `File not found: ${path}` };
}

async function httpCheck(name, url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
    return { ok: response.ok, name, detail: response.ok ? url : `HTTP ${response.status}` };
  } catch (error) {
    return { ok: false, name, detail: error instanceof Error ? error.message : String(error) };
  }
}

async function fetchJson(baseUrl, path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, init);
  if (!response.ok) {
    throw new Error(`${baseUrl}${path} returned HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
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
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function assertSameDimensions(label, actual, expected) {
  if (actual.width !== expected.width || actual.height !== expected.height) {
    throw new Error(
      `${label} is ${actual.width}x${actual.height}; expected editorial source ${expected.width}x${expected.height}.`,
    );
  }
}

function runFfmpeg(args, label) {
  const result = spawnSync(process.env.FFMPEG_COMMAND ?? 'ffmpeg', args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ffmpeg could not ${label}: ${String(result.stderr ?? '').trim()}`);
  }
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function timeoutMs() {
  const configured = Number(process.env.RENDER_PROCESS_TIMEOUT_MS ?? 900_000);
  return Number.isFinite(configured) && configured > 0 ? configured : 900_000;
}

function randomSeed() {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

function alignDown(value, alignment) {
  return Math.floor(value / alignment) * alignment;
}

function alignUp(value, alignment) {
  return Math.ceil(value / alignment) * alignment;
}

function formatCrop(crop) {
  return `${crop.width}x${crop.height} @ (${crop.x}, ${crop.y})`;
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function safeName(value) {
  return String(value)
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '');
}

function assertInside(parent, child, label) {
  const path = relative(resolve(parent), resolve(child));
  if (path !== '' && (path.startsWith('..') || isAbsolute(path))) {
    throw new Error(`${label} must remain under ${parent}: ${child}`);
  }
}
