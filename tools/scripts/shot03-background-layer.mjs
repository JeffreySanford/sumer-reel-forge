import 'dotenv/config';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  access,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from 'node:fs/promises';
import {
  basename,
  isAbsolute,
  join,
  relative,
  resolve,
} from 'node:path';
import { checkWorkflowHostCompatibility } from '../renderer/comfyui-workflow-doctor.mjs';

const MANIFEST_PATH = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const ASSET_ROOT = resolve('assets');
const CANDIDATE_ROOT = resolve(
  'tmp/animation-assets/candidates/chapter-01-reel-01-animation-v1',
);
const INPUT_ROOT = resolve(
  'tmp/animation-assets/background-inputs/shot03-background-v1',
);
const WORKFLOW_PATH = resolve(
  process.env.COMFYUI_SHOT03_BACKGROUND_WORKFLOW_PATH ??
    'tools/renderer/workflows/shot03-background-inpaint-api.json',
);
const BASE_URL = (process.env.COMFYUI_BASE_URL ?? 'http://127.0.0.1:8188').replace(
  /\/$/,
  '',
);
const BACKGROUND_LAYER_ID = 'shot03-background-v1';
const ENKI_LAYER_ID = 'shot03-enki-body-v1';
const VESSEL_LAYER_ID = 'shot03-vessel-v1';
const WIDTH = 1080;
const HEIGHT = 1920;

const command = process.argv[2] ?? 'preflight';
const options = parseOptions(process.argv.slice(3).filter((arg) => arg !== '--'));

