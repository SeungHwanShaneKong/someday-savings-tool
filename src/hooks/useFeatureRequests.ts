/**
 * [CL-ADMIN-FEATURE-REQ-20260403] Admin용 기능 요청 조회 hook
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FeatureRequest {
  id: string;
  user_id: string | null;
  content: string;
  category: string | null;
  created_at: string;
}

export function useFeatureRequests() {
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('feature_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (err) throw err;
      setRequests((data as FeatureRequest[]) || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '기능 요청을 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  return { requests, loading, error, fetchRequests };
}
