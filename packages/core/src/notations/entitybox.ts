/**
 * Shared "entity as an attribute-boxed table" renderer.
 *
 * Used by the box notations (Crow's Foot / UML / IDEF1X) and by Chen when
 * `attrs box` is active (the default). Keys are listed first and underlined
 * (partial keys dashed), a rule separates the key compartment, and attribute
 * flags render as `/derived`, `multi[]`, `optional?`.
 */
import type { Attribute, Entity, SceneNode } from '../types.js';
import type { Box } from '../geometry.js';
import { SIZE, lineNode, measure, rectNode, textNode } from './shared.js';

const ROW_PAD_X = 14;

/** Row text with UML-flavored markers. */
export function rowText(a: Attribute): string {
  let t = a.label;
  if (a.derived) t = `/${t}`;
  if (a.multi) t = `${t}[]`;
  if (a.optional) t = `${t}?`;
  return t;
}

/** Keys first, then the rest — the display order of an entity's rows. */
export function orderedAttributes(e: Entity): Attribute[] {
  const keys = e.attributes.filter((a) => a.key || a.partial);
  const rest = e.attributes.filter((a) => !(a.key || a.partial));
  return [...keys, ...rest];
}

/** The box size needed to fit an entity's header and attribute rows. */
export function entityBoxSize(e: Entity): { w: number; h: number } {
  const rows = orderedAttributes(e);
  // Header gets extra slack so the (larger) title never clips; weak entities
  // also carry a double border that eats a few px.
  let w = measure(e.label, SIZE.fontLabel) + SIZE.padX * 2 + (e.weak ? 20 : 10);
  for (const a of rows) w = Math.max(w, measure(rowText(a), SIZE.fontRow) + ROW_PAD_X * 2);
  w = Math.max(SIZE.boxMinW, Math.round(w));
  const h = SIZE.headerH + Math.max(1, rows.length) * SIZE.rowH + 14;
  return { w, h };
}

/** Emit the box, header, header rule, and attribute rows for an entity. */
export function emitEntityBox(
  e: Entity,
  box: Box,
  palette: { stroke: string; weak: string; text: string; entityFill: string },
  nodes: SceneNode[],
  opts: { rounded?: boolean; double?: boolean } = {},
): void {
  const rows = orderedAttributes(e);
  const stroke = e.weak ? palette.weak : palette.stroke;

  nodes.push(
    rectNode(e.id, box, {
      role: e.weak ? 'weak-entity' : 'entity-box',
      stroke,
      fill: palette.entityFill,
      rounded: opts.rounded ?? false,
      double: opts.double ?? false,
      bindable: false,
    }),
  );

  // Header name, centered.
  nodes.push(
    textNode(
      `hdr:${e.id}`,
      { x: box.x + box.w / 2 - measure(e.label, SIZE.fontLabel) / 2, y: box.y + 9 },
      e.label,
      { stroke: palette.text, fontSize: SIZE.fontLabel, align: 'center', role: 'label' },
    ),
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

  const keyCount = rows.filter((a) => a.key || a.partial).length;
  rows.forEach((a, idx) => {
    const ry = box.y + SIZE.headerH + 8 + idx * SIZE.rowH;
    const text = rowText(a);
    nodes.push(
      textNode(`row:${e.id}:${a.id}`, { x: box.x + ROW_PAD_X, y: ry }, text, {
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
            [box.x + ROW_PAD_X, uy],
            [box.x + ROW_PAD_X + tw, uy],
          ],
          { stroke: palette.stroke, strokeStyle: a.partial ? 'dashed' : 'solid' },
        ),
      );
    }
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
