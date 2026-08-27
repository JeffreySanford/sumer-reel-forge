import { readFileSync } from 'node:fs';
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
  throw new Error('Grouped Enki semantic hook requires proxy metadata and image environment variables.');
}

const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
const proxyImageBase64 = readFileSync(imagePath).toString('base64');
const GROUP_TIMEOUT_MS = positiveInteger(process.env.ENKI_SEMANTIC_GROUP_TIMEOUT_MS, 300000);
const MAX_REPAIR_ATTEMPTS_PER_GROUP = 1;

const GROUPS = Object.freeze([
  Object.freeze({
    id: 'face-head',
    regions: Object.freeze([
      'region:enki:head',
      'region:enki:face',
      'region:enki:hair-beard',
      'region:enki:eye-left',
      'region:enki:eye-right',
      'region:enki:crown',
    ]),
    anchors: Object.freeze([
      'anchor:enki:gaze-origin',
      'anchor:enki:head-center',
    ]),
  }),
  Object.freeze({
    id: 'body-arms',
    regions: Object.freeze([
      'region:enki:torso-robe',
      'region:enki:upper-arm-left',
      'region:enki:upper-arm-right',
      'region:enki:forearm-left',
      'region:enki:forearm-right',
    ]),
    anchors: Object.freeze([
      'anchor:enki:torso-root',
      'anchor:enki:seat-or-stance-root',
    ]),
  }),
  Object.freeze({
    id: 'hands-contact',
    regions: Object.freeze([
      'region:enki:hand-left',
      'region:enki:hand-right',
    ]),
    anchors: Object.freeze([
      'anchor:enki:hand-left',
      'anchor:enki:hand-right',
    ]),
  }),
]);

globalThis.fetch = async function enkiGroupedSemanticFetch(input, init = {}) {
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

  const merged = { summary: 'Grouped semantic discovery', regions: [], anchors: [] };
  let responseTemplate = null;
  let payloadTemplate = null;

  for (const group of GROUPS) {
    console.log(`[vision-group] ${group.id}: ${group.regions.length} region(s), ${group.anchors.length} anchor(s).`);
    const groupBody = buildGroupBody(body, group);
    let response = await originalFetch(input, {
      ...init,
      signal: AbortSignal.timeout(GROUP_TIMEOUT_MS),
      body: JSON.stringify(groupBody),
    });
    if (!response.ok) return response;

    let parsed = await parseDiscoveryResponse(response, group.id);
    assertExactGroupIds(parsed.discovery, group);
    let evaluation = evaluateProxyDiscoveryGeometry(parsed.discovery);

    if (!evaluation.ok) {
      console.warn(
        `[vision-group] ${group.id} invalid crop-normalized geometry: ${evaluation.issues.join(' | ')}. Running ${MAX_REPAIR_ATTEMPTS_PER_GROUP} text-only bounded repair with fresh ${Math.round(GROUP_TIMEOUT_MS / 1000)}s timeout.`,
      );
      const beforeStatuses = semanticStatuses(parsed.discovery);
      response = await originalFetch(input, {
        method: init.method,
        headers: init.headers,
        signal: AbortSignal.timeout(GROUP_TIMEOUT_MS),
        body: JSON.stringify(buildRepairBody(groupBody, parsed.discovery, evaluation.issues)),
      });
      if (!response.ok) return response;
      parsed = await parseDiscoveryResponse(response, `${group.id} repair`);
      assertExactGroupIds(parsed.discovery, group);
      assertSameStatuses(beforeStatuses, semanticStatuses(parsed.discovery), group.id);
      evaluation = evaluateProxyDiscoveryGeometry(parsed.discovery);
      if (!evaluation.ok) {
        throw new Error(
          `Grouped semantic locator ${group.id} repair still invalid after ${MAX_REPAIR_ATTEMPTS_PER_GROUP} attempt: ${evaluation.issues.join(' | ')}`,
        );
      }
      console.log(`[vision-group] ${group.id} bounded geometry repair accepted; statuses unchanged.`);
    }

    const mapped = mapDiscoveryFromProxyToSource(parsed.discovery, metadata);
    merged.regions.push(...(mapped.regions ?? []));
    merged.anchors.push(...(mapped.anchors ?? []));
    const foundRegions = mapped.regions?.filter((item) => item.status === 'found').length ?? 0;
    const uncertainRegions = mapped.regions?.filter((item) => item.status === 'uncertain').length ?? 0;
    const foundAnchors = mapped.anchors?.filter((item) => item.status === 'found').length ?? 0;
    console.log(
      `[vision-group] ${group.id} remapped: regions found=${foundRegions}, uncertain=${uncertainRegions}; anchors found=${foundAnchors}.`,
    );
    responseTemplate = response;
    payloadTemplate = parsed.payload;
  }

  assertMergedCoverage(merged);
  const mappedPayload = {
    ...payloadTemplate,
    message: {
      ...payloadTemplate.message,
      content: JSON.stringify(merged),
    },
  };
  return cloneResponse(responseTemplate, JSON.stringify(mappedPayload));
};

