/**
 * Shared building blocks for notation renderers: sizing constants, a
 * dependency-free text-width estimate (so boxes fit their labels without a DOM),
 * and small factory functions for scene nodes and edges.
 */
import type {
  EdgeCap,
  FillStyle,
  NotationName,
  Scene,
  SceneEdge,
  SceneNode,
  StrokeStyle,
} from '../types.js';
import type { Box, Point } from '../geometry.js';

/** Canonical sizes and spacing, in Excalidraw px. */
export const SIZE = {
  fontLabel: 20,
  fontRow: 16,
  fontCard: 16,
  entityW: 168,
  entityH: 64,
  diamondW: 150,
  diamondH: 84,
  attrW: 116,
  attrH: 52,
  rowH: 26,
  headerH: 38,
  boxMinW: 168,
  padX: 22,
  margin: 56,
  gapMain: 120,
  gapCross: 64,
  satelliteRadius: 128,
} as const;

/**
 * Estimate the rendered width of `text` at `fontSize`, per-character and
 * script-aware. Latin uses Excalifont's (wide) hand-drawn metrics; Hebrew,
 * Arabic, and CJK render in a fallback font that is noticeably wider, so they
 * get larger advances — otherwise their labels clip and centering drifts.
 * Deliberately generous throughout: an oversized shape beats clipped text.
 */
export function measure(text: string, fontSize: number = SIZE.fontLabel): number {
  let units = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 0;
    if (ch === ' ') units += 0.42;
    else if (c >= 0x0590 && c <= 0x05ff) units += 0.75; // Hebrew (Amatic SC, condensed)
    else if (c >= 0x0600 && c <= 0x08ff) units += 0.95; // Arabic & related (Aref Ruqaa, wide)
    else if (c >= 0x1100 && c <= 0xd7ff) units += 1.08; // CJK / Hangul
    else if (c >= 0xf900 && c <= 0xfaff) units += 1.08; // CJK compatibility
    else units += 0.68; // Latin & the rest (Excalifont is wide)
  }
  // Extra headroom: bound text wraps at the exact container width, so a small
  // safety margin keeps single-line labels from clipping or wrapping.
  return units * fontSize + fontSize * 0.4;
}

/**
 * A *tight* estimate of the actually-rendered text width — matched to the real
 * font metrics (Excalifont ≈0.46em/char, Amatic Hebrew ≈0.32em, Aref Arabic
 * ≈0.5em) rather than {@link measure}'s generous box-sizing padding. Use this
 * for underlines and other decorations that should hug the glyphs.
 */
export function glyphWidth(text: string, fontSize: number): number {
  let units = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 0;
    if (ch === ' ') units += 0.26;
    else if (c >= 0x0590 && c <= 0x05ff) units += 0.32;
    else if (c >= 0x0600 && c <= 0x08ff) units += 0.5;
    else if (c >= 0x1100 && c <= 0xd7ff) units += 1.0;
    else units += 0.5;
  }
  return units * fontSize;
}

/** True if `text` contains any right-to-left characters (Hebrew / Arabic). */
export function isRtl(text: string): boolean {
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 0;
    if ((c >= 0x0590 && c <= 0x05ff) || (c >= 0x0600 && c <= 0x08ff)) return true;
  }
  return false;
}

/** Width that comfortably fits `label` on one line, clamped to a minimum. */
export function fitWidth(
  label: string,
  min: number,
  fontSize: number = SIZE.fontLabel,
  padX: number = SIZE.padX,
): number {
  return Math.max(min, Math.round(measure(label, fontSize) + padX * 2));
}

/**
 * Size a diamond so its bound label fits. Excalidraw wraps bound text to the
 * shape's *inscribed* rectangle — roughly half the width for a diamond — so a
 * diamond must be ~2× as wide as the text to keep it on one line.
 */
export function fitDiamond(label: string, fontSize: number = SIZE.fontLabel): { w: number; h: number } {
  const t = measure(label, fontSize);
  const w = Math.max(SIZE.diamondW, Math.min(340, Math.round(t * 1.9 + 44)));
  // Two-line headroom when a long label had to be clamped.
  const h = t * 1.9 + 44 > 340 ? 108 : SIZE.diamondH;
  return { w, h };
}

/**
 * Size an ellipse so its bound label fits. The inscribed rectangle of an ellipse
 * is ~1/√2 of its bounds, so the ellipse must be ~1.5× the text width.
 */
export function fitEllipse(label: string, fontSize: number = SIZE.fontRow): { w: number; h: number } {
  const t = measure(label, fontSize);
  return { w: Math.max(SIZE.attrW, Math.round(t * 1.5 + 24)), h: SIZE.attrH };
}

