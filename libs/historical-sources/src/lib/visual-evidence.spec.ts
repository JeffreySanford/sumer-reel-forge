import {
  VISUAL_EVIDENCE_APPLICATIONS,
  getApplicationsForEvidence,
} from './visual-evidence-applications';
import {
  VISUAL_EVIDENCE_REGISTRY,
  getVisualEvidence,
} from './visual-evidence-registry';
import {
  validateCanonicalVisualEvidenceBinding,
  validateVisualEvidenceApplication,
  validateVisualEvidenceRegistry,
} from './visual-evidence-validation';
import type {
  CanonicalVisualEvidenceBinding,
  VisualEvidenceApplication,
} from './visual-evidence-types';

describe('Phase 1B visual evidence', () => {
  it('keeps one Standard of Ur identity while allowing multiple independent applications', () => {
    const evidenceId = 'visual:bm:standard-of-ur:1928-1010-3:v1';
    const evidence = getVisualEvidence(evidenceId);
    const applications = getApplicationsForEvidence(evidenceId);

    expect(evidence).toBeDefined();
    expect(applications).toHaveLength(3);
    expect(new Set(applications.map((item) => item.evidenceId))).toEqual(
      new Set([evidenceId]),
    );
    expect(new Set(applications.map((item) => item.id)).size).toBe(3);
  });

  it('keeps application relationship and confidence independent per target', () => {
    const applications = getApplicationsForEvidence(
      'visual:bm:standard-of-ur:1928-1010-3:v1',
    );

    expect(applications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'application:standard-ur:project-social-staging:v1',
          relationship: 'contextual',
          confidence: 'high',
        }),
        expect.objectContaining({
          id: 'application:standard-ur:enlil-costume-context:v1',
          relationship: 'contextual',
          confidence: 'medium',
        }),
      ]),
    );
  });

  it('keeps historical confidence separate from image rights', () => {
    const standard = getVisualEvidence(
      'visual:bm:standard-of-ur:1928-1010-3:v1',
    );
    const metSeal = getVisualEvidence(
      'visual:met:banquet-seal:56-157-1:v1',
    );

    expect(standard).toEqual(
      expect.objectContaining({ confidence: 'high', rightsStatus: 'metadata-only' }),
    );
    expect(metSeal).toEqual(
      expect.objectContaining({ confidence: 'high', rightsStatus: 'public-domain' }),
    );
  });

  it('rejects applications that reference unknown evidence', () => {
    const application: VisualEvidenceApplication = {
      ...VISUAL_EVIDENCE_APPLICATIONS[0],
      id: 'application:test:unknown-evidence:v1',
      evidenceId: 'visual:missing:v1',
    };

    const validation = validateVisualEvidenceApplication(application);
    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toContain(
      'FAILURE-EVIDENCE-001-unknown-evidence-id',
    );
  });

  it('rejects unsupported usage values even when runtime data bypasses TypeScript', () => {
    const application = {
      ...VISUAL_EVIDENCE_APPLICATIONS[0],
      id: 'application:test:unsupported-usage:v1',
      usages: ['definitely-not-a-real-usage'],
    } as unknown as VisualEvidenceApplication;

    const validation = validateVisualEvidenceApplication(application);
    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toContain(
      'FAILURE-EVIDENCE-002-unsupported-usage',
    );
  });

  it('rejects empty inference and direct-plus-analogical classification', () => {
    const application: VisualEvidenceApplication = {
      ...VISUAL_EVIDENCE_APPLICATIONS[0],
      id: 'application:test:bad-classification:v1',
      relationship: 'direct',
      confidence: 'analogical',
      inference: '   ',
    };

    const validation = validateVisualEvidenceApplication(application);
    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'FAILURE-EVIDENCE-005-analogical-evidence-labeled-direct',
        'FAILURE-EVIDENCE-006-missing-inference',
      ]),
    );
  });

  it('prevents metadata-only museum images from being silently promoted to ingest', () => {
    const application: VisualEvidenceApplication = {
      ...VISUAL_EVIDENCE_APPLICATIONS[0],
      id: 'application:test:unlicensed-ingest:v1',
      imageUse: 'ingest',
    };

    const validation = validateVisualEvidenceApplication(application);
    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toContain(
      'FAILURE-EVIDENCE-003-unlicensed-image-promoted',
    );
  });

  it('requires an explicit note when an application intentionally uses an anachronism', () => {
    const application: VisualEvidenceApplication = {
      ...VISUAL_EVIDENCE_APPLICATIONS[0],
      id: 'application:test:anachronism:v1',
      isAnachronistic: true,
      reviewNote: undefined,
    };

    const validation = validateVisualEvidenceApplication(application);
    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toContain(
      'FAILURE-EVIDENCE-007-anachronism-without-review-note',
    );
  });

  it('does not let a publication masquerade as a museum object record', () => {
    const evidence: CanonicalVisualEvidenceBinding = {
      ...VISUAL_EVIDENCE_REGISTRY[0],
      id: 'visual:test:publication:v1',
      objectNumber: undefined,
      title: 'A modern archaeological article',
    };

    const validation = validateCanonicalVisualEvidenceBinding(evidence);
    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toContain(
      'FAILURE-EVIDENCE-004-publication-masquerades-as-object',
    );
  });

  it('keeps the authoritative Phase 1B visual registry valid', () => {
    expect(validateVisualEvidenceRegistry()).toEqual({ valid: true, issues: [] });
  });
});
