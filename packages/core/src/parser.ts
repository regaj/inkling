/**
 * Stage 2 — the parser.
 *
 * Consumes the per-line token stream from {@link tokenize} and produces a typed
 * {@link Statement} AST plus {@link Diagnostic}s. The grammar is
 * one-statement-per-line, so each non-empty line is parsed independently and a
 * malformed line never derails the ones around it.
 *
 * Recognized diagnostics: unknown command, malformed coordinate/dimension,
 * malformed cardinality, and missing required arguments. Reference and
 * duplicate-id checks happen later in the model builder, which has the whole
 * document in view.
 */
import { tokenize } from './tokenizer.js';
import type {
  Cardinality,
  Diagnostic,
  DiagnosticCode,
  Direction,
  NotationName,
  Pos,
  PrimitiveKind,
  Statement,
  StructureKind,
  StructureOp,
  Token,
} from './types.js';
import { NOTATIONS } from './types.js';

export interface ParseResult {
  ast: Statement[];
  diagnostics: Diagnostic[];
}

/** Parse a full source document. */
export function parse(source: string): ParseResult {
  const lines = tokenize(source);
  const ast: Statement[] = [];
  const diagnostics: Diagnostic[] = [];

  for (const tokens of lines) {
    if (tokens.length === 0) continue; // blank or comment-only
    parseLine(tokens, ast, diagnostics);
  }

  return { ast, diagnostics };
}

// ─────────────────────────────────────────────────────────────────────────────
// Line dispatch
// ─────────────────────────────────────────────────────────────────────────────

