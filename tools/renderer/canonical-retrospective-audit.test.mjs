import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import * as ts from 'typescript';

test('canonical approved audit renderer is syntactically valid and read-only by contract', async () => {
  const path = resolve('tools/scripts/render-approved-shot-audit-preview.ts');
  const source = await readFile(path, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
  });
  const errors = (compiled.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.deepEqual(
    errors.map((diagnostic) => diagnostic.messageText),
    [],
  );
  assert.match(source, /canonical-approved-checksum-qa/);
  assert.match(source, /priorHumanApprovalPreserved: true/);
  assert.match(source, /automaticDowngradeAllowed: false/);
  assert.match(source, /animationV1Modified: false/);
  assert.doesNotMatch(source, /writeJson\(MANIFEST_PATH/);
});

test('retrospective audit stages approved canonical assets before modern review', async () => {
  const source = await readFile(
    resolve('tools/scripts/audit-animation-reel.mjs'),
    'utf8',
  );
  assert.match(source, /render-approved-shot-audit-preview\.ts/);
  assert.match(source, /previewSource = 'canonical-approved'/);
  assert.match(source, /--preview-dir=\$\{previewDirectory\}/);
  assert.match(source, /automaticDowngradeAllowed: false/);
  assert.match(source, /manifestMutationAllowed: false/);
});

test('canonical staging verifies approval, dimensions, and checksum provenance', async () => {
  const source = await readFile(
    resolve('tools/scripts/render-approved-shot-audit-preview.ts'),
    'utf8',
  );
  assert.match(source, /shot\.status !== 'approved'/);
  assert.match(source, /layer\.review\?\.status !== 'approved'/);
  assert.match(source, /normalizeChecksum\(layer\.sha256\) !== normalizeChecksum\(checksum\)/);
  assert.match(source, /expected editorial registration/);
});
