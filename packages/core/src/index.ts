/**
 * `@inkling/core` — the pure, DOM-free DSL engine.
 *
 * Public surface: compile source to a positioned scene and Excalidraw skeletons,
 * plus the parser/model stages, the three registries (notation, exporter, and the
 * compiler's shape kinds), palettes, and the sample document.
 *
 * @packageDocumentation
 */

// Pipeline
export { tokenize, tokenizeLine } from './tokenizer.js';
export { parse, parseCardinality } from './parser.js';
export type { ParseResult } from './parser.js';
export { buildModel } from './model.js';
export type { BuildResult } from './model.js';
export { compile, renderScene } from './compile.js';

// Excalidraw adapter
export { toExcalidrawSkeleton, wrapExcalidrawFile, EXCALIDRAW_SOURCE } from './excalidraw.js';
export type { SkeletonElement } from './excalidraw.js';

// Registries
export {
  registerNotation,
  registerBuiltinNotations,
  getNotation,
  listNotations,
} from './notations/index.js';
export {
  registerExporter,
  getExporter,
  listExporters,
  formatOf,
  defaultExportSettings,
  EXPORT_FORMATS,
} from './exporters.js';
export type {
  Exporter,
  ExportFormat,
  ExportFormatId,
  ExportInput,
  ExportArtifact,
  ExportSettings,
} from './exporters.js';

// Palettes
export { LIGHT_PALETTE, DARK_PALETTE, PALETTES } from './palette.js';
export type { Palette } from './palette.js';

// Geometry (useful to hosts that draw overlays)
export { borderPoint, center, bounds } from './geometry.js';
export type { Point, Box } from './geometry.js';

// Sample
export { SAMPLE_INK } from './sample.js';

// Types
export {
  NOTATIONS,
  DEFAULT_NOTATION,
  DEFAULT_ATTR_STYLE,
  DIRECTIONS,
  STRUCTURE_KINDS,
} from './types.js';
export type {
  NotationName,
  NotationRenderer,
  Direction,
  AttrStyle,
  StructureKind,
  StructureOp,
  DataStructure,
  Cardinality,
  Diagnostic,
  DiagnosticCode,
  Severity,
  Statement,
  Model,
  Entity,
  Attribute,
  Relationship,
  Participation,
  PrimitiveShape,
  PrimitiveConnector,
  Specialization,
  Scene,
  SceneNode,
  SceneEdge,
  EdgeCap,
  NodeRole,
  ShapeKind,
  Token,
  TokenKind,
  Pos,
  CompileOptions,
  CompileResult,
} from './types.js';
