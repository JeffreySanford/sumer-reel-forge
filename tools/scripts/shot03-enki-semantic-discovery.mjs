import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import {
  ACTOR_ANCHOR_IDS,
  ACTOR_REGION_IDS,
  buildSemanticConsensus,
  evaluateSemanticDiscovery,
} from '../animation/src/actor-semantic-geometry.mjs';

try {
  process.loadEnvFile?.();
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

const ROOT = resolve('.');
const ACTOR_PREP_ROOT = resolve('tmp/animation-assets/actor-prep/enki/v1');
const DEFAULT_MODEL = process.env.OLLAMA_VISION_MODEL ?? 'qwen3-vl:4b-instruct';
const DEFAULT_BASE_URL = (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(/\/$/, '');
const DEFAULT_TIMEOUT_MS = positiveInteger(process.env.PLANNING_TIMEOUT_MS, 300000);
const KEEP_ALIVE = process.env.OLLAMA_KEEP_ALIVE ?? '10m';
const RUN_SEEDS = Object.freeze([20260827, 20260828]);

const REGION_ROLE_TEXT = Object.freeze({
  'region:enki:head': 'complete head silhouette including hair/beard/crown attachment area',
  'region:enki:face': 'visible facial skin/features, excluding beard mass when possible',
  'region:enki:hair-beard': 'hair and beard mass',
  'region:enki:eye-left': "Enki's anatomical left eye, not viewer-left",
  'region:enki:eye-right': "Enki's anatomical right eye, not viewer-right",
  'region:enki:crown': 'visible divine crown/head ornament',
  'region:enki:torso-robe': 'main torso and robe mass',
  'region:enki:upper-arm-left': "Enki's anatomical left upper arm",
  'region:enki:upper-arm-right': "Enki's anatomical right upper arm",
  'region:enki:forearm-left': "Enki's anatomical left forearm",
  'region:enki:forearm-right': "Enki's anatomical right forearm",
  'region:enki:hand-left': "Enki's anatomical left visible hand",
  'region:enki:hand-right': "Enki's anatomical right visible hand",
});

const ANCHOR_ROLE_TEXT = Object.freeze({
  'anchor:enki:hand-left': "center of Enki's anatomical left visible hand/contact area",
  'anchor:enki:hand-right': "center of Enki's anatomical right visible hand/contact area",
  'anchor:enki:gaze-origin': 'midpoint between the visible eyes / approximate eye-line origin',
  'anchor:enki:head-center': 'stable visual center of the complete head mass',
  'anchor:enki:torso-root': 'stable torso pivot near lower chest/upper abdomen',
  'anchor:enki:seat-or-stance-root': 'visible support/root point where the body is seated or standing; do not infer a hidden point if not visible',
});

const DISCOVERY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'regions', 'anchors'],
  properties: {
    summary: { type: 'string' },
    regions: {
      type: 'array',
      minItems: ACTOR_REGION_IDS.length,
      maxItems: ACTOR_REGION_IDS.length,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'status', 'confidence', 'bbox', 'notes'],
        properties: {
          id: { type: 'string', enum: ACTOR_REGION_IDS },
          status: { type: 'string', enum: ['found', 'uncertain', 'not-visible'] },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          bbox: {
            type: 'object',
            additionalProperties: false,
            required: ['x', 'y', 'width', 'height'],
            properties: {
              x: { type: 'number', minimum: 0, maximum: 1 },
              y: { type: 'number', minimum: 0, maximum: 1 },
              width: { type: 'number', minimum: 0, maximum: 1 },
              height: { type: 'number', minimum: 0, maximum: 1 },
            },
          },
          notes: { type: 'string' },
        },
      },
    },
    anchors: {
      type: 'array',
      minItems: ACTOR_ANCHOR_IDS.length,
      maxItems: ACTOR_ANCHOR_IDS.length,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'status', 'confidence', 'point', 'notes'],
        properties: {
          id: { type: 'string', enum: ACTOR_ANCHOR_IDS },
          status: { type: 'string', enum: ['found', 'uncertain', 'not-visible'] },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          point: {
            type: 'object',
            additionalProperties: false,
            required: ['x', 'y'],
            properties: {
              x: { type: 'number', minimum: 0, maximum: 1 },
              y: { type: 'number', minimum: 0, maximum: 1 },
            },
          },
          notes: { type: 'string' },
        },
      },
    },
  },
};

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const options = parseOptions(process.argv.slice(2).filter((arg) => arg !== '--'));
  const packet = await latestPassingActorPrepPacket(options.workspace);
  const source = await verifyActorPrepPacket(packet);
  const model = options.model ?? DEFAULT_MODEL;

  await verifyOllama({ baseUrl: DEFAULT_BASE_URL, model, timeoutMs: DEFAULT_TIMEOUT_MS });

  const discoveryDirectory = join(packet.workspace, 'semantic-discovery');
  await mkdir(discoveryDirectory, { recursive: true });
  const imageBase64 = source.bytes.toString('base64');

  console.log('Shot 3 Enki automated semantic discovery');
  console.log(`Actor prep: ${packet.actorPrepPath}`);
  console.log(`Source: ${source.referencePath}`);
  console.log(`SHA-256: ${source.sha256}`);
  console.log(`Model: ${model}`);
  console.log('[INFO] Two independent locator passes; no pixel generation and no canonical mutation.');

  const runs = [];
  for (let index = 0; index < RUN_SEEDS.length; index += 1) {
    const seed = RUN_SEEDS[index];
    const label = index === 0 ? 'a' : 'b';
    console.log(`[ai] locator pass ${label.toUpperCase()} · seed ${seed}`);
    const run = await invokeDiscovery({
      baseUrl: DEFAULT_BASE_URL,
      model,
      timeoutMs: DEFAULT_TIMEOUT_MS,
      imageBase64,
      seed,
    });
    assertCompleteDiscovery(run);
    const runPath = join(discoveryDirectory, `semantic-discovery-run-${label}.json`);
    await writeJson(runPath, {
      schemaVersion: 1,
      type: 'actor-semantic-discovery-pass',
      actorPrepId: packet.actorPrep.id,
      sourceSha256: source.sha256,
      provider: 'ollama',
      model,
      seed,
      generatedPixels: false,
      ...run,
    });
    runs.push(run);
  }

  const consensus = buildSemanticConsensus(runs[0], runs[1]);
  const qa = evaluateSemanticDiscovery(consensus);
  const consensusRecord = {
    ...consensus,
    actorPrepId: packet.actorPrep.id,
    sourceSha256: source.sha256,
    model,
    runSeeds: RUN_SEEDS,
  };
  const consensusPath = join(discoveryDirectory, 'semantic-discovery-consensus.json');
  const qaPath = join(discoveryDirectory, 'semantic-discovery-qa.json');
  await writeJson(consensusPath, consensusRecord);
  await writeJson(qaPath, qa);

  const overlayPath = join(discoveryDirectory, 'semantic-discovery-review.svg');
  await writeFile(
    overlayPath,
    renderReviewSvg({
      sourceBase64: imageBase64,
      width: source.width,
      height: source.height,
      consensus,
      qa,
      model,
      sourceSha256: source.sha256,
    }),
    'utf8',
  );

  const receipt = {
    schemaVersion: 1,
    type: 'actor-semantic-discovery-receipt',
    actorPrepId: packet.actorPrep.id,
    actorPrepDefinitionSha256: packet.definitionSha256,
    sourceSha256: source.sha256,
    provider: 'ollama',
    model,
    runSeeds: RUN_SEEDS,
    modelInvocations: 2,
    generatedPixels: false,
    sourcePixelsMutated: false,
    canonicalAssetsMutated: false,
    actorPrepDefinitionMutated: false,
    structuralPass: qa.structuralPass,
    capabilities: qa.capabilities,
    humanReviewRequired: true,
    promotionAllowed: false,
    nextStage: qa.structuralPass
      ? 'HUMAN_SEMANTIC_LOCATION_REVIEW'
      : 'STOP_AND_DIAGNOSE_SEMANTIC_DISCOVERY',
    artifacts: {
      consensusPath,
      qaPath,
      overlayPath,
    },
  };
  const receiptPath = join(discoveryDirectory, 'semantic-discovery-receipt.json');
  await writeJson(receiptPath, receipt);

  console.log('');
  console.log(`[${qa.structuralPass ? 'PASS' : 'STOP'}] deterministic semantic geometry ${qa.structuralPass ? 'is structurally coherent' : 'has blocking issues'}.`);
  console.log(`Facial localization ready: ${yesNo(qa.capabilities.facialLocalizationReady)}`);
  console.log(`Hand/contact localization ready: ${yesNo(qa.capabilities.handContactLocalizationReady)}`);
  console.log(`Torso localization ready: ${yesNo(qa.capabilities.torsoLocalizationReady)}`);
  if (qa.issues.length) {
    console.log('Blocking issues:');
    for (const issue of qa.issues) console.log(`  - ${issue}`);
  }
  if (qa.advisories.length) {
    console.log('Advisories:');
    for (const advisory of qa.advisories) console.log(`  - ${advisory}`);
  }
  console.log(`Review overlay: ${overlayPath}`);
  console.log(`Receipt: ${receiptPath}`);
  console.log('');
  console.log('[GATE] Human review is required. The locator has not promoted, segmented, repainted, rigged, or animated any region.');
  if (qa.structuralPass) {
    console.log('[NEXT after human acceptance] source-pixel region extraction/segmentation only for the semantic regions that are actually useful.');
  } else {
    console.log('[NEXT] diagnose locator disagreement/geometry; do not lower thresholds or begin segmentation automatically.');
  }

  if (options.open) await maybeOpenArtifact(overlayPath);
}

