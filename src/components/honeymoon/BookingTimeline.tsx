import type { Destination } from '@/lib/honeymoon-destinations';

interface BookingTimelineProps {
  destination: Destination;
}

export function BookingTimeline({ destination }: BookingTimelineProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        📅 예약 타임라인 — {destination.name}
      </h3>

      <div className="space-y-3">
        <TimelineItem
          emoji="✈️"
          title="항공권 예약"
          description={`출국 ${destination.bestBookingWeeks}주 전 예약 시 최저가`}
          isFirst
        />
        <TimelineItem
          emoji="🏨"
          title="숙소 예약"
          description="3개월 전 예약 권장 (인기 숙소 마감 대비)"
        />
        {destination.visaRequired && (
          <TimelineItem
            emoji="🛂"
            title="비자 준비"
            description="출국 2개월 전까지 비자 신청 완료"
          />
        )}
        {!destination.visaRequired && (
          <TimelineItem
            emoji="🛂"
            title="비자"
            description="무비자 (여권 유효기간 6개월 이상 확인)"
          />
        )}
        <TimelineItem
          emoji="🛡️"
          title="여행자 보험"
          description="출국 1주 전까지 가입 (2인 5~10만원)"
        />
        <TimelineItem
          emoji="💱"
          title="환전"
          description="출국 2주 전 환전 추천 (수수료 비교)"
          isLast
        />
      </div>
    </div>
  );
}

function TimelineItem({
  emoji,
  title,
  description,
  isFirst,
  isLast,
}: {
  emoji: string;
  title: string;
  description: string;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <span className="text-base">{emoji}</span>
        {!isLast && <div className="w-px h-6 bg-border mt-1" />}
      </div>
      <div className="flex-1 pb-1">
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {description}
        </p>
      </div>
    </div>
  );
}
