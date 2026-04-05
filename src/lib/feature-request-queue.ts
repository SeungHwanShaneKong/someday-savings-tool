/**
 * [CL-ADMIN-FEATURE-REQ-20260403] 오프라인 기능 요청 큐 flush
 * 앱 로드 시 localStorage에 쌓인 요청을 Supabase로 전송
 */

import { supabase } from '@/integrations/supabase/client';

interface QueuedRequest {
  user_id: string | null;
  content: string;
  category: string | null;
  queued_at: string;
}

export async function flushFeatureRequestQueue(): Promise<void> {
  const raw = localStorage.getItem('feature_request_queue');
  if (!raw) return;

  let queue: QueuedRequest[];
  try {
    queue = JSON.parse(raw);
  } catch {
    localStorage.removeItem('feature_request_queue');
    return;
  }

  if (queue.length === 0) return;

  const remaining: QueuedRequest[] = [];

  for (const item of queue) {
    const { error } = await (supabase as any)
      .from('feature_requests')
      .insert({
        user_id: item.user_id,
        content: item.content,
        category: item.category,
      });

    if (error) {
      remaining.push(item);
    }
  }

  if (remaining.length > 0) {
    localStorage.setItem('feature_request_queue', JSON.stringify(remaining));
  } else {
    localStorage.removeItem('feature_request_queue');
  }
}
