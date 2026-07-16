import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config tuned for Tauri: fixed dev port, no forced clears, and
// esbuild target matching the system WebViews Tauri ships against.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      // Don't watch the Rust side from the frontend dev server.
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: ['es2022', 'chrome110', 'safari15'],
    sourcemap: true,
    outDir: 'dist',
    emptyOutDir: true,
  },
});
