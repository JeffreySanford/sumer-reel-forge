const HEAVY_PHYSICAL_FREQUENCY_HZ = 0.54;
const HEAVE_AMPLITUDE_PX = 1.7;
const ROLL_AMPLITUDE_DEGREES = 0.045;
const ROLL_PHASE_CYCLES = 0.18;

export const RIGGING_LAG_SECONDS = 0.24;

export function heavyPhysicalDriver({ phaseSeconds, progress }) {
  const settleWeight = settleWeightForProgress(progress);
  return {
    driverId: 'heavyPhysical',
    phaseSeconds,
    heaveY:
      Math.sin(phaseSeconds * HEAVY_PHYSICAL_FREQUENCY_HZ * Math.PI * 2) *
      HEAVE_AMPLITUDE_PX *
      settleWeight,
    rollDegrees:
      Math.sin(
        (phaseSeconds * HEAVY_PHYSICAL_FREQUENCY_HZ + ROLL_PHASE_CYCLES) *
          Math.PI *
          2,
      ) *
      ROLL_AMPLITUDE_DEGREES *
      settleWeight,
    settleWeight,
  };
}

export function riggingTensionResponse({
  phaseSeconds,
  progress,
  durationSeconds,
  lagSeconds = RIGGING_LAG_SECONDS,
}) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error('riggingTensionResponse requires a positive durationSeconds.');
  }
  if (!Number.isFinite(lagSeconds) || lagSeconds <= 0 || lagSeconds >= 0.5) {
    throw new Error('riggingTensionResponse lagSeconds must be > 0 and < 0.5.');
  }

  const currentDriver = heavyPhysicalDriver({ phaseSeconds, progress });
  const delayedPhaseSeconds = Math.max(0, phaseSeconds - lagSeconds);
  const delayedProgress = clamp(
    progress - lagSeconds / durationSeconds,
    0,
    1,
  );
  const delayedDriver = heavyPhysicalDriver({
    phaseSeconds: delayedPhaseSeconds,
    progress: delayedProgress,
  });

  const lagHeave = delayedDriver.heaveY - currentDriver.heaveY;
  const lagRoll = delayedDriver.rollDegrees - currentDriver.rollDegrees;

  return {
    driverId: currentDriver.driverId,
    lagSeconds,
    currentDriver,
    delayedDriver,
    x: clamp(lagHeave * 0.62 + lagRoll * 7.5, -1.35, 1.35),
    y: currentDriver.heaveY * 0.92 + lagHeave * 0.18,
    rotationDegrees:
      currentDriver.rollDegrees * 0.72 + lagRoll * 2.15,
    secondary: {
      heave: lagHeave,
      rollDegrees: lagRoll,
    },
  };
}

function settleWeightForProgress(progress) {
  const safeProgress = clamp(progress, 0, 1);
  if (safeProgress <= 0.8) return 1;
  return clamp(1 - (safeProgress - 0.8) / 0.2, 0, 1);
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}
