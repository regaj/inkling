/**
 * UML class-diagram-style notation.
 *
 * Entities render as class boxes (a name compartment above an attribute
 * compartment); relationships render as associations with a name label and
 * multiplicity text (`1`, `0..1`, `1..*`, `0..*`) at each end.
 */
import type { Model, Scene } from '../types.js';
import type { Palette } from '../palette.js';
import { renderBoxNotation } from './boxbase.js';
import { umlLabel } from './cardinality.js';

export function renderUml(model: Model, palette: Palette): Scene {
  return renderBoxNotation(model, palette, {
    notation: 'uml',
    endLabel: umlLabel,
    showRelName: true,
  });
}
