// [CL-READ-UX-20260706-211320] 공유 편집자 배지 — 파트너 "변경"(transient·amber) / "최근:"(정적·muted) 상호배타.
//   BudgetTable(데스크톱)·BudgetTableMobile(모바일)의 복붙 배지를 단일화 + 닉네임 길이 제한(과다 폭·이름 잠식 방지).
//   ⚠️ 텍스트 노드 계약 보존: "{닉네임} 변경"·"최근: {라벨}" 을 직계 텍스트로 유지 → 기존 getByText 계약 불변.
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getEditorLabel } from '@/lib/collab/editor-label';

/**
 * 배지에 표시할 닉네임 길이 제한 — max(기본 8자) 초과 시 …로 축약(좁은 화면 폭 잠식·항목명 겹침 방지).
 * '나'·'파트너' 같은 짧은 라벨은 무영향. 하드 char 컷이라 결정론적·테스트 가능.
 */
export function capNickname(name: string, max = 8): string {
  const s = name.trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

export interface EditorChangeBadgeProps {
  /** changedItemIds 에 포함(최근 파트너 변경분) → amber 승격 배지 */
  changed: boolean;
  partnerName?: string | null;
  lastEditedBy?: string | null;
  myUserId?: string | null;
  /** 공동편집 모드에서만 정적 "최근:" 배지 표시 */
  showEditorLabels?: boolean;
  /** transient 배지에 병기할 상대시간("방금"/"N분 전") — 없으면 생략 */
  changedAgo?: string | null;
  className?: string;
}

/** 항목 최근 편집자/변경 배지(단일 슬롯 상호배타). 표시할 게 없으면 null. */
export function EditorChangeBadge({
  changed,
  partnerName,
  lastEditedBy,
  myUserId,
  showEditorLabels,
  changedAgo,
  className,
}: EditorChangeBadgeProps) {
  // ① 최근 변경분(transient): amber + 편집자명 승격
  if (changed) {
    const nick = partnerName?.trim();
    return (
      <span
        className={cn(
          'inline-flex items-center gap-0.5 text-[10px] text-amber-700 dark:text-amber-300 font-medium whitespace-nowrap flex-shrink-0',
          className,
        )}
      >
        <Sparkles className="w-2.5 h-2.5 flex-shrink-0" aria-hidden />
        {nick ? `${capNickname(nick)} 변경` : '파트너 변경'}
        {/* 상대시간 병기 — 중첩 span(부모 직계 텍스트 노드 불변 → 기존 getByText 계약 보존) */}
        {changedAgo && <span className="font-normal opacity-80">· {changedAgo}</span>}
      </span>
    );
  }

  // ② 정적 "최근:" 배지(공동편집 모드 + 편집자 식별 시)
  const label = showEditorLabels ? getEditorLabel(lastEditedBy, myUserId, partnerName) : null;
  if (!label) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0',
        className,
      )}
      // aria 는 축약 없는 전체 라벨(SR 완전 정보), 시각은 capNickname 축약
      aria-label={`최근 편집: ${label}`}
    >
      최근: {capNickname(label)}
    </span>
  );
}
