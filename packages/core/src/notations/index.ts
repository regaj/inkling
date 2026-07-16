/**
 * Built-in notation registration.
 *
 * Registration is exposed as a function that `compile.ts` calls at runtime,
 * rather than relying purely on import side effects — a production bundler with
 * `sideEffects: false` would otherwise tree-shake away top-level
 * `registerNotation(...)` statements (their results are unused), leaving the
 * registry empty. Because {@link registerBuiltinNotations} is *called* from a
 * reachable code path, its body (and the renderer imports) are always retained.
 */
import { registerNotation } from './registry.js';
import { renderChen } from './chen.js';
import { renderMinMax } from './minmax.js';
import { renderCrowsFoot } from './crowsfoot.js';
import { renderUml } from './uml.js';
import { renderIdef1x } from './idef1x.js';

let registered = false;

/** Register all built-in notation renderers (idempotent). */
export function registerBuiltinNotations(): void {
  if (registered) return;
  registered = true;
  registerNotation('chen', renderChen);
  registerNotation('crowsfoot', renderCrowsFoot);
  registerNotation('uml', renderUml);
  registerNotation('idef1x', renderIdef1x);
  registerNotation('minmax', renderMinMax);
}

// Also register on import, for consumers that use the registry directly.
registerBuiltinNotations();

export { registerNotation, getNotation, listNotations } from './registry.js';
