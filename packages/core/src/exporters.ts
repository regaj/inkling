/**
 * The exporter registry — the third extension point (alongside notations and the
 * compiler's shape kinds).
 *
 * Core owns the registry and the format catalog; concrete exporters that need the
 * Excalidraw runtime (SVG/PNG/JPG/PDF rasterization) are registered by the host —
 * the desktop app in the browser, or the CLI in a headless Playwright page. The
 * native `.excalidraw` JSON exporter is pure and can run anywhere.
 */
import type { Scene } from './types.js';

export type ExportFormatId = 'excalidraw' | 'svg' | 'png' | 'jpg' | 'pdf';

export interface ExportFormat {
  id: ExportFormatId;
  label: string;
  ext: string;
  mime: string;
  category: 'native' | 'vector' | 'raster';
  /** Raster formats support @1x/@2x/@3x scaling. */
  scalable: boolean;
}

/** The formats the UI offers. Order is the toolbar order. */
export const EXPORT_FORMATS: readonly ExportFormat[] = [
  { id: 'excalidraw', label: 'Excalidraw', ext: 'excalidraw', mime: 'application/json', category: 'native', scalable: false },
  { id: 'svg', label: 'SVG', ext: 'svg', mime: 'image/svg+xml', category: 'vector', scalable: false },
  { id: 'png', label: 'PNG', ext: 'png', mime: 'image/png', category: 'raster', scalable: true },
  { id: 'jpg', label: 'JPG', ext: 'jpg', mime: 'image/jpeg', category: 'raster', scalable: true },
  { id: 'pdf', label: 'PDF', ext: 'pdf', mime: 'application/pdf', category: 'vector', scalable: false },
] as const;

/** Theme + background controls carried by the export dialog (independent of the app theme). */
export interface ExportSettings {
  theme: 'light' | 'dark';
  /** Background color; ignored when `transparent` is true. */
  background: string;
  transparent: boolean;
  /** Raster scale factor (1/2/3). */
  scale: 1 | 2 | 3;
}

export interface ExportInput {
  scene: Scene;
  /** Excalidraw skeleton elements from {@link toExcalidrawSkeleton}. */
  skeleton: unknown[];
  settings: ExportSettings;
}

export interface ExportArtifact {
  format: ExportFormatId;
  /** Text payload (SVG string / .excalidraw JSON) — set for text formats. */
  text?: string;
  /** Binary payload — set for raster/PDF formats. */
  bytes?: Uint8Array;
  mime: string;
  filename: string;
}

export type Exporter = (input: ExportInput) => Promise<ExportArtifact>;

const registry = new Map<ExportFormatId, Exporter>();

/** Register (or replace) the exporter for a format. */
export function registerExporter(id: ExportFormatId, exporter: Exporter): void {
  registry.set(id, exporter);
}

export function getExporter(id: ExportFormatId): Exporter | undefined {
  return registry.get(id);
}

export function listExporters(): ExportFormatId[] {
  return [...registry.keys()];
}

/** Look up format metadata by id. */
export function formatOf(id: ExportFormatId): ExportFormat {
  const f = EXPORT_FORMATS.find((x) => x.id === id);
  if (!f) throw new Error(`Unknown export format: ${id}`);
  return f;
}

/** Default export settings for a given theme. */
export function defaultExportSettings(theme: 'light' | 'dark'): ExportSettings {
  return {
    theme,
    background: theme === 'dark' ? '#1E1E1E' : '#FFFFFF',
    transparent: false,
    scale: 2,
  };
}
