import type {
  ValidationIssue,
  ValidationResult,
  VisualEvidenceUsage,
} from './historical-sources';
import { VISUAL_EVIDENCE_APPLICATIONS } from './visual-evidence-applications';
import {
  VISUAL_EVIDENCE_REGISTRY,
  getVisualEvidence,
} from './visual-evidence-registry';
import type {
  CanonicalVisualEvidenceBinding,
  VisualEvidenceApplication,
} from './visual-evidence-types';

const VALID_USAGES = new Set<VisualEvidenceUsage>([
  'costume',
  'architecture',
  'tool',
  'vehicle',
  'animal',
  'ritual',
  'social-staging',
  'decorative-motif',
]);

function result(issues: ValidationIssue[]): ValidationResult {
  return {
    valid: !issues.some((issue) => issue.severity === 'error'),
    issues,
  };
}

export function validateCanonicalVisualEvidenceBinding(
  evidence: CanonicalVisualEvidenceBinding,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!evidence.id.trim() || !evidence.revision.trim()) {
    issues.push({
      severity: 'error',
      code: 'CONTRACT-EVIDENCE-001-known-evidence-reference',
      message: 'Canonical visual evidence requires id and revision.',
    });
  }

  if (!evidence.institution.trim() || !evidence.title.trim()) {
    issues.push({
      severity: 'error',
      code: 'visual.identity.required',
      message: 'Canonical visual evidence requires institution and title.',
    });
  }

  if (!/^https?:\/\//.test(evidence.url)) {
    issues.push({
      severity: 'error',
      code: 'visual.url.invalid',
      message: 'Canonical visual evidence requires an http(s) URL.',
    });
  }

  if (evidence.evidenceType === 'museum-object' && !evidence.objectNumber?.trim()) {
    issues.push({
      severity: 'error',
      code: 'FAILURE-EVIDENCE-004-publication-masquerades-as-object',
      message: 'Museum-object evidence requires an object number.',
    });
  }

  if (!evidence.dateRange) {
    issues.push({
      severity: 'warning',
      code: 'visual.date.missing',
      message: 'Visual evidence has no date range; historical fit cannot yet be assessed.',
    });
  }

  return result(issues);
}

export function validateVisualEvidenceApplication(
  application: VisualEvidenceApplication,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const evidence = getVisualEvidence(application.evidenceId);

  if (!application.id.trim() || !application.revision.trim()) {
    issues.push({
      severity: 'error',
      code: 'CONTRACT-EVIDENCE-002-application-classification',
      message: 'Visual evidence application requires id and revision.',
    });
  }

  if (!evidence) {
    issues.push({
      severity: 'error',
      code: 'FAILURE-EVIDENCE-001-unknown-evidence-id',
      message: `Unknown visual evidence ${application.evidenceId}.`,
    });
  }

  if (!/^[a-z][a-z0-9-]*:[^\s]+$/i.test(application.target.id)) {
    issues.push({
      severity: 'error',
      code: 'FAILURE-EVIDENCE-008-invalid-target',
      message: `Invalid evidence target id ${application.target.id}.`,
    });
  }

  if (application.usages.length === 0) {
    issues.push({
      severity: 'error',
      code: 'FAILURE-EVIDENCE-002-unsupported-usage',
      message: 'Visual evidence application requires at least one supported usage.',
    });
  }

  for (const usage of application.usages) {
    if (!VALID_USAGES.has(usage)) {
      issues.push({
        severity: 'error',
        code: 'FAILURE-EVIDENCE-002-unsupported-usage',
        message: `Unsupported visual evidence usage ${String(usage)}.`,
      });
    }
  }

  if (!application.inference.trim()) {
    issues.push({
      severity: 'error',
      code: 'FAILURE-EVIDENCE-006-missing-inference',
      message: 'Every visual evidence application requires an explicit inference statement.',
    });
  }

  if (
    application.relationship === 'direct' &&
    application.confidence === 'analogical'
  ) {
    issues.push({
      severity: 'error',
      code: 'FAILURE-EVIDENCE-005-analogical-evidence-labeled-direct',
      message: 'A direct evidence relationship cannot carry analogical confidence.',
    });
  }

  if (
    evidence &&
    application.imageUse === 'ingest' &&
    evidence.rightsStatus !== 'public-domain' &&
    evidence.rightsStatus !== 'licensed'
  ) {
    issues.push({
      severity: 'error',
      code: 'FAILURE-EVIDENCE-003-unlicensed-image-promoted',
      message: `Evidence ${evidence.id} is not cleared for image-byte ingest.`,
    });
  }

  if (application.isAnachronistic && !application.reviewNote?.trim()) {
    issues.push({
      severity: 'error',
      code: 'FAILURE-EVIDENCE-007-anachronism-without-review-note',
      message: 'Anachronistic applications require an explicit review note.',
    });
  }

  return result(issues);
}

export function validateVisualEvidenceRegistry(): ValidationResult {
  const issues: ValidationIssue[] = [];
  const evidenceIds = new Set<string>();
  const applicationIds = new Set<string>();

  for (const evidence of VISUAL_EVIDENCE_REGISTRY) {
    if (evidenceIds.has(evidence.id)) {
      issues.push({
        severity: 'error',
        code: 'registry.visual-evidence.duplicate',
        message: `Duplicate visual evidence id ${evidence.id}.`,
      });
    }
    evidenceIds.add(evidence.id);
    issues.push(...validateCanonicalVisualEvidenceBinding(evidence).issues);
  }

  for (const application of VISUAL_EVIDENCE_APPLICATIONS) {
    if (applicationIds.has(application.id)) {
      issues.push({
        severity: 'error',
        code: 'registry.visual-application.duplicate',
        message: `Duplicate visual evidence application id ${application.id}.`,
      });
    }
    applicationIds.add(application.id);
    issues.push(...validateVisualEvidenceApplication(application).issues);
  }

  return result(issues);
}
