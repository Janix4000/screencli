import type { Page } from 'playwright';
import { resolveLocator, getBoundingBox, type ElementTarget } from './resolve-locator.js';
import type { BoundingBox } from '../recording/types.js';

export interface ActionResult {
  bounding_box?: BoundingBox;
  screenshot: Buffer;
  url: string;
}

async function captureState(page: Page): Promise<{ screenshot: Buffer; url: string }> {
  const screenshot = await page.screenshot({ type: 'png' });
  return { screenshot, url: page.url() };
}

export async function click(
  page: Page,
  target: ElementTarget,
  clickType: 'left' | 'right' | 'double' = 'left',
  delayMs: number = 0
): Promise<ActionResult> {
  const locator = resolveLocator(page, target);
  const bounding_box = await getBoundingBox(locator);

  if (clickType === 'double') {
    await locator.dblclick({ timeout: 10000 });
  } else {
    await locator.click({ button: clickType, timeout: 10000 });
  }

  if (delayMs > 0) await page.waitForTimeout(delayMs);
  const state = await captureState(page);
  return { bounding_box, ...state };
}

export async function type(
  page: Page,
  target: ElementTarget,
  text: string,
  options: { clearFirst?: boolean; characterByCharacter?: boolean } = {},
  delayMs: number = 0
): Promise<ActionResult> {
  const locator = resolveLocator(page, target);
  const bounding_box = await getBoundingBox(locator);

  if (options.clearFirst) {
    await locator.clear({ timeout: 10000 });
  }

  if (options.characterByCharacter) {
    await locator.pressSequentially(text, { delay: 50, timeout: 30000 });
  } else {
    await locator.fill(text, { timeout: 10000 });
  }

  if (delayMs > 0) await page.waitForTimeout(delayMs);
  const state = await captureState(page);
  return { bounding_box, ...state };
}

export async function pressKey(
  page: Page,
  key: string,
  delayMs: number = 0
): Promise<ActionResult> {
  await page.keyboard.press(key);
  if (delayMs > 0) await page.waitForTimeout(delayMs);
  const state = await captureState(page);
  return { ...state };
}

export async function scroll(
  page: Page,
  options: {
    direction?: 'up' | 'down' | 'left' | 'right';
    amount?: number;
    toElement?: ElementTarget;
  },
  delayMs: number = 0
): Promise<ActionResult> {
  let bounding_box: BoundingBox | undefined;

  if (options.toElement) {
    const locator = resolveLocator(page, options.toElement);
    bounding_box = await getBoundingBox(locator);
    await locator.scrollIntoViewIfNeeded({ timeout: 10000 });
  } else {
    const amount = options.amount ?? 500;
    const deltaX =
      options.direction === 'left' ? -amount : options.direction === 'right' ? amount : 0;
    const deltaY =
      options.direction === 'up' ? -amount : options.direction === 'down' ? amount : 0;

    // Smooth scroll: break into small increments over ~400ms
    const STEP_PX = 40;
    const STEP_DELAY_MS = 16; // ~60fps
    const totalX = Math.abs(deltaX);
    const totalY = Math.abs(deltaY);
    const total = Math.max(totalX, totalY);
    const steps = Math.max(1, Math.ceil(total / STEP_PX));
    const stepX = deltaX / steps;
    const stepY = deltaY / steps;

    for (let i = 0; i < steps; i++) {
      await page.mouse.wheel(stepX, stepY);
      await page.waitForTimeout(STEP_DELAY_MS);
    }
  }

  if (delayMs > 0) await page.waitForTimeout(delayMs);
  const state = await captureState(page);
  return { bounding_box, ...state };
}

export async function hover(
  page: Page,
  target: ElementTarget,
  delayMs: number = 0
): Promise<ActionResult> {
  const locator = resolveLocator(page, target);
  const bounding_box = await getBoundingBox(locator);
  await locator.hover({ timeout: 10000 });

  if (delayMs > 0) await page.waitForTimeout(delayMs);
  const state = await captureState(page);
  return { bounding_box, ...state };
}

export async function navigate(
  page: Page,
  url: string,
  delayMs: number = 0
): Promise<ActionResult> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (delayMs > 0) await page.waitForTimeout(delayMs);
  const state = await captureState(page);
  return { ...state };
}

export async function waitFor(
  page: Page,
  condition: {
    time?: number;
    elementVisible?: ElementTarget;
    elementHidden?: ElementTarget;
    networkIdle?: boolean;
  }
): Promise<ActionResult> {
  if (condition.time) {
    await page.waitForTimeout(condition.time);
  }
  if (condition.elementVisible) {
    const locator = resolveLocator(page, condition.elementVisible);
    await locator.waitFor({ state: 'visible', timeout: 15000 });
  }
  if (condition.elementHidden) {
    const locator = resolveLocator(page, condition.elementHidden);
    await locator.waitFor({ state: 'hidden', timeout: 15000 });
  }
  if (condition.networkIdle) {
    await page.waitForLoadState('networkidle', { timeout: 15000 });
  }
  const state = await captureState(page);
  return { ...state };
}

export async function selectOption(
  page: Page,
  target: ElementTarget,
  option: { label?: string; value?: string },
  delayMs: number = 0
): Promise<ActionResult> {
  const locator = resolveLocator(page, target);
  const bounding_box = await getBoundingBox(locator);

  if (option.label) {
    await locator.selectOption({ label: option.label }, { timeout: 10000 });
  } else if (option.value) {
    await locator.selectOption({ value: option.value }, { timeout: 10000 });
  }

  if (delayMs > 0) await page.waitForTimeout(delayMs);
  const state = await captureState(page);
  return { bounding_box, ...state };
}
