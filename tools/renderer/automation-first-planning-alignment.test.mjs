import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve('.');
const authoritative = [
  'planning/animation-v3-reset/README.md',
  'planning/animation-v3-reset/automation-first-character-performance.md',
  'planning/animation-v3-reset/current-implementation-status-and-roadmap.md',
  'planning/animation-v3-reset/implementation-backlog.md',
  'planning/animation-v3-reset/package-adoption-matrix.md',
  'planning/animation-v3-reset/enki-character-bible-v1.md',
  'planning/animation-v3-reset/actor-performance-clip-contract.md',
  'planning/animation-v3-reset/runtime-spike-playbooks.md',
  'planning/animation-v3-reset/benchmark-specifications.md',
  'planning/animation-v3-reset/phase-exit-checklists.md',
  'planning/animation-v3-reset/risk-register.md',
];

const docs = new Map(
  await Promise.all(
    authoritative.map(async (path) => [path, await readFile(resolve(ROOT, path), 'utf8')]),
  ),
);

test('authoritative V3 planning names automation-first character performance as the default', () => {
  for (const [path, source] of docs) {
    assert.match(
      source,
      /automation|headless|backend-neutral|manual GUI|manual editor/i,
      `${path} must explicitly reflect the automation-first actor policy`,
    );
  }
});

test('authoritative planning does not restore Rive as the required hero runtime', () => {
  const forbidden = [
    /Phase 5\s+Rive performance runtime/i,
    /Rive primary/i,
    /Rive:\s*Enki body\/face articulation/i,
    /Rive:\s*Enlil/i,
    /Reel 1 does not resume until both material and hero-performance benchmarks are proven/i,
    /The first Rive spike should derive/i,
  ];
  for (const [path, source] of docs) {
    for (const pattern of forbidden) {
      assert.doesNotMatch(source, pattern, `${path} contains superseded Rive-first planning`);
    }
  }
});

test('Rive references in the current authority set are explicitly optional, deferred, historical, or evidence', () => {
  for (const [path, source] of docs) {
    if (!/Rive/i.test(source)) continue;
    assert.match(
      source,
      /Rive[\s\S]{0,180}(optional|defer|historical|evidence)|(?:optional|defer|historical|evidence)[\s\S]{0,180}Rive/i,
      `${path} mentions Rive without an explicit non-default status`,
    );
  }
});

test('planning keeps human review as acceptance rather than recurring manual authoring', () => {
  const policy = docs.get('planning/animation-v3-reset/automation-first-character-performance.md');
  assert.match(policy, /Human work is a \*\*review\/approval gate\*\*/);
  assert.match(policy, /MUST NOT require a person to open a GUI editor for each actor, shot or reel/);
  assert.match(policy, /rejects\/falls back/i);
});

test('LivePortrait remains experimental and commercially license-gated', () => {
  const adoption = docs.get('planning/animation-v3-reset/package-adoption-matrix.md');
  assert.match(adoption, /LivePortrait/);
  assert.match(adoption, /NOT ADOPTED/i);
  assert.match(adoption, /InsightFace/);
  assert.match(adoption, /non-commercial research/i);
});
