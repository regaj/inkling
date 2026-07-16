/**
 * Output-format helpers.
 *
 * Kept free of any `@inkling/core` *runtime* import (only a type-only import,
 * which is erased) so the pure format-inference logic can be unit-tested without
 * pulling the engine or a workspace link.
 */
import { extname } from 'node:path';
import type { ExportFormatId } from '@inkling/core';

/** The formats the CLI can emit, in help/menu order. */
export const FORMATS: readonly ExportFormatId[] = ['excalidraw', 'svg', 'png', 'jpg', 'pdf'];

/** File extensions the CLI recognizes, mapped to the format they imply. */
const EXT_TO_FORMAT: Readonly<Record<string, ExportFormatId>> = {
  '.excalidraw': 'excalidraw',
  '.svg': 'svg',
  '.png': 'png',
  '.jpg': 'jpg',
  '.jpeg': 'jpg',
  '.pdf': 'pdf',
};

/** Text formats are written as UTF-8; the rest are binary. */
const TEXT_FORMATS: ReadonlySet<ExportFormatId> = new Set<ExportFormatId>(['excalidraw', 'svg']);

/** True for a recognized format id. */
export function isFormat(value: string): value is ExportFormatId {
  return (FORMATS as readonly string[]).includes(value);
}

/** Whether a format's payload is text (vs. binary bytes). */
export function isTextFormat(format: ExportFormatId): boolean {
  return TEXT_FORMATS.has(format);
}

/**
 * Infer an export format from an output path's extension.
 *
 * @returns the matching {@link ExportFormatId}, or `undefined` when the
 * extension is missing or unrecognized (the caller should then require an
 * explicit `--format`).
 */
export function inferFormat(outputPath: string): ExportFormatId | undefined {
  const ext = extname(outputPath).toLowerCase();
  return EXT_TO_FORMAT[ext];
}
