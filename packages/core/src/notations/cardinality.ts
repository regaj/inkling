/**
 * Maps a normalized {@link Cardinality} to each notation's visual vocabulary:
 * Chen/Min-Max/UML use text labels; Crow's Foot and IDEF1X use edge-end markers.
 */
import type { Cardinality, EdgeCap } from '../types.js';

/** Chen: the token as written ("1", "N", "0..1"). */
export function chenLabel(card: Cardinality): string {
  return card.raw;
}

/** Min-Max / ISO: `(min,max)` with ∞ shown as `N`. */
export function minmaxLabel(card: Cardinality): string {
  return `(${card.min},${card.max ?? 'N'})`;
}

/** UML multiplicity: `1`, `0..1`, `1..*`, `0..*`. */
export function umlLabel(card: Cardinality): string {
  const max = card.max ?? '*';
  if (card.min === card.max) return String(card.min);
  return `${card.min}..${max}`;
}

/** Crow's-foot end marker for a participation. */
export function crowsFootCap(card: Cardinality): EdgeCap {
  const mandatory = card.min >= 1;
  const many = card.max === null || card.max > 1;
  if (many) return mandatory ? 'bar-crowsfoot' : 'circle-crowsfoot';
  return mandatory ? 'bar-bar' : 'circle-bar';
}

/** IDEF1X child-end marker: a filled dot denotes the "zero, one, or many" child side. */
export function idef1xCap(card: Cardinality): EdgeCap {
  const many = card.max === null || card.max > 1;
  return many ? 'dot' : 'bar';
}

/** IDEF1X cardinality annotation letter (P = one-or-more, Z = zero-or-one, else the number). */
export function idef1xAnnotation(card: Cardinality): string | undefined {
  if (card.min >= 1 && card.max === null) return 'P';
  if (card.min === 0 && card.max === 1) return 'Z';
  if (card.max !== null && card.min === card.max && card.min > 1) return String(card.min);
  return undefined;
}
