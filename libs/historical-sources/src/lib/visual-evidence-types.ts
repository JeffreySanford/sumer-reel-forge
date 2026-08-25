import type {
  VisualEvidenceBinding,
  VisualEvidenceUsage,
} from './historical-sources';

export type VisualEvidenceType =
  | 'museum-object'
  | 'archaeological-site'
  | 'image'
  | 'artifact-group';

export type VisualRightsStatus =
  | 'public-domain'
  | 'licensed'
  | 'metadata-only'
  | 'rights-unknown';

export type EvidenceRelationship = 'direct' | 'contextual' | 'analogical';
export type VisualEvidenceReviewStatus = 'draft' | 'reviewed' | 'approved';
export type VisualEvidenceImageUse = 'metadata-only' | 'reference-only' | 'ingest';

export type EvidenceTargetKind =
  | 'project'
  | 'chapter'
  | 'scene'
  | 'actor'
  | 'costume'
  | 'prop'
  | 'vehicle'
  | 'city'
  | 'ritual'
  | 'material'
  | 'benchmark'
  | 'other';

export type StalenessReason =
  | 'source-revised'
  | 'target-revised'
  | 'rights-changed'
  | 'interpretation-changed'
  | 'superseded';

export interface EvidenceTargetRef {
  kind: EvidenceTargetKind;
  id: string;
  revision?: string;
}

/**
 * Canonical visual evidence identity.
 *
 * The legacy VisualEvidenceBinding remains exported from historical-sources.ts
 * for compatibility. New Phase 1B records use this stricter shape so one
 * museum object can support many independent project applications.
 */
export interface CanonicalVisualEvidenceBinding
  extends Omit<VisualEvidenceBinding, 'usage'> {
  revision: string;
  evidenceType: VisualEvidenceType;
  rightsStatus: VisualRightsStatus;
  /** Deprecated compatibility hint. Project-specific uses belong on applications. */
  legacyUsage?: VisualEvidenceUsage;
}

export interface VisualEvidenceApplication {
  id: string;
  revision: string;
  evidenceId: string;
  target: EvidenceTargetRef;
  usages: readonly VisualEvidenceUsage[];
  relationship: EvidenceRelationship;
  confidence: 'high' | 'medium' | 'analogical';
  inference: string;
  reviewStatus: VisualEvidenceReviewStatus;
  imageUse: VisualEvidenceImageUse;
  stalenessReason?: StalenessReason;
  isAnachronistic?: boolean;
  reviewNote?: string;
}
