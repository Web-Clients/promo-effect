import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    // MapLibre spawns a web worker. Vite's dependency pre-bundling rewrites the
    // worker entry to a path it then fails to serve (ERR_FAILED on
    // maplibre-gl-worker.mjs), and without the worker no vector tile is ever
    // parsed — the globe comes up blank with no error. Excluding it makes Vite
    // serve the package's own files, worker included.
    exclude: ['maplibre-gl'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-maps': ['leaflet', 'react-leaflet'],
          'vendor-globe': ['maplibre-gl'],
          'vendor-motion': ['framer-motion'],
          'vendor-ui': ['react-i18next', 'i18next'],
          // 'vendor-pdf': ['html2canvas', 'jspdf'], // uncomment when packages are added
        },
      },
    },
  },
});
