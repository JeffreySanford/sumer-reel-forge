import {
  canonicalize,
  normalizeLogicalPath,
  sha256Canonical,
} from './canonical';
import {
  RESOLVED_SCENE_SCHEMA_VERSION,
  SCENE_CANONICAL_FORM_VERSION,
  SCENE_HASH_ALGORITHM,
  type CompileResult,
  type CompilerIssue,
  type CompilerStageId,
  type CompilerStageResult,
  type CompilerStatus,
  type ResolvedAssetBinding,
  type ResolvedHistoricalSource,
  type ResolvedRuntimeBinding,
  type ResolvedSceneV3,
  type ResolvedSceneV3Payload,
  type ResolvedSemanticSeed,
  type ResolvedVisualEvidence,
  type RuntimeReferenceLike,
  type SceneCompilerDependencies,
  type SceneCompilerInput,
} from './types';

const SHA256_PATTERN = /^(?:sha256:)?[a-f0-9]{64}$/i;

const SOURCE_SCENE_SET_ARRAY_PATHS = new Set([
  '/historicalSourceIds',
  '/visualEvidenceIds',
  '/assets',
]);

function normalizeHash(value: string, label: string): string {
  if (!SHA256_PATTERN.test(value)) {
    throw new TypeError(`${label} must be a SHA-256 value.`);
  }
  return value.startsWith('sha256:')
    ? value.toLowerCase()
    : `sha256:${value.toLowerCase()}`;
}

function stage(
  id: CompilerStageId,
  issues: readonly CompilerIssue[],
  executed: ReadonlySet<CompilerStageId>,
): CompilerStageResult {
  const relevant = issues.filter((issue) => issue.code.startsWith(`${id}.`));
  if (!executed.has(id)) {
    return { id, status: 'SKIP', issueCodes: [] };
  }
  return {
    id,
    status: relevant.some((issue) => issue.severity === 'error') ? 'FAIL' : 'PASS',
    issueCodes: relevant.map((issue) => issue.code),
  };
}

function error(code: string, message: string, path?: string): CompilerIssue {
  return { severity: 'error', code, message, ...(path ? { path } : {}) };
}

function normalizeAsset(
  asset: SceneCompilerInput['assets'][number],
): ResolvedAssetBinding {
  return {
    id: asset.id,
    revision: asset.revision,
    kind: asset.kind,
    logicalPath: normalizeLogicalPath(asset.logicalPath),
    contentHash: normalizeHash(asset.sha256, `Asset ${asset.id}`),
    sourceAssetIds: [...(asset.sourceAssetIds ?? [])].sort(),
  };
}

function normalizeSourceScene<TScene extends SceneCompilerInput>(scene: TScene): unknown {
  return {
    ...scene,
    assets: scene.assets.map((asset) => ({
      ...asset,
      logicalPath: normalizeLogicalPath(asset.logicalPath),
      sha256: normalizeHash(asset.sha256, `Asset ${asset.id}`),
      ...(asset.sourceAssetIds
        ? { sourceAssetIds: [...asset.sourceAssetIds].sort() }
        : {}),
    })),
  };
}

function normalizeHistoricalSource(
  source: ResolvedHistoricalSource,
): ResolvedHistoricalSource {
  return {
    ...source,
    recordHash: normalizeHash(source.recordHash, `Historical source ${source.id}`),
  };
}

function normalizeVisualEvidence(
  evidence: ResolvedVisualEvidence,
): ResolvedVisualEvidence {
  return {
    ...evidence,
    recordHash: normalizeHash(evidence.recordHash, `Visual evidence ${evidence.id}`),
  };
}

