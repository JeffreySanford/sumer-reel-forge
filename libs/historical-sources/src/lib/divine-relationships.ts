import type { ValidationIssue, ValidationResult } from './historical-sources';
import { getKnownHistoricalSource } from './supplemental-historical-sources';

export type DivineRelationshipType =
  | 'PATRON'
  | 'MAJOR_CULT'
  | 'TEMPLE_ATTESTED'
  | 'OFFERING_ATTESTED'
  | 'LITERARY_ASSOCIATION'
  | 'NARRATIVE_OFFICE'
  | 'MANIFESTATION'
  | 'SYMBOLIC_CORRESPONDENCE'
  | 'PROJECT_GENEALOGY'
  | 'HISTORICAL_SYNCRETISM';

export type DivineProvenanceClass =
  | 'DIRECT_HISTORICAL'
  | 'LITERARY'
  | 'DELIBERATE_ADAPTATION'
  | 'PROJECT_METAPHYSICS'
  | 'MODERN_SYMBOLIC_CORRESPONDENCE';

export interface DivineRelationship {
  id: string;
  subjectId: string;
  objectId: string;
  relationship: DivineRelationshipType;
  sourceIds: readonly string[];
  provenanceClass: DivineProvenanceClass;
  historicalIdentityClaim: boolean;
  confidence: 'high' | 'medium' | 'low' | 'project-canon';
  periodBand?: string;
  symbolicNode?: string;
  qualifier?: string;
  rationale: string;
}

export interface NarrativeLocationAdaptation {
  id: string;
  sourceLocationId: string;
  fictionLocationId: string;
  sourceIds: readonly string[];
  adaptationClass: 'DELIBERATE_ADAPTATION';
  reason: string;
}

export const DIVINE_RELATIONSHIPS: readonly DivineRelationship[] = [
  {
    id: 'divine:kish:zababa:patron:v1',
    subjectId: 'city:kish',
    objectId: 'deity:zababa',
    relationship: 'PATRON',
    sourceIds: ['reference:oracc:zababa:v1'],
    provenanceClass: 'DIRECT_HISTORICAL',
    historicalIdentityClaim: true,
    confidence: 'high',
    rationale: 'Zababa is the historically attested principal civic deity of Kish.',
  },
  {
    id: 'divine:kish:an:offering:v1',
    subjectId: 'city:kish',
    objectId: 'deity:an',
    relationship: 'OFFERING_ATTESTED',
    sourceIds: ['reference:oracc:an:v1'],
    provenanceClass: 'DIRECT_HISTORICAL',
    historicalIdentityClaim: true,
    confidence: 'high',
    rationale:
      'An is historically attested through cult/offering presence at Kish without replacing Zababa as patron.',
  },
  {
    id: 'divine:kish:an:kether:v1',
    subjectId: 'city:kish',
    objectId: 'deity:an',
    relationship: 'SYMBOLIC_CORRESPONDENCE',
    sourceIds: [],
    provenanceClass: 'MODERN_SYMBOLIC_CORRESPONDENCE',
    historicalIdentityClaim: false,
    confidence: 'project-canon',
    symbolicNode: 'KETHER',
    rationale:
      'Project metaphysics uses An as the heavenly/crown principle corresponding to Kether; this is not a historical patronage claim.',
  },
  {
    id: 'divine:shuruppak:sud-ninlil:patron:v1',
    subjectId: 'city:shuruppak',
    objectId: 'deity:sud-ninlil',
    relationship: 'PATRON',
    sourceIds: ['reference:oracc:ninlil:v1'],
    provenanceClass: 'DIRECT_HISTORICAL',
    historicalIdentityClaim: true,
    confidence: 'high',
    rationale:
      'Sud, later identified with Ninlil, is the historical cult relationship preserved for Shuruppak.',
  },
  {
    id: 'divine:shuruppak:nergal:geburah:v1',
    subjectId: 'city:shuruppak',
    objectId: 'deity:nergal',
    relationship: 'SYMBOLIC_CORRESPONDENCE',
    sourceIds: ['reference:oracc:nergal:v1'],
    provenanceClass: 'PROJECT_METAPHYSICS',
    historicalIdentityClaim: false,
    confidence: 'project-canon',
    symbolicNode: 'GEBURAH',
    qualifier: 'SEVERITY_TRANSFORMATION_WAR',
    rationale:
      'Nergal represents the project office of severity, destruction, war and transformation at the Geburah node; this does not make him Shuruppak patron.',
  },
  {
    id: 'divine:uttu:inanna:manifestation:v1',
    subjectId: 'deity:uttu',
    objectId: 'deity:inanna',
    relationship: 'MANIFESTATION',
    sourceIds: ['etcsl-1.1.3'],
    provenanceClass: 'PROJECT_METAPHYSICS',
    historicalIdentityClaim: false,
    confidence: 'project-canon',
    qualifier: 'WEAVER_TO_SOVEREIGN_AGENCY',
    rationale:
      'The novel treats Uttu as a developmental/specialized manifestation of the greater Inanna principle. ETCSL supports the textile bridge but keeps the named figures distinct.',
  },
  {
    id: 'divine:inanna:ishtar:syncretism:v1',
    subjectId: 'deity:inanna',
    objectId: 'deity:ishtar',
    relationship: 'HISTORICAL_SYNCRETISM',
    sourceIds: ['reference:oracc:inanna-ishtar:v1'],
    provenanceClass: 'DIRECT_HISTORICAL',
    historicalIdentityClaim: true,
    confidence: 'high',
    rationale:
      'Inanna/Ishtar is represented as historically attested linguistic and religious syncretism, not as a mere costume/name swap.',
  },
  {
    id: 'divine:ishtar:lilith:shadow-manifestation:v1',
    subjectId: 'deity:ishtar',
    objectId: 'deity:lilith',
    relationship: 'MANIFESTATION',
    sourceIds: [],
    provenanceClass: 'MODERN_SYMBOLIC_CORRESPONDENCE',
    historicalIdentityClaim: false,
    confidence: 'project-canon',
    qualifier: 'SHADOW_CORRESPONDENCE',
    rationale:
      'The supplied modern esoteric tradition treats Lilith as a later shadow/manifestation correspondence. The project does not claim ancient historical identity with Inanna or Ishtar.',
  },
] as const;

