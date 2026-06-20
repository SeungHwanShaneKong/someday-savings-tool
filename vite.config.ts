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
    // [CL-DBSWITCH-20260620] 메인 DB 전환: Lovable 관리(tnboeqtdimyxpjzsraro) → 자가 소유(pnfjwsugsdyzyahrants).
    // 구 유저 UUID·구글 신원(auth.identities) 보존 이전 완료 후 전환. anon 키는 공개라 클라 코드에 안전.
    ...(process.env.VITE_SUPABASE_URL ? {} : {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify("https://pnfjwsugsdyzyahrants.supabase.co"),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuZmp3c3Vnc2R5enlhaHJhbnRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5MzA2NTAsImV4cCI6MjA5NzUwNjY1MH0.Lk6BGwhOEee251lyBYloa6FScU_Xu-pjkJFrU4CkItU"),
      'import.meta.env.VITE_SUPABASE_PROJECT_ID': JSON.stringify("pnfjwsugsdyzyahrants"),
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
          // [CL-PERF-DEPS-20260418-230000] vendor-map 제거 (maplibre 미사용)
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
