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
import { SIZE, glyphWidth, lineNode, measure, rectNode } from './shared.js';

const ROW_PAD_X = 18;

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
  // Header gets extra slack so the (larger) title clears the box edges; weak
  // entities carry a double border whose inner line would otherwise crowd it.
  let w = measure(e.label, SIZE.fontLabel) + SIZE.padX * 2 + (e.weak ? 36 : 12);
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

  // Header name — bound text in a transparent box so Excalidraw centers it
  // exactly (H+V), for any script including RTL.
  nodes.push(
    rectNode(`hdr:${e.id}`, { x: box.x, y: box.y, w: box.w, h: SIZE.headerH }, {
      role: 'label',
      label: e.label,
      labelColor: palette.text,
      stroke: 'transparent',
      fill: 'transparent',
      fontSize: SIZE.fontLabel,
      bindable: false,
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

  const cx = box.x + box.w / 2;
  rows.forEach((a, idx) => {
    const ry = box.y + SIZE.headerH + idx * SIZE.rowH;
    const text = rowText(a);
    // Underline hugs the actual glyphs (glyphWidth), not the padded box measure.
    const tw = glyphWidth(text, SIZE.fontRow);
    // Each row is bound, centered text in a transparent cell.
    nodes.push(
      rectNode(`row:${e.id}:${a.id}`, { x: box.x, y: ry, w: box.w, h: SIZE.rowH }, {
        role: 'label',
        label: text,
        labelColor: palette.text,
        stroke: 'transparent',
        fill: 'transparent',
        fontSize: SIZE.fontRow,
        bindable: false,
      }),
    );
    if (a.key || a.partial) {
      // Sit clearly below the (vertically-centered) text — no divider rule to
      // crowd it; the underline alone marks the key.
      const uy = ry + SIZE.rowH / 2 + SIZE.fontRow * 0.62;
      nodes.push(
        lineNode(
          `krule:${e.id}:${a.id}`,
          [
            [cx - tw / 2, uy],
            [cx + tw / 2, uy],
          ],
          { stroke: palette.stroke, strokeStyle: a.partial ? 'dashed' : 'solid' },
        ),
      );
    }
  });
}
