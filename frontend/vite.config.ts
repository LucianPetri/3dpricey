/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  base: "./",
  server: {
    host: "localhost",
    port: 8080,
    strictPort: true,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-utils': ['date-fns', 'clsx', 'class-variance-authority', 'tailwind-merge'],
        },
      },
    },
    minify: 'esbuild',
    esbuildOptions: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    sourcemap: false,
    target: "es2022",
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'recharts',
      'lucide-react',
    ],
  },
}));
