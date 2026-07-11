// [CL-POKE-VIS-20260711-173901] '협업 훅이 없는 페이지'(Summary 등)용 전역 1:1 파트너 조회.
//
// 계약: useCollaboration.refreshPartner 와 동일 — get_my_partner RPC 미배포/에러 → null degrade(앱 무영향).
// React Query 캐시(['my-partner', userId], staleTime 5분)로 같은 화면에서 여러 번 사용해도 RPC 1회.
// queryFn 은 절대 throw 하지 않으므로 retry 폭주 없음(에러도 null 로 수렴).
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { PartnerInfo } from '@/hooks/useCollaboration';

export interface UseMyPartnerResult {
  myPartner: PartnerInfo | null;
  isLoading: boolean;
}

export function useMyPartner(): UseMyPartnerResult {
  const { user } = useAuth();

  const { data, isLoading } = useQuery<PartnerInfo | null>({
    queryKey: ['my-partner', user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<PartnerInfo | null> => {
      try {
        const { data: rows, error } = await supabase.rpc('get_my_partner');
        if (!error && Array.isArray(rows) && rows.length > 0) {
          const p = rows[0];
          return { user_id: p.user_id, display_name: p.display_name, email: p.email };
        }
      } catch {
        // RPC 미배포/네트워크 예외 — null degrade(refreshPartner 와 동일 계약)
      }
      return null;
    },
  });

  return { myPartner: data ?? null, isLoading };
}
