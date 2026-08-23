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
  assert.ok(ids.has('water-approved-motion-presets'));

  const lane = resolveLayerProductionLane(lanes, layer);
  assert.equal(lane?.id, 'semantic-water-overlay');
  assert.equal(
    lane?.generator?.workflowPath,
    'tools/renderer/workflows/semantic-overlay-sam3-api.json',
  );
  assert.equal(
    lane?.qa?.executor,
    'tools/scripts/verify-semantic-overlay-candidate.mjs',
  );
  assert.ok(lane?.qa?.alphaCoverage?.minimum > 0);
  assert.ok(
    lane?.qa?.alphaCoverage?.preferredMinimum >
      lane?.qa?.alphaCoverage?.minimum,
  );
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

  const lane = resolveLayerProductionLane(lanes, layer);
  assert.equal(lane?.id, 'exact-source-preservation');
  assert.equal(
    lane?.generator?.executor,
    'tools/scripts/source-preservation-layer.mjs',
  );
  assert.equal(lane?.qa?.family, 'checksum-identity');
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
  assert.ok(ids.has('water-approved-motion-presets'));
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
  const lane = resolveLayerProductionLane(lanes, layer);
  assert.equal(lane?.id, 'environmental-coherence-mask');
  assert.equal(lane?.generator?.family, 'semantic-coherence-mask');
  assert.ok(lane?.qa?.alphaCoverage?.maximum <= 0.4);
  assert.ok(lane?.qa?.alphaCoverage?.minimum > 0);
  assert.ok(
    lane?.qa?.alphaCoverage?.preferredMinimum >
      lane?.qa?.alphaCoverage?.minimum,
  );
  assert.equal(lane?.qa?.humanReviewRequired, true);
});

test('Shot 4 surface refraction is executable through the generic semantic lane', () => {
  const layer = {
    id: 'shot04-surface-refraction-v1',
    role: 'reflection',
    material: 'underwater-refraction',
    hasAlpha: true,
  };
  const lane = resolveLayerProductionLane(lanes, layer);
  assert.equal(lane?.id, 'semantic-refraction-overlay');
  assert.equal(lane?.generator?.family, 'sam3-semantic-overlay');
  assert.equal(
    lane?.generator?.workflowPath,
    'tools/renderer/workflows/semantic-overlay-sam3-api.json',
  );
  assert.ok(lane?.qa?.alphaCoverage?.minimum > 0);
  assert.ok(
    lane?.qa?.alphaCoverage?.preferredMinimum >
      lane?.qa?.alphaCoverage?.minimum,
  );
  assert.ok(lane?.qa?.alphaCoverage?.maximum < 1);
});

test('Shot 5 shrine base reuses exact preservation mechanics for stable architecture', () => {
  const shot = {
    shotId: 'traveler-shrine-hospitality',
    sourceShotNumber: 5,
  };
  const layer = {
    id: 'shot05-shrine-base-v1',
    role: 'background',
    material: 'architectural-background',
    hasAlpha: false,
  };
  const context = buildDecisionContext({ manifest, shot, layer });
  const decisions = resolveStyleDecisions(library, context);
  const ids = new Set(decisions.map((decision) => decision.id));

  assert.ok(ids.has('shot5-stable-documentary-camera'));
  assert.ok(ids.has('shot5-shrine-structure-stillness-anchor'));
  assert.ok(ids.has('shot5-practical-hospitality-not-tableau'));

  const lane = resolveLayerProductionLane(lanes, layer);
  assert.equal(lane?.id, 'stable-architecture-preservation');
  assert.equal(lane?.generator?.family, 'source-preservation');
  assert.equal(lane?.qa?.family, 'checksum-identity');
});

test('Shot 5 smoke is executable but remains explicitly provisional until benchmark approval', () => {
  const shot = {
    shotId: 'traveler-shrine-hospitality',
    sourceShotNumber: 5,
  };
  const layer = {
    id: 'shot05-smoke-v1',
    role: 'atmosphere',
    material: 'smoke',
    hasAlpha: true,
  };
  const context = buildDecisionContext({ manifest, shot, layer });
  const decisions = resolveStyleDecisions(library, context);
  const smokeDecision = decisions.find(
    (decision) => decision.id === 'smoke-motion-provisional-material-rule',
  );
  assert.equal(smokeDecision?.state, 'provisional');

  const lane = resolveLayerProductionLane(lanes, layer);
  assert.equal(lane?.id, 'semantic-smoke-overlay');
  assert.equal(lane?.state, 'provisional');
  assert.equal(lane?.generator?.family, 'sam3-semantic-overlay');
  assert.equal(lane?.qa?.humanReviewRequired, true);
  assert.ok(lane?.qa?.alphaCoverage?.minimum > 0);
});