async function latestPassingActorPrepPacket(explicitWorkspace) {
  if (explicitWorkspace) return readActorPrepWorkspace(resolve(explicitWorkspace));
  if (!existsSync(ACTOR_PREP_ROOT)) {
    throw new Error(`Actor-prep root does not exist: ${ACTOR_PREP_ROOT}`);
  }
  const entries = await readdir(ACTOR_PREP_ROOT, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(ACTOR_PREP_ROOT, entry.name))
    .sort((left, right) => basename(right).localeCompare(basename(left)));
  for (const workspace of directories) {
    try {
      const packet = await readActorPrepWorkspace(workspace);
      if (packet.packetReceipt.pass === true) return packet;
    } catch {
      // Continue to the next older complete packet.
    }
  }
  throw new Error('No passing automated Enki actor-prep packet is available.');
}

async function readActorPrepWorkspace(workspace) {
  const actorPrepPath = join(workspace, 'actor-prep.json');
  const sourceReceiptPath = join(workspace, 'evidence', 'source-receipt.json');
  const packetReceiptPath = join(workspace, 'evidence', 'packet-receipt.json');
  for (const path of [actorPrepPath, sourceReceiptPath, packetReceiptPath]) {
    if (!existsSync(path)) throw new Error(`Incomplete actor-prep workspace; missing ${path}`);
  }
  const actorPrep = JSON.parse(await readFile(actorPrepPath, 'utf8'));
  const sourceReceipt = JSON.parse(await readFile(sourceReceiptPath, 'utf8'));
  const packetReceipt = JSON.parse(await readFile(packetReceiptPath, 'utf8'));
  return {
    workspace,
    actorPrepPath,
    actorPrep,
    sourceReceipt,
    packetReceipt,
    definitionSha256: prefixedSha(Buffer.from(JSON.stringify(actorPrep), 'utf8')),
  };
}

