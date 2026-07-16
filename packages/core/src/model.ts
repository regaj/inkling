/**
 * Stage 3 — the model builder.
 *
 * Folds the {@link Statement} AST into a resolved, notation-independent
 * {@link Model}: entities and relationships are indexed, attributes are attached
 * to their owners, binary-relationship sugar is expanded into participation
 * links, and cross-references are validated (duplicate ids, unknown owners,
 * connectors pointing at ids that were never declared).
 */
import type {
  Attribute,
  DataStructure,
  Diagnostic,
  Direction,
  Entity,
  Model,
  NotationName,
  Relationship,
  Statement,
} from './types.js';
import { DEFAULT_NOTATION } from './types.js';

export interface BuildResult {
  model: Model;
  diagnostics: Diagnostic[];
}

export function buildModel(ast: Statement[]): BuildResult {
  const diagnostics: Diagnostic[] = [];

  let notation: NotationName = DEFAULT_NOTATION;
  let direction: Direction = 'LR';
  let title: string | undefined;

  const entities = new Map<string, Entity>();
  const relationships = new Map<string, Relationship>();
  const structures = new Map<string, DataStructure>();
  const model: Model = {
    notation,
    direction,
    title,
    entities: [],
    relationships: [],
    primitives: [],
    connectors: [],
    structures: [],
  };

  // Track the declaration namespace shared by connector references.
  const declaredIds = new Set<string>();
  const declare = (id: string, stmt: Statement): void => {
    if (declaredIds.has(id)) {
      diagnostics.push({
        severity: 'error',
        message: `Duplicate id "${id}"`,
        line: stmt.pos.line,
        col: stmt.pos.col,
        length: id.length,
        code: 'duplicate-id',
      });
    }
    declaredIds.add(id);
  };

  // ── Pass 1: directives, entities, relationships, primitives ────────────────
  for (const stmt of ast) {
    switch (stmt.type) {
      case 'notation':
        notation = stmt.notation;
        break;
      case 'direction':
        direction = stmt.direction;
        break;
      case 'title':
        title = stmt.title;
        break;
      case 'entity': {
        declare(stmt.id, stmt);
        entities.set(stmt.id, {
          id: stmt.id,
          label: stmt.label,
          weak: stmt.weak,
          attributes: [],
        });
        break;
      }
      case 'rel': {
        declare(stmt.id, stmt);
        // Binary-sugar participants are expanded in pass 2, once every entity
        // is known, so their references validate against the full id set.
        const rel: Relationship = {
          id: stmt.id,
          label: stmt.label,
          identifying: stmt.identifying,
          participants: [],
          attributes: [],
        };
        relationships.set(stmt.id, rel);
        break;
      }
      case 'structure': {
        declare(stmt.id, stmt);
        structures.set(stmt.id, {
          kind: stmt.kind,
          id: stmt.id,
          label: stmt.label,
          values: [...stmt.values],
        });
        break;
      }
      case 'shape': {
        declare(stmt.id, stmt);
        model.primitives.push({
          kind: stmt.kind,
          id: stmt.id,
          label: stmt.label,
          x: stmt.x,
          y: stmt.y,
          w: stmt.w,
          h: stmt.h,
          fill: stmt.fill,
          stroke: stmt.stroke,
          double: stmt.double,
          fontSize: stmt.fontSize,
        });
        break;
      }
      default:
        break;
    }
  }

  // ── Pass 2: rel expansion, attributes, links, connectors ───────────────────
  const validateEntityRef = (id: string, stmt: Statement, kind: string): void => {
    if (!entities.has(id)) {
      diagnostics.push({
        severity: 'error',
        message: `${kind} references unknown entity "${id}"`,
        line: stmt.pos.line,
        col: stmt.pos.col,
        length: id.length,
        code: 'unknown-id',
      });
    }
  };

  for (const stmt of ast) {
    switch (stmt.type) {
      case 'rel': {
        if (!stmt.binary) break;
        const rel = relationships.get(stmt.id)!;
        validateEntityRef(stmt.binary.a, stmt, `Relationship "${stmt.id}"`);
        validateEntityRef(stmt.binary.b, stmt, `Relationship "${stmt.id}"`);
        rel.participants.push(
          { entity: stmt.binary.a, card: stmt.binary.cardA, total: false },
          { entity: stmt.binary.b, card: stmt.binary.cardB, total: false },
        );
        break;
      }
      case 'attr': {
        const attribute: Attribute = {
          id: stmt.id,
          owner: stmt.owner,
          label: stmt.label,
          key: stmt.key,
          partial: stmt.partial,
          derived: stmt.derived,
          multi: stmt.multi,
          optional: stmt.optional,
        };
        const owner = entities.get(stmt.owner) ?? relationships.get(stmt.owner);
        if (!owner) {
          diagnostics.push({
            severity: 'error',
            message: `Attribute owner "${stmt.owner}" is not a declared entity or relationship`,
            line: stmt.pos.line,
            col: stmt.pos.col,
            length: stmt.owner.length,
            code: 'unknown-id',
          });
        } else {
          owner.attributes.push(attribute);
        }
        break;
      }
      case 'link': {
        const rel = relationships.get(stmt.rel);
        if (!rel) {
          diagnostics.push({
            severity: 'error',
            message: `link references unknown relationship "${stmt.rel}"`,
            line: stmt.pos.line,
            col: stmt.pos.col,
            length: stmt.rel.length,
            code: 'unknown-id',
          });
          break;
        }
        validateEntityRef(stmt.entity, stmt, 'link');
        rel.participants.push({
          entity: stmt.entity,
          card: stmt.card,
          role: stmt.role,
          total: stmt.total,
        });
        break;
      }
      case 'structure-op': {
        const struct = structures.get(stmt.id);
        if (!struct) {
          diagnostics.push({
            severity: 'error',
            message: `${stmt.op} references unknown structure "${stmt.id}"`,
            line: stmt.pos.line,
            col: stmt.pos.col,
            length: stmt.id.length,
            code: 'unknown-id',
          });
          break;
        }
        switch (stmt.op) {
          case 'push':
          case 'append':
          case 'enqueue':
            if (stmt.value !== undefined) struct.values.push(stmt.value);
            break;
          case 'pop':
            struct.values.pop();
            break;
          case 'dequeue':
            struct.values.shift();
            break;
        }
        break;
      }
      case 'connector': {
        for (const ref of [stmt.from, stmt.to]) {
          if (!declaredIds.has(ref)) {
            diagnostics.push({
              severity: 'error',
              message: `Connector references unknown id "${ref}"`,
              line: stmt.pos.line,
              col: stmt.pos.col,
              length: ref.length,
              code: 'unknown-id',
            });
          }
        }
        model.connectors.push({
          kind: stmt.kind,
          from: stmt.from,
          to: stmt.to,
          label: stmt.label,
          dashed: stmt.dashed,
          double: stmt.double,
        });
        break;
      }
      default:
        break;
    }
  }

  model.notation = notation;
  model.direction = direction;
  model.title = title;
  model.entities = [...entities.values()];
  model.relationships = [...relationships.values()];
  model.structures = [...structures.values()];

  return { model, diagnostics };
}