export interface NodeOpts {
  role: SceneNode['role'];
  label?: string;
  labelColor?: string;
  stroke: string;
  fill: string;
  strokeStyle?: StrokeStyle;
  fillStyle?: FillStyle;
  double?: boolean;
  rounded?: boolean;
  fontSize?: number;
  align?: SceneNode['align'];
  bindable?: boolean;
}

function node(id: string, shape: SceneNode['shape'], box: Box, opts: NodeOpts): SceneNode {
  return {
    id,
    shape,
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
    label: opts.label,
    labelColor: opts.labelColor,
    role: opts.role,
    stroke: opts.stroke,
    fill: opts.fill,
    strokeStyle: opts.strokeStyle ?? 'solid',
    fillStyle: opts.fillStyle ?? 'solid',
    double: opts.double,
    rounded: opts.rounded,
    fontSize: opts.fontSize,
    align: opts.align,
    bindable: opts.bindable,
  };
}

export const rectNode = (id: string, box: Box, opts: NodeOpts): SceneNode =>
  node(id, 'rectangle', box, opts);
export const ellipseNode = (id: string, box: Box, opts: NodeOpts): SceneNode =>
  node(id, 'ellipse', box, opts);
export const diamondNode = (id: string, box: Box, opts: NodeOpts): SceneNode =>
  node(id, 'diamond', box, opts);

/** A standalone text node (no container). */
export function textNode(
  id: string,
  at: Point,
  text: string,
  opts: {
    stroke: string;
    fontSize?: number;
    align?: SceneNode['align'];
    role?: SceneNode['role'];
    /** Fixed layout width — Excalidraw aligns the text within it (exact centering). */
    width?: number;
  },
): SceneNode {
  const fontSize: number = opts.fontSize ?? SIZE.fontRow;
  const w = opts.width ?? measure(text, fontSize);
  return {
    id,
    shape: 'text',
    x: at.x,
    y: at.y,
    w,
    h: fontSize * 1.25,
    label: text,
    role: opts.role ?? 'label',
    stroke: opts.stroke,
    fill: 'transparent',
    strokeStyle: 'solid',
    fillStyle: 'solid',
    align: opts.align ?? 'left',
    fixedWidth: opts.width !== undefined,
    bindable: false,
  };
}

/** A free polyline (underlines, notation markers). */
export function lineNode(
  id: string,
  points: Array<[number, number]>,
  opts: { stroke: string; strokeStyle?: StrokeStyle; role?: SceneNode['role'] },
): SceneNode {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [px, py] of points) {
    minX = Math.min(minX, px);
    minY = Math.min(minY, py);
    maxX = Math.max(maxX, px);
    maxY = Math.max(maxY, py);
  }
  return {
    id,
    shape: 'line',
    x: minX,
    y: minY,
    w: Math.max(1, maxX - minX),
    h: Math.max(1, maxY - minY),
    role: opts.role ?? 'decoration',
    stroke: opts.stroke,
    fill: 'transparent',
    strokeStyle: opts.strokeStyle ?? 'solid',
    fillStyle: 'solid',
    points,
    bindable: false,
  };
}

export interface EdgeOpts {
  stroke: string;
  strokeStyle?: StrokeStyle;
  double?: boolean;
  startCap?: EdgeCap;
  endCap?: EdgeCap;
  label?: string;
  labelFrom?: string;
  labelTo?: string;
}

export function edge(id: string, from: string, to: string, opts: EdgeOpts): SceneEdge {
  return {
    id,
    from,
    to,
    stroke: opts.stroke,
    strokeStyle: opts.strokeStyle ?? 'solid',
    double: opts.double,
    startCap: opts.startCap,
    endCap: opts.endCap,
    label: opts.label,
    labelFrom: opts.labelFrom,
    labelTo: opts.labelTo,
  };
}

/** Center of a box. */
export function boxCenter(b: Box): Point {
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

/**
 * Shift all nodes (their boxes *and* any polyline points) so the diagram sits at
 * `(margin, margin)`, then assemble the {@link Scene}. Every renderer ends here,
 * which keeps normalization identical across notations.
 */
export function finalizeScene(
  notation: NotationName,
  title: string | undefined,
  nodes: SceneNode[],
  edges: SceneEdge[],
  margin = SIZE.margin,
): Scene {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.w);
    maxY = Math.max(maxY, n.y + n.h);
  }
  if (!Number.isFinite(minX)) {
    return { notation, title, nodes, edges, width: margin * 2, height: margin * 2 };
  }
  const dx = margin - minX;
  const dy = margin - minY;
  for (const n of nodes) {
    n.x += dx;
    n.y += dy;
    if (n.points) n.points = n.points.map(([px, py]) => [px + dx, py + dy]);
  }
  return {
    notation,
    title,
    nodes,
    edges,
    width: Math.round(maxX - minX + margin * 2),
    height: Math.round(maxY - minY + margin * 2),
  };
}
