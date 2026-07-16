/**
 * Renders the free-form escape-hatch primitives (`rect`/`ellipse`/`diamond`/
 * `text`/`arrow`/`line`). These are notation-independent — every renderer appends
 * them verbatim — so a document can mix a semantic ER model with hand-placed
 * annotations.
 */
import type { Model, SceneEdge, SceneNode } from '../types.js';
import type { Palette } from '../palette.js';
import { SIZE, fitWidth, textNode, edge, rectNode, ellipseNode, diamondNode } from './shared.js';

const DEFAULTS = {
  rect: { w: 160, h: 64 },
  ellipse: { w: 124, h: 60 },
  diamond: { w: 150, h: 84 },
} as const;

/** Append primitive shapes and connectors to an in-progress scene. */
export function appendPrimitives(
  model: Model,
  palette: Palette,
  nodes: SceneNode[],
  edges: SceneEdge[],
): void {
  let auto = 0;
  for (const p of model.primitives) {
    const def = p.kind === 'text' ? { w: 0, h: 0 } : DEFAULTS[p.kind];
    const w = p.w ?? (p.kind === 'text' ? 0 : fitWidth(p.label, def.w));
    const h = p.h ?? def.h;
    // Coordless primitives drop into a simple grid; normalization re-anchors them.
    const placed = p.x !== undefined && p.y !== undefined;
    const x = placed ? p.x! : (auto % 4) * 210;
    const y = placed ? p.y! : Math.floor(auto / 4) * 130 + 40;
    if (!placed) auto++;

    const id = `prim:${p.id}`;
    const stroke = p.stroke ?? palette.stroke;
    const fill = p.fill ?? palette.entityFill;

    if (p.kind === 'text') {
      nodes.push(
        textNode(id, { x, y }, p.label || p.id, {
          stroke,
          fontSize: p.fontSize ?? SIZE.fontLabel,
          role: 'primitive',
        }),
      );
      continue;
    }

    const box = { x, y, w, h };
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

  let ci = 0;
  for (const c of model.connectors) {
    // Connectors may reference entity ids or primitive ids; try both.
    const from = resolveRef(c.from, model);
    const to = resolveRef(c.to, model);
    edges.push(
      edge(`conn:${ci++}`, from, to, {
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
  return ref; // entity/relationship ids are used verbatim as node ids
}
