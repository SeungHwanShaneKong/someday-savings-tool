// [CL-POKE-VIS-20260711-173901] useMyPartner — Summary 등 협업 훅 없는 페이지용 파트너 조회.
//   계약: 성공 → PartnerInfo, 에러/미배포 → null degrade, 무user → RPC 미호출, 동일 캐시 2훅 → RPC 1회.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeQueryClient } from '@/test/test-utils';
import { supabase } from '@/integrations/supabase/client';
import { useMyPartner } from '../useMyPartner';

// 무user 케이스를 위해 가변 auth 모킹
const authState = vi.hoisted(() => ({ user: { id: 'me-1' } as { id: string } | null }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: authState.user }) }));

const PARTNER_ROW = { user_id: 'p-1', display_name: '민지', email: 'p@example.com' };

function makeWrapper() {
  const queryClient = makeQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

beforeEach(() => {
  authState.user = { id: 'me-1' };
  vi.mocked(supabase.rpc).mockReset();
  vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as never);
});

describe('useMyPartner', () => {
  it('MP.1 성공 — get_my_partner 1행 → myPartner 매핑', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [PARTNER_ROW], error: null } as never);
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useMyPartner(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(supabase.rpc).toHaveBeenCalledWith('get_my_partner');
    expect(result.current.myPartner).toEqual({ user_id: 'p-1', display_name: '민지', email: 'p@example.com' });
  });

  it('MP.2 RPC 에러(미배포) → null degrade(throw 없음)', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'rpc not deployed' } } as never);
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useMyPartner(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.myPartner).toBeNull();
  });

  it('MP.3 빈 결과(파트너 없음) → null', async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useMyPartner(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.myPartner).toBeNull();
  });

  it('MP.4 무user → RPC 미호출(enabled:false)·null', async () => {
    authState.user = null;
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useMyPartner(), { wrapper });

    await Promise.resolve();
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(result.current.myPartner).toBeNull();
  });

  it('MP.5 동일 QueryClient 2훅 → RPC 1회(캐시 공유·staleTime 5분)', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [PARTNER_ROW], error: null } as never);
    const { wrapper } = makeWrapper();
    const first = renderHook(() => useMyPartner(), { wrapper });
    await waitFor(() => expect(first.result.current.myPartner).not.toBeNull());

    const second = renderHook(() => useMyPartner(), { wrapper });
    await waitFor(() => expect(second.result.current.myPartner).not.toBeNull());

    expect(vi.mocked(supabase.rpc)).toHaveBeenCalledTimes(1);
  });
});
