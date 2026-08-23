import 'dotenv/config';
import { fetchComfyHostInventory } from '../renderer/comfyui-host-inventory.mjs';

const asJson = process.argv.includes('--json');
const baseUrlArg = process.argv.find((arg) => arg.startsWith('--base-url='));
const baseUrl = (
  baseUrlArg?.slice('--base-url='.length) ??
  process.env.COMFYUI_BASE_URL ??
  'http://127.0.0.1:8188'
).replace(/\/$/, '');

async function main() {
  try {
    const inventory = await fetchComfyHostInventory({ baseUrl });

    if (asJson) {
      console.log(
        JSON.stringify(
          {
            online: true,
            ...inventory,
            generationStarted: false,
          },
          null,
          2,
        ),
      );
      return;
    }

    console.log('ComfyUI animation-layer host inventory');
    console.log(`ComfyUI: ${inventory.baseUrl}`);
    console.log('Status: online');
    console.log(`API node types: ${inventory.nodeCount}`);
    console.log('');

    console.log('Likely segmentation / masking / layer-production nodes:');
    if (!inventory.layerNodeTypes.length) {
      console.log('  (none detected by name/category heuristics)');
    } else {
      for (const nodeType of inventory.layerNodeTypes) {
        console.log(`  - ${nodeType}`);
      }
    }

    console.log('');
    console.log('Installed model/resource selections relevant to layer workflows:');
    if (!inventory.resources.length) {
      console.log('  (none exposed as enum-backed ComfyUI inputs)');
    } else {
      for (const item of inventory.resources) {
        const preview = item.values.slice(0, 10).join(', ');
        const remainder =
          item.values.length > 10 ? ` (+${item.values.length - 10} more)` : '';
        console.log(
          `  - ${item.nodeType}.${item.inputName}: ${preview}${remainder}`,
        );
      }
    }

    console.log('');
    console.log('No workflow was queued and no GPU generation was started.');
    console.log(
      'Use --json for a machine-readable inventory suitable for sharing or saving.',
    );
  } catch (error) {
    const detail = describeFailure(error);
    const diagnostic = {
      online: false,
      baseUrl,
      error: detail,
      generationStarted: false,
      nextSteps: [
        `Start ComfyUI and confirm ${baseUrl} opens in a browser.`,
        `Confirm ${baseUrl}/system_stats responds.`,
        'If ComfyUI uses another port, set COMFYUI_BASE_URL or pass --base-url=http://127.0.0.1:<port>.',
        'Run this inventory command again after the API is reachable.',
      ],
    };

    if (asJson) {
      console.log(JSON.stringify(diagnostic, null, 2));
    } else {
      console.error('ComfyUI animation-layer host inventory');
      console.error(`ComfyUI: ${baseUrl}`);
      console.error('Status: offline / unreachable');
      console.error(`Reason: ${detail}`);
      console.error('');
      for (const step of diagnostic.nextSteps) {
        console.error(`- ${step}`);
      }
    }
    process.exitCode = 1;
  }
}

function describeFailure(error) {
  if (!(error instanceof Error)) return String(error);
  const cause = error.cause;
  const detail = cause?.code ?? cause?.message;
  return detail
    ? `${error.message} (${detail})`
    : error.message;
}

main();
