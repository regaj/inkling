import { describe, it, expect } from 'vitest';
import { compile } from '../src/compile.js';
import { parse } from '../src/parser.js';
import { buildModel } from '../src/model.js';
import type { IsaStmt } from '../src/types.js';

const SRC = [
  'entity audit "Audit"',
  'entity passed "Passed Audit"',
  'entity failed "Failed Audit"',
  'attr failed.hazards "hazards"',
  'isa audit [passed, failed] disjoint total',
].join('\n');

describe('ISA / specialization', () => {
  it('parses disjoint/total flags and the subclass list', () => {
    const stmt = parse('isa audit [passed, failed] disjoint total').ast[0] as IsaStmt;
    expect(stmt.superclass).toBe('audit');
    expect(stmt.subclasses).toEqual(['passed', 'failed']);
    expect(stmt.disjoint).toBe(true);
    expect(stmt.total).toBe(true);
  });

  it('defaults to disjoint + partial, and reads overlapping', () => {
    expect((parse('isa a [b, c]').ast[0] as IsaStmt).disjoint).toBe(true);
    expect((parse('isa a [b, c]').ast[0] as IsaStmt).total).toBe(false);
    expect((parse('isa a [b, c] overlapping').ast[0] as IsaStmt).disjoint).toBe(false);
  });

  it('requires a bracketed subclass list', () => {
    expect(parse('isa audit passed failed').diagnostics.length).toBeGreaterThan(0);
  });

  it('builds specializations and validates entity references', () => {
    const { model, diagnostics } = buildModel(parse(SRC).ast);
    expect(diagnostics).toHaveLength(0);
    expect(model.specializations).toHaveLength(1);
    expect(model.specializations[0].subclasses).toEqual(['passed', 'failed']);

    const bad = buildModel(parse('entity a "A"\nisa a [ghost]').ast);
    expect(bad.diagnostics.some((d) => d.code === 'unknown-id' && d.message.includes('ghost'))).toBe(
      true,
    );
  });

  it('renders an ISA circle (d/o) and a double line for total, in every notation', () => {
    for (const notation of ['chen', 'crowsfoot', 'uml', 'idef1x'] as const) {
      const r = compile(SRC, { notation });
      expect(r.ok, notation).toBe(true);
      const circle = r.scene.nodes.find((n) => n.id === 'isa:0');
      expect(circle, notation).toBeDefined();
      expect(circle!.label).toBe('d');
      // superclass edge is doubled (total)
      const supEdge = r.scene.edges.find((e) => e.id === 'isa:0:sup');
      expect(supEdge?.double, notation).toBe(true);
      // one edge per subclass
      expect(r.scene.edges.filter((e) => /^isa:0:(passed|failed)$/.test(e.id))).toHaveLength(2);
    }
  });
});
