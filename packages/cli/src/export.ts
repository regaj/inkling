/**
 * Export orchestration: source → compile → skeleton → headless render → file.
 *
 * This is the one place that stitches `@inkling/core` (pure) to the headless
 * renderer (browser) and the PDF assembler (Node). It never calls `process.exit`
 * or prints — it returns an outcome for `index.ts` to report.
 */
import { readFile, writeFile } from 'node:fs/promises';
import {
  compile,
  toExcalidrawSkeleton,
  wrapExcalidrawFile,
  defaultExportSettings,
  LIGHT_PALETTE,
  DARK_PALETTE,
} from '@inkling/core';
import type { CompileOptions, Diagnostic, ExportSettings } from '@inkling/core';
import type { CliOptions } from './cli.js';
import { renderInBrowser, type RenderFormat, type RenderResult } from './render.js';
import { svgToPdf } from './pdf.js';

/** Result of an export attempt. */
export interface ExportOutcome {
  /** All diagnostics from compilation (errors and warnings). */
  diagnostics: Diagnostic[];
  /** False when compilation produced error-severity diagnostics (nothing exported). */
  ok: boolean;
  /** True when an output file was written. */
  wrote: boolean;
}

/**
 * Compile the input document and, if it is error-free, render and write the
 * requested artifact.
 *
 * @throws when the input cannot be read, Chromium is missing, or writing fails.
 */
export async function runExport(options: CliOptions): Promise<ExportOutcome> {
  const source = await readFile(options.input, 'utf8');

  const palette = options.theme === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
  const compileOptions: CompileOptions = { palette };
  // Only pass notation when overridden — otherwise the document's directive wins.
  if (options.notation) compileOptions.notation = options.notation;

  const { scene, diagnostics, ok } = compile(source, compileOptions);
  if (!ok) {
    return { diagnostics, ok: false, wrote: false };
  }

  const settings: ExportSettings = {
    theme: options.theme,
    background: options.background ?? defaultExportSettings(options.theme).background,
    transparent: options.transparent,
    scale: options.scale,
  };

  const skeleton = toExcalidrawSkeleton(scene);
  // PDF is assembled in Node from an SVG render.
  const renderFormat: RenderFormat = options.format === 'pdf' ? 'svg' : options.format;
  const result = await renderInBrowser({ skeleton, settings, format: renderFormat });

  await writeArtifact(options, settings, result, scene.width, scene.height);
  return { diagnostics, ok: true, wrote: true };
}

/** Write the render result to disk in the requested format. */
async function writeArtifact(
  options: CliOptions,
  settings: ExportSettings,
  result: RenderResult,
  width: number,
  height: number,
): Promise<void> {
  switch (options.format) {
    case 'excalidraw': {
      const elements = expect(result, 'excalidraw').elements;
      const file = wrapExcalidrawFile(elements, {
        exportBackground: !settings.transparent,
        exportWithDarkMode: settings.theme === 'dark',
        viewBackgroundColor: settings.background,
      });
      await writeFile(options.output, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
      return;
    }
    case 'svg': {
      await writeFile(options.output, expect(result, 'svg').svg, 'utf8');
      return;
    }
    case 'png':
    case 'jpg': {
      await writeFile(options.output, dataUrlToBytes(expect(result, 'raster').dataUrl));
      return;
    }
    case 'pdf': {
      const bytes = await svgToPdf(expect(result, 'svg').svg, width, height);
      await writeFile(options.output, bytes);
      return;
    }
  }
}

/** Narrow a {@link RenderResult} to the expected kind, or fail loudly. */
function expect<K extends RenderResult['kind']>(
  result: RenderResult,
  kind: K,
): Extract<RenderResult, { kind: K }> {
  if (result.kind !== kind) {
    throw new Error(`Renderer returned "${result.kind}" but "${kind}" was expected.`);
  }
  return result as Extract<RenderResult, { kind: K }>;
}

/** Decode a `data:...;base64,....` URL into raw bytes. */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(',');
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return new Uint8Array(Buffer.from(base64, 'base64'));
}
