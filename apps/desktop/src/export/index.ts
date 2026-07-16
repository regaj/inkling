/**
 * Browser-side exporters, registered into the core exporter registry.
 *
 * All formats run the SAME Excalidraw skeleton through `convertToExcalidrawElements`
 * and Excalidraw's own `exportToSvg`/`exportToBlob`, so exports match the live
 * preview exactly. Each carries its own theme + background (independent of the
 * editor theme) via Excalidraw's `exportWithDarkMode` / `viewBackgroundColor` /
 * `exportBackground`.
 */
import { convertToExcalidrawElements, exportToSvg, exportToBlob } from '@excalidraw/excalidraw';
import { jsPDF } from 'jspdf';
import {
  registerExporter,
  getExporter,
  wrapExcalidrawFile,
  type ExportArtifact,
  type ExportFormatId,
  type ExportInput,
  type ExportSettings,
  type Scene,
} from '@inkling/core';
import { bytesToBase64 } from '../fileio.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEls = any[];

function appStateFor(settings: ExportSettings): Record<string, unknown> {
  return {
    exportWithDarkMode: settings.theme === 'dark',
    exportBackground: !settings.transparent,
    viewBackgroundColor: settings.background,
    exportEmbedScene: false,
  };
}

function baseName(scene: Scene): string {
  const raw = (scene.title ?? 'diagram').trim().replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '');
  return raw || 'diagram';
}

async function rasterBytes(input: ExportInput, mimeType: string): Promise<Uint8Array> {
  const elements = convertToExcalidrawElements(input.skeleton as AnyEls);
  const blob = await exportToBlob({
    elements,
    appState: appStateFor(input.settings),
    files: {},
    mimeType,
    quality: 0.95,
    getDimensions: (w: number, h: number) => ({
      width: w * input.settings.scale,
      height: h * input.settings.scale,
      scale: input.settings.scale,
    }),
  });
  return new Uint8Array(await blob.arrayBuffer());
}

let registered = false;

/** Register all browser exporters into the core registry (idempotent). */
export function registerBrowserExporters(): void {
  if (registered) return;
  registered = true;

  registerExporter('excalidraw', async ({ skeleton, settings, scene }): Promise<ExportArtifact> => {
    const elements = convertToExcalidrawElements(skeleton as AnyEls);
    const file = wrapExcalidrawFile(elements as unknown[], {
      viewBackgroundColor: settings.transparent ? 'transparent' : settings.background,
      theme: settings.theme,
    });
    return {
      format: 'excalidraw',
      text: JSON.stringify(file, null, 2),
      mime: 'application/json',
      filename: `${baseName(scene)}.excalidraw`,
    };
  });

  registerExporter('svg', async ({ skeleton, settings, scene }): Promise<ExportArtifact> => {
    const elements = convertToExcalidrawElements(skeleton as AnyEls);
    const svg = await exportToSvg({
      elements,
      appState: appStateFor(settings),
      files: {},
      exportPadding: 16,
    });
    return {
      format: 'svg',
      text: new XMLSerializer().serializeToString(svg),
      mime: 'image/svg+xml',
      filename: `${baseName(scene)}.svg`,
    };
  });

  registerExporter('png', async (input): Promise<ExportArtifact> => ({
    format: 'png',
    bytes: await rasterBytes(input, 'image/png'),
    mime: 'image/png',
    filename: `${baseName(input.scene)}.png`,
  }));

  registerExporter('jpg', async (input): Promise<ExportArtifact> => ({
    format: 'jpg',
    bytes: await rasterBytes(input, 'image/jpeg'),
    mime: 'image/jpeg',
    filename: `${baseName(input.scene)}.jpg`,
  }));

  registerExporter('pdf', async (input): Promise<ExportArtifact> => {
    // Embed a high-resolution raster of the diagram into a single page sized to it.
    const png = await rasterBytes(input, 'image/png');
    const { width, height } = input.scene;
    const pdf = new jsPDF({
      orientation: width >= height ? 'landscape' : 'portrait',
      unit: 'pt',
      format: [width, height],
    });
    pdf.addImage(`data:image/png;base64,${bytesToBase64(png)}`, 'PNG', 0, 0, width, height);
    return {
      format: 'pdf',
      bytes: new Uint8Array(pdf.output('arraybuffer')),
      mime: 'application/pdf',
      filename: `${baseName(input.scene)}.pdf`,
    };
  });
}

/** Run a registered exporter, returning its artifact. */
export async function runExport(
  format: ExportFormatId,
  input: ExportInput,
): Promise<ExportArtifact> {
  registerBrowserExporters();
  const exporter = getExporter(format);
  if (!exporter) throw new Error(`No exporter registered for "${format}"`);
  return exporter(input);
}

/** Copy the diagram to the clipboard as PNG or SVG. */
export async function copyToClipboard(
  kind: 'png' | 'svg',
  input: ExportInput,
): Promise<void> {
  if (kind === 'svg') {
    const artifact = await runExport('svg', input);
    await navigator.clipboard.writeText(artifact.text ?? '');
    return;
  }
  const elements = convertToExcalidrawElements(input.skeleton as AnyEls);
  const blob = await exportToBlob({
    elements,
    appState: appStateFor(input.settings),
    files: {},
    mimeType: 'image/png',
    getDimensions: (w: number, h: number) => ({
      width: w * input.settings.scale,
      height: h * input.settings.scale,
      scale: input.settings.scale,
    }),
  });
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}
