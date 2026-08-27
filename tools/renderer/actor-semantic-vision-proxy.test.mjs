import test from 'node:test';
import assert from 'node:assert/strict';
import {
  expandPixelBounds,
  isEnkiSemanticDiscoveryRequest,
  mapDiscoveryFromProxyToSource,
  mapProxyBoxToSource,
  mapProxyPointToSource,
} from '../animation/src/actor-semantic-vision-proxy.mjs';

const metadata = {
  source: { width: 1000, height: 2000 },
  crop: { x: 200, y: 400, width: 500, height: 1000 },
};

test('maps whole proxy box back to exact registered source crop', () => {
  assert.deepEqual(
    mapProxyBoxToSource({ x: 0, y: 0, width: 1, height: 1 }, metadata),
    { x: 0.2, y: 0.2, width: 0.5, height: 0.5 },
  );
});

test('maps proxy anchor back to registered source frame', () => {
  assert.deepEqual(
    mapProxyPointToSource({ x: 0.5, y: 0.5 }, metadata),
    { x: 0.45, y: 0.45 },
  );
});

test('preserves not-visible zero geometry while mapping found items', () => {
  const mapped = mapDiscoveryFromProxyToSource({
    regions: [
      { id: 'region:enki:head', status: 'found', confidence: 0.9, bbox: { x: 0.1, y: 0.2, width: 0.4, height: 0.3 }, notes: 'head' },
      { id: 'region:enki:hand-left', status: 'not-visible', confidence: 0.2, bbox: { x: 0, y: 0, width: 0, height: 0 }, notes: 'hidden' },
    ],
    anchors: [
      { id: 'anchor:enki:head-center', status: 'found', confidence: 0.9, point: { x: 0.3, y: 0.4 }, notes: 'center' },
      { id: 'anchor:enki:hand-left', status: 'not-visible', confidence: 0.2, point: { x: 0, y: 0 }, notes: 'hidden' },
    ],
  }, metadata);

  assert.deepEqual(mapped.regions[1].bbox, { x: 0, y: 0, width: 0, height: 0 });
  assert.deepEqual(mapped.anchors[1].point, { x: 0, y: 0 });
  assert.ok(mapped.regions[0].bbox.x > 0.2);
  assert.ok(mapped.anchors[0].point.y > 0.2);
});

test('expands alpha bounds with bounded padding and clamps to source edges', () => {
  assert.deepEqual(
    expandPixelBounds({ x: 10, y: 20, width: 200, height: 400 }, { width: 941, height: 1672 }, 0.18),
    { x: 0, y: 0, width: 246, height: 492 },
  );
});

test('semantic hook identifies only Enki semantic locator requests', () => {
  const body = {
    messages: [
      { role: 'system', content: 'You are the semantic actor locator for Sumer Reel Forge.' },
      { role: 'user', content: 'Locate exactly the requested Enki semantic regions and anchors' },
    ],
  };
  assert.equal(isEnkiSemanticDiscoveryRequest(body), true);
  assert.equal(isEnkiSemanticDiscoveryRequest({ messages: [{ content: 'other request' }] }), false);
});
