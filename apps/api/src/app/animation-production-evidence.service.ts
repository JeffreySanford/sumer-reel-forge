import { Injectable, NotFoundException } from '@nestjs/common';
import { access, readdir, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';

export type AnimationEvidenceKind = 'video' | 'contact-sheet';

export interface AnimationBenchmarkEvidence {
  sourceShotNumber: number;
  available: boolean;
  videoUrl: string | null;
  contactSheetUrl: string | null;
  videoPath: string | null;
  contactSheetPath: string | null;
  renderedAt: string | null;
}

export interface AnimationBenchmarkEvidenceStatus {
  schemaVersion: 1;
  observedAt: string;
  shots: AnimationBenchmarkEvidence[];
}

export interface AnimationBenchmarkEvidenceContent {
  filePath: string;
  filename: string;
  contentType: string;
}

@Injectable()
export class AnimationProductionEvidenceService {
  async getStatus(): Promise<AnimationBenchmarkEvidenceStatus> {
    const root = await findWorkspaceRoot(process.cwd());
    const renderRoot = resolve(root, 'tmp/renders');
    const shotNumbers = await discoverBenchmarkShotNumbers(renderRoot);

    return {
      schemaVersion: 1,
      observedAt: new Date().toISOString(),
      shots: await Promise.all(
        shotNumbers.map((shotNumber) => this.resolveEvidence(root, shotNumber)),
      ),
    };
  }

  async getContent(
    sourceShotNumber: number,
    kind: AnimationEvidenceKind,
  ): Promise<AnimationBenchmarkEvidenceContent> {
    const root = await findWorkspaceRoot(process.cwd());
    const renderRoot = resolve(root, 'tmp/renders');
    const folder = resolve(
      renderRoot,
      `shot${sourceShotNumber}-scene-v2-benchmark`,
    );
    const filePath =
      kind === 'video'
        ? resolve(folder, `shot${sourceShotNumber}-scene-v2-benchmark.mp4`)
        : resolve(
            folder,
            `shot${sourceShotNumber}-scene-v2-benchmark-contact-sheet.png`,
          );

    assertInside(
      renderRoot,
      filePath,
      `Shot ${sourceShotNumber} benchmark evidence`,
    );
    if (!(await exists(filePath))) {
      throw new NotFoundException(
        `No ${kind} benchmark evidence is available for Shot ${sourceShotNumber}.`,
      );
    }

    return {
      filePath,
      filename:
        kind === 'video'
          ? `shot${sourceShotNumber}-scene-v2-benchmark.mp4`
          : `shot${sourceShotNumber}-scene-v2-benchmark-contact-sheet.png`,
      contentType: kind === 'video' ? 'video/mp4' : 'image/png',
    };
  }

  private async resolveEvidence(
    root: string,
    sourceShotNumber: number,
  ): Promise<AnimationBenchmarkEvidence> {
    const folder = resolve(
      root,
      'tmp/renders',
      `shot${sourceShotNumber}-scene-v2-benchmark`,
    );
    const videoPath = resolve(
      folder,
      `shot${sourceShotNumber}-scene-v2-benchmark.mp4`,
    );
    const contactSheetPath = resolve(
      folder,
      `shot${sourceShotNumber}-scene-v2-benchmark-contact-sheet.png`,
    );

    const videoExists = await exists(videoPath);
    const contactSheetExists = await exists(contactSheetPath);
    const available = videoExists && contactSheetExists;
    const renderedAt = available
      ? new Date(
          Math.max(
            (await stat(videoPath)).mtimeMs,
            (await stat(contactSheetPath)).mtimeMs,
          ),
        ).toISOString()
      : null;

    return {
      sourceShotNumber,
      available,
      videoUrl: available
        ? `/api/runtime/animation-production/evidence/${sourceShotNumber}/video`
        : null,
      contactSheetUrl: available
        ? `/api/runtime/animation-production/evidence/${sourceShotNumber}/contact-sheet`
        : null,
      videoPath: available
        ? relative(root, videoPath).replaceAll('\\', '/')
        : null,
      contactSheetPath: available
        ? relative(root, contactSheetPath).replaceAll('\\', '/')
        : null,
      renderedAt,
    };
  }
}

async function discoverBenchmarkShotNumbers(renderRoot: string): Promise<number[]> {
  try {
    const entries = await readdir(renderRoot, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name.match(/^shot(\d+)-scene-v2-benchmark$/))
      .filter((match): match is RegExpMatchArray => Boolean(match))
      .map((match) => Number(match[1]))
      .filter((value) => Number.isInteger(value) && value > 0)
      .sort((a, b) => a - b);
  } catch {
    return [];
  }
}

async function findWorkspaceRoot(start: string): Promise<string> {
  let current = resolve(start);
  while (true) {
    if (
      (await exists(resolve(current, 'package.json'))) &&
      (await exists(resolve(current, 'assets'))) &&
      (await exists(resolve(current, 'tools')))
    ) {
      return current;
    }
    const parent = resolve(current, '..');
    if (parent === current) {
      throw new Error(`Unable to locate Reel Forge workspace root from ${start}.`);
    }
    current = parent;
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function assertInside(parent: string, child: string, label: string): void {
  const path = relative(resolve(parent), resolve(child));
  if (path.startsWith('..') || isAbsolute(path)) {
    throw new Error(`${label} must remain under ${parent}: ${child}`);
  }
}
