export interface StoryBinding {
  projectId: string;
  chapterId: string;
  reelId?: string;
  shotId?: string;
  manuscriptRevision: string;
  narrativeThreadIds?: readonly string[];
}
