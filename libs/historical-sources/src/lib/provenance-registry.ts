import type {
  HistoricalSourceBinding,
  ValidationIssue,
  ValidationResult,
} from './historical-sources';
import {
  HISTORICAL_SOURCE_REGISTRY,
  validateHistoricalSourceBinding,
  validateHistoricalSourceRegistry,
} from './historical-sources';
import {
  NARRATIVE_LOCATION_ADAPTATIONS,
  validateDivineRelationshipRegistry,
} from './divine-relationships';
import { SUPPLEMENTAL_HISTORICAL_SOURCE_REGISTRY } from './supplemental-historical-sources';
import { validateVisualEvidenceRegistry } from './visual-evidence-validation';

function result(issues: ValidationIssue[]): ValidationResult {
  return {
    valid: !issues.some((issue) => issue.severity === 'error'),
    issues,
  };
}

/**
 * Validates Phase 1 supplemental sources independently from the original
 * historical-source registry while also preventing ID collisions with it.
 *
 * The optional input exists for focused negative tests. Production callers
 * should normally use the default registry.
 */
export function validateSupplementalHistoricalSourceRegistry(
  sources: readonly HistoricalSourceBinding[] =
    SUPPLEMENTAL_HISTORICAL_SOURCE_REGISTRY,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const baseIds = new Set(HISTORICAL_SOURCE_REGISTRY.map((source) => source.id));
  const supplementalIds = new Set<string>();

  for (const source of sources) {
    if (baseIds.has(source.id)) {
      issues.push({
        severity: 'error',
        code: 'registry.supplemental-source.collides-with-base',
        message: `Supplemental historical source id ${source.id} collides with the base historical-source registry.`,
      });
    }

    if (supplementalIds.has(source.id)) {
      issues.push({
        severity: 'error',
        code: 'registry.supplemental-source.duplicate',
        message: `Duplicate supplemental historical source id ${source.id}.`,
      });
    }

    supplementalIds.add(source.id);
    issues.push(...validateHistoricalSourceBinding(source).issues);
  }

  return result(issues);
}

function validateLocationAdaptationIds(): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();

  for (const adaptation of NARRATIVE_LOCATION_ADAPTATIONS) {
    if (ids.has(adaptation.id)) {
      issues.push({
        severity: 'error',
        code: 'registry.location-adaptation.duplicate',
        message: `Duplicate narrative location adaptation id ${adaptation.id}.`,
      });
    }
    ids.add(adaptation.id);
  }

  return issues;
}

/**
 * Single trust boundary for the complete Phase 1 provenance foundation.
 *
 * This intentionally composes the existing domain validators instead of
 * re-implementing their rules. UI, Scene V3 and future API consumers can call
 * one function before accepting the registry as internally consistent.
 */
export function validatePhase1ProvenanceRegistry(): ValidationResult {
  const issues: ValidationIssue[] = [];

  issues.push(...validateHistoricalSourceRegistry().issues);
  issues.push(...validateSupplementalHistoricalSourceRegistry().issues);
  issues.push(...validateVisualEvidenceRegistry().issues);
  issues.push(...validateDivineRelationshipRegistry().issues);
  issues.push(...validateLocationAdaptationIds());

  return result(issues);
}

export interface Phase1ProvenanceHealth {
  valid: boolean;
  errorCount: number;
  warningCount: number;
  errorCodes: readonly string[];
  warningCodes: readonly string[];
}

/**
 * Deterministic, presentation-neutral health summary suitable for CLI/API/UI
 * consumption. It contains no timestamps, HTML or environment-specific data.
 */
export function getPhase1ProvenanceHealth(): Phase1ProvenanceHealth {
  const validation = validatePhase1ProvenanceRegistry();
  const errors = validation.issues.filter((issue) => issue.severity === 'error');
  const warnings = validation.issues.filter(
    (issue) => issue.severity === 'warning',
  );

  return {
    valid: validation.valid,
    errorCount: errors.length,
    warningCount: warnings.length,
    errorCodes: errors.map((issue) => issue.code).sort(),
    warningCodes: warnings.map((issue) => issue.code).sort(),
  };
}
