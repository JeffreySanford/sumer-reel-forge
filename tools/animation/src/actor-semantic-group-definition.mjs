import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function loadActorSemanticGroupDefinition(path) {
  const absolutePath = resolve(path);
  const parsed = JSON.parse(await readFile(absolutePath, 'utf8'));
  return { path: absolutePath, definition: validateActorSemanticGroupDefinition(parsed) };
}

export function validateActorSemanticGroupDefinition(value) {
  if (!value || value.schemaVersion !== 1) throw new Error('Actor semantic group schemaVersion 1 is required.');
  if (!nonEmpty(value.actorId) || !nonEmpty(value.definitionId)) throw new Error('Actor semantic group actorId/definitionId are required.');
  if (!Array.isArray(value.groups) || value.groups.length < 1) throw new Error('At least one semantic group is required.');

  const groupIds = new Set();
  const regionIds = new Set();
  const anchorIds = new Set();
  for (const group of value.groups) {
    if (!nonEmpty(group.id)) throw new Error('Semantic group id is required.');
    if (groupIds.has(group.id)) throw new Error(`Duplicate semantic group id ${group.id}.`);
    groupIds.add(group.id);
    if (!Array.isArray(group.regions) || !group.regions.length) throw new Error(`Semantic group ${group.id} requires regions.`);
    if (!Array.isArray(group.anchors)) throw new Error(`Semantic group ${group.id} anchors must be an array.`);
    for (const id of group.regions) {
      if (!nonEmpty(id)) throw new Error(`Semantic group ${group.id} contains an invalid region id.`);
      if (regionIds.has(id)) throw new Error(`Semantic region ${id} appears in more than one group.`);
      regionIds.add(id);
    }
    for (const id of group.anchors) {
      if (!nonEmpty(id)) throw new Error(`Semantic group ${group.id} contains an invalid anchor id.`);
      if (anchorIds.has(id)) throw new Error(`Semantic anchor ${id} appears in more than one group.`);
      anchorIds.add(id);
    }
  }

  if (value.policy?.maxCoordinateRepairAttemptsPerGroup !== 1) {
    throw new Error('Actor semantic groups must keep exactly one coordinate repair attempt per group.');
  }
  if (value.policy?.automaticPromotionAllowed !== false) {
    throw new Error('Actor semantic groups must explicitly disable automatic promotion.');
  }
  if (value.policy?.humanReviewRequired !== true) {
    throw new Error('Actor semantic groups must require human review.');
  }
  return value;
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
