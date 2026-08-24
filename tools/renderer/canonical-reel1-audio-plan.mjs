export const REEL_DURATION_SECONDS = 60;
export const FINAL_TITLE_HOLD_SECONDS = 3;
export const MIN_PACE_TEMPO = 0.72;

export const CANONICAL_REEL1_NARRATION_CUES = [
  {
    index: 1,
    startSeconds: 0.7,
    targetDurationSeconds: 7.2,
    text: 'Before Sumer rose from the marsh, Enki sailed along the coast in a little boat called the Stag of the Absu.',
  },
  {
    index: 2,
    startSeconds: 8.4,
    targetDurationSeconds: 5.5,
    text: 'The sea stretched around him like the body of Nammu, his mother, endless and alive.',
  },
  {
    index: 3,
    startSeconds: 14.5,
    targetDurationSeconds: 6,
    text: 'He thought he was only wandering toward Dilmun, following a map his brother Enlil had given him.',
  },
  {
    index: 4,
    startSeconds: 21.2,
    targetDurationSeconds: 3.8,
    text: 'But from beneath the waves, a voice came to him.',
  },
  {
    index: 5,
    startSeconds: 28.3,
    targetDurationSeconds: 8,
    text: 'Establish water in this land. Build shrines for travelers. Let no one say, I am thirsty. Let no one say, I am hungry.',
  },
  {
    index: 6,
    startSeconds: 38,
    targetDurationSeconds: 5.7,
    text: 'Protect the fool and the wise alike. Carry truth, justice, and freedom into the world.',
  },
  {
    index: 7,
    startSeconds: 46,
    targetDurationSeconds: 5.1,
    text: 'As the shoreline drew near, Enki understood the voyage was not an escape.',
  },
  {
    index: 8,
    startSeconds: 54,
    targetDurationSeconds: 3,
    text: 'It was the beginning of civilization.',
  },
];

export function normalizeNarration(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function paceTempoForTarget(
  naturalDurationSeconds,
  targetDurationSeconds,
  minimumTempo = MIN_PACE_TEMPO,
) {
  if (!Number.isFinite(naturalDurationSeconds) || naturalDurationSeconds <= 0) {
    throw new Error('Natural narration duration must be a positive number.');
  }
  if (!Number.isFinite(targetDurationSeconds) || targetDurationSeconds <= 0) {
    throw new Error('Target narration duration must be a positive number.');
  }
  if (!Number.isFinite(minimumTempo) || minimumTempo <= 0 || minimumTempo > 1) {
    throw new Error('Minimum narration tempo must be greater than zero and at most one.');
  }

  if (naturalDurationSeconds >= targetDurationSeconds) {
    return 1;
  }
  return Math.max(minimumTempo, naturalDurationSeconds / targetDurationSeconds);
}

export function assertCanonicalNarrationPlan(sourceNarration) {
  const joinedNarration = normalizeNarration(
    CANONICAL_REEL1_NARRATION_CUES.map((cue) => cue.text).join(' '),
  );
  const normalizedSource = normalizeNarration(sourceNarration);
  if (joinedNarration !== normalizedSource) {
    throw new Error(
      'Canonical Reel 1 narration cue plan must preserve the production narration exactly.',
    );
  }

  for (const [position, cue] of CANONICAL_REEL1_NARRATION_CUES.entries()) {
    if (cue.index !== position + 1) {
      throw new Error('Canonical Reel 1 narration cue indexes must be sequential.');
    }
    if (cue.startSeconds < 0 || cue.targetDurationSeconds <= 0) {
      throw new Error('Canonical Reel 1 narration cue timing must be positive.');
    }
    const targetEndSeconds = cue.startSeconds + cue.targetDurationSeconds;
    const nextCue = CANONICAL_REEL1_NARRATION_CUES[position + 1];
    if (nextCue && targetEndSeconds > nextCue.startSeconds) {
      throw new Error(`Canonical Reel 1 narration cue ${cue.index} overlaps cue ${nextCue.index}.`);
    }
  }

  const lastCue = CANONICAL_REEL1_NARRATION_CUES.at(-1);
  const targetNarrationEndSeconds =
    lastCue.startSeconds + lastCue.targetDurationSeconds;
  const titleHoldStartSeconds = REEL_DURATION_SECONDS - FINAL_TITLE_HOLD_SECONDS;
  if (targetNarrationEndSeconds > titleHoldStartSeconds) {
    throw new Error(
      'Canonical Reel 1 narration must leave the final title hold free of speech.',
    );
  }

  return {
    cueCount: CANONICAL_REEL1_NARRATION_CUES.length,
    targetNarrationEndSeconds,
    titleHoldStartSeconds,
  };
}
