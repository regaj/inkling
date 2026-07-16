/**
 * Lightweight persistence via the webview's localStorage (survives restarts in
 * Tauri). Window size/position is handled separately by the Rust
 * `tauri-plugin-window-state`.
 */
import { STORAGE } from './constants.js';
import type { ExportSettings, NotationName } from '@inkling/core';

export function loadDocument(fallback: string): string {
  return safeGet(STORAGE.document) ?? fallback;
}
export function saveDocument(text: string): void {
  safeSet(STORAGE.document, text);
}

export function loadNotation(fallback: NotationName): NotationName {
  return (safeGet(STORAGE.notation) as NotationName) ?? fallback;
}
export function saveNotation(n: NotationName): void {
  safeSet(STORAGE.notation, n);
}

export type ThemeName = 'light' | 'dark' | 'system';
export function loadTheme(): ThemeName {
  return (safeGet(STORAGE.theme) as ThemeName) ?? 'system';
}
export function saveTheme(t: ThemeName): void {
  safeSet(STORAGE.theme, t);
}

export function loadExportSettings(fallback: ExportSettings): ExportSettings {
  const raw = safeGet(STORAGE.exportSettings);
  if (!raw) return fallback;
  try {
    return { ...fallback, ...(JSON.parse(raw) as Partial<ExportSettings>) };
  } catch {
    return fallback;
  }
}
export function saveExportSettings(s: ExportSettings): void {
  safeSet(STORAGE.exportSettings, JSON.stringify(s));
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore quota/availability errors */
  }
}
