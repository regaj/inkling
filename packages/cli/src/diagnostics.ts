/**
 * Rendering of compiler {@link Diagnostic}s for the terminal.
 *
 * Pure string formatting — no `@inkling/core` runtime import (the `Diagnostic`
 * import is type-only and erased), so it is unit-testable in isolation.
 */
import type { Diagnostic } from '@inkling/core';

/**
 * Format one diagnostic as a single `file:line:col: severity: message [code]`
 * line, GCC/TSC style.
 *
 * `Diagnostic.col` is 0-based; it is presented 1-based for human readers.
 */
export function formatDiagnostic(diagnostic: Diagnostic, file?: string): string {
  const prefix = file ? `${file}:` : '';
  const location = `${prefix}${diagnostic.line}:${diagnostic.col + 1}`;
  return `${location}: ${diagnostic.severity}: ${diagnostic.message} [${diagnostic.code}]`;
}

/** Format a list of diagnostics, one per line. */
export function formatDiagnostics(diagnostics: readonly Diagnostic[], file?: string): string {
  return diagnostics.map((diagnostic) => formatDiagnostic(diagnostic, file)).join('\n');
}

/** True when any diagnostic is `error`-severity (i.e. export should be blocked). */
export function hasErrors(diagnostics: readonly Diagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === 'error');
}
