import {
  createEnkiNeutralRigContract,
  ENKI_RIVE_NEUTRAL_GATE_ID,
  evaluateRiveNeutralFrame,
  RIVE_WEB_RUNTIME_ADOPTION_CANDIDATE,
  type RiveNeutralSourceReceipt,
} from './rive-neutral-contract';

const SOURCE: RiveNeutralSourceReceipt = Object.freeze({
  actorId: 'actor:enki',
  sourceAssetId: 'shot03-recovered-enki-v1',
  sourceSha256:
    'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  width: 941,
  height: 1672,
  copiedSourcePixels: true,
  generatedPixels: false,
  canonicalMutation: false,
});

describe('Animation Rive ENKI-RIG-0 neutral identity contract', () => {
  it('pins the adoption candidate without pretending the runtime is installed', () => {
    expect(RIVE_WEB_RUNTIME_ADOPTION_CANDIDATE).toMatchObject({
      packageName: '@rive-app/webgl2',
      version: '2.40.1',
      license: 'MIT',
      dependencyInstalled: false,
    });
  });

  it('creates a neutral-only contract with no autonomous playback', () => {
    const contract = createEnkiNeutralRigContract(SOURCE);

    expect(contract.gateId).toBe(ENKI_RIVE_NEUTRAL_GATE_ID);
    expect(contract.runtime).toMatchObject({
      autoplay: false,
      autonomousClockAllowed: false,
      frameAuthority: 'scene-v3-frame-context',
    });
    expect(contract.neutral.animatedChannels).toHaveLength(0);
    expect(contract.neutral.stateMachineName).toBeNull();
    expect(contract.promotion).toMatchObject({
      automatic: false,
      humanIdentityApprovalRequired: true,
      motionAuthoringAllowedBeforeNeutralApproval: false,
    });
  });

  it('keeps rig time frozen while preserving exact Scene V3 story-frame metadata', () => {
    const contract = createEnkiNeutralRigContract(SOURCE);
    const start = evaluateRiveNeutralFrame(contract, 0, 30, 210);
    const middle = evaluateRiveNeutralFrame(contract, 101, 30, 210);
    const end = evaluateRiveNeutralFrame(contract, 209, 30, 210);

    expect(start).toMatchObject({ rigTimeSeconds: 0, activeAnimationCount: 0 });
    expect(middle.rigTimeSeconds).toBe(0);
    expect(end.rigTimeSeconds).toBe(0);
    expect(start.storyTimeSeconds).toBe(0);
    expect(middle.storyTimeSeconds).toBeCloseTo(101 / 30, 12);
    expect(end.storyTimeSeconds).toBeCloseTo(209 / 30, 12);
  });

  it('rejects generated or canonical-mutating neutral source receipts', () => {
    expect(() =>
      createEnkiNeutralRigContract({
        ...SOURCE,
        generatedPixels: true,
      } as unknown as RiveNeutralSourceReceipt),
    ).toThrow(/generated pixels/i);

    expect(() =>
      createEnkiNeutralRigContract({
        ...SOURCE,
        canonicalMutation: true,
      } as unknown as RiveNeutralSourceReceipt),
    ).toThrow(/canonical assets/i);
  });
});
