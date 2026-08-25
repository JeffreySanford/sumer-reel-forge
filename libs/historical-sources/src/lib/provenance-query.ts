import type { HistoricalSourceBinding } from './historical-sources';
import {
  DIVINE_RELATIONSHIPS,
  NARRATIVE_LOCATION_ADAPTATIONS,
  type DivineRelationship,
  type NarrativeLocationAdaptation,
} from './divine-relationships';
import { getKnownHistoricalSource } from './supplemental-historical-sources';
import { getApplicationsForTarget } from './visual-evidence-applications';
import { getVisualEvidence } from './visual-evidence-registry';
import type {
  CanonicalVisualEvidenceBinding,
  VisualEvidenceApplication,
} from './visual-evidence-types';

export interface ResolvedEvidenceApplication {
  application: VisualEvidenceApplication;
  evidence?: CanonicalVisualEvidenceBinding;
}

export interface TargetProvenanceView {
  targetId: string;
  applications: readonly ResolvedEvidenceApplication[];
  unresolvedEvidenceIds: readonly string[];
  rightsWarnings: readonly string[];
}

export interface EntityProvenanceView {
  entityId: string;
  relationships: readonly DivineRelationship[];
  historicalRelationships: readonly DivineRelationship[];
  interpretiveRelationships: readonly DivineRelationship[];
  sourceLocationAdaptations: readonly NarrativeLocationAdaptation[];
  fictionLocationAdaptations: readonly NarrativeLocationAdaptation[];
  sourceIds: readonly string[];
  sources: readonly HistoricalSourceBinding[];
  unresolvedSourceIds: readonly string[];
}

function sortById<T extends { id: string }>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => left.id.localeCompare(right.id));
}

export function createTargetProvenanceView(
  targetId: string,
): TargetProvenanceView {
  const applications = sortById(getApplicationsForTarget(targetId)).map(
    (application) => ({
      application,
      evidence: getVisualEvidence(application.evidenceId),
    }),
  );

  const unresolvedEvidenceIds = [
    ...new Set(
      applications
        .filter(({ evidence }) => evidence === undefined)
        .map(({ application }) => application.evidenceId),
    ),
  ].sort();

  const rightsWarnings = applications
    .filter(
      ({ evidence }) =>
        evidence?.rightsStatus === 'metadata-only' ||
        evidence?.rightsStatus === 'rights-unknown',
    )
    .map(
      ({ application, evidence }) =>
        `${application.id}: ${evidence?.rightsStatus ?? 'missing-evidence'}`,
    )
    .sort();

  return {
    targetId,
    applications,
    unresolvedEvidenceIds,
    rightsWarnings,
  };
}

export function createEntityProvenanceView(
  entityId: string,
): EntityProvenanceView {
  const relationships = sortById(
    DIVINE_RELATIONSHIPS.filter(
      (relationship) =>
        relationship.subjectId === entityId ||
        relationship.objectId === entityId,
    ),
  );

  const sourceLocationAdaptations = sortById(
    NARRATIVE_LOCATION_ADAPTATIONS.filter(
      (adaptation) => adaptation.sourceLocationId === entityId,
    ),
  );
  const fictionLocationAdaptations = sortById(
    NARRATIVE_LOCATION_ADAPTATIONS.filter(
      (adaptation) => adaptation.fictionLocationId === entityId,
    ),
  );

  const sourceIds = [
    ...new Set([
      ...relationships.flatMap((relationship) => relationship.sourceIds),
      ...sourceLocationAdaptations.flatMap((adaptation) => adaptation.sourceIds),
      ...fictionLocationAdaptations.flatMap((adaptation) => adaptation.sourceIds),
    ]),
  ].sort();

  const resolvedSources = sourceIds.map((sourceId) => ({
    sourceId,
    source: getKnownHistoricalSource(sourceId),
  }));

  return {
    entityId,
    relationships,
    historicalRelationships: relationships.filter(
      (relationship) => relationship.historicalIdentityClaim,
    ),
    interpretiveRelationships: relationships.filter(
      (relationship) => !relationship.historicalIdentityClaim,
    ),
    sourceLocationAdaptations,
    fictionLocationAdaptations,
    sourceIds,
    sources: resolvedSources
      .flatMap(({ source }) => (source ? [source] : []))
      .sort((left, right) => left.id.localeCompare(right.id)),
    unresolvedSourceIds: resolvedSources
      .filter(({ source }) => source === undefined)
      .map(({ sourceId }) => sourceId)
      .sort(),
  };
}
