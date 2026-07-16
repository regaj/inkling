import { describe, it, expect } from 'vitest';
import { parse, parseCardinality } from '../src/parser.js';
import type { AttrStmt, EntityStmt, RelStmt } from '../src/types.js';

describe('parseCardinality', () => {
  it('normalizes shorthand', () => {
    expect(parseCardinality('1')).toEqual({ min: 1, max: 1, raw: '1' });
    expect(parseCardinality('N')).toEqual({ min: 1, max: null, raw: 'N' });
    expect(parseCardinality('*')).toEqual({ min: 1, max: null, raw: '*' });
  });

  it('parses ranges and pairs', () => {
    expect(parseCardinality('0..1')).toEqual({ min: 0, max: 1, raw: '0..1' });
    expect(parseCardinality('1..*')).toEqual({ min: 1, max: null, raw: '1..*' });
    expect(parseCardinality('(0,N)')).toEqual({ min: 0, max: null, raw: '(0,N)' });
  });

  it('rejects malformed cardinalities', () => {
    expect(parseCardinality('')).toBeNull();
    expect(parseCardinality('abc')).toBeNull();
    expect(parseCardinality('1..2..3')).toBeNull();
  });
});

describe('parse', () => {
  it('parses entities and weak entities', () => {
    const { ast, diagnostics } = parse('entity user "User"\nweak audit "Audit"');
    expect(diagnostics).toHaveLength(0);
    expect((ast[0] as EntityStmt).weak).toBe(false);
    expect((ast[1] as EntityStmt).weak).toBe(true);
  });

  it('parses attribute flags and owner.id', () => {
    const { ast } = parse('attr user.email "Email" key optional');
    const a = ast[0] as AttrStmt;
    expect(a.owner).toBe('user');
    expect(a.id).toBe('email');
    expect(a.key).toBe(true);
    expect(a.optional).toBe(true);
    expect(a.derived).toBe(false);
  });

  it('expands binary relationship sugar', () => {
    const { ast } = parse('rel owns "Owns" user 1-N account identifying');
    const r = ast[0] as RelStmt;
    expect(r.identifying).toBe(true);
    expect(r.binary?.a).toBe('user');
    expect(r.binary?.b).toBe('account');
    expect(r.binary?.cardA.max).toBe(1);
    expect(r.binary?.cardB.max).toBeNull();
  });

  it('reports unknown commands with position', () => {
    const { diagnostics } = parse('frobnicate x');
    expect(diagnostics[0].code).toBe('unknown-command');
    expect(diagnostics[0].line).toBe(1);
  });

  it('reports malformed coordinates', () => {
    const { diagnostics } = parse('rect a "A" @1,2,3');
    expect(diagnostics.some((d) => d.code === 'bad-coordinate')).toBe(true);
  });

  it('reports malformed cardinality in binary rel', () => {
    const { diagnostics } = parse('rel r "R" a 1-oops b');
    expect(diagnostics.some((d) => d.code === 'bad-cardinality')).toBe(true);
  });

  it('parses primitive shapes with options', () => {
    const { ast } = parse('rect a "A" @10,20 160x64 fill=#e5ffd6 double');
    expect(ast[0]).toMatchObject({
      type: 'shape',
      kind: 'rect',
      x: 10,
      y: 20,
      w: 160,
      h: 64,
      fill: '#e5ffd6',
      double: true,
    });
  });

  it('ignores blank and comment-only lines', () => {
    const { ast, diagnostics } = parse('\n# comment\n   \nentity a "A"');
    expect(diagnostics).toHaveLength(0);
    expect(ast).toHaveLength(1);
  });
});
