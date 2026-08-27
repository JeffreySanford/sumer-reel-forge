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
  throw new Error('ENKI semantic vision proxy hook requires metadata and image environment variables.');
}
const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
const proxyImageBase64 = readFileSync(imagePath).toString('base64');
const MAX_COORDINATE_REPAIR_ATTEMPTS = 1;

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

  const messages = attachProxyImage(body.messages ?? []);
  const first = await originalFetch(input, {
    ...init,
    body: JSON.stringify({ ...body, messages }),
  });
  if (!first.ok) return first;

  let parsed = await parseDiscoveryResponse(first);
  if (!parsed) return first;

  let evaluation = evaluateProxyDiscoveryGeometry(parsed.discovery);
  let response = first;

  if (!evaluation.ok) {
    console.warn(
      `[vision-proxy] invalid crop-normalized semantic geometry: ${evaluation.issues.join(' | ')}. Running ${MAX_COORDINATE_REPAIR_ATTEMPTS} bounded coordinate correction attempt.`,
    );

    const repairInstruction = [
      'Your previous semantic localization response violated the crop-normalized coordinate contract.',
      `Contract issues: ${evaluation.issues.join(' | ')}.`,
      'Return the same semantic findings/statuses when still supported by the image; correct only invalid geometry.',
      'For every found/uncertain region: x,y,width,height are decimal fractions in 0..1 relative to the attached crop; width>0; height>0; x+width<=1; y+height<=1.',
      'For every found/uncertain anchor: x and y are decimal fractions in 0..1 relative to the attached crop.',
      'For not-visible items, use all-zero bbox/point geometry.',
      'Do not use pixel coordinates, percentages, or a 0..1000 coordinate system.',
      'Return exactly the complete JSON object required by the existing schema. Do not omit any region or anchor.',
    ].join(' ');

    const repairedMessages = [
      ...messages,
      { role: 'assistant', content: JSON.stringify(parsed.discovery) },
      { role: 'user', content: repairInstruction },
    ];
    response = await originalFetch(input, {
      ...init,
      body: JSON.stringify({
        ...body,
        messages: repairedMessages,
        options: { ...(body.options ?? {}), temperature: 0 },
      }),
    });
    if (!response.ok) return response;
    parsed = await parseDiscoveryResponse(response);
    if (!parsed) return response;
    evaluation = evaluateProxyDiscoveryGeometry(parsed.discovery);
    if (!evaluation.ok) {
      throw new Error(
        `Proxy semantic locator coordinate repair still invalid after ${MAX_COORDINATE_REPAIR_ATTEMPTS} attempt: ${evaluation.issues.join(' | ')}`,
      );
    }
    console.log('[vision-proxy] bounded coordinate correction accepted; semantic thresholds/status authority remain unchanged.');
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
