import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const livingShotPath = 'tools/renderer/level2-living-shot-gate.test.mjs';
const devLoopPath = 'tools/scripts/shot03-level2-dev-loop.mjs';

test('routine renderer tests skip human acceptance while the focused dev loop explicitly enforces it', async () => {
  const [livingShotSource, devLoopSource] = await Promise.all([
    readFile(livingShotPath, 'utf8'),
    readFile(devLoopPath, 'utf8'),
  ]);

  assert.match(
    livingShotSource,
    /SRF_ENFORCE_SHOT03_LEVEL2_MILESTONE/,
  );
  assert.match(livingShotSource, /t\.skip\(/);
  assert.match(
    livingShotSource,
    /focused Level 2 dev loop, not routine renderer tests/,
  );

  assert.match(devLoopSource, /SRF_ENFORCE_SHOT03_LEVEL2_MILESTONE/);
  assert.match(devLoopSource, /test\.mode === 'milestone'/);
  assert.match(devLoopSource, /\[MILESTONE_ENV\]: '1'/);
  assert.match(devLoopSource, /known-red/);
});
