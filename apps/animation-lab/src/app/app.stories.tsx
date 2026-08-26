import type { Meta, StoryObj } from '@storybook/react-vite';
import { App } from './app';
import {
  GOLDEN_FAKE_RUNTIME_PREVIEW_ADAPTER,
  type RuntimePreviewAdapter,
} from './runtime-preview';

const meta: Meta<typeof App> = {
  component: App,
  title: 'Studio/Scene/AnimationLab',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof App>;

export const BlinkClosed: Story = {
  args: {
    initialFrame: 101,
  },
};

export const StartFrame: Story = {
  args: {
    initialFrame: 0,
  },
};

export const EndSettled: Story = {
  args: {
    initialFrame: 209,
  },
};

export const DiagnosticFallback: Story = {
  args: {
    initialFrame: 101,
    previewRenderer: 'diagnostic',
  },
};

const failingAdapter: RuntimePreviewAdapter = {
  id: 'storybook-failure@1',
  evaluate() {
    throw new Error('Synthetic Storybook runtime failure.');
  },
};

export const RuntimeError: Story = {
  render: () => <App previewAdapter={failingAdapter} />,
};

const emptyAdapter: RuntimePreviewAdapter = {
  id: 'storybook-empty@1',
  evaluate({ inspection }) {
    return {
      adapterId: this.id,
      frame: inspection.exactFrame.frame,
      evaluatedRuntimeCount: 1,
      nodes: [],
    };
  },
};

export const RuntimeEmpty: Story = {
  render: () => <App previewAdapter={emptyAdapter} />,
};

const staleEvidenceAdapter: RuntimePreviewAdapter = {
  id: 'storybook-stale-evidence@1',
  evaluate(input) {
    const model = GOLDEN_FAKE_RUNTIME_PREVIEW_ADAPTER.evaluate(input);
    if (!model.evidence) return model;
    return {
      ...model,
      adapterId: this.id,
      evidence: {
        ...model.evidence,
        status: 'STALE',
      },
    };
  },
};

export const RuntimeStaleEvidence: Story = {
  render: () => <App previewAdapter={staleEvidenceAdapter} />,
};
