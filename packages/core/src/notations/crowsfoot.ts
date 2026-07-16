/**
 * Crow's Foot / Information Engineering (IE) notation.
 *
 * Entities are attribute-boxed tables; each relationship is a line whose ends
 * carry crow's-foot markers: a bar for "one", a circle for "optional", and the
 * three-pronged foot for "many".
 */
import type { Model, Scene } from '../types.js';
import type { Palette } from '../palette.js';
import { renderBoxNotation } from './boxbase.js';
import { crowsFootCap } from './cardinality.js';

export function renderCrowsFoot(model: Model, palette: Palette): Scene {
  return renderBoxNotation(model, palette, {
    notation: 'crowsfoot',
    cap: crowsFootCap,
    showRelName: true,
  });
}
