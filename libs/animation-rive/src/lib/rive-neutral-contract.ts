export const ENKI_RIVE_NEUTRAL_GATE_ID = 'ENKI-RIG-0' as const;

export const RIVE_WEB_RUNTIME_ADOPTION_CANDIDATE = Object.freeze({
  packageName: '@rive-app/webgl2',
  version: '2.40.1',
  license: 'MIT',
  verifiedAt: '2026-08-26',
  dependencyInstalled: false,
  rationale:
    'Rive currently recommends the WebGL2 web runtime for most projects; dependency installation is deferred until an approved .riv neutral candidate exists.',
});

export interface RiveNeutralSourceReceipt {
  readonly actorId: 'actor:enki';
  readonly sourceAssetId: string;
  readonly sourceSha256: string;
  readonly width: number;
  readonly height: number;
  readonly copiedSourcePixels: true;
  readonly generatedPixels: false;
  readonly canonicalMutation: false;
}

export interface RiveNeutralRigContract {
  readonly schemaVersion: 1;
  readonly gateId: typeof ENKI_RIVE_NEUTRAL_GATE_ID;
  readonly actorId: 'actor:enki';
  readonly rigId: 'rig:enki:neutral:v1';
  readonly source: RiveNeutralSourceReceipt;
  readonly runtime: {
    readonly packageName: '@rive-app/webgl2';
    readonly versionCandidate: string;
    readonly autoplay: false;
    readonly autonomousClockAllowed: false;
    readonly frameAuthority: 'scene-v3-frame-context';
  };
  readonly neutral: {
    readonly expectedRigFile: 'enki-neutral-v1.riv';
    readonly artboardName: 'Enki';
    readonly stateMachineName: null;
    readonly animatedChannels: readonly [];
    readonly identityMutationAllowed: false;
  };
  readonly promotion: {
    readonly automatic: false;
    readonly humanIdentityApprovalRequired: true;
    readonly motionAuthoringAllowedBeforeNeutralApproval: false;
  };
}

export interface RiveNeutralFrameState {
  readonly gateId: typeof ENKI_RIVE_NEUTRAL_GATE_ID;
  readonly actorId: 'actor:enki';
  readonly frame: number;
  readonly storyTimeSeconds: number;
  readonly rigTimeSeconds: 0;
  readonly autoplay: false;
  readonly activeAnimationCount: 0;
  readonly activeStateMachineCount: 0;
}

export function createEnkiNeutralRigContract(
  source: RiveNeutralSourceReceipt,
): RiveNeutralRigContract {
  validateNeutralSourceReceipt(source);
  return Object.freeze({
    schemaVersion: 1 as const,
    gateId: ENKI_RIVE_NEUTRAL_GATE_ID,
    actorId: 'actor:enki' as const,
    rigId: 'rig:enki:neutral:v1' as const,
    source: Object.freeze({ ...source }),
    runtime: Object.freeze({
      packageName: '@rive-app/webgl2' as const,
      versionCandidate: RIVE_WEB_RUNTIME_ADOPTION_CANDIDATE.version,
      autoplay: false as const,
      autonomousClockAllowed: false as const,
      frameAuthority: 'scene-v3-frame-context' as const,
    }),
    neutral: Object.freeze({
      expectedRigFile: 'enki-neutral-v1.riv' as const,
      artboardName: 'Enki' as const,
      stateMachineName: null,
      animatedChannels: Object.freeze([]) as readonly [],
      identityMutationAllowed: false as const,
    }),
    promotion: Object.freeze({
      automatic: false as const,
      humanIdentityApprovalRequired: true as const,
      motionAuthoringAllowedBeforeNeutralApproval: false as const,
    }),
  });
}

export function evaluateRiveNeutralFrame(
  contract: RiveNeutralRigContract,
  frame: number,
  fps: number,
  durationFrames: number,
): RiveNeutralFrameState {
  validateNeutralContract(contract);
  if (!Number.isInteger(frame) || frame < 0 || frame >= durationFrames) {
    throw new Error('Rive neutral frame must be an in-range non-negative integer.');
  }
  if (!Number.isFinite(fps) || fps <= 0) {
    throw new Error('Rive neutral fps must be positive.');
  }
  if (!Number.isInteger(durationFrames) || durationFrames <= 0) {
    throw new Error('Rive neutral durationFrames must be a positive integer.');
  }

  return Object.freeze({
    gateId: ENKI_RIVE_NEUTRAL_GATE_ID,
    actorId: 'actor:enki' as const,
    frame,
    storyTimeSeconds: frame / fps,
    rigTimeSeconds: 0 as const,
    autoplay: false as const,
    activeAnimationCount: 0 as const,
    activeStateMachineCount: 0 as const,
  });
}

export function validateNeutralSourceReceipt(
  source: RiveNeutralSourceReceipt,
): void {
  if (source.actorId !== 'actor:enki') {
    throw new Error('Rive neutral source must belong to actor:enki.');
  }
  if (!source.sourceAssetId.trim()) {
    throw new Error('Rive neutral sourceAssetId must not be empty.');
  }
  if (!/^sha256:[0-9a-f]{64}$/i.test(source.sourceSha256)) {
    throw new Error('Rive neutral source SHA must be a sha256-prefixed 64-character digest.');
  }
  if (!Number.isInteger(source.width) || source.width <= 0) {
    throw new Error('Rive neutral source width must be a positive integer.');
  }
  if (!Number.isInteger(source.height) || source.height <= 0) {
    throw new Error('Rive neutral source height must be a positive integer.');
  }
  if (source.copiedSourcePixels !== true) {
    throw new Error('Rive neutral source must preserve copied source pixels.');
  }
  if (source.generatedPixels !== false) {
    throw new Error('Rive neutral source cannot contain generated pixels.');
  }
  if (source.canonicalMutation !== false) {
    throw new Error('Rive neutral source cannot mutate canonical assets.');
  }
}

function validateNeutralContract(contract: RiveNeutralRigContract): void {
  validateNeutralSourceReceipt(contract.source);
  if (contract.gateId !== ENKI_RIVE_NEUTRAL_GATE_ID) {
    throw new Error(`Unexpected Rive neutral gate ${String(contract.gateId)}.`);
  }
  if (contract.runtime.autoplay !== false) {
    throw new Error('Rive neutral runtime must keep autoplay disabled.');
  }
  if (contract.runtime.autonomousClockAllowed !== false) {
    throw new Error('Rive neutral runtime cannot own an autonomous clock.');
  }
  if (contract.neutral.animatedChannels.length !== 0) {
    throw new Error('ENKI-RIG-0 cannot contain animated channels.');
  }
  if (contract.promotion.motionAuthoringAllowedBeforeNeutralApproval !== false) {
    throw new Error('Motion authoring must remain blocked until neutral identity is approved.');
  }
}
