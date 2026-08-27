export type ActorPrepRegionStatus =
  | 'pending-auto-discovery'
  | 'available'
  | 'unavailable'
  | 'rejected';

export type ActorPrepAnchorStatus =
  | 'pending-auto-discovery'
  | 'available'
  | 'unavailable'
  | 'rejected';

export type ActorPerformanceBackendStatus =
  | 'preferred'
  | 'candidate'
  | 'experimental'
  | 'license-blocked'
  | 'deferred'
  | 'rejected';

export type ActorPerformanceBackendClass =
  | 'deterministic-procedural'
  | 'baked-template'
  | 'baked-generative'
  | 'reusable-rig';

export interface ActorPrepSourceIdentity {
  readonly assetId: string;
  readonly sha256: string;
  readonly width: number;
  readonly height: number;
  readonly registration: string;
  readonly canonicalPromotion: boolean;
}

export interface ActorPrepRegionDefinition {
  readonly id: string;
  readonly semanticRole: string;
  readonly status: ActorPrepRegionStatus;
  readonly sourceBackedRequired: boolean;
  readonly identitySensitive?: boolean;
}

export interface ActorPrepAnchorDefinition {
  readonly id: string;
  readonly semanticRole: string;
  readonly status: ActorPrepAnchorStatus;
}

export interface ActorPerformanceBackendCandidate {
  readonly id: string;
  readonly backendClass: ActorPerformanceBackendClass;
  readonly status: ActorPerformanceBackendStatus;
  readonly headlessRequired: boolean;
  readonly recurringManualEditorAllowed: false;
  readonly liveStoryTimeAuthorityAllowed: false;
  readonly licenseEvidenceRequired: boolean;
  readonly notes?: string;
}

export interface ActorPrepDefinition {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly actorId: string;
  readonly revision: number;
  readonly source: ActorPrepSourceIdentity;
  readonly automation: {
    readonly headlessDefault: true;
    readonly recurringManualEditorAllowed: false;
    readonly humanReviewRole: 'accept-reject';
    readonly failedAutomationPolicy: 'reject-or-fallback';
  };
  readonly regions: readonly ActorPrepRegionDefinition[];
  readonly anchors: readonly ActorPrepAnchorDefinition[];
  readonly backendCandidates: readonly ActorPerformanceBackendCandidate[];
}

export function validateActorPrepDefinition(definition: ActorPrepDefinition): void {
  if (definition.schemaVersion !== 1) {
    throw new Error(`Unsupported ActorPrepDefinition schema ${String(definition.schemaVersion)}.`);
  }
  if (!definition.id.trim() || !definition.actorId.trim()) {
    throw new Error('ActorPrepDefinition id and actorId are required.');
  }
  if (!Number.isInteger(definition.revision) || definition.revision <= 0) {
    throw new Error('ActorPrepDefinition revision must be a positive integer.');
  }
  validateSource(definition.source);

  if (definition.automation.headlessDefault !== true) {
    throw new Error('Actor prep default must remain headless.');
  }
  if (definition.automation.recurringManualEditorAllowed !== false) {
    throw new Error('Recurring manual editor work is forbidden in the default actor-prep path.');
  }
  if (definition.automation.humanReviewRole !== 'accept-reject') {
    throw new Error('Human actor-prep work must remain an accept/reject gate.');
  }
  if (definition.automation.failedAutomationPolicy !== 'reject-or-fallback') {
    throw new Error('Failed actor automation must reject or fall back.');
  }

  assertUnique(definition.regions.map((region) => region.id), 'actor-prep region');
  assertUnique(definition.anchors.map((anchor) => anchor.id), 'actor-prep anchor');
  assertUnique(definition.backendCandidates.map((backend) => backend.id), 'actor backend');

  for (const region of definition.regions) {
    if (!region.id.trim() || !region.semanticRole.trim()) {
      throw new Error('Actor-prep regions require id and semanticRole.');
    }
  }
  for (const anchor of definition.anchors) {
    if (!anchor.id.trim() || !anchor.semanticRole.trim()) {
      throw new Error('Actor-prep anchors require id and semanticRole.');
    }
  }
  for (const backend of definition.backendCandidates) {
    if (!backend.id.trim()) throw new Error('Actor backend id is required.');
    if (backend.headlessRequired !== true) {
      throw new Error(`Actor backend ${backend.id} must support a headless production path.`);
    }
    if (backend.recurringManualEditorAllowed !== false) {
      throw new Error(`Actor backend ${backend.id} cannot require recurring manual editor work.`);
    }
    if (backend.liveStoryTimeAuthorityAllowed !== false) {
      throw new Error(`Actor backend ${backend.id} cannot own live story time.`);
    }
    if (backend.status === 'license-blocked' && backend.licenseEvidenceRequired !== true) {
      throw new Error(`License-blocked actor backend ${backend.id} must require license evidence.`);
    }
  }
}

function validateSource(source: ActorPrepSourceIdentity): void {
  if (!source.assetId.trim()) throw new Error('Actor prep source assetId is required.');
  if (!/^sha256:[0-9a-f]{64}$/i.test(source.sha256)) {
    throw new Error('Actor prep source sha256 must be a prefixed 64-character digest.');
  }
  if (!Number.isInteger(source.width) || source.width <= 0) {
    throw new Error('Actor prep source width must be a positive integer.');
  }
  if (!Number.isInteger(source.height) || source.height <= 0) {
    throw new Error('Actor prep source height must be a positive integer.');
  }
  if (!source.registration.trim()) throw new Error('Actor prep source registration is required.');
}

function assertUnique(values: readonly string[], label: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`Duplicate ${label} id ${value}.`);
    seen.add(value);
  }
}
