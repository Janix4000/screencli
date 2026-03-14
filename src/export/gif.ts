import { runFFmpeg } from '../video/ffmpeg.js';
import type { ExportPreset } from '../recording/types.js';
import { join, dirname } from 'node:path';

export async function exportGif(
  inputPath: string,
  outputPath: string,
  preset: ExportPreset,
  cropFilter?: string
): Promise<void> {
  const palettePath = join(dirname(outputPath), '_palette.png');

  const baseFilter = cropFilter
    ? `${cropFilter},fps=${preset.fps}`
    : `scale=${preset.width}:${preset.height},fps=${preset.fps}`;

  // Pass 1: Generate palette
  await runFFmpeg({
    input: inputPath,
    output: palettePath,
    outputArgs: [
      '-vf', `${baseFilter},palettegen=stats_mode=diff`,
      ...(preset.max_duration_s ? ['-t', String(preset.max_duration_s)] : []),
    ],
  });

  // Pass 2: Use palette to create GIF
  await runFFmpeg({
    input: inputPath,
    output: outputPath,
    outputArgs: [
      '-i', palettePath,
      '-lavfi', `${baseFilter}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3`,
      ...(preset.max_duration_s ? ['-t', String(preset.max_duration_s)] : []),
    ],
  });

  // Clean up palette
  try {
    const { unlinkSync } = await import('node:fs');
    unlinkSync(palettePath);
  } catch {
    // ignore
  }
}
