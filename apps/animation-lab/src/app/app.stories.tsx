import type { Meta, StoryObj } from '@storybook/react-vite';
import { App } from './app';

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
