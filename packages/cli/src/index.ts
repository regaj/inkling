#!/usr/bin/env node
/**
 * `inkling` CLI entry point.
 *
 * Owns all I/O and process control: parse argv, run the export, print
 * diagnostics to stderr, and translate failures into clean messages + exit
 * codes. The heavy lifting lives in `cli.ts` (parsing) and `export.ts`
 * (compile + render + write).
 */
import { getVersion, HELP_TEXT, parseCliArgs } from './cli.js';
import type { CliOptions } from './cli.js';
import { formatDiagnostics } from './diagnostics.js';
import { runExport } from './export.js';
import { ChromiumNotInstalledError } from './render.js';

/** Parse argv and dispatch. Returns the process exit code. */
async function main(): Promise<number> {
  const parsed = parseCliArgs(process.argv.slice(2));
  switch (parsed.kind) {
    case 'help':
      process.stdout.write(`${HELP_TEXT}\n`);
      return 0;
    case 'version':
      process.stdout.write(`${getVersion()}\n`);
      return 0;
    case 'error':
      process.stderr.write(`error: ${parsed.message}\n\n${HELP_TEXT}\n`);
      return 2;
    case 'run':
      return runAndReport(parsed.options);
  }
}

/** Run the export and report diagnostics / errors. */
async function runAndReport(options: CliOptions): Promise<number> {
  try {
    const { diagnostics, ok } = await runExport(options);

    if (diagnostics.length > 0) {
      process.stderr.write(`${formatDiagnostics(diagnostics, options.input)}\n`);
    }
    if (!ok) {
      process.stderr.write('error: diagram has errors; nothing was exported.\n');
      return 1;
    }

    process.stderr.write(`Wrote ${options.output}\n`);
    return 0;
  } catch (err) {
    if (err instanceof ChromiumNotInstalledError) {
      process.stderr.write(`error: ${err.message}\n`);
      return 1;
    }
    if (isErrno(err) && err.code === 'ENOENT') {
      process.stderr.write(`error: cannot read input file "${options.input}".\n`);
      return 1;
    }
    process.stderr.write(`error: ${err instanceof Error ? err.message : String(err)}\n`);
    return 1;
  }
}

/** Type guard for a Node system error carrying a `code`. */
function isErrno(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err: unknown) => {
    process.stderr.write(`error: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
  });
