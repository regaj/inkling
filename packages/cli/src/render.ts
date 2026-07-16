/**
 * Headless rendering bridge.
 *
 * Excalidraw needs a DOM and a canvas, so the actual conversion/rasterization
 * runs inside headless Chromium (Playwright), loading the self-contained offline
 * bundle at `renderer/index.html`. This module launches the browser, invokes
 * `window.__inklingRender`, and returns the result to Node.
 */
import { existsSync } from 'node:fs';
import { chromium, type Browser } from 'playwright';
import type { ExportSettings } from '@inkling/core';

/** Formats the *browser* renderer produces directly (PDF is assembled in Node from SVG). */
export type RenderFormat = 'svg' | 'png' | 'jpg' | 'excalidraw';

/** Payload sent into the page's `window.__inklingRender`. */
export interface RenderRequest {
  /** Excalidraw skeleton elements from `toExcalidrawSkeleton`. */
  skeleton: unknown[];
  settings: ExportSettings;
  format: RenderFormat;
}

/** What the renderer hands back, discriminated by `kind`. */
export type RenderResult =
  | { kind: 'svg'; svg: string }
  | { kind: 'raster'; dataUrl: string }
  | { kind: 'excalidraw'; elements: unknown[] };

/** Thrown when Playwright's Chromium build is missing; carries an actionable message. */
export class ChromiumNotInstalledError extends Error {
  constructor() {
    super(
      "Playwright's Chromium browser is not installed.\n" +
        'Install it once with:\n\n  npx playwright install chromium\n',
    );
    this.name = 'ChromiumNotInstalledError';
  }
}

/** file:// URL of the offline renderer bundle, resolved relative to `dist/`. */
const RENDERER_URL = new URL('../renderer/index.html', import.meta.url);

/**
 * Render a diagram in headless Chromium.
 *
 * @throws {@link ChromiumNotInstalledError} when the browser binary is absent.
 */
export async function renderInBrowser(request: RenderRequest): Promise<RenderResult> {
  const browser = await launchChromium();
  try {
    const page = await browser.newPage();
    await page.goto(RENDERER_URL.href);
    await page.waitForFunction(
      () => typeof (window as unknown as { __inklingRender?: unknown }).__inklingRender === 'function',
    );
    return (await page.evaluate(
      (arg) =>
        (
          window as unknown as {
            __inklingRender: (r: unknown) => Promise<unknown>;
          }
        ).__inklingRender(arg),
      request,
    )) as RenderResult;
  } finally {
    await browser.close();
  }
}

/** Launch Chromium, translating a missing-binary failure into a clean error. */
async function launchChromium(): Promise<Browser> {
  if (!chromiumInstalled()) {
    throw new ChromiumNotInstalledError();
  }
  try {
    return await chromium.launch({ headless: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/Executable doesn't exist|playwright install/i.test(message)) {
      throw new ChromiumNotInstalledError();
    }
    throw err;
  }
}

/** Best-effort check that the Chromium executable is present on disk. */
function chromiumInstalled(): boolean {
  try {
    const path = chromium.executablePath();
    return path.length > 0 && existsSync(path);
  } catch {
    // executablePath() throws when the browser was never provisioned.
    return false;
  }
}
