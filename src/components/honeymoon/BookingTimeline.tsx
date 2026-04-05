// [CL-HONEYMOON-JOURNEY-20260405-180000] getCurrentStep 수리 — useWeddingDate 연동
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';
import { useWeddingDate } from '@/hooks/useWeddingDate';
import type { Destination } from '@/lib/honeymoon-destinations';

interface BookingTimelineProps {
  destination: Destination;
  /** 외부에서 결혼일 전달 (PlanStep 인라인 등) */
  weddingDateOverride?: string | null;
}

export function BookingTimeline({ destination, weddingDateOverride }: BookingTimelineProps) {
  // [CL-HONEYMOON-JOURNEY-20260405-180000] 결혼일 기준 주수 계산 → 자동 단계 진행
  const { weddingDate: hookWeddingDate } = useWeddingDate();
  const effectiveWeddingDate = weddingDateOverride ?? hookWeddingDate;

  const currentStep = useMemo(() => {
    if (!effectiveWeddingDate) return 0;
    const now = new Date();
    const wedding = new Date(effectiveWeddingDate);
    const diffMs = wedding.getTime() - now.getTime();
    const weeksLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 7)));

    if (weeksLeft <= 1) return 5;  // 모두 완료
    if (weeksLeft <= 2) return 4;  // 환전 완료
    if (weeksLeft <= 4) return 3;  // 여행자 보험 완료
    if (weeksLeft <= 8) return 2;  // 비자 완료
    if (weeksLeft <= 12) return 1; // 숙소 완료
    return 0; // 항공권부터 시작
  }, [effectiveWeddingDate]);

  const steps = [
    {
      emoji: '✈️',
      title: '항공권 예약',
      description: `출국 ${destination.bestBookingWeeks}주 전 예약 시 최저가`,
    },
    {
      emoji: '🏨',
      title: '숙소 예약',
      description: '3개월 전 예약 권장 (인기 숙소 마감 대비)',
    },
    {
      emoji: '🛂',
      title: destination.visaRequired ? '비자 준비' : '비자',
      description: destination.visaRequired
        ? '출국 2개월 전까지 비자 신청 완료'
        : '무비자 (여권 유효기간 6개월 이상 확인)',
    },
    {
      emoji: '🛡️',
      title: '여행자 보험',
      description: '출국 1주 전까지 가입 (2인 5~10만원)',
    },
    {
      emoji: '💱',
      title: '환전',
      description: '출국 2주 전 환전 추천 (수수료 비교)',
    },
  ];

  return (
    <div className="bg-card rounded-xl border border-border p-4 hover:shadow-toss transition-all duration-200">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        📅 예약 타임라인 — {destination.name}
      </h3>

      <div className="space-y-3">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isLast = index === steps.length - 1;

          return (
            <div key={index} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full transition-all',
                    isCompleted && 'bg-green-100',
                    isCurrent && 'bg-primary/10 ring-2 ring-primary',
                    !isCompleted && !isCurrent && 'bg-muted/50'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <span className={cn('text-base', isCurrent && 'animate-pulse-subtle')}>
                      {step.emoji}
                    </span>
                  )}
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      'w-px h-4 mt-1',
                      isCompleted ? 'bg-green-300' : 'bg-border'
                    )}
                  />
                )}
              </div>
              <div className="flex-1 pb-1">
                <p
                  className={cn(
                    'text-xs font-semibold',
                    isCompleted && 'text-green-600',
                    isCurrent && 'text-primary',
                    !isCompleted && !isCurrent && 'text-muted-foreground'
                  )}
                >
                  {step.title}
                </p>
                <p
                  className={cn(
                    'text-[11px] mt-0.5',
                    !isCompleted && !isCurrent
                      ? 'text-muted-foreground/60'
                      : 'text-muted-foreground'
                  )}
                >
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
