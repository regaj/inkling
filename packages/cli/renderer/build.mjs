/**
 * Build the offline browser renderer bundle.
 *
 * Bundles `renderer/renderer.ts` (and its `@excalidraw/excalidraw` + React
 * dependencies) into a single self-contained IIFE at `renderer/dist/bundle.js`,
 * referenced by `renderer/index.html` with a relative <script> tag (no CDN).
 *
 * Run via `pnpm run build:renderer` (invoked by `pnpm run build`).
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));

await build({
  absWorkingDir: here,
  entryPoints: [resolve(here, 'renderer.ts')],
  outfile: resolve(here, 'dist/bundle.js'),
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'chrome110',
  minify: true,
  sourcemap: false,
  // React (pulled in transitively by Excalidraw) branches on this.
  define: { 'process.env.NODE_ENV': '"production"' },
  // Inline any assets Excalidraw imports so the bundle stays offline.
  loader: {
    '.woff': 'dataurl',
    '.woff2': 'dataurl',
    '.ttf': 'dataurl',
    '.css': 'text',
    '.png': 'dataurl',
    '.svg': 'dataurl',
  },
});

console.log('Built renderer/dist/bundle.js');
