import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getLocalRenderProfile,
  remotionPerformanceArgs,
} from './local-render-profile';

const STARTUP_PROFILE = {
  schemaVersion: 1,
  host: 'test-host',
  cpu: { logicalCount: 24 },
  memory: { totalGb: 64 },
  runtimePlan: {
    remotion: {
      concurrencyPerRender: 8,
      hardwareAcceleration: 'if-possible' as const,
      gl: 'angle',
    },
  },
};

test('local render profile accepts explicit concurrency and hardware overrides', () => {
  const profile = getLocalRenderProfile(
    {
      ANIMATION_RENDER_CONCURRENCY: '12',
      ANIMATION_HARDWARE_ACCELERATION: 'disable',
      ANIMATION_REMOTION_GL: 'vulkan',
    },
    STARTUP_PROFILE,
  );

  assert.equal(profile.concurrency, 12);
  assert.equal(profile.hardwareAcceleration, 'disable');
  assert.equal(profile.gl, 'vulkan');
  assert.equal(profile.source, 'environment');
  assert.deepEqual(remotionPerformanceArgs(profile), [
    '--concurrency=12',
    '--hardware-acceleration=disable',
    '--gl=vulkan',
  ]);
});

test('local render profile uses persisted startup recommendations when no override exists', () => {
  const profile = getLocalRenderProfile({}, STARTUP_PROFILE);

  assert.equal(profile.logicalCpuCount, 24);
  assert.equal(profile.totalMemoryGb, 64);
  assert.equal(profile.concurrency, 8);
  assert.equal(profile.hardwareAcceleration, 'if-possible');
  assert.equal(profile.gl, 'angle');
  assert.equal(profile.source, 'startup-profile');
});

test('local render profile rejects invalid concurrency', () => {
  assert.throws(
    () => getLocalRenderProfile({ ANIMATION_RENDER_CONCURRENCY: '0' }, STARTUP_PROFILE),
    /must be a positive integer/,
  );
});
