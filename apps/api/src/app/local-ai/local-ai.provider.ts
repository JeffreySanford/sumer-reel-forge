export type LocalAiProviderId =
  | 'ollama'
  | 'llamacpp'
  | 'lmstudio'
  | 'nvidia-nim';

export interface LocalAiCapabilities {
  text: boolean;
  vision: boolean;
  structuredOutput: boolean;
  modelInventory: boolean;
  managedUnload: boolean;
  managedStartup: boolean;
  openAiCompatible: boolean;
}

export interface LocalAiProviderCapability extends LocalAiCapabilities {
  id: LocalAiProviderId;
  available: boolean;
  baseUrl: string;
  configuredModel?: string;
  configuredVisionModel?: string;
  detail?: string;
}

export interface LocalAiModelDescriptor {
  id: string;
  provider: LocalAiProviderId;
  configuredFor: Array<'text' | 'vision'>;
}

export interface LocalAiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];
}

export interface ManagedChatRequest {
  owner: string;
  task: string;
  model: string;
  messages: LocalAiMessage[];
  format?: unknown;
  options?: Record<string, unknown>;
  timeoutMs?: number;
  leaseTimeoutMs?: number;
  unloadTimeoutMs?: number;
  keepAlive?: string;
  errorPrefix?: string;
}

export interface ManagedChatResult {
  provider: LocalAiProviderId;
  model: string;
  content: string;
}

export interface LocalAiProvider {
  readonly id: LocalAiProviderId;
  getCapability(): Promise<LocalAiProviderCapability>;
  listModels(): Promise<LocalAiModelDescriptor[]>;
  chat(request: ManagedChatRequest): Promise<ManagedChatResult>;
}
