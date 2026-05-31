/**
 * [CL-QA100-BTN-20260531] 공용 테스트 하네스 — 100 MECE 버튼/상호작용 테스트 기반
 *
 * - renderWithProviders: MemoryRouter + QueryClient + TooltipProvider 래핑
 * - routePath 옵션: useParams를 쓰는 페이지(예: Article /guide/:slug) 지원
 * - LocationProbe: 항상 현재 pathname을 data-testid="loc"로 노출 → navigate() 검증
 * - 네비게이션 검증 2패턴: ①<Link>는 href 속성 단언 ②navigate()는 클릭 후 loc 단언
 *
 * 주의: AuthProvider는 mount 시 Supabase를 호출하므로 포함하지 않는다.
 *       useAuth가 필요한 컴포넌트는 테스트 파일에서 `vi.mock('@/hooks/useAuth', ...)`로 모킹할 것.
 */
import { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';

/** 현재 라우터 위치를 항상 노출하는 프로브 (navigate 검증용) */
export function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="loc" data-search={loc.search}>{loc.pathname}</div>;
}

/** 격리된 QueryClient (테스트간 캐시 오염 방지, retry off) */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface ProviderOptions extends Omit<RenderOptions, 'wrapper'> {
  /** 초기 경로 (기본 '/') */
  route?: string;
  /** useParams가 필요한 컴포넌트를 Routes로 감쌀 때의 경로 패턴 (예: '/guide/:slug') */
  routePath?: string;
}

/**
 * 프로바이더로 감싼 render. 반환값은 RTL render 결과 + queryClient.
 * @example
 *   renderWithProviders(<NotFound />, { route: '/x' });
 *   renderWithProviders(<Article />, { route: '/guide/2026-wedding-cost/', routePath: '/guide/:slug' });
 */
export function renderWithProviders(ui: ReactElement, options: ProviderOptions = {}) {
  const { route = '/', routePath, ...rtl } = options;
  const queryClient = makeQueryClient();

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={0}>
        <MemoryRouter initialEntries={[route]}>
          {routePath ? (
            <Routes>
              <Route path={routePath} element={children as ReactElement} />
              <Route path="*" element={<div data-testid="other-route" />} />
            </Routes>
          ) : (
            children
          )}
          <LocationProbe />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );

  return {
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...rtl }),
  };
}

/** 현재 pathname 헬퍼 */
export function currentPath(): string {
  return document.querySelector('[data-testid="loc"]')?.textContent ?? '';
}

// RTL 전체 재노출 (테스트 파일에서 한 곳에서 import)
export * from '@testing-library/react';
