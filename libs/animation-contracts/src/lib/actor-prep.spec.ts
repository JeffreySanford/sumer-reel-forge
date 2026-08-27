import {
  validateActorPrepDefinition,
  type ActorPrepDefinition,
} from './actor-prep';

function validDefinition(): ActorPrepDefinition {
  return {
    schemaVersion: 1,
    id: 'actor-prep:enki:v1',
    actorId: 'actor:enki',
    revision: 1,
    source: {
      assetId: 'shot03-recovered-enki-v1',
      sha256: 'sha256:d19ff6b4810a6fad5b8ce41232e07d7fc0f72923799e195df1596f53f4239f07',
      width: 941,
      height: 1672,
      registration: 'source-frame-top-left',
      canonicalPromotion: false,
    },
    automation: {
      headlessDefault: true,
      recurringManualEditorAllowed: false,
      humanReviewRole: 'accept-reject',
      failedAutomationPolicy: 'reject-or-fallback',
    },
    regions: [
      {
        id: 'region:enki:face',
        semanticRole: 'face',
        status: 'pending-auto-discovery',
        sourceBackedRequired: true,
        identitySensitive: true,
      },
    ],
    anchors: [
      {
        id: 'anchor:enki:head-center',
        semanticRole: 'head-center',
        status: 'pending-auto-discovery',
      },
    ],
    backendCandidates: [
      {
        id: 'backend:native-source-regions',
        backendClass: 'deterministic-procedural',
        status: 'preferred',
        headlessRequired: true,
        recurringManualEditorAllowed: false,
        liveStoryTimeAuthorityAllowed: false,
        licenseEvidenceRequired: false,
      },
      {
        id: 'backend:liveportrait-baked-face',
        backendClass: 'baked-generative',
        status: 'license-blocked',
        headlessRequired: true,
        recurringManualEditorAllowed: false,
        liveStoryTimeAuthorityAllowed: false,
        licenseEvidenceRequired: true,
      },
    ],
  };
}

describe('ActorPrepDefinition', () => {
  it('accepts a source-bound headless actor preparation contract', () => {
    expect(() => validateActorPrepDefinition(validDefinition())).not.toThrow();
  });

  it('rejects recurring manual editor work as a default production dependency', () => {
    const definition = validDefinition();
    const invalid = {
      ...definition,
      automation: {
        ...definition.automation,
        recurringManualEditorAllowed: true,
      },
    } as unknown as ActorPrepDefinition;
    expect(() => validateActorPrepDefinition(invalid)).toThrow(/manual editor/i);
  });

  it('rejects actor backends that can own live story time', () => {
    const definition = validDefinition();
    const backend = { ...definition.backendCandidates[0], liveStoryTimeAuthorityAllowed: true };
    const invalid = {
      ...definition,
      backendCandidates: [backend],
    } as unknown as ActorPrepDefinition;
    expect(() => validateActorPrepDefinition(invalid)).toThrow(/story time/i);
  });

  it('requires license evidence for a license-blocked backend', () => {
    const definition = validDefinition();
    const backend = {
      ...definition.backendCandidates[1],
      licenseEvidenceRequired: false,
    };
    const invalid = {
      ...definition,
      backendCandidates: [backend],
    } as unknown as ActorPrepDefinition;
    expect(() => validateActorPrepDefinition(invalid)).toThrow(/license evidence/i);
  });

  it('rejects duplicate semantic region IDs', () => {
    const definition = validDefinition();
    const invalid = {
      ...definition,
      regions: [definition.regions[0], definition.regions[0]],
    };
    expect(() => validateActorPrepDefinition(invalid)).toThrow(/Duplicate actor-prep region/i);
  });
});
