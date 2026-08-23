import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DEFAULT_LIBRARY_PATH = resolve('tools/creative/style-decisions-v1.json');
const DEFAULT_LANE_REGISTRY_PATH = resolve('tools/animation/production-lanes-v1.json');

export async function loadStyleDecisionLibrary(path = DEFAULT_LIBRARY_PATH) {
  return JSON.parse(await readFile(resolve(path), 'utf8'));
}

export async function loadProductionLaneRegistry(path = DEFAULT_LANE_REGISTRY_PATH) {
  return JSON.parse(await readFile(resolve(path), 'utf8'));
}

export function resolveStyleDecisions(library, context, options = {}) {
  const includeProvisional = options.includeProvisional !== false;
  const decisions = (library.decisions ?? [])
    .filter((decision) => decision.state === 'approved' || (includeProvisional && decision.state === 'provisional'))
    .filter((decision) => scopeMatches(decision.scope ?? {}, context))
    .sort(compareDecisionSpecificity);

  const resolved = new Map();
  for (const decision of decisions) {
    const existing = resolved.get(decision.path);
    if (!existing || specificity(decision.scope) >= specificity(existing.scope)) {
      resolved.set(decision.path, decision);
    }
  }
  return [...resolved.values()].sort((a, b) => a.path.localeCompare(b.path));
}

export function resolveLayerProductionLane(registry, layer) {
  const matches = (registry.lanes ?? [])
    .filter((lane) => laneMatches(lane.match ?? {}, layer))
    .sort((a, b) => laneSpecificity(b.match) - laneSpecificity(a.match));
  if (!matches.length) return undefined;
  const bestScore = laneSpecificity(matches[0].match);
  const best = matches.filter((lane) => laneSpecificity(lane.match) === bestScore);
  if (best.length > 1) {
    throw new Error(
      `Ambiguous production lane for ${layer.id}: ${best.map((lane) => lane.id).join(', ')}`,
    );
  }
  return matches[0];
}

export function buildDecisionContext({ manifest, shot, layer }) {
  return {
    projectSlug: manifest.projectSlug,
    chapterNumber: manifest.chapterNumber,
    episodeNumber: manifest.episodeNumber,
    shotId: shot.shotId,
    sourceShotNumber: shot.sourceShotNumber,
    layerId: layer?.id,
    role: layer?.role,
    material: layer?.material,
    character: inferCharacter(layer),
  };
}

export function serializeResolvedDecisions(decisions) {
  return decisions.map((decision) => ({
    id: decision.id,
    state: decision.state,
    scope: decision.scope,
    path: decision.path,
    value: decision.value,
    rationale: decision.rationale,
    source: decision.source,
  }));
}

function scopeMatches(scope, context) {
  switch (scope.type) {
    case 'project':
      return optionalEquals(scope.projectSlug, context.projectSlug);
    case 'reel':
      return (
        optionalEquals(scope.projectSlug, context.projectSlug) &&
        optionalEquals(scope.chapterNumber, context.chapterNumber) &&
        optionalEquals(scope.episodeNumber, context.episodeNumber)
      );
    case 'shot':
      return optionalEquals(scope.shotId, context.shotId);
    case 'layer':
      return optionalEquals(scope.layerId, context.layerId);
    case 'material':
      return optionalEquals(scope.material, context.material);
    case 'role':
      return optionalEquals(scope.role, context.role);
    case 'character':
      return optionalEquals(scope.character, context.character);
    default:
      return false;
  }
}

function compareDecisionSpecificity(a, b) {
  const score = specificity(a.scope) - specificity(b.scope);
  return score || a.path.localeCompare(b.path) || a.id.localeCompare(b.id);
}

function specificity(scope = {}) {
  switch (scope.type) {
    case 'project':
      return 10;
    case 'reel':
      return 20;
    case 'role':
      return 30;
    case 'material':
      return 40;
    case 'character':
      return 50;
    case 'shot':
      return 60;
    case 'layer':
      return 70;
    default:
      return 0;
  }
}

function laneMatches(match, layer) {
  for (const [key, expected] of Object.entries(match)) {
    if (layer[key] !== expected) return false;
  }
  return true;
}

function laneSpecificity(match = {}) {
  return Object.keys(match).length;
}

function optionalEquals(expected, actual) {
  return expected === undefined || expected === actual;
}

function inferCharacter(layer) {
  if (!layer) return undefined;
  const values = [layer.id, layer.anchor, layer.material]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (values.includes('enki')) return 'enki';
  if (values.includes('nammu')) return 'nammu';
  return undefined;
}
