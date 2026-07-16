/**
 * The public entry point: source text → {@link CompileResult}.
 *
 * Ties the four stages together (parse → build model → pick notation → render)
 * and merges parse and semantic diagnostics. Importing `./notations/index.js`
 * for its side effect ensures every built-in renderer is registered first.
 */
import { parse } from './parser.js';
import { buildModel } from './model.js';
import { getNotation, registerBuiltinNotations } from './notations/index.js';
import { LIGHT_PALETTE } from './palette.js';
import { DEFAULT_NOTATION } from './types.js';
import type { CompileOptions, CompileResult, Model, NotationName, Scene } from './types.js';
import type { Palette } from './palette.js';

/** Compile DSL source into a positioned {@link Scene} plus diagnostics. */
export function compile(source: string, options: CompileOptions = {}): CompileResult {
  const { ast, diagnostics: parseDiags } = parse(source);
  const { model, diagnostics: modelDiags } = buildModel(ast);

  const notation = options.notation ?? model.notation;
  model.notation = notation;
  const palette = options.palette ?? LIGHT_PALETTE;

  const scene = renderScene(model, notation, palette);
  const diagnostics = [...parseDiags, ...modelDiags].sort(
    (a, b) => a.line - b.line || a.col - b.col,
  );

  return {
    scene,
    model,
    ast,
    diagnostics,
    ok: !diagnostics.some((d) => d.severity === 'error'),
  };
}

/** Render an already-built {@link Model} in a given notation. */
export function renderScene(model: Model, notation: NotationName, palette: Palette): Scene {
  // Ensure built-ins are registered even if import side effects were tree-shaken.
  registerBuiltinNotations();
  const renderer = getNotation(notation) ?? getNotation(DEFAULT_NOTATION)!;
  return renderer({ ...model, notation }, palette);
}
