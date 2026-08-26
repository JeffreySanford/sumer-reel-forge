import type { Meta, StoryObj } from '@storybook/react-vite';
import { App } from './app';
import type { RuntimePreviewAdapter } from './runtime-preview';

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