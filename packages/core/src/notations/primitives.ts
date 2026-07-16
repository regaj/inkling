/**
 * Renders the notation-independent "extras": data structures, then the free-form
 * escape-hatch primitives (`rect`/`ellipse`/`diamond`/`text`/`arrow`/`line`).
 *
 * Primitives with explicit `@x,y` keep their coordinates. Coordless primitives
 * are auto-laid-out as a **flowchart**: their connector graph is run through the
 * shared layered layout in the document's `direction` (LR / RL / TB / BT), so
 * `arrow a -> b -> c` flows the way you asked. Extras sit below any ER content.
 */
import type { Model, PrimitiveShape, SceneEdge, SceneNode } from '../types.js';
import type { Palette } from '../palette.js';
import type { Box } from '../geometry.js';
import { layered } from '../layout.js';
import { SIZE, fitWidth, measure, textNode, edge, rectNode, ellipseNode, diamondNode } from './shared.js';
import { appendStructures } from './structures.js';

const DEFAULTS = {
  rect: { w: 160, h: 64 },
  ellipse: { w: 128, h: 64 },
  diamond: { w: 150, h: 84 },
} as const;

function sizeOf(p: PrimitiveShape): { w: number; h: number } {
  if (p.kind === 'text') {
    const fs = p.fontSize ?? SIZE.fontLabel;
    return { w: Math.max(20, p.w ?? measure(p.label || p.id, fs)), h: p.h ?? fs * 1.4 };
  }
  const def = DEFAULTS[p.kind];
  return { w: p.w ?? fitWidth(p.label, def.w), h: p.h ?? def.h };
}

/** Append data structures and primitives to an in-progress scene. */
export function appendPrimitives(
  model: Model,
  palette: Palette,
  nodes: SceneNode[],
  edges: SceneEdge[],
): void {
  appendStructures(model, palette, nodes, edges);

  let bottom = -Infinity;
  for (const n of nodes) bottom = Math.max(bottom, n.y + n.h);
  const baseY = Number.isFinite(bottom) ? bottom + 80 : 0;

  const boxOf = new Map<string, Box>();
  const placed = model.primitives.filter((p) => p.x !== undefined && p.y !== undefined);
  const unplaced = model.primitives.filter((p) => p.x === undefined || p.y === undefined);

  for (const p of placed) {
    const { w, h } = sizeOf(p);
    boxOf.set(p.id, { x: p.x!, y: p.y!, w, h });
  }

  // Coordless primitives → directional flowchart layout via the connector graph.
  if (unplaced.length > 0) {
    const unplacedIds = new Set(unplaced.map((p) => p.id));
    const layoutNodes = unplaced.map((p) => ({ id: p.id, ...sizeOf(p) }));
    const layoutEdges: Array<[string, string]> = model.connectors
      .filter((c) => unplacedIds.has(c.from) && unplacedIds.has(c.to))
      .map((c) => [c.from, c.to]);
    const pos = layered(layoutNodes, layoutEdges, {
      direction: model.direction,
      gapMain: SIZE.gapMain,
      gapCross: SIZE.gapCross,
    });
    // Shift the flowchart so its top-left sits at (0, baseY).
    let minX = Infinity;
    let minY = Infinity;
    for (const p of unplaced) {
      const pt = pos.get(p.id)!;
      minX = Math.min(minX, pt.x);
      minY = Math.min(minY, pt.y);
    }
    for (const p of unplaced) {
      const pt = pos.get(p.id)!;
      const { w, h } = sizeOf(p);
      boxOf.set(p.id, { x: pt.x - minX, y: pt.y - minY + baseY, w, h });
    }
  }

  // Emit primitive shapes.
  for (const p of model.primitives) {
    const box = boxOf.get(p.id)!;
    const id = `prim:${p.id}`;
    const stroke = p.stroke ?? palette.stroke;
    const fill = p.fill ?? palette.entityFill;

    if (p.kind === 'text') {
      nodes.push(
        textNode(id, { x: box.x, y: box.y }, p.label || p.id, {
          stroke,
          fontSize: p.fontSize ?? SIZE.fontLabel,
          role: 'primitive',
        }),
      );
      continue;
    }
    const opts = {
      role: 'primitive' as const,
      label: p.label || undefined,
      stroke,
      fill,
      double: p.double,
      fontSize: p.fontSize,
    };
    if (p.kind === 'rect') nodes.push(rectNode(id, box, opts));
    else if (p.kind === 'ellipse') nodes.push(ellipseNode(id, box, opts));
    else nodes.push(diamondNode(id, box, opts));
  }

  // Emit connectors.
  let ci = 0;
  for (const c of model.connectors) {
    edges.push(
      edge(`conn:${ci++}`, resolveRef(c.from, model), resolveRef(c.to, model), {
        stroke: palette.accent,
        strokeStyle: c.dashed ? 'dashed' : 'solid',
        double: c.double,
        endCap: c.kind === 'arrow' ? 'arrow' : 'none',
        label: c.label,
      }),
    );
  }
}

/** Map a DSL reference to a scene node id (primitive ids are prefixed). */
function resolveRef(ref: string, model: Model): string {
  if (model.primitives.some((p) => p.id === ref)) return `prim:${ref}`;
  return ref;
}
