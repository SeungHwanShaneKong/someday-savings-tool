// [CL-TOP20-P4-COLLAB-20260703-040000] 파트너 최근 활동 칩 (Top 20 P4 #16 — 2인 협업 감성)
//
// BudgetFlow 공유(우리) 모드 헤더에서 "🖊 {파트너}님이 방금 편집했어요"를 최근 2분간 표시.
//  - 데이터 소스 = 기존 items(useMultipleBudgets)의 updated_at/last_edited_by 만 재사용.
//    실시간 변경도 realtimeApplier → items 갱신으로 자연 유입 — 신규 realtime 구독 0.
//  - maxUpdatedAt(items, myUserId) = '내 편집·미상(null) 제외' 최신 파트너 편집 시각(changed-since 재사용).
//  - 만료는 폴링이 아니라 남은 시간 setTimeout 1개로 결정론 처리(fake timer 검증 가능).
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { maxUpdatedAt, type HasIdUpdated } from '@/lib/collab/changed-since';

/** 칩 노출 윈도우 — 파트너 마지막 편집 후 2분 */
export const PARTNER_ACTIVITY_WINDOW_MS = 2 * 60 * 1000;

interface PartnerActivityChipProps {
  /** 활성 예산의 항목 스냅샷(실시간 반영 포함) */
  items: readonly HasIdUpdated[];
  /** 현재 사용자 id — 없으면(미인증) 항상 숨김(내 편집 오표시 0) */
  myUserId: string | null | undefined;
  /** 파트너 표시명 — 없으면 "파트너" 폴백 */
  partnerName: string | null | undefined;
  /** mode==='shared' && 파트너 존재 시에만 true — false 면 항상 숨김 */
  active: boolean;
  className?: string;
}

export function PartnerActivityChip({
  items,
  myUserId,
  partnerName,
  active,
  className,
}: PartnerActivityChipProps) {
  // 내 편집·편집자 미상(null) 제외한 최신 파트너 편집 시각(ISO). 미인증/비활성 → null.
  const latestPartnerEditAt = useMemo(
    () => (active && myUserId ? maxUpdatedAt(items, myUserId) : null),
    [items, myUserId, active],
  );

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!latestPartnerEditAt) {
      setVisible(false);
      return;
    }
    const editedMs = Date.parse(latestPartnerEditAt);
    if (Number.isNaN(editedMs)) {
      setVisible(false);
      return;
    }
    // 남은 노출 시간 = (편집시각 + 2분) - now. 시계 스큐(미래 updated_at)여도 최대 2분으로 클램프.
    const remaining = Math.min(
      editedMs + PARTNER_ACTIVITY_WINDOW_MS - Date.now(),
      PARTNER_ACTIVITY_WINDOW_MS,
    );
    if (remaining <= 0) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), remaining);
    return () => clearTimeout(timer);
  }, [latestPartnerEditAt]);

  if (!active || !visible) return null;

  const name = partnerName?.trim() || '파트너';
  return (
    <span
      role="status"
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5',
        'text-[11px] font-medium text-primary whitespace-nowrap',
        className,
      )}
    >
      <span aria-hidden="true">🖊</span>
      {name}님이 방금 편집했어요
    </span>
  );
}
