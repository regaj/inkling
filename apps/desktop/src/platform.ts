/**
 * Platform detection for the window-effects fallback.
 *
 * macOS and Windows get native translucency (applied in Rust); Linux — and any
 * plain-browser dev session without the Tauri runtime — falls back to opaque
 * chrome by tagging <html> with `.no-window-effects`.
 */
import { platform } from '@tauri-apps/plugin-os';

/** True when running inside the Tauri webview (vs. a plain browser dev server). */
export function inTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export type OS = 'macos' | 'windows' | 'linux' | 'other';

export async function detectOS(): Promise<OS> {
  if (!inTauri()) return 'other';
  try {
    const p = platform();
    if (p === 'macos' || p === 'windows' || p === 'linux') return p;
    return 'other';
  } catch {
    return 'other';
  }
}

/** Apply the opaque fallback class unless the platform supports translucency. */
export async function initWindowEffects(): Promise<void> {
  const os = await detectOS();
  const translucent = os === 'macos' || os === 'windows';
  document.documentElement.classList.toggle('no-window-effects', !translucent);
}
