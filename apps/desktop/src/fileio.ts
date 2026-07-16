/**
 * Native open/save via the Tauri dialog plugin plus the app's own file-IO
 * commands (defined in Rust). Kept behind small helpers so components don't
 * touch the Tauri API directly, and so a plain-browser dev session degrades to
 * download/upload fallbacks.
 */
import { open, save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { inTauri } from './platform.js';
import { bytesToBase64 } from './util/base64.js';

export { bytesToBase64 };

export interface OpenedDoc {
  path: string;
  contents: string;
}

/** Open an `.ink` document via a native file dialog. Returns null if cancelled. */
export async function openInkDocument(): Promise<OpenedDoc | null> {
  if (!inTauri()) return openViaInput();
  const path = await open({
    multiple: false,
    filters: [{ name: 'Inkling', extensions: ['ink'] }],
  });
  if (typeof path !== 'string') return null;
  const contents = await invoke<string>('read_text_file', { path });
  return { path, contents };
}

/** Save an `.ink` document via a native save dialog. Returns the path or null. */
export async function saveInkDocument(contents: string, defaultName = 'diagram.ink'): Promise<string | null> {
  if (!inTauri()) {
    downloadText(defaultName, contents, 'text/plain');
    return defaultName;
  }
  const path = await save({
    defaultPath: defaultName,
    filters: [{ name: 'Inkling', extensions: ['ink'] }],
  });
  if (!path) return null;
  await invoke('write_text_file', { path, contents });
  return path;
}

/** Save a text artifact (SVG / .excalidraw) with an extension filter. */
export async function saveTextArtifact(
  contents: string,
  ext: string,
  mime: string,
  defaultName: string,
): Promise<string | null> {
  if (!inTauri()) {
    downloadText(defaultName, contents, mime);
    return defaultName;
  }
  const path = await save({ defaultPath: defaultName, filters: [{ name: ext.toUpperCase(), extensions: [ext] }] });
  if (!path) return null;
  await invoke('write_text_file', { path, contents });
  return path;
}

/** Save a binary artifact (PNG / JPG / PDF) from bytes. */
export async function saveBinaryArtifact(
  bytes: Uint8Array,
  ext: string,
  mime: string,
  defaultName: string,
): Promise<string | null> {
  if (!inTauri()) {
    downloadBytes(defaultName, bytes, mime);
    return defaultName;
  }
  const path = await save({ defaultPath: defaultName, filters: [{ name: ext.toUpperCase(), extensions: [ext] }] });
  if (!path) return null;
  await invoke('write_binary_file', { path, base64_data: bytesToBase64(bytes) });
  return path;
}

// ── Browser fallbacks (dev outside Tauri) ──────────────────────────────────
function openViaInput(): Promise<OpenedDoc | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ink';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve({ path: file.name, contents: String(reader.result) });
      reader.readAsText(file);
    };
    input.click();
  });
}

function downloadText(name: string, text: string, mime: string): void {
  downloadBytes(name, new TextEncoder().encode(text), mime);
}
function downloadBytes(name: string, bytes: Uint8Array, mime: string): void {
  const blob = new Blob([bytes as unknown as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

