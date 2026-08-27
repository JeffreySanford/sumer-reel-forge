import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyHardwareProfileEnvironment,
  deriveRuntimePlan,
} from '../runtime/hardware-profile.mjs';

function profile({
  cpu = 24,
  memory = 64,
  vramMb = 10240,
  nvidia = true,
  nvenc = true,
  ollama = true,
  platform = 'win32',
} = {}) {
  return {
    platform,
    cpu: { logicalCount: cpu },
    memory: { totalGb: memory },
    gpu: {
      nvidiaSmiAvailable: nvidia,
      devices: vramMb
        ? [
            {
              vendor: nvidia ? 'NVIDIA' : 'AMD',
              name: 'Test GPU',
              memoryTotalMb: vramMb,
            },
          ]
        : [],
    },
    media: {
      ffmpegAvailable: true,
      encoders: { h264Nvenc: nvenc },
    },
    ollama: { online: ollama, models: [] },
  };
}

test('10GB workstation profile keeps automatic Ollama review concurrency at one', () => {
  const input = profile();
  const plan = deriveRuntimePlan(input, {});

  assert.equal(plan.tier, 'workstation');
  assert.equal(plan.remotion.parallelRenders, 2);
  assert.equal(plan.remotion.concurrencyPerRender, 8);
  assert.equal(plan.remotion.hardwareAcceleration, 'if-possible');
  assert.equal(plan.remotion.gl, 'angle');
  assert.equal(plan.ai.nvidiaCudaAvailable, true);
  assert.equal(plan.ai.ollamaReviewConcurrency, 1);
  assert.equal(plan.ai.comfyConcurrency, 1);
  assert.equal(plan.ai.comfyVramMode, 'normalvram');
  assert.equal(plan.ai.chatterboxDevice, 'cuda');
  assert.equal(plan.encoding.preferredH264Encoder, 'h264_nvenc');
  assert.equal(plan.reserves.logicalCpuReserved, 4);
});

test('larger VRAM tiers can increase automatic Ollama review concurrency', () => {
  assert.equal(
    deriveRuntimePlan(profile({ vramMb: 16 * 1024 }), {}).ai
      .ollamaReviewConcurrency,
    2,
  );
  assert.equal(
    deriveRuntimePlan(profile({ vramMb: 24 * 1024 }), {}).ai
      .ollamaReviewConcurrency,
    3,
  );
});

test('smaller profile scales down without assuming a GPU', () => {
  const input = profile({
    cpu: 4,
    memory: 8,
    vramMb: 0,
    nvidia: false,
    nvenc: false,
    ollama: false,
    platform: 'linux',
  });
  const plan = deriveRuntimePlan(input, {});

  assert.equal(plan.tier, 'standard');
  assert.equal(plan.remotion.parallelRenders, 1);
  assert.equal(plan.remotion.concurrencyPerRender, 2);
  assert.equal(plan.remotion.gl, undefined);
  assert.equal(plan.ai.nvidiaCudaAvailable, false);
  assert.equal(plan.ai.ollamaReviewConcurrency, 1);
  assert.equal(plan.ai.comfyVramMode, 'cpu-or-lowvram');
  assert.equal(plan.ai.chatterboxDevice, 'cpu');
  assert.equal(plan.encoding.preferredH264Encoder, 'libx264');
});

test('explicit environment overrides win over autodetected recommendations', () => {
  const input = profile();
  const plan = deriveRuntimePlan(input, {
    ANIMATION_RENDER_CONCURRENCY: '5',
    ANIMATION_PARALLEL_RENDERS: '1',
    ANIMATION_HARDWARE_ACCELERATION: 'disable',
    ANIMATION_REMOTION_GL: 'vulkan',
    ANIMATION_OLLAMA_REVIEW_CONCURRENCY: '2',
    COMFYUI_MAX_PARALLEL: '3',
  });

  assert.equal(plan.remotion.concurrencyPerRender, 5);
  assert.equal(plan.remotion.parallelRenders, 1);
  assert.equal(plan.remotion.hardwareAcceleration, 'disable');
  assert.equal(plan.remotion.gl, 'vulkan');
  assert.equal(plan.remotion.source, 'environment-override');
  assert.equal(plan.ai.ollamaReviewConcurrency, 2);
  assert.equal(plan.ai.comfyConcurrency, 3);
});

test('startup environment application never overwrites explicit settings', () => {
  const input = profile();
  input.runtimePlan = deriveRuntimePlan(input, {});
  const env = {
    ANIMATION_RENDER_CONCURRENCY: '3',
    CHATTERBOX_DEVICE: 'cpu',
  };

  applyHardwareProfileEnvironment(
    input,
    env,
    'tmp/runtime/hardware-profile.json',
  );

  assert.equal(env.ANIMATION_RENDER_CONCURRENCY, '3');
  assert.equal(env.ANIMATION_PARALLEL_RENDERS, '2');
  assert.equal(env.ANIMATION_HARDWARE_ACCELERATION, 'if-possible');
  assert.equal(env.ANIMATION_REMOTION_GL, 'angle');
  assert.equal(env.ANIMATION_OLLAMA_REVIEW_CONCURRENCY, '1');
  assert.equal(env.COMFYUI_MAX_PARALLEL, '1');
  assert.equal(env.SRF_COMFYUI_VRAM_MODE, 'normalvram');
  assert.equal(env.SRF_PREFERRED_H264_ENCODER, 'h264_nvenc');
  assert.equal(env.CHATTERBOX_DEVICE, 'cpu');
  assert.equal(
    env.SRF_HARDWARE_PROFILE_PATH,
    'tmp/runtime/hardware-profile.json',
  );
});