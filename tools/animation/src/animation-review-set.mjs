import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { readdir } from 'node:fs/promises';

export function validateReviewSet(value) {
  if (!value || value.schemaVersion !== 1) throw new Error('Review set schemaVersion 1 is required.');
  if (!nonEmpty(value.reviewSetId) || !nonEmpty(value.title)) throw new Error('Review set id/title are required.');
  if (!Number.isInteger(value.shot) || value.shot < 1) throw new Error('Review set shot must be a positive integer.');
  if (!Array.isArray(value.candidates) || value.candidates.length < 2) throw new Error('Review set needs at least two candidates.');
  const ids = new Set();
  for (const candidate of value.candidates) {
    for (const key of ['id', 'label', 'role', 'humanStatus', 'proofRoot', 'reportFile', 'proofType', 'videoArtifactKey']) {
      if (!nonEmpty(candidate?.[key])) throw new Error(`Review candidate ${candidate?.id ?? '<unknown>'} is missing ${key}.`);
    }
    if (ids.has(candidate.id)) throw new Error(`Duplicate review candidate id ${candidate.id}.`);
    ids.add(candidate.id);
    if (candidate.role === 'rejected-reference' && candidate.selectable !== false) {
      throw new Error(`Rejected reference ${candidate.id} must not be selectable.`);
    }
  }
  if (!ids.has(value.currentBaselineId)) throw new Error(`Current baseline ${value.currentBaselineId} is not in the review set.`);
  const baseline = value.candidates.find((candidate) => candidate.id === value.currentBaselineId);
  if (baseline?.humanStatus !== 'accepted') throw new Error('Current baseline must carry humanStatus=accepted.');
  if (value.policy?.automaticPromotionAllowed !== false) throw new Error('Review set must explicitly disable automatic promotion.');
  return value;
}

export async function loadReviewSet(path) {
  const absolutePath = resolve(path);
  const parsed = JSON.parse(await readFile(absolutePath, 'utf8'));
  return { path: absolutePath, reviewSet: validateReviewSet(parsed) };
}

export async function resolveReviewCandidates(reviewSet, root = '.') {
  const resolved = [];
  for (const candidate of reviewSet.candidates) {
    const proofRoot = resolve(root, candidate.proofRoot);
    const latest = await latestPassingReport(proofRoot, candidate);
    resolved.push({ ...candidate, ...latest });
  }
  return resolved;
}

export function currentBaseline(reviewSet, candidates) {
  const candidate = candidates.find((item) => item.id === reviewSet.currentBaselineId);
  if (!candidate) throw new Error(`Resolved review set is missing current baseline ${reviewSet.currentBaselineId}.`);
  return candidate;
}

async function latestPassingReport(proofRoot, candidate) {
  if (!existsSync(proofRoot)) throw new Error(`Proof root missing for ${candidate.id}: ${proofRoot}`);
  const directories = (await readdir(proofRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(proofRoot, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));
  for (const directory of directories) {
    const reportPath = join(directory, candidate.reportFile);
    if (!existsSync(reportPath)) continue;
    try {
      const report = JSON.parse(await readFile(reportPath, 'utf8'));
      if (report.proofType !== candidate.proofType) continue;
      if (report.technicalEvidence?.pass !== true) continue;
      const videoPath = resolve(report.artifacts?.[candidate.videoArtifactKey] ?? '');
      if (!videoPath || !existsSync(videoPath)) continue;
      return {
        proofDirectory: directory,
        reportPath,
        report,
        videoPath,
        aiReviewPath: report.aiReviewPath ? resolve(report.aiReviewPath) : null,
        aiStatus: report.aiStatus ?? null,
      };
    } catch {
      continue;
    }
  }
  throw new Error(`No passing ${candidate.id} proof with video artifact ${candidate.videoArtifactKey} was found under ${proofRoot}.`);
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
