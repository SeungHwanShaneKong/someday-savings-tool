// [CL-TOP20-P3-CHECK-20260703-030000]
/**
 * 오버듀 배너 — 기한 초과 항목이 있을 때 페이지 상단에 세션당 1회 노출.
 * "밀린 일정 보러 가기" 버튼으로 첫 overdue 기간 섹션으로 스크롤.
 */
import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SESSION_KEY = 'wsem-checklist-overdue-banner-seen';

function hasSeenThisSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false; // 프라이빗 모드 등 접근 불가 시 노출 허용(1회성만 약화)
  }
}

function markSeen(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    // storage 불가 환경 — 무시(멱등)
  }
}

interface OverdueAlertBannerProps {
  /** 기한 초과 미완료 항목 수 (>0 일 때만 렌더 권장) */
  overdueCount: number;
  /** 스크롤 대상 기간 라벨 (예: '12~10개월 전') */
  targetPeriodLabel: string;
  /** 대상 기간 섹션으로 스크롤 */
  onScrollToPeriod: () => void;
}

export function OverdueAlertBanner({
  overdueCount,
  targetPeriodLabel,
  onScrollToPeriod,
}: OverdueAlertBannerProps) {
  // 세션 1회: 최초 마운트 시점의 판정을 상태로 고정(lazy init) — 이후 마운트에선 숨김
  const [visible, setVisible] = useState(() => !hasSeenThisSession());

  useEffect(() => {
    if (visible) markSeen(); // StrictMode 이중 실행에도 멱등
  }, [visible]);

  if (!visible || overdueCount <= 0) return null;

  return (
    <div
      role="alert"
      className="relative flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 sm:p-5 animate-fade-up"
    >
      <span
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-destructive/10"
        aria-hidden="true"
      >
        <AlertTriangle className="h-4 w-4 text-destructive" />
      </span>

      <div className="min-w-0 flex-1 pr-6">
        <p className="text-sm font-semibold text-foreground">
          기한이 지난 할 일이 {overdueCount}개 있어요
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {targetPeriodLabel} 시기부터 차근차근 따라잡아 볼까요?
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-2.5 h-8 border-destructive/30 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={onScrollToPeriod}
        >
          <ArrowDown className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          밀린 일정 보러 가기
        </Button>
      </div>

      {/* [CL-BTNAUDIT3-20260704 | 닫기 44px] 히트영역 44px 확대(aria-label 유지·아이콘 크기 유지) */}
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="기한 초과 알림 닫기"
        className="absolute right-2 top-2 min-h-11 min-w-11 inline-flex items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
