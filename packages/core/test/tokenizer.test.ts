import { describe, it, expect } from 'vitest';
import { tokenizeLine } from '../src/tokenizer.js';

describe('tokenizer', () => {
  it('splits words and preserves quoted labels', () => {
    const t = tokenizeLine('entity user "User Account"', 0);
    expect(t.map((x) => x.value)).toEqual(['entity', 'user', 'User Account']);
    expect(t[2].kind).toBe('string');
  });

  it('recognizes connector operators', () => {
    const t = tokenizeLine('arrow a -> b', 0);
    expect(t[2].kind).toBe('op');
    expect(t[2].value).toBe('->');
    expect(tokenizeLine('line a -- b', 0)[2].value).toBe('--');
  });

  it('treats a leading # as a comment but keeps inline hex colors', () => {
    expect(tokenizeLine('# just a comment', 0)).toHaveLength(0);
    const t = tokenizeLine('rect a "A" fill=#e5ffd6 # trailing', 0);
    expect(t.map((x) => x.value)).toEqual(['rect', 'a', 'A', 'fill=#e5ffd6']);
  });

  it('tracks 1-based line and 0-based column', () => {
    const t = tokenizeLine('  entity x', 4);
    expect(t[0].pos).toEqual({ line: 5, col: 2 });
  });

  it('handles escaped quotes inside strings', () => {
    const t = tokenizeLine('text a "say \\"hi\\""', 0);
    expect(t[2].value).toBe('say "hi"');
  });
});
