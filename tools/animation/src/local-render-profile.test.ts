import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getLocalRenderProfile,
  remotionPerformanceArgs,
} from './local-render-profile';

test('local render profile accepts explicit concurrency and hardware overrides', () => {
  const profile = getLocalRenderProfile({
    ANIMATION_RENDER_CONCURRENCY: '12',
    ANIMATION_HARDWARE_ACCELERATION: 'disable',
    ANIMATION_REMOTION_GL: 'vulkan',
  });

  assert.equal(profile.concurrency, 12);
  assert.equal(profile.hardwareAcceleration, 'disable');
  assert.equal(profile.gl, 'vulkan');
  assert.deepEqual(remotionPerformanceArgs(profile), [
    '--concurrency=12',
    '--hardware-acceleration=disable',
    '--gl=vulkan',
  ]);
});

test('local render profile rejects invalid concurrency', () => {
  assert.throws(
    () => getLocalRenderProfile({ ANIMATION_RENDER_CONCURRENCY: '0' }),
    /must be a positive integer/,
  );
});
