import type { RecordingEvent, Viewport } from '../recording/types.js';

const CURSOR_RADIUS = 8;
const CURSOR_COLOR = 'red@0.8';

interface CursorPosition {
  time_s: number;
  x: number;
  y: number;
}

export function extractCursorPositions(events: RecordingEvent[]): CursorPosition[] {
  const positions: CursorPosition[] = [];

  for (const event of events) {
    if (event.bounding_box) {
      positions.push({
        time_s: event.timestamp_ms / 1000,
        x: Math.round(event.bounding_box.x + event.bounding_box.width / 2),
        y: Math.round(event.bounding_box.y + event.bounding_box.height / 2),
      });
    }
  }

  return positions;
}

export function buildCursorFilter(events: RecordingEvent[], _viewport: Viewport): string[] {
  const positions = extractCursorPositions(events);
  if (positions.length === 0) return [];

  const filters: string[] = [];

  // Draw a circle at each event's bounding box center, visible around the event time
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i]!;
    const startT = Math.max(0, pos.time_s - 0.2);
    const endT = pos.time_s + 0.5;

    // drawbox approximation of a cursor dot
    filters.push(
      `drawbox=x=${pos.x - CURSOR_RADIUS}:y=${pos.y - CURSOR_RADIUS}:w=${CURSOR_RADIUS * 2}:h=${CURSOR_RADIUS * 2}:color=${CURSOR_COLOR}:t=fill:enable='between(t,${startT.toFixed(3)},${endT.toFixed(3)})'`
    );
  }

  return filters;
}
