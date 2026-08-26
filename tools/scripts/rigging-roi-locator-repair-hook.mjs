import { evaluateNormalizedRiggingBox, isRiggingLocatorRequest } from '../animation/src/rigging-roi-locator-contract.mjs';

const originalFetch = globalThis.fetch;
if (typeof originalFetch !== 'function') {
  throw new Error('Global fetch is unavailable; Node 22+ is required.');
}

const MAX_REPAIR_ATTEMPTS = 1;

globalThis.fetch = async function riggingLocatorRepairFetch(input, init = {}) {
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
  if (!isRiggingLocatorRequest(body)) {
    return originalFetch(input, init);
  }

  const first = await originalFetch(input, init);
  if (!first.ok) return first;
  const firstText = await first.text();
  const firstParsed = parseLocatorPayload(firstText);
  if (firstParsed?.evaluation?.ok) {
    return cloneResponse(first, firstText);
  }

  const firstBounds = firstParsed?.item?.bboxNormalized ?? null;
  console.warn(
    `[locator] Ollama returned invalid normalized rigging bounds ${JSON.stringify(firstBounds)}; running ${MAX_REPAIR_ATTEMPTS} bounded correction attempt.`,
  );

  const repairInstruction = [
    'Your previous rigging bounding box violated the coordinate contract.',
    `Previous bboxNormalized: ${JSON.stringify(firstBounds)}.`,
    'Return the same one coherent rigging cluster, but bboxNormalized MUST use decimal coordinates in the closed interval 0..1 relative to the full image.',
    'Do not use pixel coordinates, percentages, or a 0..1000 coordinate system.',
    'xMin < xMax and yMin < yMax. Keep the box tight, below 35% of full-frame area, and above 0.05% of full-frame area.',
    'Return only JSON matching the supplied schema.',
  ].join(' ');

  const repairedBody = {
    ...body,
    messages: [
      ...(body.messages ?? []),
      { role: 'assistant', content: firstParsed?.content ?? firstText },
      { role: 'user', content: repairInstruction },
    ],
    options: { ...(body.options ?? {}), temperature: 0 },
  };

  const repaired = await originalFetch(input, {
    ...init,
    body: JSON.stringify(repairedBody),
  });
  if (!repaired.ok) return repaired;
  const repairedText = await repaired.text();
  const repairedParsed = parseLocatorPayload(repairedText);
  if (repairedParsed?.evaluation?.ok) {
    console.log(
      `[locator] bounded correction accepted: ${formatBox(repairedParsed.evaluation.box)}.`,
    );
  } else {
    console.warn(
      `[locator] bounded correction still invalid: ${JSON.stringify(repairedParsed?.item?.bboxNormalized ?? null)}. The main rigging search will stop rather than guess a coordinate convention.`,
    );
  }
  return cloneResponse(repaired, repairedText);
};

function parseLocatorPayload(text) {
  try {
    const payload = JSON.parse(text);
    const content = payload?.message?.content;
    if (!content) return { payload, content: null, item: null, evaluation: null };
    const parsed = JSON.parse(content);
    const item = parsed?.target ?? null;
    const evaluation = evaluateNormalizedRiggingBox(item?.bboxNormalized);
    return { payload, content, item, evaluation };
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

function formatBox(box) {
  return box
    ? `${box.xMin.toFixed(3)},${box.yMin.toFixed(3)} -> ${box.xMax.toFixed(3)},${box.yMax.toFixed(3)}`
    : '<none>';
}