function normalizeRuntime(
  reference: RuntimeReferenceLike,
  resolved: ResolvedRuntimeBinding,
): ResolvedRuntimeBinding {
  if (resolved.runtime !== reference.runtime) {
    throw new Error(
      `Runtime ${reference.id} resolved as ${resolved.runtime} instead of ${reference.runtime}.`,
    );
  }
  if (resolved.version !== reference.runtimeVersion) {
    throw new Error(
      `Runtime ${reference.id} resolved version ${resolved.version} instead of ${reference.runtimeVersion}.`,
    );
  }
  if (!resolved.adapterVersion.trim()) {
    throw new Error(`Runtime ${reference.id} is missing adapterVersion.`);
  }
  return {
    ...resolved,
    definitionId: reference.definitionId,
    capabilities: [...resolved.capabilities].sort(),
  };
}

function normalizeSeed(seed: ResolvedSemanticSeed): ResolvedSemanticSeed {
  if (!Number.isInteger(seed.algorithmVersion) || seed.algorithmVersion < 1) {
    throw new TypeError(
      `Semantic seed ${seed.targetId}/${seed.channel} has invalid algorithmVersion.`,
    );
  }
  if (!Number.isInteger(seed.value)) {
    throw new TypeError(`Semantic seed ${seed.targetId}/${seed.channel} must be an integer.`);
  }
  return { ...seed };
}

function uniqueBy<T>(values: readonly T[], key: (value: T) => string): readonly T[] {
  const result: T[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const id = key(value);
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(value);
  }
  return result;
}

function finishReport(
  sceneId: string,
  issues: readonly CompilerIssue[],
  executed: ReadonlySet<CompilerStageId>,
): CompileResult['report'] {
  const stageIds: readonly CompilerStageId[] = [
    'schema',
    'sources',
    'evidence',
    'assets',
    'runtimes',
    'capabilities',
    'seeds',
    'canonicalize',
  ];
  const stages = stageIds.map((id) => stage(id, issues, executed));
  const status: CompilerStatus = issues.some((issue) => issue.severity === 'error')
    ? 'FAIL'
    : 'PASS';
  return { sceneId, status, stages, issues: [...issues] };
}