async function verifyActorPrepPacket(packet) {
  if (packet.packetReceipt.pass !== true) throw new Error('Actor-prep packet is not passing.');
  if (packet.packetReceipt.definitionSha256 !== packet.definitionSha256) {
    throw new Error(
      `Actor-prep definition digest changed: receipt=${packet.packetReceipt.definitionSha256}, current=${packet.definitionSha256}.`,
    );
  }
  if (packet.actorPrep.automation?.headlessDefault !== true || packet.actorPrep.automation?.recurringManualEditorAllowed !== false) {
    throw new Error('Actor-prep automation policy is not headless/automation-first.');
  }
  if (packet.actorPrep.source?.sha256 !== packet.sourceReceipt.sourceSha256) {
    throw new Error('Actor-prep source identity disagrees with source receipt.');
  }
  const referencePath = resolve(packet.sourceReceipt.referencePath);
  if (!existsSync(referencePath)) throw new Error(`Actor-prep reference is missing: ${referencePath}`);
  const bytes = await readFile(referencePath);
  const sha256 = prefixedSha(bytes);
  if (sha256 !== packet.sourceReceipt.sourceSha256 || sha256 !== packet.sourceReceipt.copiedSha256) {
    throw new Error('Actor-prep reference bytes no longer match the accepted source receipt.');
  }
  const dimensions = parsePngDimensions(bytes);
  if (dimensions.width !== packet.actorPrep.source.width || dimensions.height !== packet.actorPrep.source.height) {
    throw new Error('Actor-prep reference dimensions changed after source binding.');
  }
  return { referencePath, bytes, sha256, ...dimensions };
}

