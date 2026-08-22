export const proofScene = {
  id: 'chapter-01-reel-01-animation-proof',
  title: 'The Voyage Begins',
  series: 'Blessings of Sumer',
  width: 1080,
  height: 1920,
  fps: 30,
  durationFrames: 900,
  captions: [
    {
      startFrame: 45,
      endFrame: 210,
      text: 'A reed boat enters the bright water.',
    },
    {
      startFrame: 240,
      endFrame: 435,
      text: 'The guide turns as the marsh begins to move.',
    },
    {
      startFrame: 480,
      endFrame: 690,
      text: 'The camera finds the way toward the distant city.',
    },
    {
      startFrame: 720,
      endFrame: 870,
      text: 'This is a motion proof, not a final story edit.',
    },
  ],
  mouthCues: [
    { startFrame: 48, endFrame: 74, shape: 'wide' },
    { startFrame: 75, endFrame: 100, shape: 'open' },
    { startFrame: 101, endFrame: 130, shape: 'rest' },
    { startFrame: 250, endFrame: 285, shape: 'open' },
    { startFrame: 286, endFrame: 322, shape: 'wide' },
    { startFrame: 323, endFrame: 354, shape: 'rest' },
    { startFrame: 492, endFrame: 535, shape: 'wide' },
    { startFrame: 536, endFrame: 575, shape: 'open' },
    { startFrame: 576, endFrame: 615, shape: 'rest' },
    { startFrame: 728, endFrame: 760, shape: 'open' },
    { startFrame: 761, endFrame: 805, shape: 'wide' },
    { startFrame: 806, endFrame: 852, shape: 'rest' },
  ],
} as const;

export type MouthShape = (typeof proofScene.mouthCues)[number]['shape'];
