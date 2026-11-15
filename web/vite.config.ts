/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  plugins: [
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: ['Workers', 'ThirdParty', 'Assets', 'Widgets'].map((directory) => ({
        src: `node_modules/cesium/Build/Cesium/${directory}`,
        dest: 'cesium',
      })),
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    rollupOptions: {
      output: {
        // Keep three.js out of the first paint; only the 3D modes pull it in. The libraries both the
        // app and three.js need (React, its runtime helpers, zustand) get their own small chunk.
        // Without it, Rollup parks them inside the 3D chunk, the entry file imports that chunk
        // eagerly, and even the intro page preloads ~1.2 MB it never uses.
        manualChunks(id) {
          // Vite's own helper behind every lazy import(); the entry needs it from the first byte.
          if (id.includes('vite/preload-helper')) return 'vendor';
          if (/\/node_modules\/(three|@react-three)\//.test(id)) return 'three';
          if (
            /\/node_modules\/(react|react-dom|scheduler|@babel\/runtime|zustand|use-sync-external-store)\//.test(
              id,
            )
          ) {
            return 'vendor';
          }
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
