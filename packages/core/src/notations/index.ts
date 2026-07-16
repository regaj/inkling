/**
 * Registers all built-in notation renderers. Importing this module for its side
 * effect populates the notation registry; {@link renderScene} in `compile.ts`
 * depends on it having run.
 */
import { registerNotation } from './registry.js';
import { renderChen } from './chen.js';
import { renderMinMax } from './minmax.js';
import { renderCrowsFoot } from './crowsfoot.js';
import { renderUml } from './uml.js';
import { renderIdef1x } from './idef1x.js';

registerNotation('chen', renderChen);
registerNotation('crowsfoot', renderCrowsFoot);
registerNotation('uml', renderUml);
registerNotation('idef1x', renderIdef1x);
registerNotation('minmax', renderMinMax);

export { registerNotation, getNotation, listNotations } from './registry.js';
