// [CL-ANONVISIT-CLIENT-20260627-234656] 익명 방문 추적 게이트 검증.
//  - 비로그인(인증 확정): track-visit Edge invoke 1회(비식별 페이로드)
//  - 로그인: invoke 미호출(이중기록 방지)
//  - 실패: 무음(throw 0)
// [CL-AUDIT2-R2-AUTHGATE-20260628] auth-loading 윈도우 전환 회귀 가드(F2/F4):
//  인증 미확정(loading=true) 동안엔 절대 발사하지 않고, 확정 후 '정확히 한 경로'만 실행.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createElement, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePageTracking } from '@/hooks/usePageTracking';

const h = vi.hoisted(() => ({ user: null as { id: string } | null, loading: false }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: h.user, loading: h.loading }) }));

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(MemoryRouter, { initialEntries: ['/budget'] }, children);

const invokeMock = vi.mocked(supabase.functions.invoke);

function trackVisitCalls() {
  return invokeMock.mock.calls.filter((c) => c[0] === 'track-visit');
}

beforeEach(() => {
  h.user = null;
  h.loading = false;
  invokeMock.mockReset();
  invokeMock.mockResolvedValue({ data: null, error: null } as never);
});

describe('usePageTracking — 익명 방문 집계 게이트', () => {
  it('ANON.1 비로그인(확정) → track-visit 1회, 비식별 페이로드(user_id/is_synthetic 미전송)', async () => {
    h.user = null; h.loading = false;
    renderHook(() => usePageTracking(), { wrapper });
    await waitFor(() => expect(trackVisitCalls().length).toBe(1));

    const [, opts] = trackVisitCalls()[0] as [string, { body: Record<string, unknown> }];
    expect(opts.body.page_path).toBe('/budget');
    expect(typeof opts.body.session_id).toBe('string');
    expect(opts.body).not.toHaveProperty('user_id');
    expect(opts.body).not.toHaveProperty('is_synthetic');
  });

  it('ANON.2 로그인 → track-visit 미호출(이중기록 방지)', async () => {
    h.user = { id: 'user-123' }; h.loading = false;
    renderHook(() => usePageTracking(), { wrapper });
    await Promise.resolve();
    expect(trackVisitCalls().length).toBe(0);
  });

  it('ANON.3 invoke 실패 → throw 0(무음 degrade)', async () => {
    h.user = null; h.loading = false;
    invokeMock.mockRejectedValue(new Error('network'));
    expect(() => renderHook(() => usePageTracking(), { wrapper })).not.toThrow();
    await waitFor(() => expect(trackVisitCalls().length).toBe(1));
  });

  // [CL-AUDIT2-R2-AUTHGATE-20260628] F2/F4 회귀: 로그인 유저의 콜드로드(auth-loading) 시 익명 오집계 금지.
  it('ANON.4 auth-loading(로그인 유저) 전환: loading 동안 0, 확정 후에도 0', async () => {
    h.user = null; h.loading = true; // 인증 미확정
    const { rerender } = renderHook(() => usePageTracking(), { wrapper });
    await Promise.resolve();
    expect(trackVisitCalls().length).toBe(0); // 미확정 → 발사 보류

    h.user = { id: 'user-123' }; h.loading = false; // 로그인으로 확정
    rerender();
    await Promise.resolve();
    expect(trackVisitCalls().length).toBe(0); // 로그인 확정 → 익명 집계 금지(이중집계 차단)
  });

  // 진짜 익명: loading 동안 0, 확정(여전히 null) 후 정확히 1회.
  it('ANON.5 auth-loading(진짜 익명) 전환: 확정 후 1회만', async () => {
    h.user = null; h.loading = true;
    const { rerender } = renderHook(() => usePageTracking(), { wrapper });
    await Promise.resolve();
    expect(trackVisitCalls().length).toBe(0);

    h.loading = false; // user 여전히 null = 익명 확정
    rerender();
    await waitFor(() => expect(trackVisitCalls().length).toBe(1));
  });
});
