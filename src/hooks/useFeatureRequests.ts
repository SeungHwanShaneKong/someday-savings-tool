/**
 * [CL-ADMIN-FEATURE-REQ-20260403] Admin용 기능 요청 조회 hook
 * [CL-ADMIN-RQ-MIGRATION-20260627-234656] 수동 state → React Query 준실시간 폴링(ADMIN_PANEL).
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ADMIN_PANEL } from '@/hooks/admin/adminQueryConfig';

export interface FeatureRequest {
  id: string;
  user_id: string | null;
  content: string;
  category: string | null;
  created_at: string;
}

export function useFeatureRequests(enabled = true) {
  const q = useQuery({
    queryKey: ['admin', 'featureRequests'],
    queryFn: async (): Promise<FeatureRequest[]> => {
      const { data, error: err } = await (supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            order: (c: string, o: { ascending: boolean }) => {
              limit: (n: number) => Promise<{ data: unknown; error: unknown }>;
            };
          };
        };
      })
        .from('feature_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (err) throw err;
      return ((data as FeatureRequest[]) || []);
    },
    enabled,
    ...ADMIN_PANEL,
  });
  return {
    requests: q.data ?? [],
    loading: q.isLoading,
    error: q.error ? (q.error instanceof Error ? q.error.message : '기능 요청을 불러올 수 없습니다') : null,
    fetchRequests: async () => { await q.refetch(); },
  };
}
