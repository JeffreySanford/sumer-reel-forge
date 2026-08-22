import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  loadReelOnePolicy,
  validateCreativeCandidate,
  validateReelSceneStructure,
} from './creative-quality.mjs';

const root = process.cwd();
const policy = await loadReelOnePolicy(root);

test('current Reel 1 technical scene remains structurally valid', async () => {
  const scene = JSON.parse(
    await readFile(
      resolve(root, 'tools/animation/scenes/reel-01-full-animation.scene.json'),
      'utf8',
    ),
  );

  assert.deepEqual(validateReelSceneStructure(scene, policy), []);
});

test('Enki benchmark candidate passes restrained physical-motion rules', () => {
  const candidate = {
    shotId: 'enki-at-the-helm',
    humanApprovalRequired: true,
    reviewMarkers: [0, 0.25, 0.5, 0.75, 1],
    camera: { scaleFrom: 1, scaleTo: 1.025 },
    motionBudget: {
      primary: 'slowPush',
      environment: ['waterPulse', 'riggingTension'],
    },
    narratorOnly: true,
    lipSync: false,
    stillnessAnchor: 'enki-facial-identity',
    blinkCount: 1,
    inheritedStyleRules: [
      'narratorOnly.lipSync = false',
      'foregroundOcclusion.mustAvoid = face,captions',
    ],
  };

  assert.deepEqual(validateCreativeCandidate(candidate, policy), []);
});

test('Enki benchmark rejects an obvious zoom and excessive performance', () => {
  const candidate = {
    shotId: 'enki-at-the-helm',
    humanApprovalRequired: true,
    reviewMarkers: [0, 0.25, 0.5, 0.75, 1],
    camera: { scaleFrom: 1, scaleTo: 1.12 },
    motionBudget: {
      primary: 'slowPush',
      environment: ['waterPulse', 'riggingTension', 'mistDrift'],
    },
    narratorOnly: true,
    lipSync: true,
    stillnessAnchor: 'moving-face',
    blinkCount: 4,
    inheritedStyleRules: [],
  };

  const errors = validateCreativeCandidate(candidate, policy);
  assert.ok(errors.some((error) => error.includes('Camera scale delta')));
  assert.ok(errors.some((error) => error.includes('Environment motion')));
  assert.ok(errors.some((error) => error.includes('lip sync')));
  assert.ok(errors.some((error) => error.includes('Stillness anchor')));
  assert.ok(errors.some((error) => error.includes('at most 1 blink')));
  assert.ok(errors.some((error) => error.includes('Missing required inherited style rule')));
});

test('Nammu benchmark passes restrained numinous rules', () => {
  const candidate = {
    shotId: 'nammu-under-water',
    humanApprovalRequired: true,
    reviewMarkers: [0, 0.25, 0.5, 0.75, 1],
    camera: { scaleFrom: 1, scaleTo: 1.008 },
    motionBudget: {
      primary: 'numinousDrift',
      environment: ['physicalWater', 'suspendedParticles'],
    },
    narratorOnly: true,
    lipSync: false,
    stillnessAnchor: 'camera-composition',
    revealMode: 'environmental-coherence',
    treatments: ['refraction', 'negative-space', 'light-contour'],
  };

  assert.deepEqual(validateCreativeCandidate(candidate, policy), []);
});

test('Nammu benchmark rejects generic fantasy apparition language', () => {
  const candidate = {
    shotId: 'nammu-under-water',
    humanApprovalRequired: false,
    reviewMarkers: [0, 0.5, 1],
    camera: { scaleFrom: 1, scaleTo: 1.06 },
    motionBudget: {
      primary: 'zoom',
      environment: ['particles'],
    },
    narratorOnly: true,
    lipSync: false,
    stillnessAnchor: 'nammu-face',
    revealMode: 'literal-fade',
    treatments: ['mermaid', 'glowing-eyes', 'particle-explosion'],
  };

  const errors = validateCreativeCandidate(candidate, policy);
  assert.ok(errors.some((error) => error.includes('Human approval')));
  assert.ok(errors.some((error) => error.includes('review markers')));
  assert.ok(errors.some((error) => error.includes('Camera scale delta')));
  assert.ok(errors.some((error) => error.includes('Stillness anchor')));
  assert.ok(errors.some((error) => error.includes('revealMode')));
  assert.ok(errors.some((error) => error.includes('Forbidden treatment')));
});
