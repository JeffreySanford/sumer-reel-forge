import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  evaluateProxyDiscoveryGeometry,
  isEnkiSemanticDiscoveryRequest,
  mapDiscoveryFromProxyToSource,
  proxyInstruction,
} from '../animation/src/actor-semantic-vision-proxy.mjs';

const originalFetch = globalThis.fetch;
if (typeof originalFetch !== 'function') {
  throw new Error('Global fetch is unavailable; Node 22+ is required.');
}

const metadataPath = process.env.ENKI_SEMANTIC_VISION_PROXY_META;
const imagePath = process.env.ENKI_SEMANTIC_VISION_PROXY_IMAGE;
if (!metadataPath || !imagePath) {
  throw new Error('ENKI semantic vision proxy hook requires metadata and image environment variables.');
}
const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
const proxyImageBase64 = readFileSync(imagePath).toString('base64');
const MAX_COORDINATE_REPAIR_ATTEMPTS = 1;
const REPAIR_TIMEOUT_MS = positiveInteger(
  process.env.SEMANTIC_COORDINATE_REPAIR_TIMEOUT_MS ?? process.env.PLANNING_TIMEOUT_MS,
  300_000,
);
let semanticRequestCount = 0;

globalThis.fetch = async function enkiSemanticVisionProxyFetch(input, init = {}) {
  const requestUrl = typeof input === 'string' ? input : input?.url;
  const method = String(init?.method ?? 'GET').toUpperCase();
  if (!requestUrl?.includes('/api/chat') || method !== 'POST' || typeof init?.body !== 'string') {
    return originalFetch(input, init);
  }

  let body;
  try {
    body = JSON.parse(init.body);
  } catch {
    return originalFetch(input, init);
  }
  if (!isEnkiSemanticDiscoveryRequest(body)) {
    return originalFetch(input, init);
  }
  semanticRequestCount += 1;
  const requestLabel = semanticRequestCount === 1 ? 'pass-a' : semanticRequestCount === 2 ? 'pass-b' : `pass-${semanticRequestCount}`;

  const messages = attachProxyImage(body.messages ?? []);
  const first = await originalFetch(input, {
    ...init,
    body: JSON.stringify({ ...body, messages }),
  });
  if (!first.ok) return first;

  let parsed = await parseDiscoveryResponse(first);
  if (!parsed) return first;

  const originalDiscovery = parsed.discovery;
  let evaluation = evaluateProxyDiscoveryGeometry(parsed.discovery);
  let response = first;

  if (!evaluation.ok) {
    writeDiagnostic(`${requestLabel}-invalid-before-repair`, {
      stage: 'invalid-before-repair',
      requestLabel,
      evaluation,
      discovery: parsed.discovery,
    });
    console.warn(
      `[vision-proxy] invalid crop-normalized semantic geometry: ${evaluation.issues.join(' | ')}. Running ${MAX_COORDINATE_REPAIR_ATTEMPTS} bounded coordinate correction attempt with a fresh ${Math.round(REPAIR_TIMEOUT_MS / 1000)}s timeout.`,
    );

    const repairInstruction = [
      'Your previous semantic localization response violated the crop-normalized coordinate contract.',
      `Contract issues: ${evaluation.issues.join(' | ')}.`,
      'This is a geometry-only correction. The prior response already contains the semantic findings; no image re-evaluation is required.',
      'Preserve every region/anchor id and status exactly. Correct only invalid bbox/point numeric geometry. Do not change found/uncertain/not-visible decisions.',
      'For every found/uncertain region: x,y,width,height are decimal fractions in 0..1 relative to the attached crop; width>0; height>0; x+width<=1; y+height<=1.',
      'If a box extends past the crop edge, shrink or move the box to the visible in-crop pixels only; never preserve an imagined off-crop extent.',
      'A valid repaired box must pass these arithmetic checks: x <= 1 - width and y <= 1 - height.',
      'For every found/uncertain anchor: x and y are decimal fractions in 0..1 relative to the attached crop.',
      'For not-visible items, use all-zero bbox/point geometry.',
      'Do not use pixel coordinates, percentages, or a 0..1000 coordinate system.',
      'Return exactly the complete JSON object required by the existing schema. Do not omit any region or anchor.',
    ].join(' ');

    const repairedMessages = [
      ...stripImages(messages),
      { role: 'assistant', content: JSON.stringify(parsed.discovery) },
      { role: 'user', content: repairInstruction },
    ];
    response = await originalFetch(input, {
      ...init,
      signal: AbortSignal.timeout(REPAIR_TIMEOUT_MS),
      body: JSON.stringify({
        ...body,
        messages: repairedMessages,
        options: { ...(body.options ?? {}), temperature: 0 },
      }),
    });
    if (!response.ok) return response;
    parsed = await parseDiscoveryResponse(response);
    if (!parsed) return response;

    const authorityIssues = compareSemanticAuthority(originalDiscovery, parsed.discovery);
    if (authorityIssues.length) {
      throw new Error(
        `Proxy coordinate repair changed semantic authority: ${authorityIssues.join(' | ')}`,
      );
    }

    evaluation = evaluateProxyDiscoveryGeometry(parsed.discovery);
    if (!evaluation.ok) {
      writeDiagnostic(`${requestLabel}-invalid-after-repair`, {
        stage: 'invalid-after-repair',
        requestLabel,
        evaluation,
        discovery: parsed.discovery,
      });
      throw new Error(
        `Proxy semantic locator coordinate repair still invalid after ${MAX_COORDINATE_REPAIR_ATTEMPTS} attempt: ${evaluation.issues.join(' | ')}`,
      );
    }
    console.log('[vision-proxy] bounded coordinate correction accepted; semantic statuses remain unchanged and thresholds were not relaxed.');
  }

  const mapped = mapDiscoveryFromProxyToSource(parsed.discovery, metadata);
  const foundRegions = mapped.regions?.filter((item) => item.status === 'found').length ?? 0;
  const uncertainRegions = mapped.regions?.filter((item) => item.status === 'uncertain').length ?? 0;
  const foundAnchors = mapped.anchors?.filter((item) => item.status === 'found').length ?? 0;
  console.log(
    `[vision-proxy] remapped proxy localization to registered source: regions found=${foundRegions}, uncertain=${uncertainRegions}; anchors found=${foundAnchors}.`,
  );

  const mappedPayload = {
    ...parsed.payload,
    message: {
      ...parsed.payload.message,
      content: JSON.stringify(mapped),
    },
  };
  return cloneResponse(response, JSON.stringify(mappedPayload));
};

