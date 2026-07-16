/**
 * The `.ink` CodeMirror 6 language: a StreamLanguage tokenizer, two
 * theme-matched highlight styles, context-aware autocomplete, `#hex` color
 * swatches, and a linter that surfaces the core compiler's diagnostics as
 * squiggles + gutter markers.
 */
import { StreamLanguage, HighlightStyle, syntaxHighlighting, LanguageSupport } from '@codemirror/language';
import { Tag } from '@lezer/highlight';
import {
  Decoration,
  ViewPlugin,
  MatchDecorator,
  WidgetType,
  type DecorationSet,
  type EditorView,
  type ViewUpdate,
} from '@codemirror/view';
import { linter, type Diagnostic as CmDiagnostic } from '@codemirror/lint';
import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import type { Extension } from '@codemirror/state';
import { parse, buildModel, NOTATIONS } from '@inkling/core';

// ── Custom highlight tags (one per DSL token class) ──────────────────────────
const tCommand = Tag.define();
const tId = Tag.define();
const tString = Tag.define();
const tNumber = Tag.define();
const tOption = Tag.define();
const tColor = Tag.define();
const tFlag = Tag.define();
const tOperator = Tag.define();
const tComment = Tag.define();

const COMMANDS = [
  'notation',
  'title',
  'direction',
  'entity',
  'weak',
  'attr',
  'rel',
  'link',
  'isa',
  'rect',
  'ellipse',
  'diamond',
  'text',
  'arrow',
  'line',
  'array',
  'stack',
  'queue',
  'linked_list',
  'push',
  'pop',
  'enqueue',
  'dequeue',
  'append',
];

const STRUCTURE_OPS = new Set(['push', 'pop', 'enqueue', 'dequeue', 'append']);
const FLAGS = new Set([
  'double',
  'dashed',
  'key',
  'partial',
  'derived',
  'multi',
  'optional',
  'identifying',
  'total',
  'role',
  'disjoint',
  'overlapping',
]);

interface InkState {
  n: number;
}

const inkStream = StreamLanguage.define<InkState>({
  name: 'ink',
  startState: () => ({ n: 0 }),
  token(stream, state) {
    if (stream.sol()) state.n = 0;
    if (stream.eatSpace()) return null;

    const ch = stream.peek();
    if (ch === '#') {
      stream.skipToEnd();
      return 'comment';
    }
    if (ch === '"') {
      stream.next();
      let prev = '';
      while (!stream.eol()) {
        const c = stream.next()!;
        if (c === '"' && prev !== '\\') break;
        prev = c;
      }
      state.n++;
      return 'string';
    }
    if (stream.match('->') || stream.match('--')) {
      state.n++;
      return 'operator';
    }
    if (state.n === 0) {
      stream.eatWhile(/\S/);
      state.n++;
      return 'command';
    }
    if (stream.match(/^#[0-9a-fA-F]{3,8}\b/)) {
      state.n++;
      return 'color';
    }
    // A bracketed value list, e.g. [10, 20, 30].
    if (stream.match(/^\[[^\]]*\]?/)) {
      state.n++;
      return 'number';
    }
    if (stream.match(/^[a-zA-Z_]+=/)) {
      state.n++;
      return 'option';
    }
    if (stream.match(/^@[-\d.,]+/)) {
      state.n++;
      return 'number';
    }
    if (stream.match(/^\d+(\.\d+)?x\d+(\.\d+)?\b/)) {
      state.n++;
      return 'number';
    }
    if (
      stream.match(
        /^(\d+(\.\.(\d+|\*|[NnMm]))?|[NnMm]|\*)(-(\d+(\.\.(\d+|\*|[NnMm]))?|[NnMm]|\*))?\b/,
      )
    ) {
      state.n++;
      return 'number';
    }
    const start = stream.pos;
    stream.eatWhile(/\S/);
    state.n++;
    const word = stream.string.slice(start, stream.pos).toLowerCase();
    return FLAGS.has(word) ? 'flag' : 'id';
  },
  tokenTable: {
    command: tCommand,
    id: tId,
    string: tString,
    number: tNumber,
    option: tOption,
    color: tColor,
    flag: tFlag,
    operator: tOperator,
    comment: tComment,
  },
  languageData: {
    commentTokens: { line: '#' },
    autocomplete: inkCompletions,
  },
});

// ── Highlight styles for both themes ─────────────────────────────────────────
function highlightStyle(dark: boolean): HighlightStyle {
  const c = dark
    ? {
        command: '#C9A2F0',
        id: '#7FC8F5',
        string: '#9BD98C',
        number: '#F2A66B',
        option: '#F2CE6B',
        color: '#F2CE6B',
        flag: '#F58A8A',
        operator: '#5FD0DE',
        comment: '#606A7B',
      }
    : {
        command: '#7A3EBF',
        id: '#1E6FB8',
        string: '#3F8F2E',
        number: '#C2661C',
        option: '#9A6A00',
        color: '#9A6A00',
        flag: '#C0392B',
        operator: '#0E7C86',
        comment: '#8A8F9A',
      };
  return HighlightStyle.define([
    { tag: tCommand, color: c.command, fontWeight: '600' },
    { tag: tId, color: c.id },
    { tag: tString, color: c.string },
    { tag: tNumber, color: c.number },
    { tag: tOption, color: c.option },
    { tag: tColor, color: c.color },
    { tag: tFlag, color: c.flag, fontWeight: '600' },
    { tag: tOperator, color: c.operator },
    { tag: tComment, color: c.comment, fontStyle: 'italic' },
  ]);
}

