// [CL-QUALITY-CHUNK-20260621] lazy 청크 로드 실패 복구 회귀 가드 — 실패 시 화이트스크린 아닌 경계 폴백.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';

afterEach(() => {
  try { sessionStorage.clear(); } catch { /* noop */ }
});

describe('lazyWithRetry', () => {
  it('LZ.1 정상 모듈 로드', async () => {
    const Ok = lazyWithRetry(async () => ({ default: () => <div>로드됨</div> }), {
      routeId: 'ok', reloadOnFail: false,
    });
    render(<Suspense fallback={<div>loading</div>}><Ok /></Suspense>);
    expect(await screen.findByText('로드됨')).toBeInTheDocument();
  });

  it('LZ.2 청크 로드 실패(404) → 경계 복구 UI(화이트스크린 방지)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Bad = lazyWithRetry(() => Promise.reject(new Error('Failed to fetch dynamically imported module')), {
      routeId: 'bad', retries: 0, reloadOnFail: false,
    });
    render(
      <AppErrorBoundary>
        <Suspense fallback={<div>loading</div>}><Bad /></Suspense>
      </AppErrorBoundary>,
    );
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    spy.mockRestore();
  });
});
