// [CL-TOP20-P2-HEADER-20260703-020000] AppHeader — 전역 스티키 헤더 (Top 20 로드맵 P2-#7).
// 노출 라우트 제어가 핵심: props 가 아니라 내부 useLocation() 으로 판단한다.
// 허용 목록(APP_HEADER_ROUTES) 밖의 라우트(/budget·/checklist·/chat·/summary·/admin·/profile·
// /invite·/shared 등)는 자체 스티키 헤더가 있어 이중 스택 방지를 위해 null 을 반환한다
// (개별 페이지 헤더의 전역 헤더 위임은 후속 Phase).
// 전제: AuthProvider(useAuth)·Router(useLocation) 안쪽에 마운트되어야 한다 — 통합은 PM 수행.
import { Link, useLocation } from "react-router-dom";
import { User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { WeddingMark } from "@/components/landing/WeddingMark";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

/**
 * 전역 헤더를 표시하는 라우트 허용 목록.
 * '/guide' 는 하위 아티클(/guide/:slug)까지 포함해 매칭한다(isAppHeaderRoute 참조).
 */
export const APP_HEADER_ROUTES = [
  "/",
  // [CL-TOP20-P2-HEADER-20260703-023500] /demo 제외(PM 결정) — 전용 전환 헤더(가입 CTA 스티키)가 우선
  "/guide",
  "/faq",
  "/privacy",
  "/terms",
  "/about",
  "/contact",
  "/editorial",
  "/auth",
] as const;

/**
 * 현재 pathname 이 전역 헤더 표시 대상인지 판단.
 * 프리렌더 라우트는 trailing-slash canonical(/guide/, /faq/ 등)로 진입할 수 있으므로
 * 끝 슬래시를 정규화한 뒤 비교한다. '/guide/…' 하위 경로는 아티클로 간주해 허용.
 */
// eslint-disable-next-line react-refresh/only-export-components -- 스펙 요구: 허용 목록 판정을 테스트 가능한 순수 함수로 export (HMR 영향 없음)
export function isAppHeaderRoute(pathname: string): boolean {
  const trimmed = pathname.replace(/\/+$/, "");
  const normalized = trimmed === "" ? "/" : trimmed;
  if ((APP_HEADER_ROUTES as readonly string[]).includes(normalized)) return true;
  return normalized.startsWith("/guide/");
}

export function AppHeader() {
  const location = useLocation();
  const { user, loading } = useAuth();

  if (!isAppHeaderRoute(location.pathname)) return null;

  /** 현재 위치와 일치하는 내비 링크에 aria-current="page" 부여 (trailing-slash 정규화 동일 적용) */
  const currentFor = (to: string): "page" | undefined => {
    const trimmed = location.pathname.replace(/\/+$/, "");
    const normalized = trimmed === "" ? "/" : trimmed;
    return normalized === to ? "page" : undefined;
  };

  return (
    <header
      role="banner"
      className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-sm"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        {/* [좌] 브랜드 — 마크는 장식(aria-hidden), 접근 가능한 이름은 워드마크 텍스트가 제공 */}
        <Link
          to="/"
          aria-current={currentFor("/")}
          className="flex items-center gap-2 rounded-md text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <WeddingMark size={26} className="text-primary" />
          <span className="text-lg font-bold tracking-tight">웨딩셈</span>
        </Link>

        {/* [우] 테마 토글 + 로그인 상태별 액션 */}
        <nav aria-label="전역 메뉴" className="flex items-center gap-1.5">
          <ThemeToggle />
          {/* 인증 판별 전(loading)에는 액션을 비워 잘못된 상태 플래시를 방지 */}
          {!loading &&
            (user ? (
              <>
                <Button asChild size="sm">
                  <Link to="/budget" aria-current={currentFor("/budget")}>
                    내 예산
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="icon">
                  <Link
                    to="/profile"
                    aria-label="프로필"
                    aria-current={currentFor("/profile")}
                  >
                    <User className="h-5 w-5" aria-hidden="true" />
                  </Link>
                </Button>
              </>
            ) : (
              <Button asChild size="sm">
                <Link to="/auth" aria-current={currentFor("/auth")}>
                  시작하기
                </Link>
              </Button>
            ))}
        </nav>
      </div>
    </header>
  );
}
