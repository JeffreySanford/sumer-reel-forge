// Stable public entrypoint for the Shot 3 Level 2 Enki blink lane.
// The implementation lives in the v2 module so the dev-loop command remains unchanged.
void import('./shot03-level2-enki-blink-v2.mjs').catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
