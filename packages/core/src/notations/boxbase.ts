/**
 * Shared renderer for the "box" notation family — Crow's Foot, UML, and IDEF1X.
 *
 * All three draw entities as attribute-boxed tables and relationships as edges;
 * they differ only in end markers (crow's feet vs. multiplicity text vs. IDEF1X
 * dots), line styles (identifying vs. non-identifying), and corner rounding.
 * Those differences are injected through {@link BoxConfig}.
 */
import type {
  Cardinality,
  Entity,
  Model,
  NotationName,
  Relationship,
  Scene,
  SceneEdge,
  SceneNode,
  StrokeStyle,
} from '../types.js';
import type { EdgeCap } from '../types.js';
import type { Palette } from '../palette.js';
import type { Box } from '../geometry.js';
import { layered } from '../layout.js';
import { SIZE, diamondNode, edge, fitDiamond, finalizeScene } from './shared.js';
import { entityBoxSize, emitEntityBox } from './entitybox.js';
import { appendPrimitives } from './primitives.js';
import {
  specializationLayoutNodes,
  specializationLayoutEdges,
  renderSpecializations,
} from './specialization.js';

export interface BoxConfig {
  notation: NotationName;
  /** Whether an entity's box has rounded corners (IDEF1X dependent entities). */
  rounded?: (entity: Entity) => boolean;
  /** End marker for a participant's own cardinality (Crow's Foot / IDEF1X). */
  cap?: (card: Cardinality) => EdgeCap;
  /** Text label for a participant end (UML multiplicity). */
  endLabel?: (card: Cardinality) => string;
  /** Line style for a relationship (IDEF1X: non-identifying → dashed). */
  relStyle?: (rel: Relationship) => StrokeStyle;
  /** Draw the relationship name as a mid-edge label. */
  showRelName: boolean;
}

export function renderBoxNotation(model: Model, palette: Palette, config: BoxConfig): Scene {
  const nodes: SceneNode[] = [];
  const edges: SceneEdge[] = [];

  // ── Size entity boxes to fit header + rows ─────────────────────────────────
  const boxOf = new Map<string, Box>();
  for (const e of model.entities) {
    boxOf.set(e.id, { x: 0, y: 0, ...entityBoxSize(e) });
  }

  // ── N-ary relationships get an associative diamond node ────────────────────
  const naryRels = model.relationships.filter((r) => r.participants.length > 2);
  for (const r of naryRels) {
    boxOf.set(`reln:${r.id}`, { x: 0, y: 0, ...fitDiamond(r.label) });
  }

  // ── Layout ─────────────────────────────────────────────────────────────────
  for (const n of specializationLayoutNodes(model)) {
    boxOf.set(n.id, { x: 0, y: 0, w: n.w, h: n.h });
  }
  const layoutNodes = [...boxOf.entries()].map(([id, b]) => ({ id, w: b.w, h: b.h }));
  const layoutEdges: Array<[string, string]> = [];
  for (const r of model.relationships) {
    if (r.participants.length === 2) {
      layoutEdges.push([r.participants[0].entity, r.participants[1].entity]);
    } else {
      for (const p of r.participants) layoutEdges.push([`reln:${r.id}`, p.entity]);
    }
  }
  layoutEdges.push(...specializationLayoutEdges(model));
  const positions = layered(layoutNodes, layoutEdges, {
    direction: model.direction,
    gapMain: SIZE.gapMain,
    gapCross: SIZE.gapCross,
  });
  for (const [id, p] of positions) {
    const b = boxOf.get(id);
    if (b) {
      b.x = p.x;
      b.y = p.y;
    }
  }

  // ── Emit entity boxes with header, rule, and attribute rows ────────────────
  for (const e of model.entities) {
    emitEntityBox(e, boxOf.get(e.id)!, palette, nodes, { rounded: config.rounded?.(e) ?? false });
  }

  // ── Associative diamonds for n-ary relationships ───────────────────────────
  for (const r of naryRels) {
    nodes.push(
      diamondNode(`reln:${r.id}`, boxOf.get(`reln:${r.id}`)!, {
        role: 'relationship',
        label: r.label,
        stroke: r.identifying ? palette.weak : palette.stroke,
        fill: palette.relFill,
        double: r.identifying,
      }),
    );
  }

  // ── Relationship edges ─────────────────────────────────────────────────────
  let ei = 0;
  for (const r of model.relationships) {
    const style = config.relStyle?.(r) ?? 'solid';
    const stroke = r.identifying ? palette.stroke : palette.muted;
    if (r.participants.length === 2) {
      const [a, b] = r.participants;
      edges.push(
        edge(`rel:${r.id}`, a.entity, b.entity, {
          stroke,
          strokeStyle: style,
          startCap: config.cap?.(a.card) ?? 'none',
          endCap: config.cap?.(b.card) ?? 'none',
          labelFrom: config.endLabel?.(a.card),
          labelTo: config.endLabel?.(b.card),
          label: config.showRelName ? r.label : undefined,
        }),
      );
    } else {
      for (const p of r.participants) {
        edges.push(
          edge(`rel:${r.id}:${p.entity}:${ei++}`, p.entity, `reln:${r.id}`, {
            stroke,
            strokeStyle: style,
            startCap: config.cap?.(p.card) ?? 'none',
            labelFrom: config.endLabel?.(p.card),
          }),
        );
      }
    }
  }

  renderSpecializations(model, palette, boxOf, nodes, edges);
  appendPrimitives(model, palette, nodes, edges);
  return finalizeScene(config.notation, model.title, nodes, edges);
}
