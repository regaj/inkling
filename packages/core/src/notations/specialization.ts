/**
 * EER specialization / generalization (ISA hierarchies).
 *
 * Rendered in the classic EER style: a small circle between the superclass and
 * its subclasses, labeled `d` (disjoint) or `o` (overlapping). The line to the
 * superclass is doubled for total specialization, and each subclass line carries
 * a subset symbol (⊂). Shared by the Chen-family and box notations.
 *
 * The ISA circle participates in the layout graph (so the superclass and its
 * subclasses cluster together): renderers add {@link specializationLayoutNodes}
 * and {@link specializationLayoutEdges} before laying out, then call
 * {@link renderSpecializations} with the positioned boxes.
 */
import type { Model, SceneEdge, SceneNode } from '../types.js';
import type { Palette } from '../palette.js';
import type { Box } from '../geometry.js';
import { ellipseNode, edge } from './shared.js';

const ISA_SIZE = 46;

export function isaNodeId(index: number): string {
  return `isa:${index}`;
}

/** Layout nodes for each ISA circle (add to the layout before positioning). */
export function specializationLayoutNodes(model: Model): Array<{ id: string; w: number; h: number }> {
  return model.specializations.map((_, i) => ({ id: isaNodeId(i), w: ISA_SIZE, h: ISA_SIZE }));
}

/** Layout edges connecting superclass → circle → each subclass. */
export function specializationLayoutEdges(model: Model): Array<[string, string]> {
  const edges: Array<[string, string]> = [];
  model.specializations.forEach((sp, i) => {
    const node = isaNodeId(i);
    edges.push([sp.superclass, node]);
    for (const sub of sp.subclasses) edges.push([node, sub]);
  });
  return edges;
}

/** Emit the ISA circles and their edges, given the positioned `boxOf` map. */
export function renderSpecializations(
  model: Model,
  palette: Palette,
  boxOf: Map<string, Box>,
  nodes: SceneNode[],
  edges: SceneEdge[],
): void {
  model.specializations.forEach((sp, i) => {
    const id = isaNodeId(i);
    const box = boxOf.get(id);
    if (!box) return;

    nodes.push(
      ellipseNode(id, box, {
        role: 'decoration',
        label: sp.disjoint ? 'd' : 'o',
        stroke: palette.accent,
        fill: palette.entityFill,
        fontSize: 16,
      }),
    );

    // Superclass → circle (double line when the specialization is total).
    edges.push(
      edge(`isa:${i}:sup`, sp.superclass, id, { stroke: palette.stroke, double: sp.total }),
    );

    // Circle → each subclass, with a subset symbol near the subclass end.
    for (const sub of sp.subclasses) {
      edges.push(edge(`isa:${i}:${sub}`, id, sub, { stroke: palette.stroke, labelTo: '⊂' }));
    }
  });
}
