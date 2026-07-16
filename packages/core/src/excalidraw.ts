/**
 * The Scene → Excalidraw adapter.
 *
 * Produces an array of Excalidraw *element skeletons* — the lightweight input to
 * `@excalidraw/excalidraw`'s `convertToExcalidrawElements`. This is the single
 * shared path: the desktop preview and every exporter run the same skeletons
 * through the same converter, which is why "what you see is what you export".
 *
 * The module is deliberately DOM-free and imports nothing from Excalidraw (only
 * a structurally-compatible {@link SkeletonElement} type), so it runs in Node
 * for tests and the CLI as well as in the browser.
 */
import type { EdgeCap, Scene, SceneEdge, SceneNode } from './types.js';
import { angle, along, borderPoint, center, perp } from './geometry.js';
import type { Point } from './geometry.js';

/**
 * A minimal, structurally-compatible view of Excalidraw's `ExcalidrawElementSkeleton`.
 * Only the fields Inkling emits are typed; the index signature keeps it forward-
 * compatible with Excalidraw additions.
 */
export interface SkeletonElement {
  type: 'rectangle' | 'ellipse' | 'diamond' | 'text' | 'line' | 'arrow';
  x: number;
  y: number;
  id?: string;
  width?: number;
  height?: number;
  strokeColor?: string;
  backgroundColor?: string;
  fillStyle?: 'solid' | 'hachure' | 'cross-hatch';
  strokeWidth?: number;
  strokeStyle?: 'solid' | 'dashed' | 'dotted';
  roughness?: number;
  roundness?: { type: number } | null;
  points?: Array<[number, number]>;
  text?: string;
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  startArrowhead?: string | null;
  endArrowhead?: string | null;
  start?: { id: string };
  end?: { id: string };
  label?: { text: string; fontSize?: number; strokeColor?: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

const ROUGHNESS = 1; // "artist" — matches the hand-drawn identity
const STROKE_WIDTH = 2;

const MARKER = {
  footLen: 20,
  footSpread: 11,
  barHalf: 10,
  barOffset: 15,
  circleR: 6,
  circleOffset: 12,
  dotR: 5,
};

/** Convert a {@link Scene} into Excalidraw element skeletons. */
export function toExcalidrawSkeleton(scene: Scene): SkeletonElement[] {
  const out: SkeletonElement[] = [];
  const boxes = new Map<string, SceneNode>();
  for (const n of scene.nodes) boxes.set(n.id, n);

  // Shapes first so connectors can bind to them by id.
  for (const n of scene.nodes) emitNode(n, out);
  for (const e of scene.edges) emitEdge(e, boxes, out);

  return out;
}

function emitNode(n: SceneNode, out: SkeletonElement[]): void {
  const bg = n.fill === 'transparent' ? 'transparent' : n.fill;

  if (n.shape === 'text') {
    out.push({
      type: 'text',
      id: n.id,
      x: n.x,
      y: n.y,
      text: n.label ?? '',
      fontSize: n.fontSize ?? 16,
      strokeColor: n.stroke,
      textAlign: n.align ?? 'left',
      verticalAlign: 'top',
    });
    return;
  }

  if (n.shape === 'line') {
    out.push(lineEl(n.id, n.points ?? [], n.stroke, n.strokeStyle));
    return;
  }

  const el: SkeletonElement = {
    type: n.shape,
    id: n.id,
    x: n.x,
    y: n.y,
    width: n.w,
    height: n.h,
    strokeColor: n.stroke,
    backgroundColor: bg,
    fillStyle: n.fillStyle,
    strokeWidth: STROKE_WIDTH,
    strokeStyle: n.strokeStyle,
    roughness: ROUGHNESS,
    roundness: n.rounded ? { type: 3 } : null,
  };
  if (n.label) {
    el.label = { text: n.label, fontSize: n.fontSize ?? 20, strokeColor: n.stroke };
  }
  out.push(el);

  // Double border → inset second outline (weak entity / identifying rel / multivalued attr).
  // Diamonds converge to points, so they need a larger inset to read as two lines.
  if (n.double) {
    const inset = n.shape === 'diamond' ? 10 : 7;
    out.push({
      type: n.shape,
      id: `${n.id}__inner`,
      x: n.x + inset,
      y: n.y + inset,
      width: Math.max(1, n.w - inset * 2),
      height: Math.max(1, n.h - inset * 2),
      strokeColor: n.stroke,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: STROKE_WIDTH,
      strokeStyle: n.strokeStyle,
      roughness: ROUGHNESS,
      roundness: n.rounded ? { type: 3 } : null,
    });
  }
}

function emitEdge(e: SceneEdge, boxes: Map<string, SceneNode>, out: SkeletonElement[]): void {
  const from = boxes.get(e.from);
  const to = boxes.get(e.to);
  if (!from || !to) return; // dangling reference (already reported as a diagnostic)

  const fromCenter = center(from);
  const toCenter = center(to);
  const p1 = borderPoint(from, from.shape, toCenter);
  const p2 = borderPoint(to, to.shape, fromCenter);

  if (e.double) {
    // Total-participation / double relationship line → two clearly separated
    // parallel strokes (≈9px apart), drawn explicitly so they read as two lines.
    const theta = angle(p1, p2);
    for (const off of [-4.5, 4.5]) {
      const a = perp(p1, theta, off);
      const b = perp(p2, theta, off);
      out.push(lineEl(`${e.id}__d${off}`, [
        [a.x, a.y],
        [b.x, b.y],
      ], e.stroke, e.strokeStyle));
    }
  } else {
    const isArrow = e.endCap === 'arrow' || e.startCap === 'arrow';
    out.push({
      type: isArrow ? 'arrow' : 'line',
      x: p1.x,
      y: p1.y,
      points: [
        [0, 0],
        [p2.x - p1.x, p2.y - p1.y],
      ],
      strokeColor: e.stroke,
      strokeWidth: STROKE_WIDTH,
      strokeStyle: e.strokeStyle,
      roughness: ROUGHNESS,
      startArrowhead: null,
      endArrowhead: e.endCap === 'arrow' ? 'arrow' : null,
      // Real bindings so the exported .excalidraw stays editable and reflows.
      start: { id: e.from },
      end: { id: e.to },
    });

    // End markers (crow's foot / IDEF1X). 'arrow' is the arrowhead above.
    if (e.startCap && e.startCap !== 'arrow' && e.startCap !== 'none') {
      emitCap(e.startCap, p1, angle(p1, p2), `${e.id}__sc`, e.stroke, out);
    }
    if (e.endCap && e.endCap !== 'arrow' && e.endCap !== 'none') {
      emitCap(e.endCap, p2, angle(p2, p1), `${e.id}__ec`, e.stroke, out);
    }
  }

  // Labels.
  if (e.labelFrom) out.push(edgeLabel(`${e.id}__lf`, p1, angle(p1, p2), e.labelFrom, e.stroke));
  if (e.labelTo) out.push(edgeLabel(`${e.id}__lt`, p2, angle(p2, p1), e.labelTo, e.stroke));
  if (e.label) {
    const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    out.push({
      type: 'text',
      id: `${e.id}__lm`,
      x: mid.x + 6,
      y: mid.y - 20,
      text: e.label,
      fontSize: 16,
      strokeColor: e.stroke,
      textAlign: 'left',
      verticalAlign: 'top',
    });
  }
}

/** A cardinality/multiplicity label offset just off the endpoint. */
function edgeLabel(id: string, tip: Point, theta: number, text: string, stroke: string): SkeletonElement {
  const at = perp(along(tip, theta, 20), theta, 12);
  return {
    type: 'text',
    id,
    x: at.x - text.length * 4,
    y: at.y - 10,
    text,
    fontSize: 16,
    strokeColor: stroke,
    textAlign: 'left',
    verticalAlign: 'top',
  };
}

/** Emit the line/ellipse elements that draw an {@link EdgeCap} at `tip`. */
function emitCap(
  cap: EdgeCap,
  tip: Point,
  theta: number,
  idBase: string,
  stroke: string,
  out: SkeletonElement[],
): void {
  const foot = (): void => {
    const apex = along(tip, theta, MARKER.footLen);
    const f1 = perp(tip, theta, MARKER.footSpread);
    const f2 = perp(tip, theta, -MARKER.footSpread);
    out.push(lineEl(`${idBase}_f1`, [[apex.x, apex.y], [f1.x, f1.y]], stroke, 'solid'));
    out.push(lineEl(`${idBase}_f2`, [[apex.x, apex.y], [f2.x, f2.y]], stroke, 'solid'));
    out.push(lineEl(`${idBase}_f3`, [[apex.x, apex.y], [tip.x, tip.y]], stroke, 'solid'));
  };
  const bar = (offset: number): void => {
    const c = along(tip, theta, offset);
    const a = perp(c, theta, MARKER.barHalf);
    const b = perp(c, theta, -MARKER.barHalf);
    out.push(lineEl(`${idBase}_b${offset}`, [[a.x, a.y], [b.x, b.y]], stroke, 'solid'));
  };
  const circle = (offset: number): void => {
    const c = along(tip, theta, offset);
    out.push({
      type: 'ellipse',
      id: `${idBase}_o`,
      x: c.x - MARKER.circleR,
      y: c.y - MARKER.circleR,
      width: MARKER.circleR * 2,
      height: MARKER.circleR * 2,
      strokeColor: stroke,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: STROKE_WIDTH,
      roughness: ROUGHNESS,
    });
  };
  const dot = (): void => {
    out.push({
      type: 'ellipse',
      id: `${idBase}_dot`,
      x: tip.x - MARKER.dotR,
      y: tip.y - MARKER.dotR,
      width: MARKER.dotR * 2,
      height: MARKER.dotR * 2,
      strokeColor: stroke,
      backgroundColor: stroke,
      fillStyle: 'solid',
      strokeWidth: STROKE_WIDTH,
      roughness: 0,
    });
  };

  switch (cap) {
    case 'bar':
      bar(MARKER.barOffset);
      break;
    case 'circle':
      circle(MARKER.circleOffset);
      break;
    case 'crowsfoot':
      foot();
      break;
    case 'bar-bar':
      bar(MARKER.barOffset);
      bar(MARKER.barOffset + 8);
      break;
    case 'circle-bar':
      bar(MARKER.barOffset);
      circle(MARKER.barOffset + 10);
      break;
    case 'bar-crowsfoot':
      foot();
      bar(MARKER.footLen + 6);
      break;
    case 'circle-crowsfoot':
      foot();
      circle(MARKER.footLen + 12);
      break;
    case 'dot':
      dot();
      break;
    default:
      break;
  }
}

/** Build a `line` skeleton from absolute points (normalizes to element-local coords). */
function lineEl(
  id: string,
  pts: Array<[number, number]>,
  stroke: string,
  strokeStyle: SkeletonElement['strokeStyle'],
): SkeletonElement {
  if (pts.length === 0) {
    return { type: 'line', id, x: 0, y: 0, points: [[0, 0]], strokeColor: stroke };
  }
  const ox = pts[0][0];
  const oy = pts[0][1];
  return {
    type: 'line',
    id,
    x: ox,
    y: oy,
    points: pts.map(([px, py]) => [px - ox, py - oy] as [number, number]),
    strokeColor: stroke,
    strokeWidth: STROKE_WIDTH,
    strokeStyle,
    roughness: ROUGHNESS,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// .excalidraw file envelope
// ─────────────────────────────────────────────────────────────────────────────

export const EXCALIDRAW_SOURCE = 'https://github.com/regaj/inkling';

/**
 * Wrap converted Excalidraw elements into a `.excalidraw` file object that
 * Excalidraw can reopen. `elements` is the output of `convertToExcalidrawElements`
 * (done by the app/CLI, which have the Excalidraw runtime).
 */
export function wrapExcalidrawFile(
  elements: unknown[],
  appState: Record<string, unknown> = {},
): {
  type: 'excalidraw';
  version: 2;
  source: string;
  elements: unknown[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
} {
  return {
    type: 'excalidraw',
    version: 2,
    source: EXCALIDRAW_SOURCE,
    elements,
    appState: { gridSize: null, viewBackgroundColor: '#ffffff', ...appState },
    files: {},
  };
}
