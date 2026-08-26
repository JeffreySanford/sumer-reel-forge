import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const startAllSource = readFileSync(
  new URL('../scripts/start-all.mjs', import.meta.url),
  'utf8',
);

test('start:all reserves the API, Angular Studio and Animation Lab workstation ports', () => {
  assert.match(
    startAllSource,
    /const managedPorts = \[3000, 4200, 4300, 9229\];/,
  );
  assert.match(startAllSource, /assertPortFree\(3000\)/);
  assert.match(startAllSource, /assertPortFree\(4200\)/);
  assert.match(startAllSource, /assertPortFree\(4300\)/);
});

test('start:all launches and waits for the Angular Studio and Animation Lab separately', () => {
  assert.match(
    startAllSource,
    /startProcess\('web', \['nx', 'serve', 'web', '--port=4200'\]/,
  );
  assert.match(
    startAllSource,
    /\['nx', 'serve', 'animation-lab', '--port=4300'\]/,
  );
  assert.match(startAllSource, /waitForPort\(4200, 60000\)/);
  assert.match(startAllSource, /waitForPort\(4300, 60000\)/);
  assert.match(startAllSource, /Studio: http:\/\/localhost:4200/);
  assert.match(startAllSource, /Animation Lab: http:\/\/localhost:4300/);
});

test('start:all cleanup treats Animation Lab as a managed repo-local dev server', () => {
  assert.match(startAllSource, /\(api\|web\|animation-lab\)/);
  assert.match(
    startAllSource,
    /Press Ctrl\+C to stop Studio\/API\/Animation Lab dev servers\./,
  );
});
