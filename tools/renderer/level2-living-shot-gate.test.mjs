import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const SCENE_PATH =
  'tools/animation/scenes/reel-01-shot-03-benchmark.scene-v2.json';
const MANIFEST_PATH =
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json';
const ACCEPTANCE_PATH =
  'planning/acceptance/shot03-level2-rendered-acceptance.json';

const CHARACTER_ARTICULATION_PRESETS = new Set([
  'blinkOnce',
  'subtleGazeShift',
]);
const SECONDARY_MOTION_PRESETS = new Set(['clothLag', 'riggingTension']);
const VESSEL_MOTION_PRESETS = new Set(['heavyPhysical', 'boatBob']);

async function loadCurrentShot3State() {
  const [scene, manifest] = await Promise.all([
    readFile(SCENE_PATH, 'utf8').then(JSON.parse),
    readFile(MANIFEST_PATH, 'utf8').then(JSON.parse),
  ]);

  const sceneShot = scene.shots.find((shot) => shot.sourceShotNumber === 3);
  const manifestShot = manifest.shots.find(
    (shot) => shot.sourceShotNumber === 3,
  );

  assert.ok(sceneShot, 'Shot 3 Scene V2 definition is missing.');
  assert.ok(manifestShot, 'Shot 3 animation manifest entry is missing.');

  return { sceneShot, manifestShot };
}

function approvedLayerIds(manifestShot) {
  return new Set(
    manifestShot.layers
      .filter(
        (layer) =>
          layer.state === 'approved' && layer.review?.status === 'approved',
      )
      .map((layer) => layer.id),
  );
}

function activatedPerformance(sceneShot, manifestShot, approvedIds) {
  return sceneShot.performance.filter((performance) => {
    if (performance.enabled !== false) return true;
    if (!manifestShot.activationPolicy?.enableDeferredPerformanceWhenApproved) {
      return false;
    }
    return (
      performance.deferredUntilAssetId &&
      approvedIds.has(performance.deferredUntilAssetId)
    );
  });
}

function evaluateLevel2Shot3(sceneShot, manifestShot) {
  const approvedIds = approvedLayerIds(manifestShot);
  const requiredIds = new Set(
    manifestShot.activationPolicy?.requiredLayerIds ?? [],
  );
  const requiredActivationComplete = [...requiredIds].every((id) =>
    approvedIds.has(id),
  );

  const activeLayers = requiredActivationComplete
    ? manifestShot.layers.filter((layer) => approvedIds.has(layer.id))
    : [];
  const performance = activatedPerformance(
    sceneShot,
    manifestShot,
    approvedIds,
  );

  const channels = [];

  for (const layer of activeLayers) {
    for (const preset of layer.motionPresets ?? []) {
      if (preset === 'cinematicSlow') continue;
      if (preset === 'breathing') {
        const enabled = performance.some(
          (item) =>
            item.preset === 'breathing' &&
            (!item.deferredUntilAssetId ||
              item.deferredUntilAssetId === layer.id),
        );
        if (!enabled) continue;
      }
      channels.push({
        id: `layer:${layer.id}:${preset}`,
        preset,
        kind: 'layer',
      });
    }
  }

  for (const item of performance) {
    const alreadyRepresented = channels.some(
      (channel) =>
        channel.preset === item.preset &&
        item.deferredUntilAssetId &&
        channel.id.includes(item.deferredUntilAssetId),
    );
    if (!alreadyRepresented) {
      channels.push({
        id: `performance:${item.target}:${item.preset}`,
        preset: item.preset,
        kind: 'performance',
      });
    }
  }

  for (const item of sceneShot.atmosphere ?? []) {
    channels.push({
      id: `atmosphere:${item.id}:${item.preset}`,
      preset: item.preset,
      kind: 'atmosphere',
    });
  }

  for (const item of sceneShot.lighting ?? []) {
    channels.push({
      id: `lighting:${item.id}:${item.preset}`,
      preset: item.preset,
      kind: 'lighting',
    });
  }

  const nonCameraChannels = channels.length;
  const distinctMotionFamilies = new Set(
    channels.map((channel) => channel.preset),
  );

  const hasIndependentVesselMotion = activeLayers.some(
    (layer) =>
      layer.role === 'major-prop' &&
      layer.material === 'rigid-vessel' &&
      (layer.motionPresets ?? []).some((preset) =>
        VESSEL_MOTION_PRESETS.has(preset),
      ),
  );

  const hasCharacterArticulation = performance.some((item) =>
    CHARACTER_ARTICULATION_PRESETS.has(item.preset),
  );

  const hasSecondaryLagOrInertia = activeLayers.some((layer) =>
    (layer.motionPresets ?? []).some((preset) =>
      SECONDARY_MOTION_PRESETS.has(preset),
    ),
  );

  const failures = [];
  if (!requiredActivationComplete) {
    failures.push('required approved Shot 3 layered activation is incomplete');
  }
  if (nonCameraChannels < 4) {
    failures.push(
      `needs at least 4 independently timed non-camera motion channels; found ${nonCameraChannels}`,
    );
  }
  if (distinctMotionFamilies.size < 4) {
    failures.push(
      `needs at least 4 distinct motion families; found ${distinctMotionFamilies.size}`,
    );
  }
  if (!hasIndependentVesselMotion) {
    failures.push('needs rigid-vessel motion independent from the camera');
  }
  if (!hasCharacterArticulation) {
    failures.push(
      'needs visible character articulation beyond breathing (for example blinkOnce or subtleGazeShift)',
    );
  }
  if (!hasSecondaryLagOrInertia) {
    failures.push(
      'needs an active secondary lag/inertia channel (for example riggingTension or clothLag)',
    );
  }

  return {
    pass: failures.length === 0,
    failures,
    metrics: {
      nonCameraChannels,
      distinctMotionFamilies: distinctMotionFamilies.size,
      hasIndependentVesselMotion,
      hasCharacterArticulation,
      hasSecondaryLagOrInertia,
    },
    channels,
  };
}

