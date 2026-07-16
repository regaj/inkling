/**
 * Core type definitions for the Inkling DSL engine.
 *
 * The data flows through four typed stages:
 *
 * ```
 *  source ──tokenize──▶ Token[] ──parse──▶ AST (Statement[]) ──build──▶ Model
 *                                                                        │
 *                                                                  render (per notation)
 *                                                                        ▼
 *                                                                      Scene ──▶ Excalidraw skeleton
 * ```
 *
 * Every stage is pure and DOM-free so it runs identically in Node (tests, CLI)
 * and the browser (the desktop app).
 *
 * @packageDocumentation
 */
import type { Palette } from './palette.js';

/** Source position, 1-based line, 0-based column, for diagnostics. */
export interface Pos {
  line: number;
  col: number;
}

/** A lexical token produced by {@link tokenize}. */
export interface Token {
  /** Raw text of the token (quotes stripped for strings). */
  value: string;
  /** Token category. */
  kind: TokenKind;
  pos: Pos;
}

export type TokenKind =
  | 'word' // bare identifier / keyword / number / flag
  | 'string' // "quoted label"
  | 'op' // -> or --
  | 'comment';

// ─────────────────────────────────────────────────────────────────────────────
// Notation
// ─────────────────────────────────────────────────────────────────────────────

/** The ER notations Inkling can render the same model in. */
export type NotationName = 'chen' | 'crowsfoot' | 'uml' | 'idef1x' | 'minmax';

export const NOTATIONS: readonly NotationName[] = [
  'chen',
  'crowsfoot',
  'uml',
  'idef1x',
  'minmax',
] as const;

export const DEFAULT_NOTATION: NotationName = 'chen';

/**
 * Layout flow direction — used by the ER graph layout and by flowcharts built
 * from primitives. `LR` left→right, `RL` right→left, `TB` top→bottom, `BT`
 * bottom→top.
 */
export type Direction = 'LR' | 'RL' | 'TB' | 'BT';

export const DIRECTIONS: readonly Direction[] = ['LR', 'RL', 'TB', 'BT'] as const;

/** Kinds of data structure the DSL can draw. */
export type StructureKind = 'array' | 'stack' | 'queue' | 'linked_list';