async function verifyOllama({ baseUrl, model, timeoutMs }) {
  let response;
  try {
    response = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(Math.min(timeoutMs, 5000)),
    });
  } catch (error) {
    throw new Error(`Ollama is unavailable at ${baseUrl}: ${errorMessage(error)}`);
  }
  if (!response.ok) throw new Error(`Ollama tags returned HTTP ${response.status}.`);
  const tags = await response.json();
  const models = (tags.models ?? []).map((item) => item.name ?? item.model).filter(Boolean);
  if (!models.includes(model)) {
    throw new Error(`Required vision model ${model} is not installed. Installed: ${models.join(', ') || '(none)'}`);
  }
}

async function invokeDiscovery({ baseUrl, model, timeoutMs, imageBase64, seed }) {
  const system = [
    'You are the semantic actor locator for Sumer Reel Forge.',
    'Return only JSON conforming exactly to the supplied schema.',
    'The supplied PNG is an approved source-backed Enki cutout registered to its source frame.',
    'Your task is localization only: do not redesign, repaint, complete hidden anatomy, infer invisible hands/limbs, or propose animation.',
    'All coordinates are normalized to the complete image: x=0 left, y=0 top, width/height in 0..1.',
    "Left/right means Enki's anatomical left/right, not the viewer's left/right.",
    'Use status found only when the requested semantic region or anchor is visibly supportable in the pixels.',
    'Use uncertain when a plausible location exists but boundaries/identity are ambiguous.',
    'Use not-visible when source pixels do not support the requested region; for not-visible use zero bbox/point values.',
    'Tight boxes should contain the visible semantic part without surrounding vessel/background.',
    'Every found or uncertain box must be fully contained inside the image: x + width <= 1 and y + height <= 1.',
    'For partly cropped hands or limbs, box only the visible in-frame pixels; if the visible pixels cannot support a bounded box, use uncertain or not-visible rather than extending outside the image.',
  ].join(' ');

  const user = JSON.stringify(
    {
      task: 'Locate exactly the requested Enki semantic regions and anchors in this registered source image.',
      requiredRegions: ACTOR_REGION_IDS.map((id) => ({ id, role: REGION_ROLE_TEXT[id] })),
      requiredAnchors: ACTOR_ANCHOR_IDS.map((id) => ({ id, role: ANCHOR_ROLE_TEXT[id] })),
      sourceRules: {
        immutableSource: true,
        noHiddenAnatomyInference: true,
        noPixelGeneration: true,
        noBackgroundOrVesselInclusion: true,
        normalizedCoordinates: true,
        fullyContainedBoxes: true,
        partialEdgeAnatomyUsesVisibleInFramePixelsOnly: true,
      },
    },
    null,
    2,
  );

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      think: false,
      keep_alive: KEEP_ALIVE,
      format: DISCOVERY_SCHEMA,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user, images: [imageBase64] },
      ],
      options: { temperature: 0, seed },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`Ollama discovery returned HTTP ${response.status}: ${await response.text()}`);
  const payload = await response.json();
  const content = payload.message?.content;
  if (!content) throw new Error('Ollama returned no semantic discovery content.');
  const parsed = JSON.parse(content);
  parsed.providerModel = payload.model ?? model;
  return parsed;
}

