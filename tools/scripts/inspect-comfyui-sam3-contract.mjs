import 'dotenv/config';

const baseUrl = (
  process.env.COMFYUI_BASE_URL ?? 'http://127.0.0.1:8188'
).replace(/\/$/, '');
const nodeType = process.argv[2] ?? 'SAM3_Detect';

await main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const response = await fetch(`${baseUrl}/object_info`, {
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) {
    throw new Error(
      `ComfyUI /object_info returned HTTP ${response.status}: ${await response.text()}`,
    );
  }

  const objectInfo = await response.json();
  const definition = objectInfo?.[nodeType];
  if (!definition) {
    const similar = Object.keys(objectInfo ?? {})
      .filter((name) => /sam|segment/i.test(name))
      .sort();
    throw new Error(
      `${nodeType} is not installed. Similar segmentation nodes: ${similar.join(', ') || '<none>'}`,
    );
  }

  const outputTypes = Array.isArray(definition.output) ? definition.output : [];
  const outputNames = Array.isArray(definition.output_name)
    ? definition.output_name
    : [];
  const outputIsList = Array.isArray(definition.output_is_list)
    ? definition.output_is_list
    : [];

  console.log(`ComfyUI node contract: ${nodeType}`);
  console.log(`Host: ${baseUrl}`);
  console.log(`Display name: ${definition.display_name ?? '<none>'}`);
  console.log(`Category: ${definition.category ?? '<none>'}`);
  console.log(`Outputs: ${outputTypes.length}`);

  for (let index = 0; index < outputTypes.length; index += 1) {
    console.log(
      `  [${index}] type=${String(outputTypes[index])} name=${String(outputNames[index] ?? '<unnamed>')} list=${String(outputIsList[index] ?? false)}`,
    );
  }

  const maskIndexes = outputTypes
    .map((type, index) => ({ type: String(type).toUpperCase(), index }))
    .filter((item) => item.type === 'MASK')
    .map((item) => item.index);

  console.log('');
  console.log(`Current Shot 3 workflows wire SAM3_Detect output index 0 into JoinImageWithAlpha.alpha.`);
  if (!outputTypes.length) {
    console.log('[BLOCKED] The installed node exposes no output metadata in /object_info.');
    process.exitCode = 2;
    return;
  }

  if (String(outputTypes[0]).toUpperCase() === 'MASK') {
    console.log('[OK] output index 0 is MASK; the existing wire is type-correct.');
  } else if (maskIndexes.length) {
    console.log(
      `[FAIL] output index 0 is ${String(outputTypes[0])}, not MASK. MASK output index(es): ${maskIndexes.join(', ')}.`,
    );
    console.log('[NEXT] Fix the workflow wire before any more segmentation experiments.');
    process.exitCode = 2;
  } else {
    console.log(
      `[FAIL] ${nodeType} exposes no MASK output. The current JoinImageWithAlpha workflow is architecturally invalid for this node.`,
    );
    process.exitCode = 2;
  }

  console.log('');
  console.log('Raw output contract:');
  console.log(
    JSON.stringify(
      {
        output: definition.output ?? null,
        output_name: definition.output_name ?? null,
        output_is_list: definition.output_is_list ?? null,
      },
      null,
      2,
    ),
  );
}
