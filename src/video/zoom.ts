import type { RecordingEvent, Viewport } from '../recording/types.js';

export interface ZoomKeyframe {
  time_s: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

const APPROACH_MS = 300;
const HOLD_MS = 600;
const RELEASE_MS = 500;
const PADDING_RATIO = 0.3;
const MIN_ZOOM_RATIO = 0.4; // Don't zoom in more than 40% of viewport

export function generateZoomKeyframes(
  events: RecordingEvent[],
  viewport: Viewport
): ZoomKeyframe[] {
  const keyframes: ZoomKeyframe[] = [];
  const eventsWithBoxes = events.filter((e) => e.bounding_box);

  if (eventsWithBoxes.length === 0) return keyframes;

  // Start fully zoomed out
  keyframes.push({ time_s: 0, x: 0, y: 0, w: viewport.width, h: viewport.height });

  for (const event of eventsWithBoxes) {
    const box = event.bounding_box!;
    const t = event.timestamp_ms / 1000;

    // Calculate padded crop region
    const padX = box.width * PADDING_RATIO;
    const padY = box.height * PADDING_RATIO;
    let cropW = box.width + padX * 2;
    let cropH = box.height + padY * 2;

    // Ensure minimum zoom size
    const minW = viewport.width * MIN_ZOOM_RATIO;
    const minH = viewport.height * MIN_ZOOM_RATIO;
    cropW = Math.max(cropW, minW);
    cropH = Math.max(cropH, minH);

    // Maintain aspect ratio of viewport
    const aspect = viewport.width / viewport.height;
    if (cropW / cropH < aspect) {
      cropW = cropH * aspect;
    } else {
      cropH = cropW / aspect;
    }

    // Don't exceed viewport
    cropW = Math.min(cropW, viewport.width);
    cropH = Math.min(cropH, viewport.height);

    // Center on bounding box
    let cropX = box.x + box.width / 2 - cropW / 2;
    let cropY = box.y + box.height / 2 - cropH / 2;

    // Clamp to viewport bounds
    cropX = Math.max(0, Math.min(cropX, viewport.width - cropW));
    cropY = Math.max(0, Math.min(cropY, viewport.height - cropH));

    // Approach keyframe (zoom in)
    const approachT = Math.max(0, t - APPROACH_MS / 1000);
    keyframes.push({ time_s: approachT, x: cropX, y: cropY, w: cropW, h: cropH });

    // Hold keyframe (stay zoomed)
    keyframes.push({ time_s: t, x: cropX, y: cropY, w: cropW, h: cropH });

    // Release keyframe (zoom out)
    const releaseT = t + HOLD_MS / 1000;
    keyframes.push({ time_s: releaseT, x: cropX, y: cropY, w: cropW, h: cropH });

    const resetT = releaseT + RELEASE_MS / 1000;
    keyframes.push({ time_s: resetT, x: 0, y: 0, w: viewport.width, h: viewport.height });
  }

  return keyframes;
}

export function buildZoomFilterExpr(
  keyframes: ZoomKeyframe[],
  viewport: Viewport
): string {
  if (keyframes.length === 0) return '';

  // Build expressions for x, y, w, h using linear interpolation between keyframes
  const buildExpr = (prop: 'x' | 'y' | 'w' | 'h'): string => {
    if (keyframes.length === 1) return String(Math.round(keyframes[0]![prop]));

    let expr = '';
    for (let i = 0; i < keyframes.length - 1; i++) {
      const k0 = keyframes[i]!;
      const k1 = keyframes[i + 1]!;
      const v0 = k0[prop];
      const v1 = k1[prop];
      const t0 = k0.time_s;
      const t1 = k1.time_s;

      if (t1 === t0) continue;

      // Linear interpolation: v0 + (v1 - v0) * (t - t0) / (t1 - t0)
      const segment = `if(between(t,${t0.toFixed(3)},${t1.toFixed(3)}),${v0.toFixed(1)}+(${(v1 - v0).toFixed(1)})*(t-${t0.toFixed(3)})/${(t1 - t0).toFixed(3)}`;
      expr = expr ? `${expr},${segment}` : segment;
    }

    // Close all the if-parens and use the last value as default
    const lastVal = keyframes[keyframes.length - 1]![prop];
    const closingParens = ')'.repeat(keyframes.length - 1);
    return `${expr},${lastVal.toFixed(1)}${closingParens}`;
  };

  const cropX = buildExpr('x');
  const cropY = buildExpr('y');
  const cropW = buildExpr('w');
  const cropH = buildExpr('h');

  return `crop=w='${cropW}':h='${cropH}':x='${cropX}':y='${cropY}',scale=${viewport.width}:${viewport.height}`;
}
