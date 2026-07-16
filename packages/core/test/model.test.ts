import { describe, it, expect } from 'vitest';
import { parse } from '../src/parser.js';
import { buildModel } from '../src/model.js';

function build(src: string) {
  return buildModel(parse(src).ast);
}

describe('buildModel', () => {
  it('attaches attributes to their owner entity', () => {
    const { model, diagnostics } = build('entity user "User"\nattr user.name "Name" key');
    expect(diagnostics).toHaveLength(0);
    expect(model.entities[0].attributes).toHaveLength(1);
    expect(model.entities[0].attributes[0].key).toBe(true);
  });

  it('flags duplicate ids', () => {
    const { diagnostics } = build('entity a "A"\nentity a "B"');
    expect(diagnostics.some((d) => d.code === 'duplicate-id')).toBe(true);
  });

  it('flags attributes with an unknown owner', () => {
    const { diagnostics } = build('attr ghost.x "X"');
    expect(diagnostics.some((d) => d.code === 'unknown-id')).toBe(true);
  });

  it('flags relationships referencing unknown entities exactly once', () => {
    const { diagnostics } = build('entity a "A"\nrel r "R" a 1-N ghost');
    const unknown = diagnostics.filter((d) => d.code === 'unknown-id');
    expect(unknown).toHaveLength(1);
    expect(unknown[0].message).toContain('ghost');
  });

  it('flags connectors referencing unknown ids', () => {
    const { diagnostics } = build('rect a "A"\narrow a -> b');
    expect(diagnostics.some((d) => d.code === 'unknown-id' && d.message.includes('"b"'))).toBe(true);
  });

  it('builds n-ary relationships from link statements', () => {
    const src = [
      'entity a "A"',
      'entity b "B"',
      'entity c "C"',
      'rel deliver "Deliver"',
      'link deliver a 1',
      'link deliver b N',
      'link deliver c N',
    ].join('\n');
    const { model, diagnostics } = build(src);
    expect(diagnostics).toHaveLength(0);
    expect(model.relationships[0].participants).toHaveLength(3);
  });

  it('honors the notation directive', () => {
    expect(build('notation uml').model.notation).toBe('uml');
    expect(build('entity a "A"').model.notation).toBe('chen');
  });
});
