// [CL-TOP20-P2-HEADER-20260703-020000] ThemeToggle — light/dark 2단 토글 (Top 20 로드맵 P2-#8).
// next-themes(^0.3.0) useTheme 재사용 — 컨벤션은 src/components/ui/sonner.tsx 참조.
// Provider 부재 시 next-themes 는 { setTheme: no-op, themes: [] } 기본 컨텍스트를 반환하므로
// theme/resolvedTheme 이 undefined 여도 크래시 없이 라이트 기준으로 동작한다(가드: ?? 폴백 + === 비교).
// 아이콘 전환은 dark: CSS 클래스 기반(JS 상태 비의존 → 프리렌더/첫 페인트 안전),
// transition 은 Tailwind transition-transform + motion-reduce:transition-none 만 사용
// (index.css 의 prefers-reduced-motion 규칙은 특정 animate-* 클래스 대상이라 충돌 없음).
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  // system 옵션은 생략(2단 토글 단순화) — 단, ThemeProvider 기본값이 system 인 경우를 대비해
  // resolvedTheme(실효 테마)을 우선 판독한다. Provider 부재 시 둘 다 undefined → 라이트 취급.
  const isDark = (resolvedTheme ?? theme) === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="relative"
      aria-label="다크 모드 전환"
      aria-pressed={isDark}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <Sun
        aria-hidden="true"
        className="h-5 w-5 rotate-0 scale-100 transition-transform duration-300 motion-reduce:transition-none dark:-rotate-90 dark:scale-0"
      />
      <Moon
        aria-hidden="true"
        className="absolute h-5 w-5 rotate-90 scale-0 transition-transform duration-300 motion-reduce:transition-none dark:rotate-0 dark:scale-100"
      />
    </Button>
  );
}
