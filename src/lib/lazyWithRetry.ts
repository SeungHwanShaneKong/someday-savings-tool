// [CL-QUALITY-CHUNK-20260621] lazy() 청크 로드 실패 복구 래퍼.
//
// 문제: GitHub Pages 재배포 시 이미 열린 클라이언트의 캐시된 index.html 이 옛 해시 청크를 참조 →
//   라우트 이동 시 import() 가 404 reject(ChunkLoadError) → Suspense 는 reject 를 처리 못해
//   Error Boundary 가 없으면 화이트스크린/무한 스피너.
// 해결(근본): 짧은 백오프 재시도(일시 네트워크 블립) → 최종 실패 시 새 index.html 을 받기 위해
//   1회 reload(sessionStorage 가드로 무한 reload 차단). 성공 로드 시 가드 해제. reload 도 막히면(가드 설정됨)
//   throw 하여 상위 AppErrorBoundary 가 복구 UI 제공. = Suspense(로딩)+재시도+reload+경계 3단 방어.
import { lazy, type ComponentType } from 'react';

interface RetryOpts {
  routeId?: string;
  retries?: number;
  reloadOnFail?: boolean;
}

// React.lazy 와 동일하게 임의 props 컴포넌트를 허용(StaticPage 등 props 라우트 포함).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  opts: RetryOpts = {},
) {
  const { routeId = 'route', retries = 1, reloadOnFail = true } = opts;
  return lazy(async () => {
    const key = `chunk-reload:${routeId}`;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const mod = await factory();
        try { sessionStorage.removeItem(key); } catch { /* storage 불가 — noop */ }
        return mod;
      } catch (err) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 400)); // 짧은 백오프 후 재시도
          continue;
        }
        // 최종 실패: 재배포로 인한 stale 청크면 새 index.html 1회 reload 로 해소
        if (reloadOnFail) {
          try {
            if (!sessionStorage.getItem(key)) {
              sessionStorage.setItem(key, String(Date.now()));
              window.location.reload();
              return await new Promise<{ default: T }>(() => {}); // reload 중 — 보류
            }
          } catch { /* storage 불가 — 경계 폴백으로 위임 */ }
        }
        throw err; // 가드 설정됨/재시도 소진 → AppErrorBoundary 가 복구 UI
      }
    }
    throw new Error('lazyWithRetry: unreachable');
  });
}
