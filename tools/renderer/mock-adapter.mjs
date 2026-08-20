import { join } from 'node:path';
import { writeText, toSrt } from './artifact-utils.mjs';
import {
  assembleVideo,
  createSilentAudio,
  isFfmpegAvailable,
} from './ffmpeg-adapter.mjs';

const CARD_COLORS = [
  ['#102e31', '#d6ad58'],
  ['#293a36', '#b9c9ad'],
  ['#3c2626', '#deb96c'],
  ['#1b2b3a', '#b7c9d6'],
  ['#3b3528', '#d7c88f'],
  ['#23352e', '#d3a85a'],
  ['#312a3a', '#c9b5d4'],
  ['#28373b', '#d7b96f'],
];

export async function renderMockPipeline(context) {
  const { episode, outputDirectory, log, config } = context;
  await log(
    'system',
    'info',
    'Mock adapter is creating deterministic storyboard cards and a timed MP4.',
  );

  const narrationPath = join(outputDirectory, 'narration.txt');
  const captionsPath = join(outputDirectory, 'captions.srt');
  await writeText(narrationPath, `${episode.narration}\n`);
  await writeText(
    captionsPath,
    toSrt(episode.onScreenText, episode.targetDurationSeconds),
  );

  const frames = await renderCards(episode, outputDirectory, log);
  const artifacts = frames.map((frame, index) => ({
    assetType: 'image',
    shotNumber: index + 1,
    path: frame.path,
    metadata: {
      adapter: 'mock',
      placeholder: true,
      width: 540,
      height: 960,
      durationSeconds: frame.durationSeconds,
    },
  }));
  artifacts.push({
    assetType: 'captions',
    path: captionsPath,
    metadata: { adapter: 'mock', format: 'srt' },
  });
  artifacts.push({
    assetType: 'other',
    path: narrationPath,
    metadata: { adapter: 'mock', role: 'narration-script' },
  });

  if (!(await isFfmpegAvailable(config.ffmpegCommand, log))) {
    return artifacts;
  }

  const audioPath = join(outputDirectory, 'narration.wav');
  const videoPath = join(outputDirectory, 'reel.mp4');
  await createSilentAudio({
    command: config.ffmpegCommand,
    durationSeconds: episode.targetDurationSeconds,
    outputPath: audioPath,
    outputDirectory,
    timeoutMs: config.processTimeoutMs,
    log,
  });
  await assembleVideo({
    command: config.ffmpegCommand,
    frames,
    audioPath,
    captionsPath,
    outputPath: videoPath,
    outputDirectory,
    timeoutMs: config.processTimeoutMs,
    log,
  });
  artifacts.push(
    {
      assetType: 'audio',
      path: audioPath,
      metadata: {
        adapter: 'mock',
        placeholder: true,
        durationSeconds: episode.targetDurationSeconds,
      },
    },
    {
      assetType: 'video',
      path: videoPath,
      metadata: {
        adapter: 'mock',
        placeholder: true,
        width: 540,
        height: 960,
        durationSeconds: episode.targetDurationSeconds,
      },
    },
  );
  return artifacts;
}

async function renderCards(episode, outputDirectory, log) {
  let browser;
  try {
    const { chromium } = await import('@playwright/test');
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 540, height: 960 },
      deviceScaleFactor: 1,
    });
    await page.setContent(cardMarkup());

    const frames = [];
    for (const [index, shot] of episode.shots.entries()) {
      const path = join(
        outputDirectory,
        `shot-${String(index + 1).padStart(2, '0')}.png`,
      );
      const colors = CARD_COLORS[index % CARD_COLORS.length];
      await page.evaluate(
        ({
          episodeNumber,
          episodeTitle,
          shotNumber,
          visual,
          time,
          background,
          accent,
        }) => {
          document.body.style.background = background;
          document.documentElement.style.setProperty('--accent', accent);
          document.querySelector('[data-episode]').textContent =
            `CHAPTER 1 / EPISODE ${episodeNumber}`;
          document.querySelector('[data-title]').textContent = episodeTitle;
          document.querySelector('[data-shot]').textContent =
            `SHOT ${shotNumber}`;
          document.querySelector('[data-visual]').textContent = visual;
          document.querySelector('[data-time]').textContent = time;
        },
        {
          episodeNumber: episode.episode,
          episodeTitle: episode.title,
          shotNumber: index + 1,
          visual: shot.visual,
          time: shot.time,
          background: colors[0],
          accent: colors[1],
        },
      );
      await page.screenshot({ path });
      frames.push({ path, durationSeconds: shot.durationSeconds });
      await log('system', 'info', `Created mock visual for shot ${index + 1}.`);
    }
    return frames;
  } finally {
    await browser?.close();
  }
}

function cardMarkup() {
  return `<!doctype html>
<html><head><style>
*{box-sizing:border-box}html,body{width:540px;height:960px;margin:0;overflow:hidden}
body{display:grid;grid-template-rows:auto 1fr auto;padding:54px 42px;color:#fff;font-family:Arial,sans-serif}
header{border-top:6px solid var(--accent);padding-top:18px}
.eyebrow,.time{color:var(--accent);font-size:18px;font-weight:800;letter-spacing:2px}
h1{max-width:430px;margin:16px 0 0;font-size:48px;line-height:1.02;letter-spacing:0}
main{display:flex;align-items:center}.visual{font-family:Georgia,serif;font-size:34px;line-height:1.24}
footer{display:flex;align-items:end;justify-content:space-between;border-bottom:6px solid var(--accent);padding-bottom:18px}
.shot{font-size:22px;font-weight:800}.time{font-size:16px}
</style></head><body><header><div class="eyebrow" data-episode></div><h1 data-title></h1></header>
<main><div class="visual" data-visual></div></main><footer><div class="shot" data-shot></div><div class="time" data-time></div></footer></body></html>`;
}
