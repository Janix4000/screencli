import type { ExportPreset } from '../recording/types.js';

export const presets: Record<string, ExportPreset> = {
  youtube: {
    name: 'youtube',
    aspect_ratio: [16, 9],
    width: 1920,
    height: 1080,
    format: 'mp4',
    codec: 'libx264',
    fps: 30,
  },
  twitter: {
    name: 'twitter',
    aspect_ratio: [16, 9],
    width: 1280,
    height: 720,
    format: 'mp4',
    codec: 'libx264',
    fps: 30,
    max_duration_s: 140,
  },
  instagram: {
    name: 'instagram',
    aspect_ratio: [9, 16],
    width: 1080,
    height: 1920,
    format: 'mp4',
    codec: 'libx264',
    fps: 30,
    max_duration_s: 90,
  },
  tiktok: {
    name: 'tiktok',
    aspect_ratio: [9, 16],
    width: 1080,
    height: 1920,
    format: 'mp4',
    codec: 'libx264',
    fps: 30,
  },
  linkedin: {
    name: 'linkedin',
    aspect_ratio: [1, 1],
    width: 1080,
    height: 1080,
    format: 'mp4',
    codec: 'libx264',
    fps: 30,
  },
  'github-gif': {
    name: 'github-gif',
    aspect_ratio: [16, 9],
    width: 800,
    height: 450,
    format: 'gif',
    codec: 'gif',
    fps: 15,
    max_duration_s: 12,
    max_file_size_bytes: 8 * 1024 * 1024,
  },
};

export function getPreset(name: string): ExportPreset {
  const preset = presets[name];
  if (!preset) {
    throw new Error(`Unknown preset: ${name}. Available: ${Object.keys(presets).join(', ')}`);
  }
  return preset;
}
