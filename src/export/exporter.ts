import { join } from 'node:path';
import { getPreset } from './presets.js';
import { computeSmartCrop, buildCropFilter } from './smart-crop.js';
import { exportGif } from './gif.js';
import { runFFmpeg } from '../video/ffmpeg.js';
import { buildBackgroundFilterComplex, computeFitLayout, type BackgroundOptions } from '../video/background.js';
import { logger } from '../utils/logger.js';
import type { RecordingEvent, RecordingMetadata } from '../recording/types.js';

export interface ExportRunOptions {
  sourceVideo: string;
  events: RecordingEvent[];
  metadata: RecordingMetadata;
  presetName: string;
  outputDir: string;
  outputPath?: string;
  zoom: boolean;
  highlight: boolean;
  cursor: boolean;
  background?: BackgroundOptions;
}

export async function runExport(options: ExportRunOptions): Promise<string> {
  const preset = getPreset(options.presetName);
  const ext = preset.format === 'gif' ? 'gif' : 'mp4';
  const outputPath = options.outputPath ?? join(options.outputDir, `${preset.name}.${ext}`);

  logger.info(`Exporting with preset: ${preset.name} (${preset.width}x${preset.height})`);

  // Compute smart crop for aspect ratio conversion
  const crop = computeSmartCrop(options.events, options.metadata.viewport, preset);
  const cropFilter = buildCropFilter(crop, preset);

  if (preset.format === 'gif') {
    await exportGif(options.sourceVideo, outputPath, preset, cropFilter);
    return outputPath;
  }

  // MP4 export
  if (options.background) {
    // With background: fit video inside gradient at preset dimensions
    const outputVP = { width: preset.width, height: preset.height };
    const layout = computeFitLayout(options.metadata.viewport, outputVP, options.background.padding);
    const fc = buildBackgroundFilterComplex([], outputVP, options.background, layout);

    logger.info(`Applying ${options.background.gradient} background at ${preset.width}x${preset.height}`);

    const args: string[] = [
      '-map', '[out]',
      '-c:v', preset.codec,
      '-preset', 'fast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-r', String(preset.fps),
    ];

    if (preset.max_duration_s) {
      args.push('-t', String(preset.max_duration_s));
    }

    await runFFmpeg({
      input: options.sourceVideo,
      output: outputPath,
      filterComplex: fc,
      outputArgs: args,
    });
  } else {
    const filters = [cropFilter];
    const args: string[] = [
      '-vf', filters.join(','),
      '-c:v', preset.codec,
      '-preset', 'fast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-r', String(preset.fps),
    ];

    if (preset.max_duration_s) {
      args.push('-t', String(preset.max_duration_s));
    }

    await runFFmpeg({
      input: options.sourceVideo,
      output: outputPath,
      outputArgs: args,
    });
  }

  return outputPath;
}
