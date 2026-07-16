/**
 * Offline browser renderer.
 *
 * Bundled by esbuild (`renderer/build.mjs`) into `renderer/dist/bundle.js` and
 * loaded by `renderer/index.html` inside headless Chromium. It exposes
 * `window.__inklingRender`, which the Node CLI calls via `page.evaluate`.
 *
 * This file is intentionally excluded from the package's `tsc` build — it runs
 * in the browser and depends on `@excalidraw/excalidraw`'s DOM/canvas runtime.
 */
import {
  convertToExcalidrawElements,
  exportToBlob,
  exportToSvg,
} from '@excalidraw/excalidraw';

interface Settings {
  theme: 'light' | 'dark';
  background: string;
  transparent: boolean;
  scale: 1 | 2 | 3;
}

type RenderFormat = 'svg' | 'png' | 'jpg' | 'excalidraw';

interface RenderRequest {
  skeleton: unknown[];
  settings: Settings;
  format: RenderFormat;
}

type RenderResult =
  | { kind: 'svg'; svg: string }
  | { kind: 'raster'; dataUrl: string }
  | { kind: 'excalidraw'; elements: unknown[] };

/** Read a Blob as a base64 `data:` URL. */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('failed to read blob'));
    reader.readAsDataURL(blob);
  });
}

/** Convert skeleton + settings into the requested artifact. */
async function render({ skeleton, settings, format }: RenderRequest): Promise<RenderResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const elements = convertToExcalidrawElements(skeleton as any);

  const appState = {
    exportWithDarkMode: settings.theme === 'dark',
    exportBackground: !settings.transparent,
    viewBackgroundColor: settings.background,
    exportScale: settings.scale,
  };

  if (format === 'excalidraw') {
    return { kind: 'excalidraw', elements };
  }

  if (format === 'svg') {
    const svg = await exportToSvg({ elements, appState, files: {} });
    return { kind: 'svg', svg: svg.outerHTML };
  }

  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const blob = await exportToBlob({
    elements,
    appState,
    files: {},
    mimeType,
    scale: settings.scale,
  });
  return { kind: 'raster', dataUrl: await blobToDataUrl(blob) };
}

declare global {
  interface Window {
    __inklingRender: (request: RenderRequest) => Promise<RenderResult>;
  }
}

window.__inklingRender = render;
