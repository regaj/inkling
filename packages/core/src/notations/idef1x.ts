/**
 * IDEF1X notation.
 *
 * Independent entities are square-cornered; dependent entities (weak entities,
 * i.e. those whose identity depends on a parent) are round-cornered. Identifying
 * relationships are solid lines, non-identifying relationships are dashed, and a
 * filled dot marks the "zero, one, or many" child end.
 */
import type { Model, Scene } from '../types.js';
import type { Palette } from '../palette.js';
import { renderBoxNotation } from './boxbase.js';
import { idef1xCap } from './cardinality.js';

export function renderIdef1x(model: Model, palette: Palette): Scene {
  return renderBoxNotation(model, palette, {
    notation: 'idef1x',
    rounded: (entity) => entity.weak,
    cap: idef1xCap,
    relStyle: (rel) => (rel.identifying ? 'solid' : 'dashed'),
    showRelName: true,
  });
}
