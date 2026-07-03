// [CL-TOP20-P2-HEADER-20260703-020000] ThemeToggle 테스트 — Provider 부재 가드·setTheme 토글·aria 상태.
// next-themes 는 부분 스위처블 mock: h.impl 미설정 시 실제 useTheme(Provider 부재 기본 컨텍스트) 사용,
// 설정 시 해당 구현으로 대체 — 한 파일에서 실물/모의 시나리오를 모두 커버한다.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

type UseThemeStub = {
  theme?: string;
  resolvedTheme?: string;
  themes: string[];
  setTheme: (theme: string) => void;
};

const h = vi.hoisted(() => ({
  impl: null as (() => unknown) | null,
}));

vi.mock("next-themes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-themes")>();
  return {
    ...actual,
    useTheme: () => (h.impl ? h.impl() : actual.useTheme()),
  };
});

beforeEach(() => {
  h.impl = null;
});

function stub(overrides: Partial<UseThemeStub> = {}): UseThemeStub {
  return { themes: ["light", "dark"], setTheme: vi.fn(), ...overrides };
}

describe("ThemeToggle", () => {
  it("① ThemeProvider 부재 시에도 크래시 없이 렌더·클릭된다 (기본 컨텍스트 가드)", () => {
    // h.impl = null → 실제 next-themes useTheme, Provider 없음 → { setTheme: no-op, themes: [] }
    render(<ThemeToggle />);

    const button = screen.getByRole("button", { name: "다크 모드 전환" });
    expect(button).toBeInTheDocument();
    // theme/resolvedTheme undefined → 라이트 취급
    expect(button).toHaveAttribute("aria-pressed", "false");
    // no-op setTheme 클릭도 크래시 없음
    expect(() => fireEvent.click(button)).not.toThrow();
  });

  it("② 라이트 상태에서 클릭하면 setTheme('dark') 를 호출한다", () => {
    const setTheme = vi.fn();
    h.impl = () => stub({ theme: "light", resolvedTheme: "light", setTheme });
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button", { name: "다크 모드 전환" }));
    expect(setTheme).toHaveBeenCalledTimes(1);
    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("②-역방향 다크 상태에서 클릭하면 setTheme('light') 를 호출한다", () => {
    const setTheme = vi.fn();
    h.impl = () => stub({ theme: "dark", resolvedTheme: "dark", setTheme });
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button", { name: "다크 모드 전환" }));
    expect(setTheme).toHaveBeenCalledWith("light");
  });

  it("③ aria 상태 — 다크면 aria-pressed=true, 라이트면 false, 레이블 고정", () => {
    h.impl = () => stub({ theme: "dark", resolvedTheme: "dark" });
    const { unmount } = render(<ThemeToggle />);
    let button = screen.getByRole("button", { name: "다크 모드 전환" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAttribute("aria-label", "다크 모드 전환");
    unmount();

    h.impl = () => stub({ theme: "light", resolvedTheme: "light" });
    render(<ThemeToggle />);
    button = screen.getByRole("button", { name: "다크 모드 전환" });
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("③-보강 system 테마여도 resolvedTheme 이 dark 면 눌린 상태로 표시한다", () => {
    h.impl = () => stub({ theme: "system", resolvedTheme: "dark" });
    render(<ThemeToggle />);
    expect(
      screen.getByRole("button", { name: "다크 모드 전환" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