export const STRUCTURE_KINDS: readonly StructureKind[] = [
  'array',
  'stack',
  'queue',
  'linked_list',
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Cardinality
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A normalized participation cardinality.
 *
 * Shorthand tokens normalize as follows: `1` → (1,1); `N`/`M`/`*` → (1, ∞).
 * Explicit ranges (`0..1`, `1..*`, `0..*`, `1..1`) are taken verbatim.
 * `max === null` represents "many" (∞).
 */
export interface Cardinality {
  min: number;
  /** `null` means unbounded ("many"/N). */
  max: number | null;
  /** The token as written, preserved for Chen/UML labels (e.g. "N", "1", "0..*"). */
  raw: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// AST — the parsed statements
// ─────────────────────────────────────────────────────────────────────────────

export type Statement =
  | NotationStmt
  | TitleStmt
  | DirectionStmt
  | EntityStmt
  | AttrStmt
  | RelStmt
  | LinkStmt
  | PrimitiveShapeStmt
  | PrimitiveConnectorStmt
  | StructureStmt
  | StructureOpStmt
  | IsaStmt;

export interface NotationStmt {
  type: 'notation';
  notation: NotationName;
  pos: Pos;
}

export interface TitleStmt {
  type: 'title';
  title: string;
  pos: Pos;
}

export interface DirectionStmt {
  type: 'direction';
  direction: Direction;
  pos: Pos;
}

/** `entity <id> "Label"` / `weak <id> "Label"`. */
export interface EntityStmt {
  type: 'entity';
  id: string;
  label: string;
  weak: boolean;
  pos: Pos;
}

/** `attr <owner>.<id> "Label" [flags]`. */
export interface AttrStmt {
  type: 'attr';
  owner: string;
  id: string;
  label: string;
  key: boolean;
  partial: boolean;
  derived: boolean;
  multi: boolean;
  optional: boolean;
  pos: Pos;
}

/**
 * `rel <id> "Label" [identifying]` (n-ary declaration) or
 * `rel <id> "Label" <A> <cardA>-<cardB> <B> [identifying]` (binary sugar).
 */
export interface RelStmt {
  type: 'rel';
  id: string;
  label: string;
  identifying: boolean;
  /** Present for the binary-sugar form; expanded into two links by the model builder. */
  binary?: {
    a: string;
    b: string;
    cardA: Cardinality;
    cardB: Cardinality;
  };
  pos: Pos;
}

/** `link <relId> <entityId> <card> [role "..."] [total]`. */
export interface LinkStmt {
  type: 'link';
  rel: string;
  entity: string;
  card: Cardinality;
  role?: string;
  total: boolean;
  pos: Pos;
}

export type PrimitiveKind = 'rect' | 'ellipse' | 'diamond' | 'text';

/** `rect|ellipse|diamond|text <id> "Label" @x,y [WxH] [opts]`. */
export interface PrimitiveShapeStmt {
  type: 'shape';
  kind: PrimitiveKind;
  id: string;
  label: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  fill?: string;
  stroke?: string;
  double: boolean;
  fontSize?: number;
  pos: Pos;
}

/** `arrow a -> b ["label"] [dashed]` / `line a -- b ["label"] [dashed] [double]`. */
export interface PrimitiveConnectorStmt {
  type: 'connector';
  kind: 'arrow' | 'line';
  from: string;
  to: string;
  label?: string;
  dashed: boolean;
  double: boolean;
  pos: Pos;
}

/**
 * `isa <super> [sub1, sub2, ...] [disjoint|overlapping] [total|partial]` — an
 * EER specialization / generalization (an ISA hierarchy).
 */
export interface IsaStmt {
  type: 'isa';
  superclass: string;
  subclasses: string[];
  disjoint: boolean;
  total: boolean;
  pos: Pos;
}

/** `array|stack|queue|linked_list <id> "Label" [v1, v2, ...]`. */
export interface StructureStmt {
  type: 'structure';
  kind: StructureKind;
  id: string;
  label: string;
  values: string[];
  pos: Pos;
}

export type StructureOp = 'push' | 'pop' | 'enqueue' | 'dequeue' | 'append';

/** `push|append|enqueue <id> <value>` / `pop|dequeue <id>`. */
export interface StructureOpStmt {
  type: 'structure-op';
  op: StructureOp;
  id: string;
  value?: string;
  pos: Pos;
}

// ─────────────────────────────────────────────────────────────────────────────
// Diagnostics
// ─────────────────────────────────────────────────────────────────────────────

export type Severity = 'error' | 'warning';

/** A parse or semantic diagnostic, surfaced as an editor squiggle + gutter marker. */
export interface Diagnostic {
  severity: Severity;
  message: string;
  /** 1-based line. */
  line: number;
  /** 0-based column. */
  col: number;
  /** Length of the offending span (best effort). */
  length: number;
  code: DiagnosticCode;
}

export type DiagnosticCode =
  | 'unknown-command'
  | 'duplicate-id'
  | 'unknown-id'
  | 'bad-coordinate'
  | 'bad-cardinality'
  | 'missing-argument'
  | 'bad-notation'
  | 'bad-direction'
  | 'bad-owner'
  | 'syntax';

// ─────────────────────────────────────────────────────────────────────────────
// Semantic model — resolved, notation-independent
// ─────────────────────────────────────────────────────────────────────────────

export interface Attribute {
  id: string;
  owner: string;
  label: string;
  key: boolean;
  partial: boolean;
  derived: boolean;
  multi: boolean;
  optional: boolean;
}

export interface Entity {
  id: string;
  label: string;
  weak: boolean;
  attributes: Attribute[];
}

export interface Participation {
  entity: string;
  card: Cardinality;
  role?: string;
  total: boolean;
}

export interface Relationship {
  id: string;
  label: string;
  identifying: boolean;
  participants: Participation[];
  attributes: Attribute[];
}

export interface PrimitiveShape {
  kind: PrimitiveKind;
  id: string;
  label: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  fill?: string;
  stroke?: string;
  double: boolean;
  fontSize?: number;
}

export interface PrimitiveConnector {
  kind: 'arrow' | 'line';
  from: string;
  to: string;
  label?: string;
  dashed: boolean;
  double: boolean;
}

/** A data structure with its current (post-operations) values. */
export interface DataStructure {
  kind: StructureKind;
  id: string;
  label: string;
  values: string[];
}

/**
 * An EER specialization: a superclass entity specialized into subclass entities,
 * with disjoint/overlapping and total/partial constraints.
 */
export interface Specialization {
  superclass: string;
  subclasses: string[];
  /** `true` = disjoint (d), `false` = overlapping (o). */
  disjoint: boolean;
  /** `true` = total participation (double line to the superclass). */
  total: boolean;
}

/** The fully resolved, notation-independent model. */
export interface Model {
  notation: NotationName;
  direction: Direction;
  title?: string;
  entities: Entity[];
  relationships: Relationship[];
  primitives: PrimitiveShape[];
  connectors: PrimitiveConnector[];
  structures: DataStructure[];
  specializations: Specialization[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Scene IR — what a notation renderer produces (fully positioned, notation-neutral)
// ─────────────────────────────────────────────────────────────────────────────

export type ShapeKind = 'rectangle' | 'ellipse' | 'diamond' | 'text' | 'line';

export type StrokeStyle = 'solid' | 'dashed' | 'dotted';
export type FillStyle = 'solid' | 'hachure' | 'cross-hatch';

/**
 * Semantic role of a scene node — drives palette/decoration choices and lets
 * exporters and tests reason about output. Purely descriptive; geometry lives in
 * the node's box.
 */
export type NodeRole =
  | 'entity'
  | 'weak-entity'
  | 'relationship'
  | 'attribute'
  | 'entity-box'
  | 'compartment-rule'
  | 'label'
  | 'cardinality'
  | 'decoration'
  | 'primitive';

export interface SceneNode {
  id: string;
  shape: ShapeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
  role: NodeRole;
  stroke: string;
  fill: string;
  strokeStyle: StrokeStyle;
  fillStyle: FillStyle;
  /** Emit a second inset outline (weak entity / identifying rel / multivalued attr). */
  double?: boolean;
  /** Rounded corners (IDEF1X dependent entity, UML option). */
  rounded?: boolean;
  fontSize?: number;
  /** Horizontal text alignment for text nodes. */
  align?: 'left' | 'center' | 'right';
  /** Free polyline points (absolute), used for `line` shapes such as markers/underlines. */
  points?: Array<[number, number]>;
  /** When false, the node is decorative and takes no bound text. */
  bindable?: boolean;
}

export type EdgeCap =
  | 'none'
  | 'arrow'
  | 'bar' // exactly one (|)
  | 'circle' // optional (o)
  | 'crowsfoot' // many (<)
  | 'circle-bar' // zero-or-one (o|)
  | 'bar-bar' // one-and-only-one (||)
  | 'circle-crowsfoot' // zero-or-many (o<)
  | 'bar-crowsfoot' // one-or-many (|<)
  | 'dot'; // IDEF1X "many" child dot

export interface SceneEdge {
  id: string;
  /** Source node id. */
  from: string;
  /** Target node id. */
  to: string;
  stroke: string;
  strokeStyle: StrokeStyle;
  /** Double / total-participation line. */
  double?: boolean;
  startCap?: EdgeCap;
  endCap?: EdgeCap;
  /** Mid-edge label (e.g. UML association name). */
  label?: string;
  /** Label near the `from` endpoint (e.g. Chen cardinality). */
  labelFrom?: string;
  /** Label near the `to` endpoint. */
  labelTo?: string;
}

/** A positioned, notation-neutral diagram, ready for the Excalidraw adapter. */
export interface Scene {
  notation: NotationName;
  title?: string;
  nodes: SceneNode[];
  edges: SceneEdge[];
  width: number;
  height: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Compile result
// ─────────────────────────────────────────────────────────────────────────────

export interface CompileResult {
  scene: Scene;
  model: Model;
  ast: Statement[];
  diagnostics: Diagnostic[];
  /** True when there are no `error`-severity diagnostics. */
  ok: boolean;
}

/** Options accepted by {@link compile}. */
export interface CompileOptions {
  /** Override the notation (takes precedence over the document's `notation` directive). */
  notation?: NotationName;
  /** Palette to theme scene shapes (defaults to the light editor palette). */
  palette?: Palette;
}

/**
 * A notation renderer: turns the resolved {@link Model} into a fully positioned
 * {@link Scene}. Registered in the notation registry keyed by {@link NotationName}.
 */
export type NotationRenderer = (model: Model, palette: Palette) => Scene;
