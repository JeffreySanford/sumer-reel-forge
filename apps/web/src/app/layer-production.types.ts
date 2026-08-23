export interface ComfyUiResourceChoice {
  nodeType: string;
  inputName: string;
  values: Array<string | number | boolean>;
}

export interface ComfyUiLayerFamilies {
  segmentation: string[];
  matting: string[];
  backgroundRemoval: string[];
  depth: string[];
  inpaint: string[];
}

export interface ComfyUiInventory {
  schemaVersion: number;
  baseUrl: string;
  observedAt: string;
  online: boolean;
  error: string | null;
  nodeCount: number;
  nodeTypes: string[];
  layerNodeTypes: string[];
  resources: ComfyUiResourceChoice[];
  families: ComfyUiLayerFamilies;
}

export interface ShotLayerTarget {
  id: string;
  label: string;
  role: string;
  material: string;
  required: boolean;
  recommendedFirst?: boolean;
  status: 'planned' | 'candidate' | 'approved';
}
