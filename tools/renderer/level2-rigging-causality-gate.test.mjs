import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  RIGGING_LAG_SECONDS,
  heavyPhysicalDriver,
  riggingTensionResponse,
} from '../animation/src/level2-rigging-motion.mjs';

const rendererPath = 'tools/animation/src/SceneV2ResolvedBenchmark.tsx';

function riggingBranch(source) {
  const marker = "if (layer.motionPresets.includes('riggingTension'))";
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, 'Scene V2 renderer is missing riggingTension handling.');
  const nextBranch = source.indexOf("if (layer.motionPresets.includes('clothLag'))", start);
  assert.notEqual(nextBranch, -1, 'Could not bound the riggingTension renderer branch.');
  return source.slice(start, nextBranch);
}

function approximatelyEqual(actual, expected, tolerance = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}.`,
  );
}

test('Level 2 rigging response numerically lags the shared heavyPhysical vessel driver', () => {
  const durationSeconds = 7;
  const phaseSeconds = 2.3;
  const progress = phaseSeconds / durationSeconds;
  const currentDriver = heavyPhysicalDriver({ phaseSeconds, progress });
  const response = riggingTensionResponse({
    phaseSeconds,
    progress,
    durationSeconds,
  });

  assert.equal(response.driverId, 'heavyPhysical');
  assert.equal(response.currentDriver.driverId, currentDriver.driverId);
  approximatelyEqual(response.currentDriver.heaveY, currentDriver.heaveY);
  approximatelyEqual(response.currentDriver.rollDegrees, currentDriver.rollDegrees);
  approximatelyEqual(response.lagSeconds, RIGGING_LAG_SECONDS);
  approximatelyEqual(
    response.delayedDriver.phaseSeconds,
    phaseSeconds - RIGGING_LAG_SECONDS,
  );
  assert.ok(
    Math.abs(response.secondary.heave) > 0.05 ||
      Math.abs(response.secondary.rollDegrees) > 0.001,
    'A representative sample must contain a measurable delayed response rather than copying the vessel transform exactly.',
  );
  assert.ok(Math.abs(response.x) <= 1.35, 'Rigging lateral lag must remain bounded.');
  assert.ok(
    Math.abs(response.rotationDegrees) < 0.2,
    'Rigging rotation must remain restrained rather than becoming theatrical.',
  );
});

test('ACTIVE LEVEL 2 RIGGING GATE: renderer uses the vessel-driven delayed rigging response and no legacy oscillator', async () => {
  const source = await readFile(rendererPath, 'utf8');
  const branch = riggingBranch(source);

  assert.match(
    source,
    /const vesselDriver = heavyPhysicalDriver\(/,
    'The rigid vessel must use the same heavyPhysical driver that feeds secondary motion.',
  );
  assert.match(
    branch,
    /const vesselDrivenRigging = riggingTensionResponse\(/,
    'riggingTension must derive its transform from the delayed vessel response model.',
  );
  assert.match(
    branch,
    /durationSeconds: shot\.durationFrames \/ fps/,
    'The lag model must receive shot duration so delayed settling remains time-aware.',
  );
  assert.doesNotMatch(
    branch,
    /Math\.sin\(phase \* 0\.61 \+ 0\.9\)|Math\.sin\(phase \* 0\.43 \+ 0\.4\)/,
    'The legacy independent rigging oscillator must not return.',
  );
});
