import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { chromium } from '@playwright/test';

const SOURCE_PATH = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/shot-03/water.png',
);
const EXPECTED_SHA256 =
  'sha256:f77eb37906ae589b0483dd3a11504ee39cc1aa28500ec10dba5de14a3b6f8979';
const EXPECTED_WIDTH = 941;
const EXPECTED_HEIGHT = 1672;
const OUTPUT_ROOT = resolve(
  'tmp/animation-previews/pixi-shot03-water-mask-diagnostic',
);

void main().catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
});

async function main() {
  const source = await readFile(SOURCE_PATH);
  const sourceSha256 = prefixedSha(source);
  if (sourceSha256 !== EXPECTED_SHA256) {
    throw new Error(
      `Shot 3 water source checksum mismatch: expected ${EXPECTED_SHA256}, received ${sourceSha256}.`,
    );
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDirectory = join(OUTPUT_ROOT, stamp);
  await mkdir(outputDirectory, { recursive: true });

  console.log('Pixi Shot 3 water alpha-mask diagnostic');
  console.log(`Source: ${SOURCE_PATH}`);
  console.log(`SHA-256: ${sourceSha256}`);

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const result = await page.evaluate(
      async ({ dataUrl, expectedWidth, expectedHeight }) => {
        const image = new Image();
        image.src = dataUrl;
        await image.decode();

        if (image.naturalWidth !== expectedWidth || image.naturalHeight !== expectedHeight) {
          throw new Error(
            `Decoded water source is ${image.naturalWidth}x${image.naturalHeight}; expected ${expectedWidth}x${expectedHeight}.`,
          );
        }

        const canvas = document.createElement('canvas');
        canvas.width = expectedWidth;
        canvas.height = expectedHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('2D canvas context is unavailable.');
        context.clearRect(0, 0, expectedWidth, expectedHeight);
        context.drawImage(image, 0, 0);

        const pixels = context.getImageData(0, 0, expectedWidth, expectedHeight).data;
        const totalPixels = expectedWidth * expectedHeight;
        const thresholds = [0, 16, 64, 128, 250];
        const counts = Object.fromEntries(thresholds.map((threshold) => [threshold, 0]));
        let alphaSum = 0;
        let minX = expectedWidth;
        let minY = expectedHeight;
        let maxX = -1;
        let maxY = -1;

        for (let pixelIndex = 0; pixelIndex < totalPixels; pixelIndex += 1) {
          const alpha = pixels[pixelIndex * 4 + 3] ?? 0;
          alphaSum += alpha;
          for (const threshold of thresholds) {
            if (alpha > threshold) counts[threshold] += 1;
          }

          if (alpha > 16) {
            const x = pixelIndex % expectedWidth;
            const y = Math.floor(pixelIndex / expectedWidth);
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }

        const alphaBounds = maxX >= 0
          ? {
              x: minX,
              y: minY,
              width: maxX - minX + 1,
              height: maxY - minY + 1,
            }
          : null;

        function renderAlphaDiagnostic(binaryThreshold) {
          const diagnostic = document.createElement('canvas');
          diagnostic.width = expectedWidth;
          diagnostic.height = expectedHeight;
          const diagnosticContext = diagnostic.getContext('2d');
          if (!diagnosticContext) throw new Error('Diagnostic 2D canvas context is unavailable.');
          const output = diagnosticContext.createImageData(expectedWidth, expectedHeight);

          for (let pixelIndex = 0; pixelIndex < totalPixels; pixelIndex += 1) {
            const alpha = pixels[pixelIndex * 4 + 3] ?? 0;
            const value = binaryThreshold === null ? alpha : alpha > binaryThreshold ? 255 : 0;
            const offset = pixelIndex * 4;
            output.data[offset] = value;
            output.data[offset + 1] = value;
            output.data[offset + 2] = value;
            output.data[offset + 3] = 255;
          }

          diagnosticContext.putImageData(output, 0, 0);
          return diagnostic.toDataURL('image/png');
        }

        const percent = (count) => (count / totalPixels) * 100;
        const meaningfulCoveragePercent = percent(counts[16]);
        const coverageClass = meaningfulCoveragePercent < 25
          ? 'sparse-alpha-overlay'
          : meaningfulCoveragePercent < 65
            ? 'partial-region-alpha'
            : 'broad-region-alpha';

        return {
          width: expectedWidth,
          height: expectedHeight,
          totalPixels,
          counts,
          coveragePercent: Object.fromEntries(
            thresholds.map((threshold) => [threshold, percent(counts[threshold])]),
          ),
          alphaWeightedCoveragePercent: (alphaSum / (255 * totalPixels)) * 100,
          alphaBounds,
          alphaBoundsAreaPercent: alphaBounds
            ? ((alphaBounds.width * alphaBounds.height) / totalPixels) * 100
            : 0,
          coverageClass,
          grayscalePng: renderAlphaDiagnostic(null),
          binary16Png: renderAlphaDiagnostic(16),
          binary128Png: renderAlphaDiagnostic(128),
        };
      },
      {
        dataUrl: `data:image/png;base64,${source.toString('base64')}`,
        expectedWidth: EXPECTED_WIDTH,
        expectedHeight: EXPECTED_HEIGHT,
      },
    );

    const grayscalePath = join(outputDirectory, 'shot03-water-alpha-grayscale.png');
    const binary16Path = join(outputDirectory, 'shot03-water-alpha-binary-gt16.png');
    const binary128Path = join(outputDirectory, 'shot03-water-alpha-binary-gt128.png');
    const reportPath = join(outputDirectory, 'pixi-shot03-water-mask-diagnostic.json');

    await Promise.all([
      writeFile(grayscalePath, dataUrlBuffer(result.grayscalePng)),
      writeFile(binary16Path, dataUrlBuffer(result.binary16Png)),
      writeFile(binary128Path, dataUrlBuffer(result.binary128Png)),
    ]);

    const report = {
      schemaVersion: 1,
      diagnosticType: 'shot03-water-source-alpha-mask',
      generatedAt: new Date().toISOString(),
      source: {
        path: SOURCE_PATH,
        sha256: sourceSha256,
        width: result.width,
        height: result.height,
      },
      alpha: {
        totalPixels: result.totalPixels,
        thresholds: {
          anyAlphaGt0: summarizeThreshold(result, 0),
          meaningfulAlphaGt16: summarizeThreshold(result, 16),
          visibleAlphaGt64: summarizeThreshold(result, 64),
          strongAlphaGt128: summarizeThreshold(result, 128),
          nearOpaqueAlphaGt250: summarizeThreshold(result, 250),
        },
        alphaWeightedCoveragePercent: result.alphaWeightedCoveragePercent,
        meaningfulAlphaBoundsGt16: result.alphaBounds,
        meaningfulAlphaBoundsAreaPercent: result.alphaBoundsAreaPercent,
        coverageClass: result.coverageClass,
      },
      artifacts: {
        grayscaleAlpha: grayscalePath,
        binaryMeaningfulAlphaGt16: binary16Path,
        binaryStrongAlphaGt128: binary128Path,
      },
      interpretation: {
        rule:
          'Coverage class is diagnostic only: <25% meaningful alpha is labeled sparse-alpha-overlay, 25-65% partial-region-alpha, and >=65% broad-region-alpha.',
        nextStep:
          result.coverageClass === 'sparse-alpha-overlay'
            ? 'Do not treat water.png as the basin deformation mask. Preserve it as approved painted water detail and derive a separate hash-bound basin mask before displacement/refraction work.'
            : 'Inspect the binary mask artifact before deciding whether water.png is spatially suitable for bounded displacement/refraction.',
      },
    };

    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    console.log('');
    console.log(`[RESULT] meaningful alpha >16: ${formatPercent(result.coveragePercent[16])}`);
    console.log(`[RESULT] strong alpha >128: ${formatPercent(result.coveragePercent[128])}`);
    console.log(
      `[RESULT] alpha-weighted coverage: ${formatPercent(result.alphaWeightedCoveragePercent)}`,
    );
    console.log(
      `[RESULT] meaningful-alpha bounding box area: ${formatPercent(result.alphaBoundsAreaPercent)}`,
    );
    console.log(`[CLASS] ${result.coverageClass}`);
    console.log(`[REVIEW] binary mask: ${binary16Path}`);
    console.log(`[INFO] grayscale alpha: ${grayscalePath}`);
    console.log(`[INFO] receipt: ${reportPath}`);
    console.log(`[NEXT] ${report.interpretation.nextStep}`);
  } finally {
    await browser.close();
  }
}

function summarizeThreshold(result, threshold) {
  return {
    threshold,
    pixelCount: result.counts[threshold],
    coveragePercent: result.coveragePercent[threshold],
  };
}

function dataUrlBuffer(dataUrl) {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) throw new Error('Diagnostic canvas returned an invalid data URL.');
  return Buffer.from(dataUrl.slice(comma + 1), 'base64');
}

function prefixedSha(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function formatPercent(value) {
  return `${value.toFixed(3)}%`;
}
