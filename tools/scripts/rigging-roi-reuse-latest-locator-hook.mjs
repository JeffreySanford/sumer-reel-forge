import { existsSync } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { isRiggingLocatorRequest } from '../animation/src/rigging-roi-locator-contract.mjs';

const originalFetch = globalThis.fetch;
if (typeof originalFetch !== 'function') {
  throw new Error('Global fetch is unavailable; Node 22+ is required.');
}

const WORK_ROOT = resolve('tmp/animation-assets/resegmentation/shot03-rigging-roi-search');
const REPORT_NAME = 'shot03-rigging-roi-search.json';
let cachedLocator = null;

globalThis.fetch = async function reuseLatestRiggingLocatorFetch(input, init = {}) {
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

  const locator = cachedLocator ?? (cachedLocator = await loadLatestLocator());
  console.log(
    `[locator] reusing exact latest rigging locator: ${formatBox(locator.bboxNormalized)} from ${locator.sourceReport}`,
  );

  const responsePayload = {
    model: locator.model ?? body.model ?? 'reused-rigging-locator',
    created_at: new Date().toISOString(),
    message: {
      role: 'assistant',
      content: JSON.stringify({
        target: {
          found: true,
          confidence: locator.confidence,
          bboxNormalized: locator.bboxNormalized,
          notes: `${locator.notes ?? 'Reused exact prior rigging locator.'} [reused exact prior locator; no relocalization]`,
        },
      }),
    },
    done: true,
  };

  return new Response(JSON.stringify(responsePayload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};

async function loadLatestLocator() {
  if (!existsSync(WORK_ROOT)) {
    throw new Error(`No rigging ROI search root exists: ${WORK_ROOT}`);
  }
  const entries = await readdir(WORK_ROOT, { withFileTypes: true });
  const reports = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const path = join(WORK_ROOT, entry.name, REPORT_NAME);
    if (!existsSync(path)) continue;
    const info = await stat(path);
    reports.push({ path, mtimeMs: info.mtimeMs });
  }
  reports.sort((a, b) => b.mtimeMs - a.mtimeMs);
  if (!reports.length) throw new Error(`No ${REPORT_NAME} found under ${WORK_ROOT}`);

  const sourceReport = reports[0].path;
  const report = JSON.parse(await readFile(sourceReport, 'utf8'));
  const locator = report.locator;
  const box = locator?.bboxNormalized;
  if (
    !locator ||
    !box ||
    ![box.xMin, box.yMin, box.xMax, box.yMax].every(
      (value) => Number.isFinite(value) && value >= 0 && value <= 1,
    ) ||
    box.xMax <= box.xMin ||
    box.yMax <= box.yMin
  ) {
    throw new Error(`Latest rigging report does not contain a valid normalized locator: ${sourceReport}`);
  }

  return {
    sourceReport,
    model: locator.model,
    confidence: Number.isFinite(locator.confidence) ? locator.confidence : 1,
    bboxNormalized: box,
    notes: locator.notes,
  };
}

function formatBox(box) {
  return `${box.xMin.toFixed(3)},${box.yMin.toFixed(3)} -> ${box.xMax.toFixed(3)},${box.yMax.toFixed(3)}`;
}
