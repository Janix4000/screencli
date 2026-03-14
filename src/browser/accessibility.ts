import type { Page } from 'playwright';

export interface AccessibilityNode {
  role: string;
  name: string;
  children?: AccessibilityNode[];
  value?: string;
  description?: string;
  checked?: boolean | 'mixed';
  disabled?: boolean;
  expanded?: boolean;
  level?: number;
  pressed?: boolean | 'mixed';
  selected?: boolean;
}

export async function getAccessibilityTree(page: Page): Promise<{
  tree: string;
  elementCount: number;
}> {
  // Use Playwright's ariaSnapshot for modern versions, fall back to locator-based approach
  try {
    const snapshot = await page.locator('body').ariaSnapshot();
    const lineCount = snapshot.split('\n').length;
    return { tree: snapshot, elementCount: lineCount };
  } catch {
    // Fallback: use page.evaluate with string function to avoid DOM type issues
    const tree = await page.evaluate(`
      (function() {
        function walk(el, depth) {
          var role = el.getAttribute('role') || el.tagName.toLowerCase();
          var name = el.getAttribute('aria-label') || el.getAttribute('title') || (el.innerText || '').slice(0, 50);
          var prefix = '  '.repeat(depth);
          var line = prefix + '- ' + role;
          if (name) line += ' "' + name.replace(/"/g, '\\\\"') + '"';
          var lines = [line];
          for (var i = 0; i < el.children.length; i++) {
            lines.push(walk(el.children[i], depth + 1));
          }
          return lines.join('\\n');
        }
        return walk(document.body, 0);
      })()
    `) as string;
    const lineCount = tree.split('\n').length;
    return { tree, elementCount: lineCount };
  }
}

export async function getPageInfo(page: Page): Promise<{
  url: string;
  title: string;
  viewport: { width: number; height: number };
  loading: boolean;
}> {
  const viewport = page.viewportSize() ?? { width: 0, height: 0 };
  let loading = false;
  try {
    loading = await page.evaluate(`document.readyState !== 'complete'`) as boolean;
  } catch {
    loading = true;
  }

  return {
    url: page.url(),
    title: await page.title(),
    viewport,
    loading,
  };
}
