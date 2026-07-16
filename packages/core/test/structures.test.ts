import { describe, it, expect } from 'vitest';
import { compile } from '../src/compile.js';
import { parse } from '../src/parser.js';
import { buildModel } from '../src/model.js';
import type { StructureStmt } from '../src/types.js';

function model(src: string) {
  return buildModel(parse(src).ast).model;
}

describe('data structures', () => {
  it('parses a bracketed value list regardless of spacing', () => {
    const a = parse('array a "A" [1, 2, 3]').ast[0] as StructureStmt;
    const b = parse('array a "A" [1,2,3]').ast[0] as StructureStmt;
    expect(a.values).toEqual(['1', '2', '3']);
    expect(b.values).toEqual(['1', '2', '3']);
  });

  it('builds each structure kind', () => {
    const m = model(
      ['array ar "Arr" [1,2]', 'stack st "St" [1]', 'queue q "Q" [a,b]', 'linked_list ll "LL" [x]'].join(
        '\n',
      ),
    );
    expect(m.structures.map((s) => s.kind)).toEqual(['array', 'stack', 'queue', 'linked_list']);
  });

  it('applies push / append / enqueue / pop / dequeue in order', () => {
    const src = [
      'stack s "S" [1, 2]',
      'push s 3',
      'pop s',
      'queue q "Q" [a]',
      'enqueue q b',
      'dequeue q',
      'array r "R" []',
      'append r 9',
    ].join('\n');
    const m = model(src);
    expect(m.structures.find((s) => s.id === 's')!.values).toEqual(['1', '2']); // pushed 3 then popped
    expect(m.structures.find((s) => s.id === 'q')!.values).toEqual(['b']); // a dequeued, b enqueued
    expect(m.structures.find((s) => s.id === 'r')!.values).toEqual(['9']);
  });

  it('flags operations on an unknown structure', () => {
    const { diagnostics } = buildModel(parse('push ghost 1').ast);
    expect(diagnostics.some((d) => d.code === 'unknown-id')).toBe(true);
  });

  it('renders structure cells into the scene in every notation', () => {
    const src = 'array a "Arr" [10, 20, 30]';
    for (const notation of ['chen', 'crowsfoot', 'uml'] as const) {
      const r = compile(src, { notation });
      expect(r.ok).toBe(true);
      // three value cells present
      expect(r.scene.nodes.filter((n) => /^ds:a:\d+$/.test(n.id))).toHaveLength(3);
    }
  });

  it('draws linked-list pointer arrows between nodes', () => {
    const r = compile('linked_list ll "L" [a, b, c]');
    const links = r.scene.edges.filter((e) => e.id.includes('link'));
    expect(links.length).toBeGreaterThanOrEqual(3); // 2 inter-node + 1 to null
    expect(links.every((e) => e.endCap === 'arrow')).toBe(true);
  });
});

describe('directions', () => {
  it('accepts LR, RL, TB, BT', () => {
    for (const d of ['LR', 'RL', 'TB', 'BT']) {
      const { diagnostics } = parse(`direction ${d}`);
      expect(diagnostics, d).toHaveLength(0);
    }
  });

  it('rejects an invalid direction', () => {
    expect(parse('direction sideways').diagnostics.some((d) => d.code === 'bad-direction')).toBe(true);
  });

  it('RL mirrors LR on the x-axis (different layout, same set of ids)', () => {
    const src = 'rect a "A"\nrect b "B"\nrect c "C"\narrow a -> b\narrow b -> c';
    const lr = compile(`direction LR\n${src}`).scene;
    const rl = compile(`direction RL\n${src}`).scene;
    const ax = (s: typeof lr, id: string) => s.nodes.find((n) => n.id === `prim:${id}`)!.x;
    // In LR, a is left of c; in RL, a is right of c.
    expect(ax(lr, 'a')).toBeLessThan(ax(lr, 'c'));
    expect(ax(rl, 'a')).toBeGreaterThan(ax(rl, 'c'));
  });

  it('lays out a coordless flowchart by connectors', () => {
    const r = compile('direction TB\nrect a "Start"\ndiamond b "OK?"\nrect c "End"\narrow a -> b\narrow b -> c');
    const y = (id: string) => r.scene.nodes.find((n) => n.id === `prim:${id}`)!.y;
    expect(y('a')).toBeLessThan(y('b'));
    expect(y('b')).toBeLessThan(y('c'));
  });
});
