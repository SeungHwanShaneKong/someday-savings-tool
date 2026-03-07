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
        // [VITE-CHUNK-FIX-20260308-021800] 순환 의존성 해결 — vendor-data ↔ vendor-ui
        // 순환 참조로 React.createContext undefined 에러 발생.
        // React 코어 + UI + 데이터 라이브러리를 단일 vendor 청크로 통합하여
        // 모듈 초기화 순서 문제를 근본적으로 해결. vendor-chart, vendor-map은 독립적이므로 분리 유지.
        manualChunks: {
          // 통합 vendor 청크 (React + Router + Radix + Lucide + Query + Supabase)
          'vendor': [
            'react',
            'react-dom',
            'react-router-dom',
            '@tanstack/react-query',
            '@supabase/supabase-js',
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
          // Map library (MapLibre GL — heavy, 독립적)
          'vendor-map': [
            'maplibre-gl',
          ],
          // Chart library (Recharts — heavy, 독립적)
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
