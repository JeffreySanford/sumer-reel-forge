import type { VisualEvidenceApplication } from './visual-evidence-types';

export const VISUAL_EVIDENCE_APPLICATIONS: readonly VisualEvidenceApplication[] = [
  {
    id: 'application:standard-ur:project-social-staging:v1',
    revision: 'v1',
    evidenceId: 'visual:bm:standard-of-ur:1928-1010-3:v1',
    target: { kind: 'project', id: 'project:blessings-of-sumer' },
    usages: ['social-staging'],
    relationship: 'contextual',
    confidence: 'high',
    inference:
      'Use the object as contextual evidence for ranked social staging, procession spacing and grouped human activity without identifying any depicted figure as a specific manuscript character.',
    reviewStatus: 'reviewed',
    imageUse: 'metadata-only',
  },
  {
    id: 'application:standard-ur:enlil-costume-context:v1',
    revision: 'v1',
    evidenceId: 'visual:bm:standard-of-ur:1928-1010-3:v1',
    target: { kind: 'costume', id: 'costume:enlil:baseline:v1' },
    usages: ['costume', 'decorative-motif'],
    relationship: 'contextual',
    confidence: 'medium',
    inference:
      'Use garment silhouettes, textile arrangement and decorative hierarchy as contextual Early Dynastic evidence only; do not claim that the Standard depicts Enlil or his canonical costume.',
    reviewStatus: 'draft',
    imageUse: 'metadata-only',
  },
  {
    id: 'application:standard-ur:procession-context:v1',
    revision: 'v1',
    evidenceId: 'visual:bm:standard-of-ur:1928-1010-3:v1',
    target: { kind: 'scene', id: 'scene:chapter2:marriage-procession' },
    usages: ['social-staging', 'animal'],
    relationship: 'contextual',
    confidence: 'medium',
    inference:
      'Use register composition, attendants, animals and carried goods as contextual staging evidence for a ceremonial procession while preserving the literary source as narrative authority.',
    reviewStatus: 'draft',
    imageUse: 'metadata-only',
  },
  {
    id: 'application:royal-game-ur:decorative-material:v1',
    revision: 'v1',
    evidenceId: 'visual:bm:royal-game-ur:1928-1009-378:v1',
    target: { kind: 'material', id: 'material:ur-inlay:decorative:v1' },
    usages: ['decorative-motif'],
    relationship: 'analogical',
    confidence: 'analogical',
    inference:
      'Use the surviving inlay materials and geometric treatment as an analogue for elite decorative material language, not as a claim that unrelated props used the same exact design.',
    reviewStatus: 'draft',
    imageUse: 'metadata-only',
  },
  {
    id: 'application:met-banquet:chapter2-banquet-staging:v1',
    revision: 'v1',
    evidenceId: 'visual:met:banquet-seal:56-157-1:v1',
    target: { kind: 'scene', id: 'scene:chapter2:banquet' },
    usages: ['social-staging', 'ritual'],
    relationship: 'direct',
    confidence: 'high',
    inference:
      'Use the banquet scene directly as period evidence that seated drinking/banquet imagery and associated vessel handling belong in the visual vocabulary, while leaving character identity and narrative meaning to the manuscript and literary sources.',
    reviewStatus: 'reviewed',
    imageUse: 'reference-only',
  },
] as const;

export function getVisualEvidenceApplication(
  applicationId: string,
): VisualEvidenceApplication | undefined {
  return VISUAL_EVIDENCE_APPLICATIONS.find(
    (application) => application.id === applicationId,
  );
}

export function getApplicationsForEvidence(
  evidenceId: string,
): readonly VisualEvidenceApplication[] {
  return VISUAL_EVIDENCE_APPLICATIONS.filter(
    (application) => application.evidenceId === evidenceId,
  );
}

export function getApplicationsForTarget(
  targetId: string,
): readonly VisualEvidenceApplication[] {
  return VISUAL_EVIDENCE_APPLICATIONS.filter(
    (application) => application.target.id === targetId,
  );
}
