// [CL-COEDIT-E2E-20260620-130000] 공동 예산 협업 훅 — 초대 발급·협업자 목록·해제
//
// 오너가 초대 링크를 발급(budget_invitations insert → token)하고, 협업자 목록을 조회/해제한다.
// 수락은 AcceptInvite + accept_budget_invitation RPC 가 담당(별도). RLS 가 보안 경계.
// ※ 추가형 — 기존 훅 무수정. 단독사용자(협업 0) 영향 없음.
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Collaborator {
  user_id: string;
  role: string;
}

export interface UseCollaborationResult {
  collaborators: Collaborator[];
  inviteUrl: string | null;
  busy: boolean;
  createInvite: () => Promise<string | null>;
  removeCollaborator: (userId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useCollaboration(budgetId: string | null): UseCollaborationResult {
  const { user } = useAuth();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!budgetId) {
      setCollaborators([]);
      return;
    }
    const { data } = await supabase
      .from('budget_collaborators')
      .select('user_id, role')
      .eq('budget_id', budgetId);
    setCollaborators((data ?? []) as Collaborator[]);
  }, [budgetId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createInvite = useCallback(async (): Promise<string | null> => {
    if (!budgetId || !user) return null;
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from('budget_invitations')
        .insert({ budget_id: budgetId, invited_by: user.id, role: 'editor', email: '' })
        .select('token')
        .single();
      let token = (data as { token?: string } | null)?.token;
      // [CL-COEDIT-E2E-20260620-130000] 멱등 재초대: 이 예산에 이미 초대가 있으면(UNIQUE 409)
      //  기존 행을 pending + 만료 7일 연장으로 **갱신**해 항상 사용 가능한 링크를 반환.
      //  (단순 재노출이면 옛 expired/accepted 토큰을 줘 수락 실패 → E2E 가 발견. refresh 가 정답.)
      if (!token && error) {
        const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: refreshed } = await supabase
          .from('budget_invitations')
          .update({ status: 'pending', expires_at: sevenDays })
          .eq('budget_id', budgetId)
          .eq('email', '')
          .select('token');
        token = (refreshed as Array<{ token?: string }> | null)?.[0]?.token;
      }
      if (!token) return null;
      const url = `${window.location.origin}/invite/${token}`;
      setInviteUrl(url);
      return url;
    } finally {
      setBusy(false);
    }
  }, [budgetId, user]);

  const removeCollaborator = useCallback(
    async (userId: string) => {
      if (!budgetId) return;
      await supabase
        .from('budget_collaborators')
        .delete()
        .eq('budget_id', budgetId)
        .eq('user_id', userId);
      await refresh();
    },
    [budgetId, refresh],
  );

  return { collaborators, inviteUrl, busy, createInvite, removeCollaborator, refresh };
}
