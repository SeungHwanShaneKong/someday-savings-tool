import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  define: {
    // Fallback: ensure Supabase env vars are always available
    ...(process.env.VITE_SUPABASE_URL ? {} : {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify("https://tnboeqtdimyxpjzsraro.supabase.co"),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuYm9lcXRkaW15eHBqenNyYXJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyMzE4MDcsImV4cCI6MjA4NDgwNzgwN30.vW3bVRKZ91key-JpysigzC96qa96DqqFE47CLs6Nhj0"),
      'import.meta.env.VITE_SUPABASE_PROJECT_ID': JSON.stringify("tnboeqtdimyxpjzsraro"),
    }),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core vendor chunk (React, React-DOM, Router)
          'vendor-core': [
            'react',
            'react-dom',
            'react-router-dom',
          ],
          // UI library chunk (Radix + Lucide)
          'vendor-ui': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-popover',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-progress',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-switch',
            '@radix-ui/react-label',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            'lucide-react',
          ],
          // Data & utility chunk
          'vendor-data': [
            '@tanstack/react-query',
            '@supabase/supabase-js',
          ],
          // Map library (MapLibre GL)
          'vendor-map': [
            'maplibre-gl',
          ],
          // Chart library (heavy)
          'vendor-chart': [
            'recharts',
          ],
        },
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
}));