// ── #hex color swatches ──────────────────────────────────────────────────────
class SwatchWidget extends WidgetType {
  constructor(readonly color: string) {
    super();
  }
  override eq(other: SwatchWidget): boolean {
    return other.color === this.color;
  }
  override toDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'ink-swatch';
    span.style.background = this.color;
    return span;
  }
  override ignoreEvent(): boolean {
    return true;
  }
}

const swatchMatcher = new MatchDecorator({
  regexp: /#[0-9a-fA-F]{3,8}\b/g,
  decoration: (m) => Decoration.widget({ widget: new SwatchWidget(m[0]), side: -1 }),
});

const swatchPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = swatchMatcher.createDeco(view);
    }
    update(u: ViewUpdate): void {
      if (u.docChanged || u.viewportChanged) this.decorations = swatchMatcher.updateDeco(u, this.decorations);
    }
  },
  { decorations: (v) => v.decorations },
);

// ── Autocomplete ─────────────────────────────────────────────────────────────
const OPTION_KEYS = ['fill=', 'stroke=', 'size='];
const PALETTE = ['#0E7C86', '#B9852B', '#2E8B57', '#C0392B', '#1E6FB8', '#7A3EBF', '#e5ffd6', '#ffffff'];

function declaredIds(text: string, kinds?: RegExp): string[] {
  const ids = new Set<string>();
  const re =
    kinds ??
    /^\s*(?:entity|weak|rel|rect|ellipse|diamond|text|array|stack|queue|linked_list)\s+([A-Za-z_]\w*)/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) ids.add(m[1]);
  return [...ids];
}

function inkCompletions(ctx: CompletionContext): CompletionResult | null {
  const line = ctx.state.doc.lineAt(ctx.pos);
  const before = line.text.slice(0, ctx.pos - line.from);
  const trimmed = before.replace(/^\s+/, '');
  const parts = trimmed.length ? trimmed.split(/\s+/) : [];

  // Command position
  if (parts.length <= 1 && !/\s$/.test(before)) {
    const w = ctx.matchBefore(/[A-Za-z]*/);
    if (!w) return null;
    return {
      from: w.from,
      options: COMMANDS.map((label) => ({ label, type: 'keyword' })),
      validFor: /^[A-Za-z]*$/,
    };
  }

  const cmd = (parts[0] ?? '').toLowerCase();
  const token = ctx.matchBefore(/[\w#=.]*/);
  const from = token ? token.from : ctx.pos;

  if (cmd === 'notation') {
    return { from, options: NOTATIONS.map((label) => ({ label, type: 'enum' })) };
  }
  if (cmd === 'direction') {
    return { from, options: ['LR', 'RL', 'TB', 'BT'].map((label) => ({ label, type: 'enum' })) };
  }
  if (STRUCTURE_OPS.has(cmd)) {
    // Suggest ids of declared data structures.
    const structRe = /^\s*(?:array|stack|queue|linked_list)\s+([A-Za-z_]\w*)/gm;
    return {
      from,
      options: declaredIds(ctx.state.doc.toString(), structRe).map((label) => ({
        label,
        type: 'variable',
      })),
    };
  }
  if (['arrow', 'line', 'link', 'rel', 'isa'].includes(cmd)) {
    return {
      from,
      options: declaredIds(ctx.state.doc.toString()).map((label) => ({ label, type: 'variable' })),
    };
  }
  if (['rect', 'ellipse', 'diamond', 'entity', 'weak', 'attr', 'text'].includes(cmd)) {
    const opts = [
      ...OPTION_KEYS.map((label) => ({ label, type: 'property' })),
      ...[...FLAGS].map((label) => ({ label, type: 'keyword' })),
      ...PALETTE.map((label) => ({ label, type: 'color', detail: 'color' })),
    ];
    return { from, options: opts };
  }
  return null;
}

// ── Linter (core diagnostics → CodeMirror) ───────────────────────────────────
export function inkLinter(): Extension {
  return linter(
    (view) => {
      const text = view.state.doc.toString();
      const { ast, diagnostics: pd } = parse(text);
      const { diagnostics: md } = buildModel(ast);
      const all = [...pd, ...md];
      const doc = view.state.doc;
      return all.map((d): CmDiagnostic => {
        const lineNo = Math.min(Math.max(1, d.line), doc.lines);
        const line = doc.line(lineNo);
        const from = Math.min(line.from + d.col, line.to);
        const to = Math.min(from + Math.max(1, d.length), line.to);
        return { from, to: Math.max(from + 1, to), severity: d.severity, message: d.message, source: d.code };
      });
    },
    { delay: 350 },
  );
}

/** The full `.ink` language support for a given theme. */
export function inkLanguage(dark: boolean): Extension {
  return [
    new LanguageSupport(inkStream, [inkStream.data.of({ autocomplete: inkCompletions })]),
    syntaxHighlighting(highlightStyle(dark)),
    swatchPlugin,
    autocompletion({ activateOnTyping: true }),
    inkLinter(),
  ];
}
