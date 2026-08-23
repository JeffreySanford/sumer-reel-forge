import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDecisionContext,
  loadProductionLaneRegistry,
  loadStyleDecisionLibrary,
  resolveLayerProductionLane,
  resolveStyleDecisions,
} from './style-decisions.mjs';

const library = await loadStyleDecisionLibrary();
const lanes = await loadProductionLaneRegistry();

const manifest = {
  projectSlug: 'blessings-of-sumer',
  chapterNumber: 1,
  episodeNumber: 1,
};

test('Shot 3 water inherits project and water-material decisions', () => {
  const shot = { shotId: 'enki-at-the-helm', sourceShotNumber: 3 };
  const layer = {
    id: 'shot03-water-v1',
    role: 'water',
    material: 'water',
    hasAlpha: true,
  };
  const context = buildDecisionContext({ manifest, shot, layer });
  const decisions = resolveStyleDecisions(library, context);
  const ids = new Set(decisions.map((decision) => decision.id));

  assert.ok(ids.has('project-editorial-source-immutable'));
  assert.ok(ids.has('project-human-approval-final-gate'));
  assert.ok(ids.has('water-motion-material-internal'));
  assert.equal(resolveLayerProductionLane(lanes, layer)?.id, 'semantic-water-overlay');
});

test('Shot 4 deep water inherits provisional Nammu rules and exact-source lane', () => {
  const shot = { shotId: 'nammu-under-water', sourceShotNumber: 4 };
  const layer = {
    id: 'shot04-deep-water-v1',
    role: 'background',
    material: 'underwater-refraction',
    hasAlpha: false,
  };
  const context = buildDecisionContext({ manifest, shot, layer });
  const decisions = resolveStyleDecisions(library, context);
  const ids = new Set(decisions.map((decision) => decision.id));

  assert.ok(ids.has('nammu-near-static-camera'));
  assert.ok(ids.has('nammu-environmental-coherence'));
  assert.ok(ids.has('nammu-deep-water-source-anchor'));
  assert.equal(resolveLayerProductionLane(lanes, layer)?.id, 'exact-source-preservation');
});

test('provisional rules can be excluded for approved-only inheritance', () => {
  const shot = { shotId: 'nammu-under-water', sourceShotNumber: 4 };
  const layer = {
    id: 'shot04-mid-current-v1',
    role: 'water',
    material: 'water',
    hasAlpha: true,
  };
  const context = buildDecisionContext({ manifest, shot, layer });
  const decisions = resolveStyleDecisions(library, context, { includeProvisional: false });
  const ids = new Set(decisions.map((decision) => decision.id));

  assert.ok(ids.has('water-motion-material-internal'));
  assert.ok(!ids.has('nammu-near-static-camera'));
  assert.ok(!ids.has('nammu-environmental-coherence'));
});

test('Shot 4 coherence mask selects environmental coherence lane', () => {
  const layer = {
    id: 'shot04-nammu-coherence-mask-v1',
    role: 'mask',
    material: 'divine-light',
    hasAlpha: true,
  };
  assert.equal(resolveLayerProductionLane(lanes, layer)?.id, 'environmental-coherence-mask');
});
