/**
 * Min-Max (ISO / (min,max)) notation.
 *
 * Identical geometry to Chen — entities as rectangles, relationships as diamonds,
 * attributes as ellipses — but each participation is labeled with a `(min,max)`
 * pair on the entity side instead of a bare cardinality letter.
 */
import type { Model, Scene } from '../types.js';
import type { Palette } from '../palette.js';
import { renderChenLike } from './chen.js';
import { minmaxLabel } from './cardinality.js';

export function renderMinMax(model: Model, palette: Palette): Scene {
  return renderChenLike(model, palette, 'minmax', minmaxLabel);
}
