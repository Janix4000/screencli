import type { RecordingEvent, Viewport, ExportPreset } from '../recording/types.js';

export interface CropWindow {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function computeSmartCrop(
  events: RecordingEvent[],
  sourceViewport: Viewport,
  preset: ExportPreset
): CropWindow {
  const targetAspect = preset.aspect_ratio[0] / preset.aspect_ratio[1];
  const sourceAspect = sourceViewport.width / sourceViewport.height;

  // If same aspect ratio, no crop needed
  if (Math.abs(targetAspect - sourceAspect) < 0.01) {
    return { x: 0, y: 0, width: sourceViewport.width, height: sourceViewport.height };
  }

  // Calculate crop dimensions maintaining target aspect ratio
  let cropW: number;
  let cropH: number;

  if (targetAspect < sourceAspect) {
    // Target is taller (e.g. 9:16) — crop width
    cropH = sourceViewport.height;
    cropW = Math.round(cropH * targetAspect);
  } else {
    // Target is wider — crop height
    cropW = sourceViewport.width;
    cropH = Math.round(cropW / targetAspect);
  }

  // Find average focus point from events with bounding boxes
  const eventsWithBoxes = events.filter((e) => e.bounding_box);
  let focusX = sourceViewport.width / 2;
  let focusY = sourceViewport.height / 2;

  if (eventsWithBoxes.length > 0) {
    let totalWeight = 0;
    let weightedX = 0;
    let weightedY = 0;

    for (let i = 0; i < eventsWithBoxes.length; i++) {
      const box = eventsWithBoxes[i]!.bounding_box!;
      // Weight recent events more heavily
      const weight = (i + 1) / eventsWithBoxes.length;
      weightedX += (box.x + box.width / 2) * weight;
      weightedY += (box.y + box.height / 2) * weight;
      totalWeight += weight;
    }

    focusX = weightedX / totalWeight;
    focusY = weightedY / totalWeight;
  }

  // Center crop on focus point, clamped to viewport
  let cropX = Math.round(focusX - cropW / 2);
  let cropY = Math.round(focusY - cropH / 2);
  cropX = Math.max(0, Math.min(cropX, sourceViewport.width - cropW));
  cropY = Math.max(0, Math.min(cropY, sourceViewport.height - cropH));

  return { x: cropX, y: cropY, width: cropW, height: cropH };
}

export function buildCropFilter(crop: CropWindow, preset: ExportPreset): string {
  return `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y},scale=${preset.width}:${preset.height}`;
}