export function compileSceneV3<TScene extends SceneCompilerInput>(
  scene: TScene,
  dependencies: SceneCompilerDependencies<TScene>,
): CompileResult {
  const issues: CompilerIssue[] = [];
  const executed = new Set<CompilerStageId>();

  executed.add('schema');
  const structural = dependencies.validateScene(scene);
  issues.push(
    ...structural.issues.map((issue) => ({
      ...issue,
      code: `schema.${issue.code}`,
    })),
  );
  if (!structural.valid || structural.issues.some((issue) => issue.severity === 'error')) {
    if (!structural.issues.some((issue) => issue.severity === 'error')) {
      issues.push(error('schema.invalid', 'Scene validation failed without a specific error.'));
    }
    return { ok: false, report: finishReport(scene.id, issues, executed) };
  }

  executed.add('sources');
  const historicalSources: ResolvedHistoricalSource[] = [];
  for (const id of [...scene.historicalSourceIds].sort()) {
    const resolved = dependencies.resolveHistoricalSource(id);
    if (!resolved) {
      issues.push(
        error('sources.missing', `Historical source ${id} could not be resolved.`, id),
      );
      continue;
    }
    try {
      historicalSources.push(normalizeHistoricalSource(resolved));
    } catch (reason) {
      issues.push(error('sources.invalid', String(reason), id));
    }
  }

  executed.add('evidence');
  const visualEvidence: ResolvedVisualEvidence[] = [];
  for (const id of [...scene.visualEvidenceIds].sort()) {
    const resolved = dependencies.resolveVisualEvidence(id);
    if (!resolved) {
      issues.push(
        error('evidence.missing', `Visual evidence ${id} could not be resolved.`, id),
      );
      continue;
    }
    try {
      visualEvidence.push(normalizeVisualEvidence(resolved));
    } catch (reason) {
      issues.push(error('evidence.invalid', String(reason), id));
    }
  }

  executed.add('assets');
  const assets: ResolvedAssetBinding[] = [];
  for (const asset of [...scene.assets].sort((a, b) => a.id.localeCompare(b.id))) {
    try {
      assets.push(normalizeAsset(asset));
    } catch (reason) {
      issues.push(error('assets.invalid', String(reason), asset.id));
    }
  }

  executed.add('runtimes');
  const runtimeReferences = uniqueBy(
    dependencies.collectRuntimeReferences(scene),
    (reference) =>
      `${reference.id}\u0000${reference.runtime}\u0000${reference.runtimeVersion}\u0000${reference.definitionId}`,
  );
  const runtimes: ResolvedRuntimeBinding[] = [];
  for (const reference of runtimeReferences) {
    const resolved = dependencies.resolveRuntime(reference);
    if (!resolved) {
      issues.push(
        error(
          'runtimes.missing',
          `Runtime ${reference.id} ${reference.runtime}@${reference.runtimeVersion} could not be resolved.`,
          reference.id,
        ),
      );
      continue;
    }
    try {
      runtimes.push(normalizeRuntime(reference, resolved));
    } catch (reason) {
      issues.push(error('runtimes.mismatch', String(reason), reference.id));
    }
  }
  runtimes.sort((a, b) =>
    `${a.id}\u0000${a.runtime}\u0000${a.version}`.localeCompare(
      `${b.id}\u0000${b.runtime}\u0000${b.version}`,
    ),
  );

  executed.add('capabilities');
  if (dependencies.validateCapabilities) {
    const capabilities = dependencies.validateCapabilities(scene, runtimes);
    issues.push(
      ...capabilities.issues.map((issue) => ({
        ...issue,
        code: `capabilities.${issue.code}`,
      })),
    );
    if (!capabilities.valid && !capabilities.issues.some((issue) => issue.severity === 'error')) {
      issues.push(
        error(
          'capabilities.invalid',
          'Runtime capability validation failed without a specific error.',
        ),
      );
    }
  }

  executed.add('seeds');
  const semanticSeeds: ResolvedSemanticSeed[] = [];
  try {
    semanticSeeds.push(...dependencies.deriveSemanticSeeds(scene).map(normalizeSeed));
    semanticSeeds.sort((a, b) =>
      `${a.targetId}\u0000${a.channel}\u0000${a.purpose}`.localeCompare(
        `${b.targetId}\u0000${b.channel}\u0000${b.purpose}`,
      ),
    );
  } catch (reason) {
    issues.push(error('seeds.invalid', String(reason)));
  }

  if (issues.some((issue) => issue.severity === 'error')) {
    return { ok: false, report: finishReport(scene.id, issues, executed) };
  }

  executed.add('canonicalize');
  try {
    const semanticScene = canonicalize(normalizeSourceScene(scene), {
      setLikeArrayPaths: SOURCE_SCENE_SET_ARRAY_PATHS,
    });
    const sourceSceneHash = sha256Canonical(semanticScene);

    const payload: ResolvedSceneV3Payload = {
      schemaVersion: RESOLVED_SCENE_SCHEMA_VERSION,
      canonicalFormVersion: SCENE_CANONICAL_FORM_VERSION,
      hashAlgorithm: SCENE_HASH_ALGORITHM,
      sourceSceneId: scene.id,
      sourceSceneRevision: scene.revision,
      sourceSceneHash,
      frame: {
        fps: scene.fps,
        durationFrames: scene.durationFrames,
        width: scene.width,
        height: scene.height,
      },
      historicalSources: historicalSources.sort((a, b) => a.id.localeCompare(b.id)),
      visualEvidence: visualEvidence.sort((a, b) => a.id.localeCompare(b.id)),
      assets,
      runtimes,
      semanticSeeds,
      qaContract: canonicalize(scene.qa),
      semanticScene,
    };

    const resolvedSceneHash = sha256Canonical(payload);
    const resolvedScene: ResolvedSceneV3 = {
      ...payload,
      resolvedSceneHash,
    };

    return {
      ok: true,
      resolvedScene,
      report: finishReport(scene.id, issues, executed),
    };
  } catch (reason) {
    issues.push(error('canonicalize.failed', String(reason)));
    return { ok: false, report: finishReport(scene.id, issues, executed) };
  }
}
