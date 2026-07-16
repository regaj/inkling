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
import {
  SIZE,
  diamondNode,
  edge,
  fitWidth,
  finalizeScene,
  lineNode,
  measure,
  rectNode,
  textNode,
} from './shared.js';
import { appendPrimitives } from './primitives.js';

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

/** Row text with UML-flavored markers: `/derived`, `multi[]`, `optional?`. */
function rowText(label: string, attr: { derived: boolean; multi: boolean; optional: boolean }): string {
  let t = label;
  if (attr.derived) t = `/${t}`;
  if (attr.multi) t = `${t}[]`;
  if (attr.optional) t = `${t}?`;
  return t;
}

export function renderBoxNotation(model: Model, palette: Palette, config: BoxConfig): Scene {
  const nodes: SceneNode[] = [];
  const edges: SceneEdge[] = [];

  // ── Size entity boxes to fit header + rows ─────────────────────────────────
  const boxOf = new Map<string, Box>();
  const orderedRows = new Map<string, Entity['attributes']>();
  for (const e of model.entities) {
    const keys = e.attributes.filter((a) => a.key || a.partial);
    const rest = e.attributes.filter((a) => !(a.key || a.partial));
    const rows = [...keys, ...rest];
    orderedRows.set(e.id, rows);

    let w = measure(e.label, SIZE.fontLabel) + SIZE.padX * 2;
    for (const a of rows) w = Math.max(w, measure(rowText(a.label, a), SIZE.fontRow) + SIZE.padX * 2);
    w = Math.max(SIZE.boxMinW, Math.round(w));
    const h = SIZE.headerH + rows.length * SIZE.rowH + 14;
    boxOf.set(e.id, { x: 0, y: 0, w, h });
  }

  // ── N-ary relationships get an associative diamond node ────────────────────
  const naryRels = model.relationships.filter((r) => r.participants.length > 2);
  for (const r of naryRels) {
    boxOf.set(`reln:${r.id}`, { x: 0, y: 0, w: fitWidth(r.label, SIZE.diamondW), h: SIZE.diamondH });
  }

  // ── Layout ─────────────────────────────────────────────────────────────────
  const layoutNodes = [...boxOf.entries()].map(([id, b]) => ({ id, w: b.w, h: b.h }));
  const layoutEdges: Array<[string, string]> = [];
  for (const r of model.relationships) {
    if (r.participants.length === 2) {
      layoutEdges.push([r.participants[0].entity, r.participants[1].entity]);
    } else {
      for (const p of r.participants) layoutEdges.push([`reln:${r.id}`, p.entity]);
    }
  }
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
    const box = boxOf.get(e.id)!;
    const rows = orderedRows.get(e.id)!;
    const stroke = e.weak ? palette.weak : palette.stroke;
    nodes.push(
      rectNode(e.id, box, {
        role: e.weak ? 'weak-entity' : 'entity-box',
        stroke,
        fill: palette.entityFill,
        rounded: config.rounded?.(e) ?? false,
        bindable: false,
      }),
    );
    // Header name, centered.
    nodes.push(
      textNode(`hdr:${e.id}`, { x: box.x + box.w / 2 - measure(e.label, SIZE.fontLabel) / 2, y: box.y + 9 }, e.label, {
        stroke: palette.text,
        fontSize: SIZE.fontLabel,
        align: 'center',
        role: 'label',
      }),
    );
    // Header rule.
    nodes.push(
      lineNode(
        `rule:${e.id}`,
        [
          [box.x, box.y + SIZE.headerH],
          [box.x + box.w, box.y + SIZE.headerH],
        ],
        { stroke, role: 'compartment-rule' },
      ),
    );
    // Attribute rows.
    const keyCount = rows.filter((a) => a.key || a.partial).length;
    rows.forEach((a, idx) => {
      const ry = box.y + SIZE.headerH + 8 + idx * SIZE.rowH;
      const text = rowText(a.label, a);
      nodes.push(
        textNode(`row:${e.id}:${a.id}`, { x: box.x + SIZE.padX * 0.6, y: ry }, text, {
          stroke: palette.text,
          fontSize: SIZE.fontRow,
          align: 'left',
          role: 'label',
        }),
      );
      if (a.key || a.partial) {
        const tw = measure(text, SIZE.fontRow);
        const uy = ry + SIZE.fontRow + 1;
        nodes.push(
          lineNode(
            `krule:${e.id}:${a.id}`,
            [
              [box.x + SIZE.padX * 0.6, uy],
              [box.x + SIZE.padX * 0.6 + tw, uy],
            ],
            { stroke: palette.stroke, strokeStyle: a.partial ? 'dashed' : 'solid' },
          ),
        );
      }
      // Rule between key group and the rest.
      if (keyCount > 0 && idx === keyCount - 1 && keyCount < rows.length) {
        const sy = ry + SIZE.rowH - 2;
        nodes.push(
          lineNode(
            `sect:${e.id}`,
            [
              [box.x, sy],
              [box.x + box.w, sy],
            ],
            { stroke, strokeStyle: 'dotted', role: 'compartment-rule' },
          ),
        );
      }
    });
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

  appendPrimitives(model, palette, nodes, edges);
  return finalizeScene(config.notation, model.title, nodes, edges);
}
