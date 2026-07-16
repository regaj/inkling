/**
 * Pure 2D geometry helpers shared by the notation renderers.
 *
 * The important one is {@link borderPoint}: connectors never specify endpoints,
 * so each renderer computes where a line meets a shape's border by intersecting
 * the center-to-target ray with the shape outline (slab for rect/text, ellipse
 * equation for ellipse, rhombus equation for diamond).
 */
import type { ShapeKind } from './types.js';

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function center(b: Box): Point {
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

/** Euclidean length of a vector. */
export function len(dx: number, dy: number): number {
  return Math.hypot(dx, dy);
}

/** Angle (radians) from `a` to `b`. */
export function angle(a: Point, b: Point): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/**
 * Point on the border of `box` (of the given `shape`) along the ray from the
 * box center toward `target`. Falls back to the center when `target` coincides
 * with the center.
 */
export function borderPoint(box: Box, shape: ShapeKind, target: Point): Point {
  const c = center(box);
  const dx = target.x - c.x;
  const dy = target.y - c.y;
  if (dx === 0 && dy === 0) return c;

  const a = box.w / 2;
  const b = box.h / 2;
  let t: number;

  switch (shape) {
    case 'ellipse': {
      t = 1 / Math.hypot(dx / a, dy / b);
      break;
    }
    case 'diamond': {
      t = 1 / (Math.abs(dx) / a + Math.abs(dy) / b);
      break;
    }
    // rectangle, text, line → axis-aligned slab
    default: {
      const tx = a / Math.abs(dx || Number.EPSILON);
      const ty = b / Math.abs(dy || Number.EPSILON);
      t = Math.min(tx, ty);
      break;
    }
  }

  return { x: c.x + dx * t, y: c.y + dy * t };
}

/** Move `p` by `dist` along `theta` radians. */
export function along(p: Point, theta: number, dist: number): Point {
  return { x: p.x + Math.cos(theta) * dist, y: p.y + Math.sin(theta) * dist };
}

/** Perpendicular offset of `p` by `dist` relative to heading `theta`. */
export function perp(p: Point, theta: number, dist: number): Point {
  return { x: p.x + Math.cos(theta + Math.PI / 2) * dist, y: p.y + Math.sin(theta + Math.PI / 2) * dist };
}

/** Axis-aligned bounding box of a set of boxes, padded by `pad`. */
export function bounds(boxes: Box[], pad = 0): Box {
  if (boxes.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const box of boxes) {
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.w);
    maxY = Math.max(maxY, box.y + box.h);
  }
  return { x: minX - pad, y: minY - pad, w: maxX - minX + 2 * pad, h: maxY - minY + 2 * pad };
}
