import type { Meta, StoryObj } from '@storybook/angular';
import { LayerCandidateReviewCardComponent } from './layer-candidate-review-card.component';

const meta: Meta<LayerCandidateReviewCardComponent> = {
  title: 'Studio/Layer Candidate Review',
  component: LayerCandidateReviewCardComponent,
  args: {
    layerId: 'shot03-water-v1',
    layerLabel: 'Water',
    material: 'fluid / reflective',
    state: 'candidate',
    previewAvailable: true,
    diagnosticAvailable: true,
    note: 'AI-generated candidate remains isolated until human review approves it.',
  },
};

export default meta;
type Story = StoryObj<LayerCandidateReviewCardComponent>;

export const CandidatePending: Story = {};

export const WaterMotionQaPassed: Story = {
  args: {
    state: 'qa-pass',
    meanDifference: 0.8017,
    changedPixelRatio: 0.088324,
    note: 'Rendered-motion QA passed. Human review still decides whether the water movement is cinematic and physically believable.',
  },
};

export const WaterMotionQaFailed: Story = {
  args: {
    state: 'qa-fail',
    meanDifference: 0.005,
    changedPixelRatio: 0.00002,
    note: 'Rendered pixels did not change enough to count as a working motion proof.',
  },
};

export const VesselCandidateReady: Story = {
  args: {
    layerId: 'shot03-vessel-v1',
    layerLabel: 'Vessel',
    material: 'wood / rigid',
    state: 'candidate',
    meanDifference: null,
    changedPixelRatio: null,
    note: 'Vessel candidate is ready for heavy-motion diagnostic preview and motion QA.',
  },
};

export const Approved: Story = {
  args: {
    state: 'approved',
    meanDifference: 0.8017,
    changedPixelRatio: 0.088324,
    note: 'Human review approved this candidate for promotion into animation-v1.',
  },
};

export const Rejected: Story = {
  args: {
    state: 'rejected',
    meanDifference: 0.921,
    changedPixelRatio: 0.104,
    note: 'Motion existed, but the candidate failed artistic or segmentation review and must not be promoted.',
  },
};
