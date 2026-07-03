// [CL-TOP20-P2-HEADER-20260703-020000] AppHeader 테스트 — 라우트 노출 제어·브랜드·인증 상태별 액션.
// useAuth 는 컨벤션대로 파일 상단 vi.mock (AuthProvider 는 mount 시 Supabase 호출 → 미포함).
// ThemeToggle(next-themes)은 Provider 부재 시 기본 컨텍스트로 동작하므로 별도 mock 불필요.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderWithProviders, screen, within } from "@/test/test-utils";
import {
  AppHeader,
  APP_HEADER_ROUTES,
  isAppHeaderRoute,
} from "@/components/layout/AppHeader";

const h = vi.hoisted(() => ({
  auth: { user: null as { id: string } | null, loading: false },
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => h.auth }));

beforeEach(() => {
  h.auth = { user: null, loading: false };
});

describe("AppHeader — 노출 라우트 제어", () => {
  it("① '/' 에서 브랜드(웨딩셈)와 '시작하기' 버튼을 렌더한다 (비로그인)", () => {
    renderWithProviders(<AppHeader />, { route: "/" });

    const banner = screen.getByRole("banner");
    // 브랜드 워드마크 + 홈 링크
    const brand = within(banner).getByRole("link", { name: "웨딩셈" });
    expect(brand).toHaveAttribute("href", "/");
    expect(brand).toHaveAttribute("aria-current", "page");
    // 비로그인 → 시작하기(/auth)
    const cta = within(banner).getByRole("link", { name: "시작하기" });
    expect(cta).toHaveAttribute("href", "/auth");
    // 테마 토글 동거
    expect(
      within(banner).getByRole("button", { name: "다크 모드 전환" }),
    ).toBeInTheDocument();
    // 로그인 전용 액션은 없음
    expect(
      within(banner).queryByRole("link", { name: "내 예산" }),
    ).not.toBeInTheDocument();
  });

  it("② '/budget' 등 허용 목록 밖 라우트에서는 아무것도 렌더하지 않는다 (null)", () => {
    renderWithProviders(<AppHeader />, { route: "/budget" });
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(screen.queryByText("웨딩셈")).not.toBeInTheDocument();
  });

  it("③ 로그인 상태에서는 '내 예산'(/budget)과 프로필 링크를 노출하고 '시작하기'는 숨긴다", () => {
    h.auth = { user: { id: "u-1" }, loading: false };
    renderWithProviders(<AppHeader />, { route: "/" });

    const banner = screen.getByRole("banner");
    expect(
      within(banner).getByRole("link", { name: "내 예산" }),
    ).toHaveAttribute("href", "/budget");
    expect(
      within(banner).getByRole("link", { name: "프로필" }),
    ).toHaveAttribute("href", "/profile");
    expect(
      within(banner).queryByRole("link", { name: "시작하기" }),
    ).not.toBeInTheDocument();
  });

  it("④ '/guide/:slug' 하위 경로(trailing-slash 포함)에서도 렌더한다", () => {
    renderWithProviders(<AppHeader />, { route: "/guide/2026-wedding-cost/" });
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByText("웨딩셈")).toBeInTheDocument();
  });

  it("인증 판별 전(loading)에는 테마 토글만 남기고 인증 액션을 렌더하지 않는다", () => {
    h.auth = { user: null, loading: true };
    renderWithProviders(<AppHeader />, { route: "/" });

    const banner = screen.getByRole("banner");
    expect(
      within(banner).getByRole("button", { name: "다크 모드 전환" }),
    ).toBeInTheDocument();
    expect(
      within(banner).queryByRole("link", { name: "시작하기" }),
    ).not.toBeInTheDocument();
    expect(
      within(banner).queryByRole("link", { name: "내 예산" }),
    ).not.toBeInTheDocument();
  });

  it("'/auth' 에서는 '시작하기' 링크에 aria-current=page 가 부여된다", () => {
    renderWithProviders(<AppHeader />, { route: "/auth" });
    const cta = within(screen.getByRole("banner")).getByRole("link", {
      name: "시작하기",
    });
    expect(cta).toHaveAttribute("aria-current", "page");
  });
});

describe("isAppHeaderRoute — 허용 목록 판정 (순수 함수)", () => {
  it("APP_HEADER_ROUTES 전체와 trailing-slash 변형을 허용한다", () => {
    for (const route of APP_HEADER_ROUTES) {
      expect(isAppHeaderRoute(route), route).toBe(true);
      // 프리렌더 trailing-slash canonical 호환 ('/'는 그 자체)
      const slashed = route === "/" ? "/" : `${route}/`;
      expect(isAppHeaderRoute(slashed), slashed).toBe(true);
    }
    expect(isAppHeaderRoute("/guide/some-slug")).toBe(true);
    expect(isAppHeaderRoute("/guide/some-slug/")).toBe(true);
  });

  it("자체 헤더 보유 라우트·유사 접두 라우트는 차단한다", () => {
    for (const blocked of [
      "/budget",
      "/checklist",
      "/chat",
      "/summary",
      "/admin",
      "/profile",
      "/invite/abc",
      "/shared/xyz",
      "/guidebook", // 접두 유사 경로 오탐 방지
      "/authx",
    ]) {
      expect(isAppHeaderRoute(blocked), blocked).toBe(false);
    }
  });

  // [CL-TOP20-P2-VERIFY-20260703-031500] 독립검증 관찰 3 반영 — /demo 제외(전용 전환 헤더 우선, PM 결정) 회귀 가드
  it("/demo 는 전용 전환 헤더가 우선이므로 전역 헤더 비표시", () => {
    expect(isAppHeaderRoute("/demo")).toBe(false);
    expect(isAppHeaderRoute("/demo/")).toBe(false);
  });
});
