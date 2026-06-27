// [CL-ADMIN-RQ-MIGRATION-20260627-234656] Admin 전용 React Query freshness 프리셋.
//
// 배경: 전역 QueryClient(App.tsx)는 staleTime 5분 + refetchOnWindowFocus:false(일반 페이지 최적).
//   관리자 대시보드는 '준실시간'이 필요 → 쿼리별로 아래 프리셋을 spread 해 override.
// 스마트 폴링: refetchIntervalInBackground:false(탭 숨김 시 폴링 자동 정지) + refetchOnWindowFocus:true
//   (탭 복귀 즉시 갱신) = 과거 Admin.tsx 의 setInterval + visibilitychange 수동 플러밍을 RQ 네이티브로 대체.

/** 무거운 집계(코어 KPI: profiles/page_views/budgets/items + RPC들).
 *  [CL-AUDIT2-R5-PERF-20260628] 30s — 풀-테이블 페치+클라 집계를 20s로 돌리면 기존(30s) 대비 +50% 부하(F6/F8).
 *  히스토리성 KPI는 30s로 충분하고, refetchOnWindowFocus 로 탭 복귀 시 즉시 갱신해 '준실시간' 체감 유지. */
export const ADMIN_HEAVY = {
  staleTime: 15_000,
  refetchInterval: 30_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchIntervalInBackground: false,
  retry: 1,
  gcTime: 5 * 60_000,
} as const;

/** 가벼운 단건 RPC/쿼리. 15s. */
export const ADMIN_LIGHT = {
  staleTime: 15_000,
  refetchInterval: 15_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchIntervalInBackground: false,
  retry: 1,
  gcTime: 5 * 60_000,
} as const;

/** Edge 함수 패널(RAG/성능/기능요청). 30~60s(비용·부하 절약). */
export const ADMIN_PANEL = {
  staleTime: 30_000,
  refetchInterval: 45_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchIntervalInBackground: false,
  retry: 1,
  gcTime: 5 * 60_000,
} as const;
