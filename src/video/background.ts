import type { Viewport } from '../recording/types.js';

export type GradientPreset = 'aurora' | 'sunset' | 'ocean' | 'lavender' | 'mint' | 'ember';

export const GRADIENT_PRESETS: GradientPreset[] = ['aurora', 'sunset', 'ocean', 'lavender', 'mint', 'ember'];

interface GradientDef {
  r: string;
  g: string;
  b: string;
}

/**
 * Gradient definitions using FFmpeg geq expressions.
 * X/Y = pixel coords, W/H = frame dimensions.
 * Trig functions at varying frequencies/phases produce organic colour blends.
 */
const gradients: Record<GradientPreset, GradientDef> = {
  aurora: {
    r: '70+50*sin(2*PI*X/W+1.2)+30*cos(3*PI*Y/H)',
    g: '90+80*sin(2*PI*Y/H+0.5)+40*cos(1.5*PI*X/W)',
    b: '180+60*sin(1.5*PI*X/W)+40*cos(2*PI*Y/H+2)',
  },
  sunset: {
    r: '210+40*sin(2*PI*Y/H)+20*cos(3*PI*X/W)',
    g: '90+60*sin(2.5*PI*X/W+1)+30*cos(2*PI*Y/H)',
    b: '130+80*cos(2*PI*X/W+PI*Y/H)+30*sin(3*PI*Y/H)',
  },
  ocean: {
    r: '20+35*sin(2*PI*X/W*1.5)+15*cos(2*PI*Y/H)',
    g: '100+70*sin(2*PI*Y/H+0.7)+35*cos(1.8*PI*X/W)',
    b: '190+55*cos(PI*X/W+1.5*PI*Y/H)+30*sin(2.5*PI*X/W)',
  },
  lavender: {
    r: '155+65*sin(2*PI*X/W+0.8)+25*cos(2.5*PI*Y/H)',
    g: '95+45*sin(2.5*PI*Y/H+1.2)+20*cos(2*PI*X/W)',
    b: '200+45*cos(1.5*PI*(X+Y)/(W+H))+25*sin(3*PI*X/W)',
  },
  mint: {
    r: '130+55*sin(2*PI*Y/H+0.5)+20*cos(2.5*PI*X/W)',
    g: '195+50*cos(1.5*PI*X/W+0.3)+25*sin(2*PI*Y/H)',
    b: '165+55*sin(2*PI*X/W+2*PI*Y/H)+20*cos(3*PI*Y/H)',
  },
  ember: {
    r: '200+50*sin(1.5*PI*X/W)+25*cos(2*PI*Y/H+1)',
    g: '70+55*sin(2*PI*Y/H+0.8)+25*cos(2.5*PI*X/W)',
    b: '40+35*cos(2*PI*(X+Y)/(W+H)+1.5)+20*sin(3*PI*X/W)',
  },
};

export interface BackgroundOptions {
  gradient: GradientPreset;
  /** Padding as a percentage of output size (0–50). Default 8. */
  padding: number;
  /** Corner radius in pixels. Default 12. */
  cornerRadius: number;
  /** Add a drop shadow behind the video frame. Default true. */
  shadow: boolean;
}

export const DEFAULT_BACKGROUND: BackgroundOptions = {
  gradient: 'aurora',
  padding: 8,
  cornerRadius: 12,
  shadow: true,
};

interface LayoutMetrics {
  outW: number;
  outH: number;
  scaledW: number;
  scaledH: number;
  padX: number;
  padY: number;
}

/** Ensure value is even (required by most video codecs). */
function even(n: number): number {
  return n % 2 === 0 ? n : n - 1;
}

function computeLayout(viewport: Viewport, padding: number): LayoutMetrics {
  const outW = even(viewport.width);
  const outH = even(viewport.height);
  const fraction = padding / 100;
  const padX = Math.round(outW * fraction);
  const padY = Math.round(outH * fraction);
  return {
    outW,
    outH,
    scaledW: even(outW - 2 * padX),
    scaledH: even(outH - 2 * padY),
    padX,
    padY,
  };
}