function assertCompleteDiscovery(run) {
  const regionIds = run.regions?.map((item) => item.id) ?? [];
  const anchorIds = run.anchors?.map((item) => item.id) ?? [];
  assertExactIds(regionIds, ACTOR_REGION_IDS, 'semantic region');
  assertExactIds(anchorIds, ACTOR_ANCHOR_IDS, 'semantic anchor');
  for (const region of run.regions) {
    if (region.status === 'not-visible') continue;
    assertUnitBox(region.bbox, region.id);
  }
  for (const anchor of run.anchors) {
    if (anchor.status === 'not-visible') continue;
    assertUnitPoint(anchor.point, anchor.id);
  }
}

function assertExactIds(actual, expected, label) {
  if (new Set(actual).size !== actual.length) throw new Error(`Duplicate ${label} IDs returned by locator.`);
  const missing = expected.filter((id) => !actual.includes(id));
  const unexpected = actual.filter((id) => !expected.includes(id));
  if (missing.length || unexpected.length) {
    throw new Error(`${label} ID mismatch. Missing: ${missing.join(', ') || '(none)'}; unexpected: ${unexpected.join(', ') || '(none)'}.`);
  }
}

function assertUnitBox(box, id) {
  if (!box || ![box.x, box.y, box.width, box.height].every(Number.isFinite)) {
    throw new Error(`${id} returned a non-numeric bbox.`);
  }
  if (box.x < 0 || box.y < 0 || box.width <= 0 || box.height <= 0 || box.x + box.width > 1.000001 || box.y + box.height > 1.000001) {
    throw new Error(`${id} returned an out-of-bounds normalized bbox.`);
  }
}

function assertUnitPoint(point, id) {
  if (!point || ![point.x, point.y].every(Number.isFinite) || point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) {
    throw new Error(`${id} returned an out-of-bounds normalized point.`);
  }
}

