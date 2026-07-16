import { describe, it, expect } from 'vitest';
import { compile } from '../src/compile.js';
import { NOTATIONS } from '../src/types.js';
import { SAMPLE_INK } from '../src/sample.js';
import { DARK_PALETTE } from '../src/palette.js';

describe('compile', () => {
  it('compiles the sample document without errors', () => {
    const r = compile(SAMPLE_INK);
    expect(r.ok).toBe(true);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
    expect(r.scene.nodes.length).toBeGreaterThan(0);
    expect(r.scene.width).toBeGreaterThan(0);
    expect(r.scene.height).toBeGreaterThan(0);
  });

  it('renders the sample in every notation and stays in-bounds', () => {
    for (const notation of NOTATIONS) {
      const r = compile(SAMPLE_INK, { notation });
      expect(r.ok, `notation ${notation}`).toBe(true);
      expect(r.scene.notation).toBe(notation);
      // Every node sits within the reported canvas.
      for (const n of r.scene.nodes) {
        expect(n.x).toBeGreaterThanOrEqual(0);
        expect(n.y).toBeGreaterThanOrEqual(0);
        expect(n.x + n.w).toBeLessThanOrEqual(r.scene.width + 1);
        expect(n.y + n.h).toBeLessThanOrEqual(r.scene.height + 1);
      }
    }
  });

  it('option notation overrides the document directive', () => {
    const r = compile('notation chen\nentity a "A"', { notation: 'crowsfoot' });
    expect(r.scene.notation).toBe('crowsfoot');
  });

  it('is deterministic (same input → identical scene)', () => {
    const a = JSON.stringify(compile(SAMPLE_INK).scene);
    const b = JSON.stringify(compile(SAMPLE_INK).scene);
    expect(a).toBe(b);
  });

  it('accepts a palette override', () => {
    const r = compile('entity a "A"', { palette: DARK_PALETTE });
    const entity = r.scene.nodes.find((n) => n.id === 'a');
    expect(entity?.fill).toBe(DARK_PALETTE.entityFill);
  });

  it('Chen renders weak entities and identifying relationships as doubles', () => {
    const src = 'weak w "W"\nentity e "E"\nrel r "R" w N-1 e identifying';
    const r = compile(src, { notation: 'chen' });
    expect(r.scene.nodes.find((n) => n.id === 'w')?.double).toBe(true);
    expect(r.scene.nodes.find((n) => n.id === 'r')?.double).toBe(true);
  });

  it('Crow\'s Foot renders entities as attribute boxes with rows', () => {
    const src = 'entity u "User"\nattr u.id "id" key\nattr u.name "name"';
    const r = compile(src, { notation: 'crowsfoot' });
    expect(r.scene.nodes.find((n) => n.id === 'u')?.role).toBe('entity-box');
    expect(r.scene.nodes.some((n) => n.id === 'row:u:name')).toBe(true);
  });
});
