import { describe, expect, it } from 'vitest';
import { inferFormat, isFormat, isTextFormat } from '../src/format.js';
import { formatDiagnostic, formatDiagnostics, hasErrors } from '../src/diagnostics.js';
import type { Diagnostic } from '@inkling/core';

describe('format inference', () => {
  it('maps known extensions to formats', () => {
    expect(inferFormat('out.svg')).toBe('svg');
    expect(inferFormat('out.png')).toBe('png');
    expect(inferFormat('diagram.jpg')).toBe('jpg');
    expect(inferFormat('photo.jpeg')).toBe('jpg');
    expect(inferFormat('doc.pdf')).toBe('pdf');
    expect(inferFormat('scene.excalidraw')).toBe('excalidraw');
  });

  it('is case-insensitive and path-aware', () => {
    expect(inferFormat('OUT.SVG')).toBe('svg');
    expect(inferFormat('/tmp/nested.dir/out.PNG')).toBe('png');
  });

  it('returns undefined for missing or unknown extensions', () => {
    expect(inferFormat('output')).toBeUndefined();
    expect(inferFormat('archive.zip')).toBeUndefined();
  });

  it('classifies text vs binary formats', () => {
    expect(isFormat('svg')).toBe(true);
    expect(isFormat('bmp')).toBe(false);
    expect(isTextFormat('svg')).toBe(true);
    expect(isTextFormat('excalidraw')).toBe(true);
    expect(isTextFormat('png')).toBe(false);
    expect(isTextFormat('pdf')).toBe(false);
  });
});

describe('diagnostics formatting', () => {
  const error: Diagnostic = {
    severity: 'error',
    message: 'unknown id "foo"',
    line: 3,
    col: 4,
    length: 3,
    code: 'unknown-id',
  };
  const warning: Diagnostic = {
    severity: 'warning',
    message: 'entity has no attributes',
    line: 7,
    col: 0,
    length: 1,
    code: 'unknown-command',
  };

  it('formats one diagnostic with a 1-based column and file prefix', () => {
    expect(formatDiagnostic(error, 'schema.ink')).toBe(
      'schema.ink:3:5: error: unknown id "foo" [unknown-id]',
    );
  });

  it('omits the file prefix when none is given', () => {
    expect(formatDiagnostic(error)).toBe('3:5: error: unknown id "foo" [unknown-id]');
  });

  it('joins multiple diagnostics one per line', () => {
    expect(formatDiagnostics([error, warning], 'schema.ink')).toBe(
      'schema.ink:3:5: error: unknown id "foo" [unknown-id]\n' +
        'schema.ink:7:1: warning: entity has no attributes [unknown-command]',
    );
  });

  it('detects error-severity diagnostics', () => {
    expect(hasErrors([warning])).toBe(false);
    expect(hasErrors([warning, error])).toBe(true);
    expect(hasErrors([])).toBe(false);
  });
});
