export function evaluateReelAnimationReadiness(manifest, options = {}) {
  if (!manifest || !Array.isArray(manifest.shots)) throw new Error('Animation manifest with shots is required.');
  const motionBaselines = options.motionBaselines ?? new Map();
  const rows = manifest.shots
    .slice()
    .sort((a, b) => Number(a.sourceShotNumber) - Number(b.sourceShotNumber))
    .map((shot) => evaluateShot(shot, motionBaselines.get(Number(shot.sourceShotNumber))));
  return {
    schemaVersion: 1,
    type: 'reel-animation-readiness',
    manifestId: manifest.manifestId ?? null,
    projectSlug: manifest.projectSlug ?? null,
    chapterNumber: manifest.chapterNumber ?? null,
    rows,
    summary: {
      totalShots: rows.length,
      requiredAssetsReady: rows.filter((row) => row.requiredAssetsReady).length,
      blockedShots: rows.filter((row) => !row.requiredAssetsReady).length,
      acceptedMotionBaselines: rows.filter((row) => row.motionBaseline?.humanStatus === 'accepted').length,
    },
  };
}

function evaluateShot(shot, motionBaseline) {
  const layers = Array.isArray(shot.layers) ? shot.layers : [];
  const requiredIds = shot.activationPolicy?.requiredLayerIds ?? [];
  const byId = new Map(layers.map((layer) => [layer.id, layer]));
  const required = requiredIds.map((id) => {
    const layer = byId.get(id);
    return {
      id,
      state: layer?.state ?? 'missing',
      reviewStatus: layer?.review?.status ?? null,
      ready: layer?.state === 'approved' && layer?.review?.status === 'approved',
    };
  });
  const requiredAssetsReady = required.every((item) => item.ready);
  const optional = layers
    .filter((layer) => !requiredIds.includes(layer.id))
    .map((layer) => ({
      id: layer.id,
      state: layer.state ?? 'unknown',
      reviewStatus: layer.review?.status ?? null,
      blocking: false,
    }));
  return {
    shotNumber: Number(shot.sourceShotNumber),
    shotId: shot.shotId,
    manifestStatus: shot.status ?? null,
    requiredAssetsReady,
    required,
    optional,
    motionBaseline: motionBaseline ?? null,
    releaseGate: requiredAssetsReady ? 'REQUIRED-ASSETS-READY' : 'BLOCKED-REQUIRED-ASSET',
  };
}