async function main() {
  if (!['preflight', 'generate'].includes(command)) {
    throw new Error('Use preflight or generate.');
  }

  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  const shot = manifest.shots?.find((item) => item.sourceShotNumber === 3);
  const layer = shot?.layers?.find((item) => item.id === BACKGROUND_LAYER_ID);
  if (!shot || !layer) {
    throw new Error(`Could not resolve ${BACKGROUND_LAYER_ID} from ${MANIFEST_PATH}.`);
  }

  const sourcePath = resolve(ASSET_ROOT, shot.sourceFrame);
  const enki = await resolveLayerCandidate(
    ENKI_LAYER_ID,
    options.enkiCandidateDir,
  );
  const vessel = await resolveLayerCandidate(
    VESSEL_LAYER_ID,
    options.vesselCandidateDir,
  );
  const input = await prepareRemovalMask({ sourcePath, enki, vessel });

  const checks = [
    await fileCheck('Animation manifest', MANIFEST_PATH),
    await fileCheck('Shot 3 source', sourcePath),
    await fileCheck('Validated Enki candidate', enki.path),
    await fileCheck('Validated vessel candidate', vessel.path),
    await fileCheck('Combined removal mask', input.maskPath),
    await httpCheck('ComfyUI', `${BASE_URL}/system_stats`),
  ];
  const compatibility = await checkWorkflowHostCompatibility({
    workflowPath: WORKFLOW_PATH,
    baseUrl: BASE_URL,
  });

  printPreflight({ manifest, shot, layer, sourcePath, enki, vessel, input, checks, compatibility });
  const ready = checks.every((check) => check.ok) && compatibility.ok;
  if (command === 'preflight') {
    if (!ready) process.exitCode = 2;
    return;
  }
  if (!ready) {
    throw new Error(
      'Shot 3 background generation is blocked. If the inpainting checkpoint is unavailable, run `pnpm comfyui:models:setup`, restart ComfyUI/start:all, then rerun this preflight.',
    );
  }

  const seed = options.seed ?? randomSeed();
  const [sourceUpload, maskUpload] = await Promise.all([
    uploadImage(sourcePath, `srf-${manifest.manifestId}-shot-03-background-source.png`),
    uploadImage(input.maskPath, `srf-${manifest.manifestId}-shot-03-background-removal-mask.png`),
  ]);
  const template = JSON.parse(await readFile(WORKFLOW_PATH, 'utf8'));
  const layerPrompt = [
    'Use the approved editorial image as the visual authority.',
    'Reconstruct only background that would plausibly exist behind the removed Enki and vessel silhouettes.',
    'Continue immediately adjacent water, sky, haze, distant landscape, brushwork, palette, lighting and perspective.',
    'Do not introduce a new subject, landmark, vessel, person, architecture or narrative event.',
    'Outside the supplied removal mask, source pixels must remain unchanged.',
  ].join(' ');
  const negativePrompt = [
    'person',
    'human',
    'man',
    'face',
    'body',
    'robe',
    'boat',
    'vessel',
    'ship',
    'new object',
    'new composition',
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
    '{{OUTPUT_PREFIX}}': 'srf-layer-03-shot03-background-v1',
  });

  console.log('');
  console.log('Generating Shot 3 background plate with masked inpainting...');
  console.log(`Seed: ${seed}`);
  const queued = await fetchJson(`${BASE_URL}/prompt`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      prompt: workflow,
      client_id: `sumer-reel-forge-background-${crypto.randomUUID()}`,
    }),
    signal: AbortSignal.timeout(timeoutMs()),
  });
  if (!queued.prompt_id) {
    throw new Error('ComfyUI did not return a prompt id for the background candidate.');
  }
  const image = await waitForImage(queued.prompt_id);
  const response = await fetch(`${BASE_URL}/view?${new URLSearchParams(image)}`, {
    signal: AbortSignal.timeout(timeoutMs()),
  });
  if (!response.ok) {
    throw new Error(`ComfyUI background download returned HTTP ${response.status}.`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const dimensions = readPngDimensions(bytes, BACKGROUND_LAYER_ID);
  if (dimensions.width !== WIDTH || dimensions.height !== HEIGHT) {
    throw new Error(
      `${BACKGROUND_LAYER_ID} dimensions ${dimensions.width}x${dimensions.height} do not match ${WIDTH}x${HEIGHT}.`,
    );
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputRoot = options.outputRoot
    ? resolve(options.outputRoot)
    : join(CANDIDATE_ROOT, stamp);
  assertInside(CANDIDATE_ROOT, outputRoot, 'Background candidate output');
  const shotDirectory = join(outputRoot, 'shot-03');
  await mkdir(shotDirectory, { recursive: true });
  const candidatePath = join(shotDirectory, `${BACKGROUND_LAYER_ID}.png`);
  await writeFile(candidatePath, bytes);

  const candidate = {
    schemaVersion: 1,
    state: 'pending-human-review',
    manifestId: manifest.manifestId,
    shotId: shot.shotId,
    sourceShotNumber: 3,
    layerId: BACKGROUND_LAYER_ID,
    role: layer.role,
    material: layer.material,
    sourceFrame: shot.sourceFrame,
    intendedApprovedPath: layer.path ?? null,
    expectedAlpha: false,
    sourceDimensions: { width: WIDTH, height: HEIGHT },
    candidateDimensions: dimensions,
    candidatePath,
    sha256: sha256(bytes),
    comfyPromptId: queued.prompt_id,
    seed,
    layerPrompt,
    generatedAt: new Date().toISOString(),
    manifestMutated: false,
    automaticPromotionAllowed: false,
    backgroundInputs: {
      maskPath: input.maskPath,
      inputManifestPath: input.manifestPath,
      enkiCandidatePath: enki.path,
      vesselCandidatePath: vessel.path,
      sourcePath,
      sourceUpload,
      maskUpload,
    },
  };
  await writeFile(
    join(shotDirectory, `${BACKGROUND_LAYER_ID}.candidate.json`),
    `${JSON.stringify(candidate, null, 2)}\n`,
    'utf8',
  );
  const runManifest = {
    schemaVersion: 1,
    type: 'animation-layer-candidates',
    generatedAt: new Date().toISOString(),
    sourceManifestId: manifest.manifestId,
    sourceManifestPath: MANIFEST_PATH,
    workflowPath: WORKFLOW_PATH,
    comfyBaseUrl: BASE_URL,
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
  console.log('Generated 1 background candidate.');
  console.log(`Candidate workspace: ${outputRoot}`);
  console.log(`Candidate PNG: ${candidatePath}`);
  console.log(`Removal mask: ${input.maskPath}`);
  console.log('The animation-v1 manifest was NOT modified.');
  console.log('The candidate remains pending human review and background QA.');
}

async function prepareRemovalMask({ sourcePath, enki, vessel }) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const directory = join(INPUT_ROOT, stamp);
  await mkdir(directory, { recursive: true });
  const maskPath = join(directory, 'enki-vessel-removal-mask.png');
  const ffmpeg = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
  const result = spawnSync(
    ffmpeg,
    [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      enki.path,
      '-i',
      vessel.path,
      '-filter_complex',
      "[0:v]alphaextract[a];[1:v]alphaextract[b];[a][b]blend=all_expr='max(A,B)',format=gray[mask]",
      '-map',
      '[mask]',
      '-frames:v',
      '1',
      maskPath,
    ],
    {
      cwd: process.cwd(),
      env: process.env,
      encoding: 'utf8',
      windowsHide: true,
      shell: false,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `ffmpeg could not combine Enki and vessel alpha masks: ${String(result.stderr ?? '').trim()}`,
    );
  }

  for (const [label, path] of [
    ['source', sourcePath],
    ['Enki candidate', enki.path],
    ['vessel candidate', vessel.path],
    ['removal mask', maskPath],
  ]) {
    const dimensions = readPngDimensions(await readFile(path), label);
    if (dimensions.width !== WIDTH || dimensions.height !== HEIGHT) {
      throw new Error(`${label} is ${dimensions.width}x${dimensions.height}; expected ${WIDTH}x${HEIGHT}.`);
    }
  }

  const inputManifest = {
    schemaVersion: 1,
    type: 'shot03-background-inpaint-inputs',
    generatedAt: new Date().toISOString(),
    sourcePath,
    enki: {
      runDirectory: enki.runDirectory,
      candidatePath: enki.path,
      sha256: sha256(await readFile(enki.path)),
    },
    vessel: {
      runDirectory: vessel.runDirectory,
      candidatePath: vessel.path,
      sha256: sha256(await readFile(vessel.path)),
    },
    maskPath,
    maskSha256: sha256(await readFile(maskPath)),
    policy: {
      useValidatedCandidateSilhouettes: true,
      resegmentForegroundForBackground: false,
      preservePixelsOutsideMask: true,
    },
  };
  const manifestPath = join(directory, 'background-inputs.json');
  await writeFile(manifestPath, `${JSON.stringify(inputManifest, null, 2)}\n`, 'utf8');
  return { directory, maskPath, manifestPath };
}

async function resolveLayerCandidate(layerId, configuredDirectory) {
  const directories = configuredDirectory
    ? [resolve(configuredDirectory)]
    : await candidateDirectoriesNewestFirst();
  for (const runDirectory of directories) {
    assertInside(CANDIDATE_ROOT, runDirectory, `${layerId} candidate directory`);
    const direct = join(runDirectory, 'shot-03', `${layerId}.png`);
    if (await exists(direct)) return { runDirectory, path: direct };

    try {
      const run = JSON.parse(await readFile(join(runDirectory, 'candidate-run.json'), 'utf8'));
      const match = (run.candidates ?? []).find((item) => item?.layerId === layerId);
      if (match?.candidatePath) {
        const path = isAbsolute(match.candidatePath)
          ? resolve(match.candidatePath)
          : resolve(runDirectory, match.candidatePath);
        if (isInside(runDirectory, path) && (await exists(path))) {
          return { runDirectory, path };
        }
      }
    } catch {
      // Older runs remain discoverable from the conventional shot directory.
    }
  }
  throw new Error(
    `No ${layerId} candidate was found. Generate and review the required foreground candidate first.`,
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

async function uploadImage(path, uploadName) {
  const form = new FormData();
  form.append('image', new Blob([await readFile(path)], { type: 'image/png' }), uploadName);
  form.append('type', 'input');
  form.append('overwrite', 'true');
  const response = await fetch(`${BASE_URL}/upload/image`, {
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

async function waitForImage(promptId) {
  const deadline = Date.now() + timeoutMs();
  while (Date.now() < deadline) {
    const history = await fetchJson(`${BASE_URL}/history/${promptId}`, {
      signal: AbortSignal.timeout(15_000),
    });
    const result = history[promptId];
    const images = Object.values(result?.outputs ?? {})
      .flatMap((output) => output.images ?? [])
      .filter((candidate) => candidate.type === 'output' || candidate.filename);
    if (images.length > 1) {
      throw new Error(
        `Background workflow returned ${images.length} images; exactly one primary PNG is required.`,
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
      throw new Error('ComfyUI reported an error while reconstructing the background.');
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 2_000));
  }
  throw new Error('ComfyUI timed out while reconstructing the Shot 3 background.');
}

function replaceTokens(value, replacements) {
  if (typeof value === 'string') {
    if (Object.prototype.hasOwnProperty.call(replacements, value)) {
      return replacements[value];
    }
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

function printPreflight({ manifest, layer, enki, vessel, input, checks, compatibility }) {
  console.log('Shot 3 background reconstruction preflight');
  console.log(`Manifest: ${manifest.manifestId} / ${BACKGROUND_LAYER_ID} / ${layer.state}`);
  for (const check of checks) {
    console.log(`${check.ok ? '[ok]' : '[blocked]'} ${check.name}: ${check.detail}`);
  }
  console.log(`${compatibility.ok ? '[ok]' : '[blocked]'} Host workflow compatibility: ${compatibility.nodeCount} API node(s) / ${compatibility.nodeTypes.length} node type(s)`);
  for (const nodeType of compatibility.missingNodeTypes) {
    console.log(`  missing node type: ${nodeType}`);
  }
  for (const item of compatibility.unavailableSelections) {
    console.log(`  unavailable selection: node ${item.nodeId} ${item.nodeType}.${item.inputName} = ${item.configuredValue}`);
  }
  for (const error of compatibility.errors) console.log(`  ${error}`);
  console.log('');
  console.log(`Enki silhouette: ${enki.path}`);
  console.log(`Vessel silhouette: ${vessel.path}`);
  console.log(`Combined removal mask: ${input.maskPath}`);
  console.log('* required for animation-v1 activation');
  console.log('* generation is restricted to the supplied removal mask; outside pixels are restored from editorial-v1');
}

function parseOptions(args) {
  const parsed = {};
  for (const arg of args) {
    if (arg.startsWith('--enki-candidate-dir=')) {
      parsed.enkiCandidateDir = arg.slice('--enki-candidate-dir='.length);
    } else if (arg.startsWith('--vessel-candidate-dir=')) {
      parsed.vesselCandidateDir = arg.slice('--vessel-candidate-dir='.length);
    } else if (arg.startsWith('--output=')) {
      parsed.outputRoot = arg.slice('--output='.length);
    } else if (arg.startsWith('--seed=')) {
      const seed = Number(arg.slice('--seed='.length));
      if (!Number.isSafeInteger(seed) || seed < 0) throw new Error(`Invalid ${arg}`);
      parsed.seed = seed;
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
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

async function fetchJson(url, init = {}) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}: ${await response.text()}`);
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

function assertInside(parent, child, label) {
  if (!isInside(parent, child)) {
    throw new Error(`${label} must remain under ${parent}: ${child}`);
  }
}

function isInside(parent, child) {
  const path = relative(resolve(parent), resolve(child));
  return path === '' || (!path.startsWith('..') && !isAbsolute(path));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
