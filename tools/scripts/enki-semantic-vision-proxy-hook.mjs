import { readFileSync } from 'node:fs';
import {
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

  const messages = (body.messages ?? []).map((message) => {
    if (message?.role !== 'user' || !Array.isArray(message.images) || message.images.length === 0) {
      return message;
    }
    return {
      ...message,
      content: `${String(message.content ?? '')}\n\n${proxyInstruction(metadata)}`,
      images: [proxyImageBase64],
    };
  });

  const proxied = await originalFetch(input, {
    ...init,
    body: JSON.stringify({ ...body, messages }),
  });
  if (!proxied.ok) return proxied;

  const text = await proxied.text();
  let payload;
  let discovery;
  try {
    payload = JSON.parse(text);
    discovery = JSON.parse(payload?.message?.content ?? '');
  } catch {
    return cloneResponse(proxied, text);
  }

  const mapped = mapDiscoveryFromProxyToSource(discovery, metadata);
  const foundRegions = mapped.regions?.filter((item) => item.status === 'found').length ?? 0;
  const uncertainRegions = mapped.regions?.filter((item) => item.status === 'uncertain').length ?? 0;
  const foundAnchors = mapped.anchors?.filter((item) => item.status === 'found').length ?? 0;
  console.log(
    `[vision-proxy] remapped proxy localization to registered source: regions found=${foundRegions}, uncertain=${uncertainRegions}; anchors found=${foundAnchors}.`,
  );

  const mappedPayload = {
    ...payload,
    message: {
      ...payload.message,
      content: JSON.stringify(mapped),
    },
  };
  return cloneResponse(proxied, JSON.stringify(mappedPayload));
};

function cloneResponse(response, bodyText) {
  return new Response(bodyText, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
