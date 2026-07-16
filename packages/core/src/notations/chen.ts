/**
 * Chen notation (the default).
 *
 * Entity → rectangle (weak entity → double rectangle), relationship → diamond
 * (identifying → double diamond), attribute → ellipse (key → underlined,
 * partial key → dashed underline, derived → dashed ellipse, multivalued → double
 * ellipse), cardinality → connector label, total participation → double line.
 * Attributes fan out as satellites around their owner.
 */
import type { Cardinality, Model, NotationName, Scene, SceneEdge, SceneNode } from '../types.js';
import type { Palette } from '../palette.js';
import type { Box } from '../geometry.js';
import { layered } from '../layout.js';
import { chenLabel } from './cardinality.js';
import {
  SIZE,
  boxCenter,
  diamondNode,
  edge,
  ellipseNode,
  fitWidth,
  finalizeScene,
  lineNode,
  measure,
  rectNode,
} from './shared.js';
import { appendPrimitives } from './primitives.js';
import {
  specializationLayoutNodes,
  specializationLayoutEdges,
  renderSpecializations,
} from './specialization.js';

export function renderChen(model: Model, palette: Palette): Scene {
  return renderChenLike(model, palette, 'chen', chenLabel);
}

/**
 * Shared Chen-family renderer. Chen and Min-Max share identical geometry and
 * differ only in how a cardinality is labeled, so both flow through here.
 */
export function renderChenLike(
  model: Model,
  palette: Palette,
  notation: NotationName,
  cardLabel: (card: Cardinality) => string,
): Scene {
  const nodes: SceneNode[] = [];
  const edges: SceneEdge[] = [];

  // ── Size and lay out the entity/relationship graph ─────────────────────────
  const boxOf = new Map<string, Box>();
  for (const e of model.entities) {
    boxOf.set(e.id, { x: 0, y: 0, w: fitWidth(e.label, SIZE.entityW), h: SIZE.entityH });
  }
  for (const r of model.relationships) {
    boxOf.set(r.id, { x: 0, y: 0, w: fitWidth(r.label, SIZE.diamondW), h: SIZE.diamondH });
  }
  for (const n of specializationLayoutNodes(model)) {
    boxOf.set(n.id, { x: 0, y: 0, w: n.w, h: n.h });
  }

  const layoutNodes = [...boxOf.entries()].map(([id, b]) => ({ id, w: b.w, h: b.h }));
  const layoutEdges: Array<[string, string]> = [];
  for (const r of model.relationships) {
    for (const p of r.participants) layoutEdges.push([r.id, p.entity]);
  }
  layoutEdges.push(...specializationLayoutEdges(model));
  const positions = layered(layoutNodes, layoutEdges, {
    direction: model.direction,
    gapMain: SIZE.gapMain + 60,
    gapCross: SIZE.gapCross + 40,
  });
  for (const [id, p] of positions) {
    const b = boxOf.get(id);
    if (b) {
      b.x = p.x;
      b.y = p.y;
    }
  }

  // ── Entity + relationship nodes ────────────────────────────────────────────
  for (const e of model.entities) {
    nodes.push(
      rectNode(e.id, boxOf.get(e.id)!, {
        role: e.weak ? 'weak-entity' : 'entity',
        label: e.label,
        stroke: e.weak ? palette.weak : palette.stroke,
        fill: palette.entityFill,
        double: e.weak,
      }),
    );
  }
  for (const r of model.relationships) {
    nodes.push(
      diamondNode(r.id, boxOf.get(r.id)!, {
        role: 'relationship',
        label: r.label,
        stroke: r.identifying ? palette.weak : palette.stroke,
        fill: palette.relFill,
        double: r.identifying,
      }),
    );
  }

  // ── Participation edges (entity ── relationship) ───────────────────────────
  let ei = 0;
  for (const r of model.relationships) {
    for (const p of r.participants) {
      edges.push(
        edge(`part:${ei++}`, p.entity, r.id, {
          stroke: palette.stroke,
          double: p.total,
          labelFrom: cardLabel(p.card),
          label: p.role,
        }),
      );
    }
  }

  // ── Attributes as satellite ellipses ───────────────────────────────────────
  const owners = [
    ...model.entities.map((e) => ({ id: e.id, attrs: e.attributes, prefer: -Math.PI / 2 })),
    ...model.relationships.map((r) => ({ id: r.id, attrs: r.attributes, prefer: Math.PI / 2 })),
  ];
  for (const owner of owners) {
    if (owner.attrs.length === 0) continue;
    const ownerBox = boxOf.get(owner.id)!;
    const c = boxCenter(ownerBox);
    const n = owner.attrs.length;
    const span = n === 1 ? 0 : Math.min(Math.PI * 1.4, (Math.PI / 5) * (n - 1));
    const start = owner.prefer - span / 2;
    const step = n === 1 ? 0 : span / (n - 1);
    const radius = SIZE.satelliteRadius + ownerBox.w / 4;

    owner.attrs.forEach((attr, i) => {
      const theta = start + step * i;
      const cx = c.x + Math.cos(theta) * radius;
      const cy = c.y + Math.sin(theta) * radius;
      const w = fitWidth(attr.label, SIZE.attrW, SIZE.fontRow);
      const box = { x: cx - w / 2, y: cy - SIZE.attrH / 2, w, h: SIZE.attrH };
      const attrId = `attr:${owner.id}:${attr.id}`;
      nodes.push(
        ellipseNode(attrId, box, {
          role: 'attribute',
          label: attr.label,
          stroke: palette.stroke,
          fill: palette.attrFill,
          strokeStyle: attr.derived ? 'dashed' : 'solid',
          double: attr.multi,
          fontSize: SIZE.fontRow,
        }),
      );
      edges.push(edge(`ae:${attrId}`, attrId, owner.id, { stroke: palette.stroke }));

      // Key attributes are underlined (partial keys dashed).
      if (attr.key || attr.partial) {
        const tw = Math.min(w - 16, measure(attr.label, SIZE.fontRow));
        const uy = cy + SIZE.fontRow * 0.62;
        nodes.push(
          lineNode(
            `ul:${attrId}`,
            [
              [cx - tw / 2, uy],
              [cx + tw / 2, uy],
            ],
            { stroke: palette.stroke, strokeStyle: attr.partial ? 'dashed' : 'solid' },
          ),
        );
      }
    });
  }

  renderSpecializations(model, palette, boxOf, nodes, edges);
  appendPrimitives(model, palette, nodes, edges);
  return finalizeScene(notation, model.title, nodes, edges);
}
