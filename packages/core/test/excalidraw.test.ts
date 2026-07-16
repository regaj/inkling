import { describe, it, expect } from 'vitest';
import { compile } from '../src/compile.js';
import { toExcalidrawSkeleton, wrapExcalidrawFile } from '../src/excalidraw.js';

describe('toExcalidrawSkeleton — golden structure', () => {
  it('labels boxed entities with a centered bound-text header', () => {
    const { scene } = compile('entity user "User"', { notation: 'chen' });
    const els = toExcalidrawSkeleton(scene);
    expect(els.find((e) => e.id === 'user')?.type).toBe('rectangle');
    // Header is bound text in a transparent cell (centered by Excalidraw).
    const hdr = els.find((e) => e.id === 'hdr:user');
    expect(hdr?.label?.text).toBe('User');
    expect(hdr?.strokeColor).toBe('transparent');
  });

  it('emits bound-text labels on relationship diamonds and classic ellipse attrs', () => {
    const src = 'entity a "A"\nentity b "B"\nrel r "R" a 1-N b';
    const els = toExcalidrawSkeleton(compile(src, { notation: 'chen' }).scene);
    const diamond = els.find((e) => e.id === 'r');
    expect(diamond?.type).toBe('diamond');
    expect(diamond?.label?.text).toBe('R');

    // In classic ellipse mode, attributes are bound-text ellipses.
    const ell = toExcalidrawSkeleton(
      compile('attrs ellipse\nentity a "A"\nattr a.x "X"', { notation: 'chen' }).scene,
    );
    expect(ell.find((e) => e.id === 'attr:a:x')?.label?.text).toBe('X');
  });

  it('emits arrows with real start/end bindings for participation edges', () => {
    const src = 'entity e "E"\nweak w "W"\nrel r "R" e 1-N w';
    const { scene } = compile(src, { notation: 'chen' });
    const els = toExcalidrawSkeleton(scene);
    const connectors = els.filter((e) => e.type === 'arrow' || e.type === 'line');
    const bound = connectors.filter((e) => e.start?.id && e.end?.id);
    expect(bound.length).toBeGreaterThan(0);
    // Every binding references a real element id.
    const ids = new Set(els.map((e) => e.id));
    for (const c of bound) {
      expect(ids.has(c.start!.id)).toBe(true);
      expect(ids.has(c.end!.id)).toBe(true);
    }
  });

  it('emits an inset inner outline for double-bordered shapes', () => {
    const { scene } = compile('weak w "W"', { notation: 'chen' });
    const els = toExcalidrawSkeleton(scene);
    const outer = els.find((e) => e.id === 'w')!;
    const inner = els.find((e) => e.id === 'w__inner')!;
    expect(inner).toBeDefined();
    expect(inner.x).toBeGreaterThan(outer.x);
    expect(inner.width!).toBeLessThan(outer.width!);
    expect(inner.backgroundColor).toBe('transparent');
  });

  it('draws crow\'s-foot markers for many-cardinality ends', () => {
    const src = 'entity a "A"\nentity b "B"\nrel r "R" a 1-N b';
    const { scene } = compile(src, { notation: 'crowsfoot' });
    const els = toExcalidrawSkeleton(scene);
    // Marker line elements are emitted with the __sc / __ec id suffixes.
    expect(els.some((e) => typeof e.id === 'string' && e.id.includes('__ec'))).toBe(true);
  });

  it('wraps elements in a reopenable .excalidraw envelope', () => {
    const file = wrapExcalidrawFile([{ type: 'rectangle' }]);
    expect(file.type).toBe('excalidraw');
    expect(file.version).toBe(2);
    expect(file.elements).toHaveLength(1);
    expect(file.appState).toHaveProperty('viewBackgroundColor');
  });

  it('produces no NaN coordinates', () => {
    const { scene } = compile('entity a "A"\nentity b "B"\nrel r "R" a 1-N b', {
      notation: 'uml',
    });
    for (const el of toExcalidrawSkeleton(scene)) {
      expect(Number.isFinite(el.x)).toBe(true);
      expect(Number.isFinite(el.y)).toBe(true);
    }
  });
});