function attachProxyImage(messages) {
  return messages.map((message) => {
    if (message?.role !== 'user' || !Array.isArray(message.images) || message.images.length === 0) {
      return message;
    }
    return {
      ...message,
      content: `${String(message.content ?? '')}\n\n${proxyInstruction(metadata)}`,
      images: [proxyImageBase64],
    };
  });
}

function stripImages(messages) {
  return messages.map((message) => {
    if (!message || typeof message !== 'object' || !('images' in message)) return message;
    const { images: _images, ...withoutImages } = message;
    return withoutImages;
  });
}

function compareSemanticAuthority(before, after) {
  const issues = [];
  compareItems('region', before?.regions, after?.regions, issues);
  compareItems('anchor', before?.anchors, after?.anchors, issues);
  return issues;
}

function compareItems(label, beforeItems = [], afterItems = [], issues) {
  const afterById = new Map((afterItems ?? []).map((item) => [item?.id, item]));
  for (const beforeItem of beforeItems ?? []) {
    const afterItem = afterById.get(beforeItem?.id);
    if (!afterItem) {
      issues.push(`${label} ${String(beforeItem?.id)} missing after coordinate repair`);
      continue;
    }
    if (afterItem.status !== beforeItem.status) {
      issues.push(
        `${label} ${String(beforeItem?.id)} status changed ${String(beforeItem.status)} -> ${String(afterItem.status)}`,
      );
    }
  }
  if ((afterItems ?? []).length !== (beforeItems ?? []).length) {
    issues.push(`${label} count changed during coordinate repair`);
  }
}

async function parseDiscoveryResponse(response) {
  const text = await response.text();
  try {
    const payload = JSON.parse(text);
    const discovery = JSON.parse(payload?.message?.content ?? '');
    return { text, payload, discovery };
  } catch {
    return null;
  }
}

function cloneResponse(response, bodyText) {
  return new Response(bodyText, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

function writeDiagnostic(name, value) {
  const directory = join(dirname(metadataPath), 'semantic-vision-proxy-diagnostics');
  mkdirSync(directory, { recursive: true });
  const diagnostic = {
    schemaVersion: 1,
    type: 'actor-semantic-vision-proxy-diagnostic',
    proxyMetadataPath: metadataPath,
    proxyImagePath: imagePath,
    metadata,
    sourcePixelsMutated: false,
    canonicalAssetsMutated: false,
    ...value,
  };
  writeFileSync(join(directory, `${name}.json`), `${JSON.stringify(diagnostic, null, 2)}\n`, 'utf8');
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
