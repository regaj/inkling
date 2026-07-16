/**
 * Command-line parsing and validation.
 *
 * Turns `process.argv` into a fully-validated {@link CliOptions} (or a help /
 * version / error signal) using Node's built-in {@link parseArgs} — no external
 * argument parser. All I/O and process control lives in `index.ts`; this module
 * is pure and testable.
 */
import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { NOTATIONS } from '@inkling/core';
import type { ExportFormatId, NotationName } from '@inkling/core';
import { FORMATS, inferFormat, isFormat } from './format.js';

/** A fully-validated invocation, ready to run. */
export interface CliOptions {
  /** Path to the input `.ink` document. */
  input: string;
  /** Path to write the exported artifact to. */
  output: string;
  /** Resolved export format (explicit or inferred from {@link output}). */
  format: ExportFormatId;
  /** Override notation; when omitted the document's own directive wins. */
  notation?: NotationName;
  /** Diagram theme (independent of any editor theme). */
  theme: 'light' | 'dark';
  /** Background hex color; ignored when {@link transparent} is set. */
  background?: string;
  /** Export with a transparent background. */
  transparent: boolean;
  /** Raster scale factor. */
  scale: 1 | 2 | 3;
}

/** The outcome of parsing argv. */
export type ParsedArgs =
  | { kind: 'run'; options: CliOptions }
  | { kind: 'help' }
  | { kind: 'version' }
  | { kind: 'error'; message: string };

/** True for a recognized notation name. */
function isNotation(value: string): value is NotationName {
  return (NOTATIONS as readonly string[]).includes(value);
}

/** Basic `#rgb` / `#rrggbb` hex-color check. */
function isHexColor(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

/**
 * Parse and validate CLI arguments.
 *
 * Never throws and never touches the filesystem or process — returns a tagged
 * {@link ParsedArgs} the caller renders. Unknown flags and malformed values
 * surface as `{ kind: 'error' }`.
 */
export function parseCliArgs(argv: readonly string[]): ParsedArgs {
  let parsed: ReturnType<typeof parseArgs<{
    options: {
      output: { type: 'string'; short: 'o' };
      format: { type: 'string' };
      notation: { type: 'string' };
      theme: { type: 'string' };
      background: { type: 'string' };
      transparent: { type: 'boolean' };
      scale: { type: 'string' };
      help: { type: 'boolean'; short: 'h' };
      version: { type: 'boolean'; short: 'v' };
    };
    allowPositionals: true;
  }>>;
  try {
    parsed = parseArgs({
      args: [...argv],
      allowPositionals: true,
      options: {
        output: { type: 'string', short: 'o' },
        format: { type: 'string' },
        notation: { type: 'string' },
        theme: { type: 'string' },
        background: { type: 'string' },
        transparent: { type: 'boolean' },
        scale: { type: 'string' },
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
      },
    });
  } catch (err) {
    return { kind: 'error', message: err instanceof Error ? err.message : String(err) };
  }

  const { values, positionals } = parsed;

  if (values.help) return { kind: 'help' };
  if (values.version) return { kind: 'version' };

  if (positionals.length === 0) {
    return { kind: 'error', message: 'Missing input file. Usage: inkling <input.ink> -o <output>' };
  }
  if (positionals.length > 1) {
    return { kind: 'error', message: `Expected a single input file but got ${positionals.length}.` };
  }
  const input = positionals[0]!;

  const output = values.output;
  if (!output) {
    return { kind: 'error', message: 'Missing output path. Pass -o <output>.' };
  }

  let format: ExportFormatId;
  if (values.format !== undefined) {
    if (!isFormat(values.format)) {
      return { kind: 'error', message: `Unknown format "${values.format}". Expected one of: ${FORMATS.join(', ')}.` };
    }
    format = values.format;
  } else {
    const inferred = inferFormat(output);
    if (!inferred) {
      return {
        kind: 'error',
        message: `Cannot infer format from "${output}". Pass --format (${FORMATS.join(', ')}).`,
      };
    }
    format = inferred;
  }

  const options: CliOptions = {
    input,
    output,
    format,
    theme: 'light',
    transparent: Boolean(values.transparent),
    scale: 1,
  };

  if (values.notation !== undefined) {
    if (!isNotation(values.notation)) {
      return { kind: 'error', message: `Unknown notation "${values.notation}". Expected one of: ${NOTATIONS.join(', ')}.` };
    }
    options.notation = values.notation;
  }

  if (values.theme !== undefined) {
    if (values.theme !== 'light' && values.theme !== 'dark') {
      return { kind: 'error', message: `Unknown theme "${values.theme}". Expected "light" or "dark".` };
    }
    options.theme = values.theme;
  }

  if (values.background !== undefined) {
    if (!isHexColor(values.background)) {
      return { kind: 'error', message: `Invalid background "${values.background}". Expected a hex color like #ffffff.` };
    }
    options.background = values.background;
  }

  if (values.scale !== undefined) {
    const n = Number(values.scale);
    if (n !== 1 && n !== 2 && n !== 3) {
      return { kind: 'error', message: `Invalid scale "${values.scale}". Expected 1, 2, or 3.` };
    }
    options.scale = n as 1 | 2 | 3;
  }

  return { kind: 'run', options };
}

/** The `--help` text. */
export const HELP_TEXT = `inkling — export .ink diagrams from the terminal

Usage:
  inkling <input.ink> -o <output> [options]

Options:
  -o, --output <path>      Output file (required). Format is inferred from its extension.
      --format <fmt>       Force output format: ${FORMATS.join(' | ')}
      --notation <name>    Override notation: ${[...NOTATIONS].join(' | ')}
                           (omit to honor the document's own notation directive)
      --theme <light|dark> Diagram theme (default: light)
      --background <hex>   Background color, e.g. #ffffff (ignored with --transparent)
      --transparent        Export with a transparent background
      --scale <1|2|3>      Raster scale factor for png/jpg (default: 1)
  -h, --help               Show this help
  -v, --version            Print the version

Examples:
  inkling schema.ink -o schema.svg
  inkling schema.ink -o schema.png --scale 2 --theme dark
  inkling schema.ink -o schema.excalidraw --notation crowsfoot`;

/** Read this package's version from its `package.json`, best-effort. */
export function getVersion(): string {
  try {
    const url = new URL('../package.json', import.meta.url);
    const pkg = JSON.parse(readFileSync(url, 'utf8')) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}