function buildGroupBody(body, group) {
  const format = structuredClone(body.format);
  format.properties.regions.minItems = group.regions.length;
  format.properties.regions.maxItems = group.regions.length;
  format.properties.regions.items.properties.id.enum = [...group.regions];
  format.properties.anchors.minItems = group.anchors.length;
  format.properties.anchors.maxItems = group.anchors.length;
  format.properties.anchors.items.properties.id.enum = [...group.anchors];

  const messages = (body.messages ?? []).map((message) => {
    if (message?.role !== 'user' || !Array.isArray(message.images) || message.images.length === 0) {
      return message;
    }
    const parsed = parseUserRequest(message.content);
    const requiredRegions = (parsed.requiredRegions ?? []).filter((item) => group.regions.includes(item.id));
    const requiredAnchors = (parsed.requiredAnchors ?? []).filter((item) => group.anchors.includes(item.id));
    if (requiredRegions.length !== group.regions.length || requiredAnchors.length !== group.anchors.length) {
      throw new Error(`Could not derive complete ${group.id} semantic request from base discovery prompt.`);
    }
    const grouped = {
      ...parsed,
      task: `Locate only the ${group.id} Enki semantic group in this crop. Return exactly the requested group items.`,
      requiredRegions,
      requiredAnchors,
      groupingPolicy: {
        groupId: group.id,
        smallerTaskForLocalVisionModel: true,
        doNotInferOtherGroups: true,
      },
    };
    return {
      ...message,
      content: `${JSON.stringify(grouped, null, 2)}\n\n${proxyInstruction(metadata)}`,
      images: [proxyImageBase64],
    };
  });

  return {
    ...body,
    format,
    messages,
    options: { ...(body.options ?? {}), temperature: 0 },
  };
}

function buildRepairBody(groupBody, discovery, issues) {
  const textOnlyMessages = (groupBody.messages ?? []).map((message) => {
    const { images: _images, ...rest } = message ?? {};
    return rest;
  });
  return {
    ...groupBody,
    messages: [
      ...textOnlyMessages,
      { role: 'assistant', content: JSON.stringify(discovery) },
      {
        role: 'user',
        content: [
          'Coordinate repair only. Do not re-evaluate the image and do not change any semantic status.',
          `Invalid geometry: ${issues.join(' | ')}.`,
          'For every found/uncertain region, x,y,width,height are decimal fractions in 0..1 and must satisfy width>0, height>0, x+width<=1, y+height<=1.',
          'For found/uncertain anchors, x and y must remain in 0..1.',
          'For not-visible items, preserve zero geometry.',
          'Do not use pixels, percentages, 0..1000 coordinates, or clamping instructions.',
          'Return the complete group JSON object only.',
        ].join(' '),
      },
    ],
    options: { ...(groupBody.options ?? {}), temperature: 0 },
  };
}

function parseUserRequest(content) {
  const text = String(content ?? '');
  const contractIndex = text.indexOf('\n\nVISION-PROXY CONTRACT:');
  const jsonText = contractIndex >= 0 ? text.slice(0, contractIndex) : text;
  try {
    return JSON.parse(jsonText);
  } catch (error) {
    throw new Error(`Could not parse semantic discovery user request JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function parseDiscoveryResponse(response, label) {
  const text = await response.text();
  try {
    const payload = JSON.parse(text);
    const discovery = JSON.parse(payload?.message?.content ?? '');
    return { payload, discovery };
  } catch (error) {
    throw new Error(`Could not parse ${label} semantic response: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function assertExactGroupIds(discovery, group) {
  assertExactIds(discovery?.regions?.map((item) => item.id) ?? [], group.regions, `${group.id} region`);
  assertExactIds(discovery?.anchors?.map((item) => item.id) ?? [], group.anchors, `${group.id} anchor`);
}

function assertExactIds(actual, expected, label) {
  if (new Set(actual).size !== actual.length) throw new Error(`Duplicate ${label} IDs.`);
  const missing = expected.filter((id) => !actual.includes(id));
  const unexpected = actual.filter((id) => !expected.includes(id));
  if (missing.length || unexpected.length) {
    throw new Error(`${label} ID mismatch. Missing: ${missing.join(', ') || '(none)'}; unexpected: ${unexpected.join(', ') || '(none)'}.`);
  }
}

function semanticStatuses(discovery) {
  return new Map([
    ...(discovery?.regions ?? []).map((item) => [item.id, item.status]),
    ...(discovery?.anchors ?? []).map((item) => [item.id, item.status]),
  ]);
}

function assertSameStatuses(before, after, groupId) {
  for (const [id, status] of before) {
    if (after.get(id) !== status) {
      throw new Error(`Grouped semantic repair ${groupId} changed ${id} status from ${status} to ${String(after.get(id))}.`);
    }
  }
}

function assertMergedCoverage(merged) {
  const regionIds = GROUPS.flatMap((group) => [...group.regions]);
  const anchorIds = GROUPS.flatMap((group) => [...group.anchors]);
  assertExactIds(merged.regions.map((item) => item.id), regionIds, 'merged region');
  assertExactIds(merged.anchors.map((item) => item.id), anchorIds, 'merged anchor');
}

function cloneResponse(response, bodyText) {
  return new Response(bodyText, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

function positiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}
