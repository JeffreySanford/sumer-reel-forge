import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function loadReelOnePolicy(root = process.cwd()) {
  return JSON.parse(
    await readFile(
      resolve(root, 'tools/creative/reel-01-quality-policy.json'),
      'utf8',
    ),
  );
}

export function validateReelSceneStructure(scene, policy) {
  const errors = [];
  const format = policy.format;

  if (scene.width !== format.width || scene.height !== format.height) {
    errors.push(`Expected ${format.width}x${format.height} vertical output.`);
  }
  if (scene.fps !== format.fps) {
    errors.push(`Expected ${format.fps} fps.`);
  }
  if (scene.durationFrames !== format.durationFrames) {
    errors.push(`Expected ${format.durationFrames} total frames.`);
  }
  if (!Array.isArray(scene.shots) || scene.shots.length !== format.shotCount) {
    errors.push(`Expected exactly ${format.shotCount} shots.`);
  } else {
    let nextFrame = 0;
    for (const shot of scene.shots) {
      if (shot.startFrame !== nextFrame) {
        errors.push(`Shot ${shot.id} must start at frame ${nextFrame}.`);
      }
      if (!Number.isInteger(shot.endFrame) || shot.endFrame < shot.startFrame) {
        errors.push(`Shot ${shot.id} has an invalid end frame.`);
        continue;
      }
      const frameCount = shot.endFrame - shot.startFrame + 1;
      const expectedFrames = shot.durationSeconds * format.fps;
      if (frameCount !== expectedFrames) {
        errors.push(
          `Shot ${shot.id} has ${frameCount} frames but durationSeconds implies ${expectedFrames}.`,
        );
      }
      nextFrame = shot.endFrame + 1;
    }
    if (nextFrame !== format.durationFrames) {
      errors.push('Shots do not cover the complete reel duration exactly once.');
    }
  }

  if (!Array.isArray(scene.captions) || scene.captions.length === 0) {
    errors.push('Captions are required.');
  } else {
    let nextCaptionFrame = 0;
    for (const caption of scene.captions) {
      if (caption.startFrame !== nextCaptionFrame) {
        errors.push(`Caption starting at ${caption.startFrame} leaves a timing gap or overlap.`);
      }
      if (caption.endFrame < caption.startFrame) {
        errors.push('Caption endFrame must not precede startFrame.');
      }
      if (wordCount(caption.text) > format.maxCaptionWords) {
        errors.push(
          `Caption exceeds ${format.maxCaptionWords} words: ${caption.text}`,
        );
      }
      nextCaptionFrame = caption.endFrame + 1;
    }
    if (nextCaptionFrame !== format.durationFrames) {
      errors.push('Captions must cover the complete reel duration.');
    }
  }

  if (!String(scene.sourcePolicy ?? '').toLowerCase().includes('no source')) {
    errors.push('Scene must explicitly preserve source/story text.');
  }
  if (!(scene.animationChannels ?? []).includes('safe-area-captions')) {
    errors.push('Scene must preserve safe-area captions.');
  }

  return errors;
}

export function validateCreativeCandidate(candidate, policy) {
  const errors = [];
  const review = policy.review;
  const motion = policy.motion;
  const shotPolicy = policy.shots[candidate.shotId] ?? {};

  if (candidate.humanApprovalRequired !== review.humanApprovalRequired) {
    errors.push('Human approval must remain required.');
  }

  const markers = candidate.reviewMarkers ?? [];
  if (JSON.stringify(markers) !== JSON.stringify(review.markers)) {
    errors.push('Candidate must expose the standard 0/25/50/75/100 review markers.');
  }

  const scaleFrom = candidate.camera?.scaleFrom;
  const scaleTo = candidate.camera?.scaleTo;
  if (!Number.isFinite(scaleFrom) || !Number.isFinite(scaleTo)) {
    errors.push('Candidate camera scale values must be finite numbers.');
  } else {
    const delta = Math.abs(scaleTo - scaleFrom);
    const maxDelta =
      shotPolicy.maxCameraScaleDelta ?? motion.maxDefaultCameraScaleDelta;
    if (delta > maxDelta + Number.EPSILON) {
      errors.push(
        `Camera scale delta ${delta.toFixed(4)} exceeds ${maxDelta.toFixed(4)} for ${candidate.shotId}.`,
      );
    }
  }

  if (motion.onePrimaryMotion && !candidate.motionBudget?.primary) {
    errors.push('Exactly one primary motion must be identified.');
  }

  const environment = candidate.motionBudget?.environment ?? [];
  if (environment.length > motion.maxEnvironmentChannels) {
    errors.push(
      `Environment motion exceeds the ${motion.maxEnvironmentChannels}-channel default budget.`,
    );
  }

  if (candidate.narratorOnly && candidate.lipSync !== motion.narratorOnlyLipSync) {
    errors.push('Narrator-only shots must not enable lip sync.');
  }

  if (
    shotPolicy.stillnessAnchor &&
    candidate.stillnessAnchor !== shotPolicy.stillnessAnchor
  ) {
    errors.push(
      `Stillness anchor for ${candidate.shotId} must remain ${shotPolicy.stillnessAnchor}.`,
    );
  }

  if (
    Number.isInteger(shotPolicy.maxBlinkCount) &&
    (candidate.blinkCount ?? 0) > shotPolicy.maxBlinkCount
  ) {
    errors.push(
      `${candidate.shotId} allows at most ${shotPolicy.maxBlinkCount} blink(s).`,
    );
  }

  const styleRules = new Set(candidate.inheritedStyleRules ?? []);
  for (const requiredRule of shotPolicy.requiredStyleRules ?? []) {
    if (!styleRules.has(requiredRule)) {
      errors.push(`Missing required inherited style rule: ${requiredRule}`);
    }
  }

  if (shotPolicy.revealMode && candidate.revealMode !== shotPolicy.revealMode) {
    errors.push(
      `${candidate.shotId} must use revealMode=${shotPolicy.revealMode}.`,
    );
  }

  const treatments = new Set(candidate.treatments ?? []);
  for (const forbidden of shotPolicy.forbiddenTreatments ?? []) {
    if (treatments.has(forbidden)) {
      errors.push(`Forbidden treatment for ${candidate.shotId}: ${forbidden}`);
    }
  }

  return errors;
}

function wordCount(text) {
  return String(text ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}
