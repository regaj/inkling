/**
 * Deterministic auto-layout.
 *
 * Renderers describe *structure* (which boxes connect to which); this module
 * assigns coordinates. It is intentionally dependency-free and deterministic —
 * same input always yields the same geometry — so golden-file tests are stable
 * and the CLI and app agree pixel-for-pixel.
 *
 * The core algorithm is a simple BFS layering: connected nodes are pushed into
 * successive columns (LR) or rows (TB), and nodes sharing a layer are stacked
 * along the cross axis. It is not force-directed, but for ER graphs it produces
 * clean, legible arrangements.
 */
import type { Direction } from './types.js';
import type { Box, Point } from './geometry.js';

export interface LayoutNode {
  id: string;
  w: number;
  h: number;
}

export interface LayeredOptions {
  direction: Direction;
  /** Gap between successive layers (along the main axis). */
  gapMain: number;
  /** Gap between siblings within a layer (cross axis). */
  gapCross: number;
}

/**
 * Layer nodes by BFS distance and return each node's top-left position.
 * Coordinates may be negative; call {@link normalize} to shift into view.
 */
export function layered(
  nodes: LayoutNode[],
  edges: Array<[string, string]>,
  opts: LayeredOptions,
): Map<string, Point> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const [a, b] of edges) {
    if (adj.has(a) && adj.has(b)) {
      adj.get(a)!.push(b);
      adj.get(b)!.push(a);
    }
  }

  // BFS layering across all (possibly disconnected) components.
  const layer = new Map<string, number>();
  for (const n of nodes) {
    if (layer.has(n.id)) continue;
    layer.set(n.id, 0);
    const queue = [n.id];
    while (queue.length) {
      const cur = queue.shift()!;
      const cl = layer.get(cur)!;
      for (const nb of adj.get(cur)!) {
        if (!layer.has(nb)) {
          layer.set(nb, cl + 1);
          queue.push(nb);
        }
      }
    }
  }

  // Group ids by layer, preserving declaration order.
  const layers = new Map<number, string[]>();
  for (const n of nodes) {
    const l = layer.get(n.id)!;
    if (!layers.has(l)) layers.set(l, []);
    layers.get(l)!.push(n.id);
  }
  const layerIdx = [...layers.keys()].sort((a, b) => a - b);

  const mainOf = (id: string): number => (opts.direction === 'LR' ? byId.get(id)!.w : byId.get(id)!.h);
  const crossOf = (id: string): number => (opts.direction === 'LR' ? byId.get(id)!.h : byId.get(id)!.w);

  // Main-axis offset for each layer (cumulative max extent).
  const layerMain = new Map<number, number>();
  const layerMainSize = new Map<number, number>();
  let acc = 0;
  for (const li of layerIdx) {
    layerMain.set(li, acc);
    const maxMain = Math.max(...layers.get(li)!.map(mainOf));
    layerMainSize.set(li, maxMain);
    acc += maxMain + opts.gapMain;
  }

  const pos = new Map<string, Point>();
  for (const li of layerIdx) {
    const ids = layers.get(li)!;
    const totalCross = ids.reduce((s, id) => s + crossOf(id) + opts.gapCross, 0) - opts.gapCross;
    let cursor = -totalCross / 2;
    for (const id of ids) {
      const main = layerMain.get(li)! + (layerMainSize.get(li)! - mainOf(id)) / 2;
      const cross = cursor;
      cursor += crossOf(id) + opts.gapCross;
      pos.set(id, opts.direction === 'LR' ? { x: main, y: cross } : { x: cross, y: main });
    }
  }

  return pos;
}

/**
 * Shift a set of positioned boxes so the whole diagram sits at `(margin, margin)`,
 * and report the resulting canvas size.
 */
export function normalize(
  boxes: Array<Box & { id: string }>,
  margin: number,
): { width: number; height: number } {
  if (boxes.length === 0) return { width: margin * 2, height: margin * 2 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of boxes) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  const dx = margin - minX;
  const dy = margin - minY;
  for (const b of boxes) {
    b.x += dx;
    b.y += dy;
  }
  return { width: maxX - minX + margin * 2, height: maxY - minY + margin * 2 };
}

/**
 * Positions for `count` satellite boxes (e.g. Chen attributes) fanned around an
 * owner center, biased toward `preferAngle` (radians) so they splay away from
 * the busy side of the diagram.
 */
export function satellites(
  ownerCenter: Point,
  count: number,
  radius: number,
  size: { w: number; h: number },
  preferAngle = -Math.PI / 2,
): Point[] {
  const out: Point[] = [];
  if (count === 0) return out;
  // Spread across an arc; a single attribute sits straight at preferAngle.
  const span = count === 1 ? 0 : Math.min(Math.PI * 1.5, (Math.PI / 5) * (count - 1));
  const start = preferAngle - span / 2;
  const step = count === 1 ? 0 : span / (count - 1);
  for (let i = 0; i < count; i++) {
    const theta = start + step * i;
    const cx = ownerCenter.x + Math.cos(theta) * radius;
    const cy = ownerCenter.y + Math.sin(theta) * radius;
    out.push({ x: cx - size.w / 2, y: cy - size.h / 2 });
  }
  return out;
}
