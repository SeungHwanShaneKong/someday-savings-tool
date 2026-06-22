// [CL-COEDIT-E2E-20260620-130000] 실시간 공동편집 동기화 훅 (우리 모드 전용)
//
// 활성 공유 예산의 budget_items 변경을 Supabase Realtime(postgres_changes)으로 수신해
// 완성된 충돌 엔진(src/lib/collab/conflict-resolution.ts)으로 머지한다.
//  - INSERT/UPDATE → decideItemUpsert(에코·stale 가드 + 필드 머지) → onUpsert
//  - DELETE        → onDelete(old.id)
// ※ 추가형. budgetId=null(개인 모드)이면 구독 안 함 → 개인 예산은 절대 실시간 동기화 안 됨(완전 분리).
// 구독 wiring 자체는 라이브 Supabase 필요(원격 검증). 머지 결정(resolveRealtimeEvent)은 순수=CI 검증.
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { decideItemUpsert, type PendingOp } from '@/lib/collab/conflict-resolution';

export type ItemRow = Record<string, unknown> & { id: string; updated_at: string };

export interface RealtimeContext {
  getLocal: (id: string) => ItemRow | undefined;
  pending: ReadonlyMap<string, PendingOp>;
  knownUpdatedAt: ReadonlyMap<string, string>;
  editingColumns?: (id: string) => Set<string>;
  /** [CL-AUDIT-ZOMBIE-TOMBSTONE-20260622-233012] 방금 삭제된 항목(TTL 내)이면 upsert 차단(좀비 부활 방지) */
  isTombstoned?: (id: string) => boolean;
}

export type RealtimeAction =
  | { type: 'upsert'; row: ItemRow }
  | { type: 'delete'; id: string }
  | { type: 'ignore' };

/** 순수: 실시간 이벤트 1건 → 적용 액션 결정(에코/stale 무시, 필드 머지, 삭제). CI 검증 대상. */
export function resolveRealtimeEvent(
  eventType: 'INSERT' | 'UPDATE' | 'DELETE',
  newRow: ItemRow | undefined,
  oldRow: Partial<ItemRow> | undefined,
  ctx: RealtimeContext,
): RealtimeAction {
  if (eventType === 'DELETE') {
    const id = oldRow?.id;
    return id ? { type: 'delete', id } : { type: 'ignore' };
  }
  if (!newRow) return { type: 'ignore' };
  const decision = decideItemUpsert(ctx.getLocal(newRow.id), newRow, {
    pending: ctx.pending,
    knownUpdatedAt: ctx.knownUpdatedAt.get(newRow.id),
    editingColumns: ctx.editingColumns?.(newRow.id),
    isTombstoned: ctx.isTombstoned,
  });
  return decision.action === 'ignore' ? { type: 'ignore' } : { type: 'upsert', row: decision.merged };
}

export interface RealtimeApplier extends RealtimeContext {
  onUpsert: (row: ItemRow) => void;
  onDelete: (id: string) => void;
  /** 채택한 행의 updated_at 을 기지값으로 갱신(다음 stale 게이트용) */
  setKnownUpdatedAt: (id: string, updatedAt: string) => void;
}

/**
 * 활성 공유 예산(budgetId)의 실시간 구독. budgetId=null 이면 구독 안 함.
 * applier 는 ref 로 보관해 매 렌더 재구독을 방지(budgetId 변경 시에만 재구독).
 */
export function useRealtimeBudget(budgetId: string | null, applier: RealtimeApplier): void {
  const applierRef = useRef(applier);
  applierRef.current = applier;

  useEffect(() => {
    if (!budgetId) return;
    type ChangePayload = { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: ItemRow; old?: Partial<ItemRow> };
    // supabase realtime .on('postgres_changes', ...) 오버로드 추론 우회(콜백 타입은 유지)
    type LooseChannel = {
      on: (type: string, filter: Record<string, unknown>, cb: (p: ChangePayload) => void) => LooseChannel;
    };
    const channel = supabase.channel(`budget:${budgetId}`);
    (channel as unknown as LooseChannel).on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'budget_items', filter: `budget_id=eq.${budgetId}` },
      (payload) => {
        const a = applierRef.current;
        const action = resolveRealtimeEvent(payload.eventType, payload.new, payload.old, a);
        if (action.type === 'upsert') {
          a.setKnownUpdatedAt(action.row.id, action.row.updated_at);
          a.onUpsert(action.row);
        } else if (action.type === 'delete') {
          a.onDelete(action.id);
        }
      },
    );
    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [budgetId]);
}
