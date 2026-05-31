import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  // [CL-QA100-BTN-20260531] Supabase 클라이언트가 모듈 로드 시 createClient(env) 를 호출하므로
  // vite.config 의 define 폴백을 테스트 환경에도 동일 주입 (없으면 "supabaseUrl is required" 크래시).
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://tnboeqtdimyxpjzsraro.supabase.co"),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify("test-anon-key"),
    "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify("tnboeqtdimyxpjzsraro"),
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // [CL-QA100-BTN-20260531] Windows 안정화: 멀티 fork + 대용량 heap 조합이 IPC/OOM 크래시 유발.
    // 단일 fork로 직렬 실행 → 메모리 안정 (NODE_OPTIONS 대용량 heap 불필요).
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
