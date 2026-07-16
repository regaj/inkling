/**
 * The notation-renderer registry — one of Inkling's three extension points.
 *
 * Adding a new ER notation is a single file: implement a {@link NotationRenderer}
 * and call {@link registerNotation}. Everything downstream (preview, export, CLI)
 * picks it up automatically.
 */
import type { NotationName, NotationRenderer } from '../types.js';

const registry = new Map<NotationName, NotationRenderer>();

/** Register (or replace) the renderer for a notation. */
export function registerNotation(name: NotationName, renderer: NotationRenderer): void {
  registry.set(name, renderer);
}

/** Look up a renderer; returns `undefined` if the notation is not registered. */
export function getNotation(name: NotationName): NotationRenderer | undefined {
  return registry.get(name);
}

/** All registered notation names, in registration order. */
export function listNotations(): NotationName[] {
  return [...registry.keys()];
}