/**
 * Compute layout when the source aspect ratio differs from the output.
 * The video is fit (letterboxed) inside the padded area.
 */
export function computeFitLayout(
  source: Viewport,
  output: Viewport,
  padding: number,
): LayoutMetrics {
  const outW = even(output.width);
  const outH = even(output.height);
  const fraction = padding / 100;
  const maxW = outW - 2 * Math.round(outW * fraction);
  const maxH = outH - 2 * Math.round(outH * fraction);

  const scale = Math.min(maxW / source.width, maxH / source.height);
  const scaledW = even(Math.round(source.width * scale));
  const scaledH = even(Math.round(source.height * scale));

  return {
    outW,
    outH,
    scaledW,
    scaledH,
    padX: Math.round((outW - scaledW) / 2),
    padY: Math.round((outH - scaledH) / 2),
  };
}

function buildCornerRadiusExpr(radius: number): string {
  const R = radius;
  // geq alpha expression that rounds the four corners.
  // Inside the corner quadrant: use circular distance check.
  // Outside corner quadrants: fully opaque.
  return (
    `a='if(gt(abs(X-W/2),W/2-${R})*gt(abs(Y-H/2),H/2-${R}),` +
    `if(lte(hypot(abs(X-W/2)-(W/2-${R}),abs(Y-H/2)-(H/2-${R})),${R}),255,0),255)'` +
    `:r='r(X,Y)':g='g(X,Y)':b='b(X,Y)'`
  );
}

/**
 * Build an FFmpeg filter_complex that composites the video onto a colourful
 * gradient background with optional rounded corners and drop shadow.
 *
 * @param effectFilters  Any pre-existing -vf style effect filters (may be empty).
 * @param viewport       Output dimensions.
 * @param opts           Background configuration.
 * @param layout         Optional pre-computed layout (for fit/letterbox cases).
 * @returns The full filter_complex string. Output label is `[out]`.
 */
export function buildBackgroundFilterComplex(
  effectFilters: string[],
  viewport: Viewport,
  opts: BackgroundOptions,
  layout?: LayoutMetrics,
): string {
  const grad = gradients[opts.gradient];
  const m = layout ?? computeLayout(viewport, opts.padding);
  const { outW, outH, scaledW, scaledH, padX, padY } = m;

  const chains: string[] = [];

  // ── Chain 1: process input → scale → round corners ──
  const effectStr = effectFilters.length > 0 ? effectFilters.join(',') + ',' : '';
  let fgChain = `[0:v]${effectStr}scale=${scaledW}:${scaledH},format=rgba`;

  if (opts.cornerRadius > 0) {
    fgChain += `,geq=${buildCornerRadiusExpr(opts.cornerRadius)}`;
  }

  if (opts.shadow) {
    fgChain += '[fg_raw]';
    chains.push(fgChain);
    chains.push('[fg_raw]split[fg][shadow_src]');
    chains.push(
      '[shadow_src]colorchannelmixer=rr=0:gg=0:bb=0:aa=0.4,boxblur=12:4[shadow]',
    );
  } else {
    fgChain += '[fg]';
    chains.push(fgChain);
  }

  // ── Chain 2: generate gradient background ──
  chains.push(
    `color=s=${outW}x${outH}:c=black:r=30,` +
    `geq=r='${grad.r}':g='${grad.g}':b='${grad.b}',format=rgba[bg]`,
  );

  // ── Chain 3: composite ──
  if (opts.shadow) {
    const sx = padX + 4;
    const sy = padY + 6;
    chains.push(`[bg][shadow]overlay=${sx}:${sy}:shortest=1[bg_s]`);
    chains.push(`[bg_s][fg]overlay=${padX}:${padY}:shortest=1[out]`);
  } else {
    chains.push(`[bg][fg]overlay=${padX}:${padY}:shortest=1[out]`);
  }

  return chains.join(';');
}