function parseLine(tokens: Token[], ast: Statement[], diags: Diagnostic[]): void {
  const head = tokens[0];
  const keyword = head.value.toLowerCase();

  switch (keyword) {
    case 'notation':
      return parseNotation(tokens, ast, diags);
    case 'title':
      return parseTitle(tokens, ast, diags);
    case 'direction':
      return parseDirection(tokens, ast, diags);
    case 'entity':
      return parseEntity(tokens, ast, diags, false);
    case 'weak':
      return parseEntity(tokens, ast, diags, true);
    case 'attr':
      return parseAttr(tokens, ast, diags);
    case 'rel':
      return parseRel(tokens, ast, diags);
    case 'link':
      return parseLink(tokens, ast, diags);
    case 'rect':
    case 'ellipse':
    case 'diamond':
    case 'text':
      return parseShape(tokens, ast, diags, keyword as PrimitiveKind);
    case 'arrow':
    case 'line':
      return parseConnector(tokens, ast, diags, keyword as 'arrow' | 'line');
    case 'array':
    case 'stack':
    case 'queue':
    case 'linked_list':
      return parseStructure(tokens, ast, diags, keyword as StructureKind);
    case 'push':
    case 'pop':
    case 'enqueue':
    case 'dequeue':
    case 'append':
      return parseStructureOp(tokens, ast, diags, keyword as StructureOp);
    default:
      diag(diags, 'unknown-command', `Unknown command "${head.value}"`, head);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Directives
// ─────────────────────────────────────────────────────────────────────────────

function parseNotation(tokens: Token[], ast: Statement[], diags: Diagnostic[]): void {
  const arg = tokens[1];
  if (!arg) return missing(diags, 'notation <name>', tokens[0]);
  const name = arg.value.toLowerCase() as NotationName;
  if (!NOTATIONS.includes(name)) {
    return diag(
      diags,
      'bad-notation',
      `Unknown notation "${arg.value}". Expected one of: ${NOTATIONS.join(', ')}`,
      arg,
    );
  }
  ast.push({ type: 'notation', notation: name, pos: tokens[0].pos });
}

function parseTitle(tokens: Token[], ast: Statement[], diags: Diagnostic[]): void {
  const arg = tokens[1];
  if (!arg || arg.kind !== 'string') {
    return missing(diags, 'title "Text"', tokens[0]);
  }
  ast.push({ type: 'title', title: arg.value, pos: tokens[0].pos });
}

function parseDirection(tokens: Token[], ast: Statement[], diags: Diagnostic[]): void {
  const arg = tokens[1];
  if (!arg) return missing(diags, 'direction <LR|TB>', tokens[0]);
  const dir = arg.value.toUpperCase();
  if (dir !== 'LR' && dir !== 'RL' && dir !== 'TB' && dir !== 'BT') {
    return diag(
      diags,
      'bad-direction',
      `Direction must be LR, RL, TB, or BT, got "${arg.value}"`,
      arg,
    );
  }
  ast.push({ type: 'direction', direction: dir as Direction, pos: tokens[0].pos });
}

// ─────────────────────────────────────────────────────────────────────────────
// Semantic ER
// ─────────────────────────────────────────────────────────────────────────────

function parseEntity(
  tokens: Token[],
  ast: Statement[],
  diags: Diagnostic[],
  weak: boolean,
): void {
  const idTok = tokens[1];
  if (!idTok || idTok.kind !== 'word') {
    return missing(diags, `${weak ? 'weak' : 'entity'} <id> "Label"`, tokens[0]);
  }
  const labelTok = tokens[2];
  const label = labelTok && labelTok.kind === 'string' ? labelTok.value : idTok.value;
  ast.push({ type: 'entity', id: idTok.value, label, weak, pos: tokens[0].pos });
}

function parseAttr(tokens: Token[], ast: Statement[], diags: Diagnostic[]): void {
  const ownerTok = tokens[1];
  if (!ownerTok || ownerTok.kind !== 'word') {
    return missing(diags, 'attr <owner>.<id> "Label"', tokens[0]);
  }
  const dot = ownerTok.value.indexOf('.');
  if (dot <= 0 || dot === ownerTok.value.length - 1) {
    return diag(
      diags,
      'bad-owner',
      `Attribute must be written <owner>.<id> (e.g. user.name), got "${ownerTok.value}"`,
      ownerTok,
    );
  }
  const owner = ownerTok.value.slice(0, dot);
  const id = ownerTok.value.slice(dot + 1);
  const labelTok = tokens[2];
  const label = labelTok && labelTok.kind === 'string' ? labelTok.value : id;

  const flags = flagSet(tokens.slice(labelTok && labelTok.kind === 'string' ? 3 : 2));
  ast.push({
    type: 'attr',
    owner,
    id,
    label,
    key: flags.has('key'),
    partial: flags.has('partial'),
    derived: flags.has('derived'),
    multi: flags.has('multi'),
    optional: flags.has('optional'),
    pos: tokens[0].pos,
  });
}

function parseRel(tokens: Token[], ast: Statement[], diags: Diagnostic[]): void {
  const idTok = tokens[1];
  if (!idTok || idTok.kind !== 'word') {
    return missing(diags, 'rel <id> "Label" [<A> <cA>-<cB> <B>] [identifying]', tokens[0]);
  }
  const labelTok = tokens[2];
  const hasLabel = labelTok && labelTok.kind === 'string';
  const label = hasLabel ? labelTok.value : idTok.value;

  const rest = tokens.slice(hasLabel ? 3 : 2);
  const identifying = rest.some((t) => t.value.toLowerCase() === 'identifying');
  const positional = rest.filter((t) => t.value.toLowerCase() !== 'identifying');

  // Binary sugar: <A> <cardA>-<cardB> <B>
  if (positional.length >= 3) {
    const [aTok, cardTok, bTok] = positional;
    const parts = cardTok.value.split('-');
    if (parts.length !== 2) {
      return diag(
        diags,
        'bad-cardinality',
        `Binary cardinality must look like 1-N or 0..1-1..*, got "${cardTok.value}"`,
        cardTok,
      );
    }
    const cardA = parseCardinality(parts[0]);
    const cardB = parseCardinality(parts[1]);
    if (!cardA || !cardB) {
      return diag(diags, 'bad-cardinality', `Malformed cardinality "${cardTok.value}"`, cardTok);
    }
    ast.push({
      type: 'rel',
      id: idTok.value,
      label,
      identifying,
      binary: { a: aTok.value, b: bTok.value, cardA, cardB },
      pos: tokens[0].pos,
    });
    return;
  }

  // N-ary declaration form
  ast.push({ type: 'rel', id: idTok.value, label, identifying, pos: tokens[0].pos });
}

function parseLink(tokens: Token[], ast: Statement[], diags: Diagnostic[]): void {
  const relTok = tokens[1];
  const entTok = tokens[2];
  const cardTok = tokens[3];
  if (!relTok || !entTok || !cardTok) {
    return missing(diags, 'link <relId> <entityId> <card> [role "..."] [total]', tokens[0]);
  }
  const card = parseCardinality(cardTok.value);
  if (!card) {
    return diag(diags, 'bad-cardinality', `Malformed cardinality "${cardTok.value}"`, cardTok);
  }
  const rest = tokens.slice(4);
  const total = rest.some((t) => t.value.toLowerCase() === 'total');
  let role: string | undefined;
  const roleIdx = rest.findIndex((t) => t.value.toLowerCase() === 'role');
  if (roleIdx >= 0 && rest[roleIdx + 1] && rest[roleIdx + 1].kind === 'string') {
    role = rest[roleIdx + 1].value;
  }
  ast.push({
    type: 'link',
    rel: relTok.value,
    entity: entTok.value,
    card,
    role,
    total,
    pos: tokens[0].pos,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────────────────────────────────────────

function parseShape(
  tokens: Token[],
  ast: Statement[],
  diags: Diagnostic[],
  kind: PrimitiveKind,
): void {
  const idTok = tokens[1];
  if (!idTok || idTok.kind !== 'word') {
    return missing(diags, `${kind} <id> "Label" @x,y`, tokens[0]);
  }
  const labelTok = tokens[2];
  const hasLabel = labelTok && labelTok.kind === 'string';
  const label = hasLabel ? labelTok.value : '';

  const stmt = {
    type: 'shape' as const,
    kind,
    id: idTok.value,
    label,
    double: false,
    pos: tokens[0].pos,
  } as Extract<Statement, { type: 'shape' }>;

  for (const t of tokens.slice(hasLabel ? 3 : 2)) {
    const v = t.value;
    if (v.startsWith('@')) {
      const coord = parseCoord(v.slice(1));
      if (!coord) {
        diag(diags, 'bad-coordinate', `Malformed coordinate "${v}" (expected @x,y)`, t);
      } else {
        stmt.x = coord.x;
        stmt.y = coord.y;
      }
    } else if (/^\d+(\.\d+)?x\d+(\.\d+)?$/i.test(v)) {
      const [w, h] = v.toLowerCase().split('x').map(Number);
      stmt.w = w;
      stmt.h = h;
    } else if (v.toLowerCase().startsWith('fill=')) {
      stmt.fill = v.slice(5);
    } else if (v.toLowerCase().startsWith('stroke=')) {
      stmt.stroke = v.slice(7);
    } else if (v.toLowerCase().startsWith('size=')) {
      const n = Number(v.slice(5));
      if (Number.isFinite(n)) stmt.fontSize = n;
    } else if (v.toLowerCase() === 'double') {
      stmt.double = true;
    }
  }

  ast.push(stmt);
}

function parseConnector(
  tokens: Token[],
  ast: Statement[],
  diags: Diagnostic[],
  kind: 'arrow' | 'line',
): void {
  // <from> <op> <to> ["label"] [flags]
  const fromTok = tokens[1];
  const opTok = tokens[2];
  const toTok = tokens[3];
  if (!fromTok || !opTok || opTok.kind !== 'op' || !toTok) {
    return missing(diags, `${kind} <a> ${kind === 'arrow' ? '->' : '--'} <b> ["label"]`, tokens[0]);
  }
  const rest = tokens.slice(4);
  const labelTok = rest.find((t) => t.kind === 'string');
  const flags = flagSet(rest.filter((t) => t.kind !== 'string'));
  ast.push({
    type: 'connector',
    kind,
    from: fromTok.value,
    to: toTok.value,
    label: labelTok?.value,
    dashed: flags.has('dashed'),
    double: flags.has('double'),
    pos: tokens[0].pos,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Data structures
// ─────────────────────────────────────────────────────────────────────────────

function parseStructure(
  tokens: Token[],
  ast: Statement[],
  diags: Diagnostic[],
  kind: StructureKind,
): void {
  const idTok = tokens[1];
  if (!idTok || idTok.kind !== 'word') {
    return missing(diags, `${kind} <id> "Label" [v1, v2, ...]`, tokens[0]);
  }
  const labelTok = tokens[2];
  const hasLabel = labelTok && labelTok.kind === 'string';
  const label = hasLabel ? labelTok.value : idTok.value;
  const rest = tokens.slice(hasLabel ? 3 : 2);
  const values = parseValueList(rest);
  ast.push({ type: 'structure', kind, id: idTok.value, label, values, pos: tokens[0].pos });
}

function parseStructureOp(
  tokens: Token[],
  ast: Statement[],
  diags: Diagnostic[],
  op: StructureOp,
): void {
  const idTok = tokens[1];
  if (!idTok || idTok.kind !== 'word') {
    const usage = op === 'pop' || op === 'dequeue' ? `${op} <id>` : `${op} <id> <value>`;
    return missing(diags, usage, tokens[0]);
  }
  const needsValue = op !== 'pop' && op !== 'dequeue';
  const valueTok = tokens[2];
  if (needsValue && !valueTok) {
    return missing(diags, `${op} <id> <value>`, tokens[0]);
  }
  ast.push({
    type: 'structure-op',
    op,
    id: idTok.value,
    value: needsValue ? valueTok.value : undefined,
    pos: tokens[0].pos,
  });
}

/**
 * Parse a bracketed value list, e.g. `[10, 20, 30]`. Whitespace-insensitive:
 * the tokens are rejoined and the run between `[` and `]` is split on commas.
 * Values are simple (numbers / bare words / single-token strings) — commas
 * inside a value are not supported.
 */
function parseValueList(tokens: Token[]): string[] {
  if (tokens.length === 0) return [];
  const joined = tokens.map((t) => t.value).join(' ');
  const match = joined.match(/\[(.*)\]/s);
  const inner = match ? match[1] : joined;
  return inner
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse a single cardinality token into a normalized {@link Cardinality}.
 *
 * Accepts shorthand (`1`, `N`, `M`, `*`), ranges (`0..1`, `1..*`), and
 * parenthesized `(min,max)`. Returns `null` when malformed.
 */
export function parseCardinality(input: string): Cardinality | null {
  const raw = input.trim();
  if (raw.length === 0) return null;

  // Parenthesized (min,max)
  if (raw.startsWith('(') && raw.endsWith(')')) {
    const inner = raw.slice(1, -1).split(',');
    if (inner.length !== 2) return null;
    const min = boundValue(inner[0]);
    const max = boundValue(inner[1]);
    if (min === undefined || max === undefined || min === null) return null;
    return { min, max, raw };
  }

  // Range min..max
  if (raw.includes('..')) {
    const parts = raw.split('..');
    if (parts.length !== 2) return null;
    const min = boundValue(parts[0]);
    const max = boundValue(parts[1]);
    if (min === undefined || max === undefined || min === null) return null;
    return { min, max, raw };
  }

  // Shorthand
  const lower = raw.toLowerCase();
  if (lower === 'n' || lower === 'm' || raw === '*') {
    return { min: 1, max: null, raw };
  }
  const num = Number(raw);
  if (Number.isInteger(num) && num >= 0) {
    return { min: num, max: num, raw };
  }
  return null;
}

/** Parse one side of a range/pair: a non-negative integer, or `*`/`N`/`M` → ∞ (null). */
function boundValue(s: string): number | null | undefined {
  const t = s.trim().toLowerCase();
  if (t === '*' || t === 'n' || t === 'm') return null;
  const num = Number(t);
  if (Number.isInteger(num) && num >= 0) return num;
  return undefined; // invalid
}

function parseCoord(s: string): { x: number; y: number } | null {
  const parts = s.split(',');
  if (parts.length !== 2) return null;
  const x = Number(parts[0]);
  const y = Number(parts[1]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

/** Lowercased set of bare flag words from a token slice. */
function flagSet(tokens: Token[]): Set<string> {
  return new Set(tokens.filter((t) => t.kind === 'word').map((t) => t.value.toLowerCase()));
}

function diag(diags: Diagnostic[], code: DiagnosticCode, message: string, at: Token | Pos): void {
  const pos = 'pos' in at ? at.pos : at;
  const length = 'value' in at ? Math.max(1, at.value.length) : 1;
  diags.push({ severity: 'error', message, line: pos.line, col: pos.col, length, code });
}

function missing(diags: Diagnostic[], usage: string, at: Token): void {
  diag(diags, 'missing-argument', `Missing argument. Usage: ${usage}`, at);
}
