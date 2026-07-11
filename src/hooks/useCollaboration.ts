// [CL-COEDIT-E2E-20260620-130000] 공동 예산 협업 훅 — 초대 발급·협업자 목록·해제
//
// 오너가 초대 링크를 발급(budget_invitations insert → token)하고, 협업자 목록을 조회/해제한다.
// 수락은 AcceptInvite + accept_budget_invitation RPC 가 담당(별도). RLS 가 보안 경계.
// ※ 추가형 — 기존 훅 무수정. 단독사용자(협업 0) 영향 없음.
// [CL-PARTNER-1TO1-20260622-233012] 전역 1:1 파트너(myPartner·해지·자동공유) + [CL-ACQ-EMAIL] 파트너 이메일 표출.
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Collaborator {
  user_id: string;
  role: string;
  /** [CL-COEDIT-PARTICIPANTS-20260620] get_budget_participants RPC 의 표시명. 폴백 시 undefined → '파트너' 표시 */
  display_name?: string | null;
  /** [CL-ACQ-EMAIL-RPC-20260622-233012] 동일 예산 협업자에게만 노출되는 이메일(개선5). RPC v2 미배포 시 undefined */
  email?: string | null;
  /** 현재 사용자 본인 여부(목록에서 자기 자신 제외·표기에 사용) */
  isMe?: boolean;
}

/** [CL-PARTNER-1TO1-20260622-233012] 전역 1:1 현재 파트너(없으면 null) */
export interface PartnerInfo {
  user_id: string;
  display_name: string | null;
  email: string | null;
}

export interface UseCollaborationResult {
  collaborators: Collaborator[];
  inviteUrl: string | null;
  busy: boolean;
  /** 전역 1:1 현재 파트너(없으면 null) */
  myPartner: PartnerInfo | null;
  createInvite: () => Promise<string | null>;
  /** 공동관리자 해제 — Supabase delete error 검사 후 성공 여부 반환(형제 releasePartner 계약과 동일) */
  removeCollaborator: (userId: string) => Promise<boolean>;
  /** 파트너 해지 — 양방향 협업자 링크 제거(예산 본문은 소유자 보관). 성공 여부 반환 */
  releasePartner: () => Promise<boolean>;
  /** 새 우리 옵션을 현재 파트너에게 자동 공유(파트너 없으면 no-op). 성공 여부 반환(실패 시 호출측 폴백) */
  shareBudgetWithPartner: (budgetId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

// [CL-POKE-VIS-20260711-173901] 옵션 — 기본값(trackPartner:true)이 기존 시그니처/동작과 완전 동일(하위호환).
export interface UseCollaborationOptions {
  /** false 면 get_my_partner 조회를 생략(myPartner 항상 null). CollaboratorManager 가 external
   *  주입으로 비활성일 때 내부 인스턴스의 중복 RPC 발사를 근본 제거하기 위한 스위치. */
  trackPartner?: boolean;
}

export function useCollaboration(
  budgetId: string | null,
  opts?: UseCollaborationOptions,
): UseCollaborationResult {
  const trackPartner = opts?.trackPartner ?? true;
  const { user } = useAuth();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [myPartner, setMyPartner] = useState<PartnerInfo | null>(null);

  const refresh = useCallback(async () => {
    if (!budgetId) {
      setCollaborators([]);
      return;
    }
    // [CL-ACQ-EMAIL-RPC-20260622-233012] 1순위: 이메일 포함 RPC(개선5). 미배포/에러 시 단계적 폴백.
    const { data: withEmail, error: emailErr } = await supabase.rpc('get_budget_participants_email', {
      p_budget_id: budgetId,
    });
    if (!emailErr && Array.isArray(withEmail)) {
      setCollaborators(
        withEmail.map((p) => ({
          user_id: p.user_id,
          role: p.role,
          display_name: p.display_name,
          email: p.email,
          isMe: p.user_id === user?.id,
        })),
      );
      return;
    }
    // [CL-COEDIT-PARTICIPANTS-20260620] 2순위: 이름만 RPC. 3순위: budget_collaborators('파트너').
    const { data: participants, error: rpcError } = await supabase.rpc('get_budget_participants', {
      p_budget_id: budgetId,
    });
    if (!rpcError && Array.isArray(participants)) {
      setCollaborators(
        participants.map((p) => ({
          user_id: p.user_id,
          role: p.role,
          display_name: p.display_name,
          isMe: p.user_id === user?.id,
        })),
      );
      return;
    }
    const { data } = await supabase
      .from('budget_collaborators')
      .select('user_id, role')
      .eq('budget_id', budgetId);
    setCollaborators(
      ((data ?? []) as Array<{ user_id: string; role: string }>).map((r) => ({
        user_id: r.user_id,
        role: r.role,
        isMe: r.user_id === user?.id,
      })),
    );
  }, [budgetId, user?.id]);

  // [CL-PARTNER-1TO1-20260622-233012] 전역 파트너(user 단위) 조회. 미배포 RPC → null 강등.
  // [CL-POKE-VIS-20260711-173901] trackPartner:false → 조회 자체를 생략(중복 RPC 이중발사 근본수정).
  const refreshPartner = useCallback(async () => {
    if (!trackPartner) {
      setMyPartner(null);
      return;
    }
    if (!user) {
      setMyPartner(null);
      return;
    }
    const { data, error } = await supabase.rpc('get_my_partner');
    if (!error && Array.isArray(data) && data.length > 0) {
      const p = data[0];
      setMyPartner({ user_id: p.user_id, display_name: p.display_name, email: p.email });
    } else {
      setMyPartner(null);
    }
  }, [user?.id, trackPartner]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    void refreshPartner();
  }, [refreshPartner]);

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

  // [CL-BTNAUDIT3-20260704 | remove-err-check] delete error 미검사로 실패가 침묵되던 것을 근본수정 —
  //   형제 releasePartner/shareBudgetWithPartner 와 동일 계약(Promise<boolean>)으로 통일. 호출측이 토스트로 배선.
  const removeCollaborator = useCallback(
    async (userId: string): Promise<boolean> => {
      if (!budgetId) return false;
      const { error } = await supabase
        .from('budget_collaborators')
        .delete()
        .eq('budget_id', budgetId)
        .eq('user_id', userId);
      await refresh();
      await refreshPartner();
      return !error;
    },
    [budgetId, refresh, refreshPartner],
  );

  // [CL-PARTNER-1TO1-20260622-233012] 파트너 해지 — 양방향 링크 제거(예산 본문은 소유자 보관)
  const releasePartner = useCallback(async (): Promise<boolean> => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('release_partner');
      await refreshPartner();
      await refresh();
      const ok = !error && (data as { ok?: boolean } | null)?.ok !== false;
      return ok;
    } finally {
      setBusy(false);
    }
  }, [refresh, refreshPartner]);

  // [CL-PARTNER-1TO1-20260622-233012 / CL-AUDIT-R3-SHARE-20260623-000000] 새 우리 옵션을 현재 파트너에게 자동 공유.
  //   RPC 미배포/에러/not_owner 면 false 반환(이전엔 결과 미검사로 '공유됐다' 오인 → 침묵 실패). 파트너 없으면 ok=true(no-op).
  const shareBudgetWithPartner = useCallback(async (bId: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc('share_budget_with_partner', { p_budget_id: bId });
    return !error && (data as { ok?: boolean } | null)?.ok !== false;
  }, []);

  return {
    collaborators,
    inviteUrl,
    busy,
    myPartner,
    createInvite,
    removeCollaborator,
    releasePartner,
    shareBudgetWithPartner,
    refresh,
  };
}