async function evaluateLevel2Shot3FinalAcceptance(sceneShot, manifestShot) {
  const result = evaluateLevel2Shot3(sceneShot, manifestShot);
  const acceptance = await readAcceptanceReceipt();
  const acceptanceFailures = evaluateAcceptanceReceipt(acceptance);

  return {
    ...result,
    pass: result.pass && acceptanceFailures.length === 0,
    failures: [...result.failures, ...acceptanceFailures],
  };
}

async function readAcceptanceReceipt() {
  try {
    return JSON.parse(await readFile(ACCEPTANCE_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function evaluateAcceptanceReceipt(receipt) {
  const failures = [];
  if (!receipt) {
    return [
      `needs rendered Level 1 / Level 2 A/B human acceptance receipt at ${ACCEPTANCE_PATH}`,
    ];
  }
  if (receipt.schemaVersion !== 1) {
    failures.push('needs Shot 3 Level 2 acceptance receipt schemaVersion 1');
  }
  if (receipt.shotNumber !== 3) {
    failures.push('needs Shot 3 Level 2 acceptance receipt for source shot 3');
  }
  if (receipt.decision !== 'accepted') {
    failures.push('needs human decision accepted');
  }
  if (receipt.proof?.proofType !== 'shot03-level2-rendered-motion-proof') {
    failures.push('needs rendered-motion proof receipt');
  }
  if (receipt.proof?.deterministicPass !== true) {
    failures.push('needs deterministic rendered proof pass');
  }
  if (receipt.abReview?.watchedAtNormalSpeed !== true) {
    failures.push('needs normal-speed Level 1 / Level 2 A/B review');
  }
  if (receipt.abReview?.preferred !== 'level2') {
    failures.push('needs human preference for Level 2 over Level 1');
  }
  if (!Array.isArray(receipt.abReview?.meaningfulImprovements)) {
    failures.push('needs meaningful motion improvements list');
  } else if (receipt.abReview.meaningfulImprovements.length < 3) {
    failures.push('needs at least three meaningful motion improvements');
  }
  if (receipt.abReview?.compensatingLossFound !== false) {
    failures.push(
      'needs no compensating source-fidelity or material-realism loss',
    );
  }
  if (!receipt.reviewedAt || !receipt.reviewer) {
    failures.push('needs reviewer and reviewedAt');
  }
  return failures;
}

function approvePlannedLayer(manifestShot, layerId) {
  const layer = manifestShot.layers.find(
    (candidate) => candidate.id === layerId,
  );
  assert.ok(layer, `Fixture is missing ${layerId}.`);
  layer.state = 'approved';
  layer.review = { ...layer.review, status: 'approved' };
}

function deactivateLevel2Layer(manifestShot, layerId) {
  const layer = manifestShot.layers.find(
    (candidate) => candidate.id === layerId,
  );
  assert.ok(layer, `Fixture is missing ${layerId}.`);
  layer.state = 'planned';
  layer.review = { ...layer.review, status: 'pending' };
}

test('Level 2 Shot 3 gate rejects a layered still treatment that lacks articulation and secondary motion', async () => {
  const { sceneShot, manifestShot } = await loadCurrentShot3State();
  const layeredStillManifestShot = structuredClone(manifestShot);
  deactivateLevel2Layer(layeredStillManifestShot, 'shot03-enki-eyes-v1');
  deactivateLevel2Layer(layeredStillManifestShot, 'shot03-rigging-v1');

  const result = evaluateLevel2Shot3(sceneShot, layeredStillManifestShot);

  assert.equal(result.metrics.hasIndependentVesselMotion, true);
  assert.ok(result.metrics.nonCameraChannels >= 4);
  assert.equal(result.metrics.hasCharacterArticulation, false);
  assert.equal(result.metrics.hasSecondaryLagOrInertia, false);
  assert.match(
    result.failures.join('\n'),
    /visible character articulation beyond breathing/,
  );
  assert.match(result.failures.join('\n'), /secondary lag\/inertia channel/);
});

test('Level 2 Shot 3 gate is achievable when reviewed blink and rigging channels are active', async () => {
  const { sceneShot, manifestShot } = await loadCurrentShot3State();
  const candidateManifestShot = structuredClone(manifestShot);

  approvePlannedLayer(candidateManifestShot, 'shot03-enki-eyes-v1');
  approvePlannedLayer(candidateManifestShot, 'shot03-rigging-v1');

  const result = evaluateLevel2Shot3(sceneShot, candidateManifestShot);

  assert.equal(result.pass, true, result.failures.join('\n'));
  assert.equal(result.metrics.hasCharacterArticulation, true);
  assert.equal(result.metrics.hasSecondaryLagOrInertia, true);
});

test('ACTIVE MILESTONE GATE: approved Shot 3 meets Level 2 Living Shot motion quality', async (t) => {
  if (process.env.SRF_ENFORCE_SHOT03_LEVEL2_MILESTONE !== '1') {
    t.skip(
      'Shot 3 rendered human acceptance is enforced by the focused Level 2 dev loop, not routine renderer tests.',
    );
    return;
  }

  const { sceneShot, manifestShot } = await loadCurrentShot3State();
  const result = await evaluateLevel2Shot3FinalAcceptance(
    sceneShot,
    manifestShot,
  );

  assert.equal(
    result.pass,
    true,
    [
      'Shot 3 is still below the Level 2 Living Shot bar:',
      ...result.failures.map((failure) => `- ${failure}`),
      '',
      `Observed non-camera channels: ${result.metrics.nonCameraChannels}`,
      `Observed distinct motion families: ${result.metrics.distinctMotionFamilies}`,
      `Independent vessel motion: ${result.metrics.hasIndependentVesselMotion ? 'yes' : 'no'}`,
      `Character articulation beyond breathing: ${result.metrics.hasCharacterArticulation ? 'yes' : 'no'}`,
      `Secondary lag/inertia: ${result.metrics.hasSecondaryLagOrInertia ? 'yes' : 'no'}`,
    ].join('\n'),
  );
});
