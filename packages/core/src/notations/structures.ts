/**
 * Renders data structures — arrays, stacks, queues, and linked lists — into the
 * scene. These are notation-independent (they look the same in every ER
 * notation), so every renderer appends them, and they're laid out in a vertical
 * column beneath any ER/flowchart content.
 */
import type { DataStructure, Model, SceneEdge, SceneNode } from '../types.js';
import type { Palette } from '../palette.js';
import { SIZE, edge, measure, rectNode, textNode } from './shared.js';

const CELL = { w: 66, h: 46 };
const PTR = 24; // linked-list pointer cell width
const TITLE_H = 28;
const INDEX_H = 22;
const STRUCT_GAP = 66;

/** Append every data structure in the model, stacked below existing content. */
export function appendStructures(
  model: Model,
  palette: Palette,
  nodes: SceneNode[],
  edges: SceneEdge[],
): void {
  if (model.structures.length === 0) return;

  let bottom = -Infinity;
  for (const n of nodes) bottom = Math.max(bottom, n.y + n.h);
  let y = Number.isFinite(bottom) ? bottom + 80 : 0;
  const x = 0;

  for (const s of model.structures) {
    const height = renderStructure(s, palette, x, y, nodes, edges);
    y += height + STRUCT_GAP;
  }
}

function renderStructure(
  s: DataStructure,
  palette: Palette,
  x: number,
  y: number,
  nodes: SceneNode[],
  edges: SceneEdge[],
): number {
  // Title (kind + label).
  nodes.push(
    textNode(`ds:${s.id}:title`, { x, y }, `${s.label}  ·  ${s.kind}`, {
      stroke: palette.muted,
      fontSize: SIZE.fontRow,
      role: 'label',
    }),
  );
  const bodyY = y + TITLE_H;

  switch (s.kind) {
    case 'array':
      return TITLE_H + renderArray(s, palette, x, bodyY, nodes);
    case 'stack':
      return TITLE_H + renderStack(s, palette, x, bodyY, nodes);
    case 'queue':
      return TITLE_H + renderQueue(s, palette, x, bodyY, nodes);
    case 'linked_list':
      return TITLE_H + renderLinkedList(s, palette, x, bodyY, nodes, edges);
  }
}

/** A single value cell. */
function cell(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  value: string | undefined,
  palette: Palette,
  nodes: SceneNode[],
  fill = palette.entityFill,
): void {
  nodes.push(
    rectNode(id, { x, y, w, h }, {
      role: 'primitive',
      label: value || undefined,
      stroke: palette.stroke,
      fill,
      fontSize: 18,
    }),
  );
}

/** A contiguous row of indexed cells. */
function renderArray(
  s: DataStructure,
  palette: Palette,
  x: number,
  y: number,
  nodes: SceneNode[],
): number {
  const n = Math.max(1, s.values.length);
  for (let i = 0; i < n; i++) {
    const cx = x + i * CELL.w;
    cell(`ds:${s.id}:${i}`, cx, y, CELL.w, CELL.h, s.values[i], palette, nodes);
    nodes.push(
      textNode(
        `ds:${s.id}:idx:${i}`,
        { x: cx + CELL.w / 2 - 4, y: y + CELL.h + 4 },
        String(i),
        { stroke: palette.muted, fontSize: 13, align: 'center', role: 'label' },
      ),
    );
  }
  return CELL.h + INDEX_H;
}

/** Vertical LIFO cells; the last value is the top. */
function renderStack(
  s: DataStructure,
  palette: Palette,
  x: number,
  y: number,
  nodes: SceneNode[],
): number {
  const n = Math.max(1, s.values.length);
  for (let j = 0; j < n; j++) {
    // j = 0 is the top row → last value.
    const value = s.values[s.values.length - 1 - j];
    cell(`ds:${s.id}:${j}`, x, y + j * CELL.h, CELL.w, CELL.h, value, palette, nodes);
  }
  if (s.values.length > 0) {
    nodes.push(
      textNode(`ds:${s.id}:top`, { x: x + CELL.w + 12, y: y + CELL.h / 2 - 8 }, '← top', {
        stroke: palette.accent,
        fontSize: 14,
        role: 'label',
      }),
    );
  }
  return n * CELL.h;
}

/** Horizontal FIFO cells with front/rear markers. */
function renderQueue(
  s: DataStructure,
  palette: Palette,
  x: number,
  y: number,
  nodes: SceneNode[],
): number {
  const n = Math.max(1, s.values.length);
  for (let i = 0; i < n; i++) {
    cell(`ds:${s.id}:${i}`, x + i * CELL.w, y, CELL.w, CELL.h, s.values[i], palette, nodes);
  }
  if (s.values.length > 0) {
    nodes.push(
      textNode(`ds:${s.id}:front`, { x, y: y + CELL.h + 4 }, 'front', {
        stroke: palette.accent,
        fontSize: 13,
        role: 'label',
      }),
    );
    const rearX = x + (n - 1) * CELL.w;
    nodes.push(
      textNode(`ds:${s.id}:rear`, { x: rearX + CELL.w - measure('rear', 13), y: y + CELL.h + 4 }, 'rear', {
        stroke: palette.accent,
        fontSize: 13,
        role: 'label',
      }),
    );
  }
  return CELL.h + INDEX_H;
}

/** Nodes of [value | next] cells chained by arrows, terminating at ⌀. */
function renderLinkedList(
  s: DataStructure,
  palette: Palette,
  x: number,
  y: number,
  nodes: SceneNode[],
  edges: SceneEdge[],
): number {
  const n = s.values.length;
  const nodeW = CELL.w + PTR;
  const stride = nodeW + 44; // room for the arrow between nodes
  for (let i = 0; i < n; i++) {
    const nx = x + i * stride;
    cell(`ds:${s.id}:${i}`, nx, y, CELL.w, CELL.h, s.values[i], palette, nodes);
    const ptrId = `ds:${s.id}:p${i}`;
    cell(ptrId, nx + CELL.w, y, PTR, CELL.h, undefined, palette, nodes, palette.attrFill);
    // dot in the pointer cell
    nodes.push(
      textNode(`ds:${s.id}:dot${i}`, { x: nx + CELL.w + PTR / 2 - 4, y: y + CELL.h / 2 - 10 }, '•', {
        stroke: palette.accent,
        fontSize: 20,
        align: 'center',
        role: 'label',
      }),
    );
    if (i < n - 1) {
      edges.push(edge(`ds:${s.id}:link${i}`, ptrId, `ds:${s.id}:${i + 1}`, { stroke: palette.accent, endCap: 'arrow' }));
    } else {
      // terminal null marker
      const nullId = `ds:${s.id}:null`;
      nodes.push(
        textNode(nullId, { x: nx + nodeW + 20, y: y + CELL.h / 2 - 12 }, '⌀', {
          stroke: palette.muted,
          fontSize: 22,
          role: 'label',
        }),
      );
      edges.push(edge(`ds:${s.id}:linkN`, ptrId, nullId, { stroke: palette.accent, endCap: 'arrow' }));
    }
  }
  return CELL.h;
}