function renderReviewSvg({ sourceBase64, width, height, consensus, qa, model, sourceSha256 }) {
  const margin = 22;
  const footer = 230;
  const canvasWidth = width + margin * 2;
  const canvasHeight = height + footer + margin * 2;
  const regionMarkup = consensus.regions
    .filter((region) => region.status !== 'not-visible' && region.bbox?.width > 0 && region.bbox?.height > 0)
    .map((region, index) => {
      const x = margin + region.bbox.x * width;
      const y = margin + region.bbox.y * height;
      const w = region.bbox.width * width;
      const h = region.bbox.height * height;
      const stroke = region.status === 'found' ? '#24d366' : '#ffb020';
      const label = `${region.id.replace('region:enki:', '')} ${Math.round(region.confidence * 100)}%`;
      const labelY = Math.max(margin + 14, y + 14 + (index % 2) * 14);
      return `<g><rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}" fill="none" stroke="${stroke}" stroke-width="2" ${region.status === 'uncertain' ? 'stroke-dasharray="8 5"' : ''}/><rect x="${num(x)}" y="${num(labelY - 13)}" width="${Math.max(92, label.length * 6.4)}" height="16" fill="#111" fill-opacity="0.78"/><text x="${num(x + 3)}" y="${num(labelY)}" font-family="monospace" font-size="11" fill="#fff">${escapeXml(label)}</text></g>`;
    })
    .join('\n');

  const anchorMarkup = consensus.anchors
    .filter((anchor) => anchor.status !== 'not-visible' && Number.isFinite(anchor.point?.x) && Number.isFinite(anchor.point?.y))
    .map((anchor) => {
      const x = margin + anchor.point.x * width;
      const y = margin + anchor.point.y * height;
      const stroke = anchor.status === 'found' ? '#2ca7ff' : '#ffb020';
      const label = anchor.id.replace('anchor:enki:', '');
      return `<g><circle cx="${num(x)}" cy="${num(y)}" r="6" fill="#111" stroke="${stroke}" stroke-width="2"/><line x1="${num(x - 9)}" y1="${num(y)}" x2="${num(x + 9)}" y2="${num(y)}" stroke="${stroke}"/><line x1="${num(x)}" y1="${num(y - 9)}" x2="${num(x)}" y2="${num(y + 9)}" stroke="${stroke}"/><text x="${num(x + 9)}" y="${num(y - 8)}" font-family="monospace" font-size="11" fill="#fff" stroke="#111" stroke-width="3" paint-order="stroke">${escapeXml(label)}</text></g>`;
    })
    .join('\n');

  const summaryY = margin + height + 34;
  const issues = qa.issues.length ? qa.issues : ['none'];
  const advisorySummary = qa.advisories.length ? `${qa.advisories.length} uncertain/not-visible item(s)` : 'none';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">
  <rect width="100%" height="100%" fill="#171717"/>
  <image href="data:image/png;base64,${sourceBase64}" x="${margin}" y="${margin}" width="${width}" height="${height}"/>
  ${regionMarkup}
  ${anchorMarkup}
  <g font-family="monospace" fill="#f4f4f4">
    <text x="${margin}" y="${summaryY}" font-size="16" font-weight="700">Enki semantic discovery · ${qa.structuralPass ? 'STRUCTURAL PASS / HUMAN REVIEW REQUIRED' : 'STOP / STRUCTURAL FAIL'}</text>
    <text x="${margin}" y="${summaryY + 25}" font-size="12">model: ${escapeXml(model)} · two-pass seeds: ${RUN_SEEDS.join(', ')}</text>
    <text x="${margin}" y="${summaryY + 45}" font-size="12">source: ${escapeXml(sourceSha256)}</text>
    <text x="${margin}" y="${summaryY + 70}" font-size="12">facial=${yesNo(qa.capabilities.facialLocalizationReady)} · hands=${yesNo(qa.capabilities.handContactLocalizationReady)} · torso=${yesNo(qa.capabilities.torsoLocalizationReady)} · advisories=${escapeXml(advisorySummary)}</text>
    <text x="${margin}" y="${summaryY + 96}" font-size="12">green boxes = stable found · dashed amber = uncertain · blue crosses = stable anchors</text>
    <text x="${margin}" y="${summaryY + 120}" font-size="12">blocking issues: ${escapeXml(issues.slice(0, 3).join(' | '))}</text>
    <text x="${margin}" y="${summaryY + 150}" font-size="13" font-weight="700">Human gate: verify boxes/crosses identify the real painted anatomy. Nothing is promoted by this SVG.</text>
  </g>
</svg>\n`;
}

async function maybeOpenArtifact(path) {
  try {
    let child;
    if (process.platform === 'win32') {
      child = spawn('cmd.exe', ['/d', '/c', 'start', '', path], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
    } else if (process.platform === 'darwin') {
      child = spawn('open', [path], { detached: true, stdio: 'ignore' });
    } else {
      child = spawn('xdg-open', [path], { detached: true, stdio: 'ignore' });
    }
    child.unref();
  } catch (error) {
    console.log(`[advisory] Could not open review overlay automatically: ${errorMessage(error)}`);
  }
}

function parseOptions(args) {
  const options = { model: null, workspace: null, open: true };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--no-open') options.open = false;
    else if (arg === '--model') options.model = args[++index];
    else if (arg.startsWith('--model=')) options.model = arg.slice('--model='.length);
    else if (arg === '--workspace') options.workspace = args[++index];
    else if (arg.startsWith('--workspace=')) options.workspace = arg.slice('--workspace='.length);
    else throw new Error(`Unknown option: ${arg}`);
  }
  return options;
}

function parsePngDimensions(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 24) throw new Error('Actor source is not a valid PNG buffer.');
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!bytes.subarray(0, 8).equals(signature) || bytes.toString('ascii', 12, 16) !== 'IHDR') {
    throw new Error('Actor source is not a PNG with a valid IHDR.');
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (!width || !height) throw new Error('Actor source PNG dimensions must be positive.');
  return { width, height };
}

function prefixedSha(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function positiveInteger(raw, fallback) {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function num(value) {
  return Number(value.toFixed(2));
}

function yesNo(value) {
  return value ? 'YES' : 'NO';
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
