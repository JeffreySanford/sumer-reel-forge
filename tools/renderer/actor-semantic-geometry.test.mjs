import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTOR_ANCHOR_IDS,
  ACTOR_REGION_IDS,
  boxIou,
  buildSemanticConsensus,
  evaluateSemanticDiscovery,
} from '../animation/src/actor-semantic-geometry.mjs';

function region(id, bbox, confidence = 0.9) {
  return { id, status: 'found', confidence, bbox, notes: 'fixture' };
}

function anchor(id, point, confidence = 0.9) {
  return { id, status: 'found', confidence, point, notes: 'fixture' };
}

function healthyRun(offset = 0) {
  const boxes = {
    'region:enki:head': { x: 0.30 + offset, y: 0.05, width: 0.34, height: 0.26 },
    'region:enki:face': { x: 0.37 + offset, y: 0.11, width: 0.20, height: 0.13 },
    'region:enki:hair-beard': { x: 0.32 + offset, y: 0.07, width: 0.30, height: 0.25 },
    'region:enki:eye-left': { x: 0.405 + offset, y: 0.145, width: 0.045, height: 0.025 },
    'region:enki:eye-right': { x: 0.49 + offset, y: 0.145, width: 0.045, height: 0.025 },
    'region:enki:crown': { x: 0.39 + offset, y: 0.025, width: 0.17, height: 0.07 },
    'region:enki:torso-robe': { x: 0.26 + offset, y: 0.27, width: 0.48, height: 0.44 },
    'region:enki:upper-arm-left': { x: 0.22 + offset, y: 0.31, width: 0.16, height: 0.20 },
    'region:enki:upper-arm-right': { x: 0.62 + offset, y: 0.31, width: 0.16, height: 0.20 },
    'region:enki:forearm-left': { x: 0.18 + offset, y: 0.46, width: 0.17, height: 0.20 },
    'region:enki:forearm-right': { x: 0.65 + offset, y: 0.46, width: 0.17, height: 0.20 },
    'region:enki:hand-left': { x: 0.16 + offset, y: 0.61, width: 0.10, height: 0.08 },
    'region:enki:hand-right': { x: 0.74 + offset, y: 0.61, width: 0.10, height: 0.08 },
  };
  const points = {
    'anchor:enki:hand-left': { x: 0.21 + offset, y: 0.65 },
    'anchor:enki:hand-right': { x: 0.79 + offset, y: 0.65 },
    'anchor:enki:gaze-origin': { x: 0.47 + offset, y: 0.16 },
    'anchor:enki:head-center': { x: 0.47 + offset, y: 0.18 },
    'anchor:enki:torso-root': { x: 0.49 + offset, y: 0.50 },
    'anchor:enki:seat-or-stance-root': { x: 0.50 + offset, y: 0.71 },
  };
  return {
    summary: 'healthy fixture',
    regions: ACTOR_REGION_IDS.map((id) => region(id, boxes[id])),
    anchors: ACTOR_ANCHOR_IDS.map((id) => anchor(id, points[id])),
  };
}

test('semantic consensus accepts two spatially stable passes', () => {
  const consensus = buildSemanticConsensus(healthyRun(0), healthyRun(0.005));
  assert.equal(consensus.regions.every((item) => item.status === 'found'), true);
  assert.equal(consensus.anchors.every((item) => item.status === 'found'), true);
  const qa = evaluateSemanticDiscovery(consensus);
  assert.equal(qa.structuralPass, true);
  assert.equal(qa.capabilities.facialLocalizationReady, true);
  assert.equal(qa.capabilities.handContactLocalizationReady, true);
  assert.equal(qa.capabilities.torsoLocalizationReady, true);
  assert.equal(qa.humanReviewRequired, true);
  assert.equal(qa.promotionAllowed, false);
});

test('semantic QA rejects a face outside the head', () => {
  const run = healthyRun();
  run.regions = run.regions.map((item) =>
    item.id === 'region:enki:face'
      ? region(item.id, { x: 0.72, y: 0.10, width: 0.18, height: 0.12 })
      : item,
  );
  const qa = evaluateSemanticDiscovery(buildSemanticConsensus(run, run));
  assert.equal(qa.structuralPass, false);
  assert.match(qa.issues.join('\n'), /Face is not sufficiently contained/i);
});

test('semantic QA rejects out-of-bounds normalized geometry', () => {
  const run = healthyRun();
  run.regions = run.regions.map((item) =>
    item.id === 'region:enki:torso-robe'
      ? region(item.id, { x: 0.80, y: 0.30, width: 0.40, height: 0.40 })
      : item,
  );
  const qa = evaluateSemanticDiscovery(buildSemanticConsensus(run, run));
  assert.equal(qa.structuralPass, false);
  assert.match(qa.issues.join('\n'), /invalid normalized bbox/i);
});

test('two-pass disagreement becomes uncertain instead of silently accepted', () => {
  const left = healthyRun();
  const right = healthyRun();
  right.regions = right.regions.map((item) =>
    item.id === 'region:enki:eye-left'
      ? region(item.id, { x: 0.70, y: 0.50, width: 0.05, height: 0.03 })
      : item,
  );
  const consensus = buildSemanticConsensus(left, right);
  assert.equal(consensus.regions.find((item) => item.id === 'region:enki:eye-left').status, 'uncertain');
  const qa = evaluateSemanticDiscovery(consensus);
  assert.equal(qa.capabilities.facialLocalizationReady, false);
  assert.equal(qa.humanReviewRequired, true);
});

test('missing hands disable hand capability without blocking core semantic structure', () => {
  const run = healthyRun();
  run.regions = run.regions.map((item) =>
    item.id === 'region:enki:hand-left' || item.id === 'region:enki:hand-right'
      ? {
          id: item.id,
          status: 'not-visible',
          confidence: 0.2,
          bbox: { x: 0, y: 0, width: 0, height: 0 },
          notes: 'fixture hidden hand',
        }
      : item,
  );
  run.anchors = run.anchors.map((item) =>
    item.id === 'anchor:enki:hand-left' || item.id === 'anchor:enki:hand-right'
      ? {
          id: item.id,
          status: 'not-visible',
          confidence: 0.2,
          point: { x: 0, y: 0 },
          notes: 'fixture hidden hand',
        }
      : item,
  );
  const qa = evaluateSemanticDiscovery(buildSemanticConsensus(run, run));
  assert.equal(qa.structuralPass, true);
  assert.equal(qa.capabilities.facialLocalizationReady, true);
  assert.equal(qa.capabilities.torsoLocalizationReady, true);
  assert.equal(qa.capabilities.handContactLocalizationReady, false);
  assert.match(qa.advisories.join('\n'), /region:enki:hand-left is not-visible/);
});

test('box IoU reports exact identity and disjoint boxes', () => {
  assert.equal(boxIou({ x: 0.1, y: 0.1, width: 0.2, height: 0.2 }, { x: 0.1, y: 0.1, width: 0.2, height: 0.2 }), 1);
  assert.equal(boxIou({ x: 0.1, y: 0.1, width: 0.2, height: 0.2 }, { x: 0.6, y: 0.6, width: 0.2, height: 0.2 }), 0);
});
