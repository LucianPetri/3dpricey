/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
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
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Optimize chunks for better caching and faster loads
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - separate large libraries
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-utils': ['date-fns', 'clsx', 'class-variance-authority', 'tailwind-merge'],
        },
      },
    },
    // Use esbuild for minification (built-in, faster than terser)
    minify: 'esbuild',
    // Drop console in production
    esbuildOptions: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    // Disable source maps for production to reduce payload/analysis noise
    sourcemap: false,
    // Target modern browsers to avoid legacy polyfills (saves ~12KB)
    target: "es2022",
  },
  // Optimize dependencies
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
