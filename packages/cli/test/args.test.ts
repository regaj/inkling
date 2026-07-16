import { describe, expect, it } from 'vitest';
import { parseCliArgs } from '../src/cli.js';

describe('parseCliArgs', () => {
  it('infers format from the output extension', () => {
    const parsed = parseCliArgs(['schema.ink', '-o', 'out.png']);
    expect(parsed.kind).toBe('run');
    if (parsed.kind !== 'run') return;
    expect(parsed.options).toMatchObject({
      input: 'schema.ink',
      output: 'out.png',
      format: 'png',
      theme: 'light',
      transparent: false,
      scale: 1,
    });
    expect(parsed.options.notation).toBeUndefined();
  });

  it('lets an explicit --format override the extension', () => {
    const parsed = parseCliArgs(['s.ink', '-o', 'out.txt', '--format', 'svg']);
    expect(parsed).toMatchObject({ kind: 'run', options: { format: 'svg' } });
  });

  it('accepts full option set and coerces scale', () => {
    const parsed = parseCliArgs([
      's.ink',
      '-o', 'out.png',
      '--notation', 'crowsfoot',
      '--theme', 'dark',
      '--background', '#112233',
      '--transparent',
      '--scale', '2',
    ]);
    expect(parsed).toMatchObject({
      kind: 'run',
      options: {
        notation: 'crowsfoot',
        theme: 'dark',
        background: '#112233',
        transparent: true,
        scale: 2,
      },
    });
  });

  it('requires an input file', () => {
    expect(parseCliArgs(['-o', 'out.svg']).kind).toBe('error');
  });

  it('requires an output path', () => {
    expect(parseCliArgs(['schema.ink']).kind).toBe('error');
  });

  it('errors when the format cannot be inferred and none is given', () => {
    const parsed = parseCliArgs(['schema.ink', '-o', 'out']);
    expect(parsed.kind).toBe('error');
  });

  it('rejects unknown format, notation, theme, and scale values', () => {
    expect(parseCliArgs(['s.ink', '-o', 'o.x', '--format', 'gif']).kind).toBe('error');
    expect(parseCliArgs(['s.ink', '-o', 'o.svg', '--notation', 'bogus']).kind).toBe('error');
    expect(parseCliArgs(['s.ink', '-o', 'o.svg', '--theme', 'blue']).kind).toBe('error');
    expect(parseCliArgs(['s.ink', '-o', 'o.svg', '--scale', '4']).kind).toBe('error');
    expect(parseCliArgs(['s.ink', '-o', 'o.svg', '--background', 'red']).kind).toBe('error');
  });

  it('surfaces help and version before validation', () => {
    expect(parseCliArgs(['--help']).kind).toBe('help');
    expect(parseCliArgs(['-v']).kind).toBe('version');
  });
});
