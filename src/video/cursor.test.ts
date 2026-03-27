import { describe, it, expect } from 'vitest';
import { buildCursorOverlay, cursorImagePath } from './cursor.js';
import type { RecordingEvent, Viewport } from '../recording/types.js';

const viewport: Viewport = { width: 1920, height: 1080 };

function makeEvents(count: number, spreadMs = 4000): RecordingEvent[] {
  const events: RecordingEvent[] = [];
  for (let i = 0; i < count; i++) {
    events.push({
      id: i + 1,
      timestamp_ms: 3000 + i * spreadMs,
      type: 'click',
      bounding_box: {
        x: 100 + (i * 300) % 1600,
        y: 100 + (i * 200) % 800,
        width: 80,
        height: 30,
      },
      viewport,
      description: `click ${i + 1}`,
    });
  }
  return events;
}

describe('buildCursorOverlay', () => {
  it('returns null for events without bounding boxes', () => {
    const events: RecordingEvent[] = [
      { id: 1, timestamp_ms: 1000, type: 'navigate', viewport, description: 'go to url' },
    ];
    expect(buildCursorOverlay(events, viewport)).toBeNull();
  });

  it('generates overlay for a single event', () => {
    const events = makeEvents(1);
    const result = buildCursorOverlay(events, viewport);
    expect(result).not.toBeNull();
    expect(result!.imagePath).toBe(cursorImagePath());
    expect(result!.overlay).toContain("x='");
    expect(result!.overlay).toContain("y='");
    expect(result!.overlay).toContain('shortest=1');
  });

  it('generates valid expressions for 3 events', () => {
    const events = makeEvents(3);
    const result = buildCursorOverlay(events, viewport)!;
    expect(result).not.toBeNull();

    // Expression should have balanced parentheses
    const overlay = result.overlay;
    const openParens = (overlay.match(/\(/g) || []).length;
    const closeParens = (overlay.match(/\)/g) || []).length;
    expect(openParens).toBe(closeParens);
  });

  it('keeps expression nesting under 100 levels for 20 events', () => {
    const events = makeEvents(20, 3000);
    const result = buildCursorOverlay(events, viewport)!;
    expect(result).not.toBeNull();

    // Extract x expression and count nesting depth (number of 'between' calls)
    const xExpr = result.overlay.split(":y='")[0]!;
    const segments = (xExpr.match(/between/g) || []).length;
    expect(segments).toBeLessThan(100);
  });

  it('cursor positions stay within viewport bounds', () => {
    const events = makeEvents(5);
    const result = buildCursorOverlay(events, viewport)!;

    // Extract all numeric position values from x expression
    const xExpr = result.overlay.split(":y='")[0]!.replace("x='", '');
    const xValues = xExpr.match(/(\d+\.\d)/g)?.map(Number) ?? [];

    for (const x of xValues) {
      // Positions should be reasonable (not negative, not way off screen)
      // Allow some overshoot but should still be in reasonable range
      expect(x).toBeGreaterThanOrEqual(-50);
      expect(x).toBeLessThanOrEqual(viewport.width + 50);
    }
  });

  it('expressions use eased timing (non-uniform spacing)', () => {
    // With 2 events far apart, the Bezier curve should produce non-uniform steps
    const events: RecordingEvent[] = [
      {
        id: 1, timestamp_ms: 3000, type: 'click',
        bounding_box: { x: 100, y: 100, width: 80, height: 30 },
        viewport, description: 'click 1',
      },
      {
        id: 2, timestamp_ms: 7000, type: 'click',
        bounding_box: { x: 1500, y: 800, width: 80, height: 30 },
        viewport, description: 'click 2',
      },
    ];
    const result = buildCursorOverlay(events, viewport)!;
    expect(result).not.toBeNull();

    // Should have more than 4 segments (old linear had ~4, new should have more)
    const xExpr = result.overlay.split(":y='")[0]!;
    const segments = (xExpr.match(/between/g) || []).length;
    expect(segments).toBeGreaterThan(4);
  });

  it('handles events with very close timestamps', () => {
    const events: RecordingEvent[] = [
      {
        id: 1, timestamp_ms: 3000, type: 'click',
        bounding_box: { x: 100, y: 200, width: 80, height: 30 },
        viewport, description: 'click 1',
      },
      {
        id: 2, timestamp_ms: 3500, type: 'click',
        bounding_box: { x: 800, y: 500, width: 80, height: 30 },
        viewport, description: 'click 2',
      },
    ];
    const result = buildCursorOverlay(events, viewport);
    expect(result).not.toBeNull();

    // Should not have any NaN or Infinity in the expression
    expect(result!.overlay).not.toContain('NaN');
    expect(result!.overlay).not.toContain('Infinity');
  });
});
