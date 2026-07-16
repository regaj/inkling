/**
 * Stage 1 — the tokenizer.
 *
 * Splits each source line into whitespace-delimited {@link Token}s while
 * respecting double-quoted labels. A `#` at the start of a token begins a
 * comment that runs to end of line — this is deliberately chosen so that inline
 * hex colors (`fill=#e5ffd6`, where `#` is *not* at a token boundary) are never
 * mistaken for comments.
 *
 * Tokens are grouped per line because the grammar is strictly one-statement-per-line.
 */
import type { Token } from './types.js';

const OPERATORS = new Set(['->', '--']);

/** Tokenize a single line (0-based `lineIndex`); returns its tokens in order. */
export function tokenizeLine(line: string, lineIndex: number): Token[] {
  const tokens: Token[] = [];
  const lineNo = lineIndex + 1;
  let i = 0;
  const n = line.length;

  while (i < n) {
    const ch = line[i];

    // Whitespace
    if (ch === ' ' || ch === '\t' || ch === '\r') {
      i++;
      continue;
    }

    // Comment — `#` at the start of a token
    if (ch === '#') {
      break;
    }

    const startCol = i;

    // Quoted string
    if (ch === '"') {
      i++; // consume opening quote
      let value = '';
      while (i < n) {
        if (line[i] === '\\' && i + 1 < n) {
          // allow \" and \\ escapes
          value += line[i + 1];
          i += 2;
          continue;
        }
        if (line[i] === '"') {
          i++; // consume closing quote
          break;
        }
        value += line[i];
        i++;
      }
      tokens.push({ value, kind: 'string', pos: { line: lineNo, col: startCol } });
      continue;
    }

    // Bare word / operator — read until whitespace
    let value = '';
    while (i < n && line[i] !== ' ' && line[i] !== '\t' && line[i] !== '\r') {
      value += line[i];
      i++;
    }
    tokens.push({
      value,
      kind: OPERATORS.has(value) ? 'op' : 'word',
      pos: { line: lineNo, col: startCol },
    });
  }

  return tokens;
}

/** Tokenize a full source document into per-line token arrays. */
export function tokenize(source: string): Token[][] {
  return source.split('\n').map((line, idx) => tokenizeLine(line, idx));
}