export const NARRATIVE_LOCATION_ADAPTATIONS: readonly NarrativeLocationAdaptation[] = [
  {
    id: 'location:enlil-sud:eres-to-uruk:v1',
    sourceLocationId: 'city:eres',
    fictionLocationId: 'city:uruk',
    sourceIds: ['etcsl-1.2.2'],
    adaptationClass: 'DELIBERATE_ADAPTATION',
    reason:
      'The source geography remains Eres/Nisaba/Sud; the manuscript relocates the episode to Uruk for symbolic and narrative consolidation.',
  },
] as const;

function result(issues: ValidationIssue[]): ValidationResult {
  return {
    valid: !issues.some((issue) => issue.severity === 'error'),
    issues,
  };
}

export function normalizeSemanticEntityId(entityId: string): string {
  return entityId.trim().toLowerCase();
}

export function getDivineRelationshipsForSubject(
  subjectId: string,
): readonly DivineRelationship[] {
  return DIVINE_RELATIONSHIPS.filter(
    (relationship) => relationship.subjectId === subjectId,
  );
}

export function getHistoricalCityBindings(
  cityId: string,
): readonly DivineRelationship[] {
  const historicalTypes = new Set<DivineRelationshipType>([
    'PATRON',
    'MAJOR_CULT',
    'TEMPLE_ATTESTED',
    'OFFERING_ATTESTED',
  ]);

  return getDivineRelationshipsForSubject(cityId).filter(
    (relationship) =>
      relationship.historicalIdentityClaim &&
      historicalTypes.has(relationship.relationship),
  );
}

export function validateDivineRelationship(
  relationship: DivineRelationship,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!relationship.id.trim() || !relationship.subjectId.trim() || !relationship.objectId.trim()) {
    issues.push({
      severity: 'error',
      code: 'divine.relationship.identity.required',
      message: 'Divine relationship requires id, subjectId and objectId.',
    });
  }

  for (const sourceId of relationship.sourceIds) {
    if (!getKnownHistoricalSource(sourceId)) {
      issues.push({
        severity: 'error',
        code: 'divine.relationship.source.unknown',
        message: `Unknown relationship source ${sourceId}.`,
      });
    }
  }

  if (relationship.historicalIdentityClaim && relationship.sourceIds.length === 0) {
    issues.push({
      severity: 'error',
      code: 'divine.relationship.historical-source.required',
      message: 'Historical identity claims require at least one registered historical source.',
    });
  }

  if (
    relationship.historicalIdentityClaim &&
    (relationship.provenanceClass === 'PROJECT_METAPHYSICS' ||
      relationship.provenanceClass === 'MODERN_SYMBOLIC_CORRESPONDENCE')
  ) {
    issues.push({
      severity: 'error',
      code: 'DIVINE-ONTOLOGY-002-symbolic-node-not-promoted-to-historical-cult',
      message: 'Project metaphysics or symbolic correspondence cannot satisfy a historical identity claim.',
    });
  }

  if (
    relationship.relationship === 'SYMBOLIC_CORRESPONDENCE' &&
    relationship.historicalIdentityClaim
  ) {
    issues.push({
      severity: 'error',
      code: 'DIVINE-ONTOLOGY-002-symbolic-node-not-promoted-to-historical-cult',
      message: 'Symbolic correspondence cannot be promoted to historical cult identity.',
    });
  }

  return result(issues);
}

export function validateNarrativeLocationAdaptation(
  adaptation: NarrativeLocationAdaptation,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (adaptation.sourceLocationId === adaptation.fictionLocationId) {
    issues.push({
      severity: 'error',
      code: 'DIVINE-ONTOLOGY-004-fiction-location-preserves-source-location',
      message: 'A deliberate location adaptation must preserve distinct source and fiction locations.',
    });
  }

  for (const sourceId of adaptation.sourceIds) {
    if (!getKnownHistoricalSource(sourceId)) {
      issues.push({
        severity: 'error',
        code: 'location.adaptation.source.unknown',
        message: `Unknown location-adaptation source ${sourceId}.`,
      });
    }
  }

  return result(issues);
}

export function validateDivineRelationshipRegistry(): ValidationResult {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();

  for (const relationship of DIVINE_RELATIONSHIPS) {
    if (ids.has(relationship.id)) {
      issues.push({
        severity: 'error',
        code: 'divine.relationship.duplicate',
        message: `Duplicate divine relationship id ${relationship.id}.`,
      });
    }
    ids.add(relationship.id);
    issues.push(...validateDivineRelationship(relationship).issues);
  }

  for (const adaptation of NARRATIVE_LOCATION_ADAPTATIONS) {
    issues.push(...validateNarrativeLocationAdaptation(adaptation).issues);
  }

  return result(issues);
}
