export interface PrepareContext {
  readonly sceneId: string;
  readonly sceneRevision: number;
  readonly sceneSeed: number;
  readonly mode: 'preview' | 'storybook' | 'render' | 'qa';
  readonly assetChecksums: Readonly<Record<string, string>>;
}
