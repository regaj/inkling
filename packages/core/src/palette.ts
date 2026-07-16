/**
 * Shape palettes for the canvas.
 *
 * These are the colors renderers paint diagram shapes with. They are kept
 * separate from the app's CSS chrome tokens because exported artifacts carry
 * their own theme (a dark editor can export a light diagram), so the palette is
 * always passed explicitly into {@link compile}.
 */

export interface Palette {
  /** Default shape stroke. */
  stroke: string;
  /** Entity / box fill. */
  entityFill: string;
  /** Relationship (diamond) fill. */
  relFill: string;
  /** Attribute (ellipse) fill. */
  attrFill: string;
  /** Weak-entity / identifying-relationship accent stroke (ochre). */
  weak: string;
  /** Accent (peacock ink) — used for connectors/cardinality. */
  accent: string;
  /** Primary text color. */
  text: string;
  /** Muted text (cardinality, roles). */
  muted: string;
  /** Transparent sentinel for backgrounds. */
  transparent: string;
}

/** Light-mode diagram palette (warm paper canvas). */
export const LIGHT_PALETTE: Palette = {
  stroke: '#22222A',
  entityFill: '#FFFFFF',
  relFill: '#EAF6F7',
  attrFill: '#FBFBFD',
  weak: '#B9852B',
  accent: '#0E7C86',
  text: '#22222A',
  muted: '#6B6B78',
  transparent: 'transparent',
};

/** Dark-mode diagram palette (warm charcoal canvas). */
export const DARK_PALETTE: Palette = {
  stroke: '#ECEAF2',
  entityFill: '#24232E',
  relFill: '#203038',
  attrFill: '#1F1E28',
  weak: '#D9A441',
  accent: '#3FB6C4',
  text: '#ECEAF2',
  muted: '#8A8798',
  transparent: 'transparent',
};

export const PALETTES: Record<'light' | 'dark', Palette> = {
  light: LIGHT_PALETTE,
  dark: DARK_PALETTE,
};
