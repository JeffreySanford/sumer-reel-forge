import { HISTORICAL_SOURCE_REGISTRY } from './historical-sources';
import { DIVINE_RELATIONSHIPS, NARRATIVE_LOCATION_ADAPTATIONS } from './divine-relationships';
import { ALL_HISTORICAL_SOURCES } from './supplemental-historical-sources';
import { VISUAL_EVIDENCE_APPLICATIONS } from './visual-evidence-applications';
import { VISUAL_EVIDENCE_REGISTRY } from './visual-evidence-registry';

export interface CountEntry {
  key: string;
  count: number;
}

export interface ProvenanceSummary {
  historicalSourceCount: number;
  etcslSourceCount: number;
  nonEtcslSourceCount: number;
  supplementalSourceCount: number;
  researchNeededSourceCount: number;
  visualEvidenceCount: number;
  visualApplicationCount: number;
  applicationsByRelationship: readonly CountEntry[];
  applicationsByConfidence: readonly CountEntry[];
  rightsModes: readonly CountEntry[];
  unresolvedReferences: readonly string[];
  staleApplications: readonly string[];
  divineRelationshipCount: number;
  divineRelationshipsByType: readonly CountEntry[];
  locationAdaptationCount: number;
}

function countBy(values: readonly string[]): CountEntry[] {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, count]) => ({ key, count }));
}

export function createProvenanceSummary(): ProvenanceSummary {
  const evidenceIds = new Set(VISUAL_EVIDENCE_REGISTRY.map((item) => item.id));
  const unresolvedReferences = VISUAL_EVIDENCE_APPLICATIONS.filter(
    (application) => !evidenceIds.has(application.evidenceId),
  )
    .map((application) => application.id)
    .sort();

  const staleApplications = VISUAL_EVIDENCE_APPLICATIONS.filter(
    (application) => application.stalenessReason !== undefined,
  )
    .map((application) => application.id)
    .sort();

  const etcslSourceCount = ALL_HISTORICAL_SOURCES.filter(
    (source) => source.sourceType === 'etcsl',
  ).length;

  return {
    historicalSourceCount: ALL_HISTORICAL_SOURCES.length,
    etcslSourceCount,
    nonEtcslSourceCount: ALL_HISTORICAL_SOURCES.length - etcslSourceCount,
    supplementalSourceCount:
      ALL_HISTORICAL_SOURCES.length - HISTORICAL_SOURCE_REGISTRY.length,
    researchNeededSourceCount: ALL_HISTORICAL_SOURCES.filter(
      (source) => source.researchStatus === 'needs-research',
    ).length,
    visualEvidenceCount: VISUAL_EVIDENCE_REGISTRY.length,
    visualApplicationCount: VISUAL_EVIDENCE_APPLICATIONS.length,
    applicationsByRelationship: countBy(
      VISUAL_EVIDENCE_APPLICATIONS.map((application) => application.relationship),
    ),
    applicationsByConfidence: countBy(
      VISUAL_EVIDENCE_APPLICATIONS.map((application) => application.confidence),
    ),
    rightsModes: countBy(
      VISUAL_EVIDENCE_REGISTRY.map((evidence) => evidence.rightsStatus),
    ),
    unresolvedReferences,
    staleApplications,
    divineRelationshipCount: DIVINE_RELATIONSHIPS.length,
    divineRelationshipsByType: countBy(
      DIVINE_RELATIONSHIPS.map((relationship) => relationship.relationship),
    ),
    locationAdaptationCount: NARRATIVE_LOCATION_ADAPTATIONS.length,
  };
}

export function getEvidenceForTarget(targetId: string) {
  const applications = VISUAL_EVIDENCE_APPLICATIONS.filter(
    (application) => application.target.id === targetId,
  );

  return applications
    .map((application) => ({
      application,
      evidence: VISUAL_EVIDENCE_REGISTRY.find(
        (item) => item.id === application.evidenceId,
      ),
    }))
    .sort((left, right) => left.application.id.localeCompare(right.application.id));
}

export function getRightsWarningsForTarget(targetId: string): readonly string[] {
  return getEvidenceForTarget(targetId)
    .filter(
      ({ evidence }) =>
        evidence?.rightsStatus === 'metadata-only' ||
        evidence?.rightsStatus === 'rights-unknown',
    )
    .map(({ application, evidence }) =>
      `${application.id}: ${evidence?.rightsStatus ?? 'missing-evidence'}`,
    )
    .sort();
}

export function getStaleApplications(): readonly string[] {
  return VISUAL_EVIDENCE_APPLICATIONS.filter(
    (application) => application.stalenessReason !== undefined,
  )
    .map((application) => application.id)
    .sort();
}
