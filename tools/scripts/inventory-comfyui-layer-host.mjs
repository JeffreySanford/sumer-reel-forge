import 'dotenv/config';
import { fetchComfyHostInventory } from '../renderer/comfyui-host-inventory.mjs';

const asJson = process.argv.includes('--json');

async function main() {
  const baseUrl = (
    process.env.COMFYUI_BASE_URL ?? 'http://127.0.0.1:8188'
  ).replace(/\/$/, '');
  const inventory = await fetchComfyHostInventory({ baseUrl });

  if (asJson) {
    console.log(JSON.stringify(inventory, null, 2));
    return;
  }

  console.log('ComfyUI animation-layer host inventory');
  console.log(`ComfyUI: ${inventory.baseUrl}`);
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
      const remainder = item.values.length > 10 ? ` (+${item.values.length - 10} more)` : '';
      console.log(`  - ${item.nodeType}.${item.inputName}: ${preview}${remainder}`);
    }
  }

  console.log('');
  console.log('No workflow was queued and no GPU generation was started.');
  console.log('Use --json for a machine-readable inventory suitable for sharing or saving.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
