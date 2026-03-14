import type { Page, Locator } from 'playwright';

export interface ElementTarget {
  role?: string;
  name?: string;
  text?: string;
  selector?: string;
}

export function resolveLocator(page: Page, target: ElementTarget): Locator {
  if (target.role && target.name) {
    return page.getByRole(target.role as any, { name: target.name });
  }
  if (target.role) {
    return page.getByRole(target.role as any);
  }
  if (target.text) {
    return page.getByText(target.text);
  }
  if (target.selector) {
    return page.locator(target.selector);
  }
  throw new Error('No valid target provided. Use role+name, text, or selector.');
}

export async function getBoundingBox(
  locator: Locator
): Promise<{ x: number; y: number; width: number; height: number } | undefined> {
  try {
    const box = await locator.boundingBox({ timeout: 3000 });
    if (!box) return undefined;
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  } catch {
    return undefined;
  }
}
