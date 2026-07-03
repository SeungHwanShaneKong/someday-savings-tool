// [CL-TOP20-P1-TRUST-20260703-010000] 랜딩 신뢰 섹션 — Top 20 로드맵 P1(#2).
// 원칙: 허위 후기 금지 — 실제 후기 데이터가 없으므로 "활용 예시" 라벨을 명시한 사용 시나리오 카드와
//       공개·검증 가능한 정직 지표만 노출한다(AdSense/신뢰 리스크 방지).
// 레이아웃: 모바일 = Embla 가로 스와이프, sm 이상 = 캐러셀 비활성(active:false) → 정적 3열 배치(단일 DOM).
// 계측: 섹션 최초 뷰포트 노출 시 social_proof_view 1회 — IO 미지원 환경(jsdom 등)에선 no-op.

import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { USAGE_STORIES, USAGE_STORY_LABEL, type UsageStory } from '@/content/usage-stories';
import { ARTICLES } from '@/content/articles';
import { trackFunnelOnce } from '@/lib/analytics/funnel-events';
import { cn } from '@/lib/utils';

interface TrustSectionProps {
  /** 래퍼 <section>에 덧붙일 클래스 — 랜딩 통합 시 간격·애니메이션 조정용 */
  className?: string;
}

/**
 * 정직 지표 — 공개·검증 가능한 사실만(수치 과장 금지).
 * 기존 랜딩 지표(5,000+ 비용 데이터 · 6개 AI 기능 · 무료)와 중복되지 않는 보완 관점.
 * 가이드 편수는 레지스트리 길이에서 파생 → 아티클 추가 시 자동 갱신(하드코딩 낙후 방지).
 */
const TRUST_FACTS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '출처 공개', label: '한국소비자원·통계청 등 참고 자료 표기' },
  { value: `가이드 ${ARTICLES.length}편`, label: '비용·일정 단계별 안내' },
  { value: '카드 등록 없음', label: '모든 기능 무료 이용' },
];

function StoryCard({ story }: { story: UsageStory }) {
  return (
    <article className="h-full flex flex-col gap-2 p-4 rounded-xl bg-card border border-border/50">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-primary">{story.persona}</span>
        {/* 후기 오인 방지 라벨 — 모든 카드에 필수 노출 */}
        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">
          {USAGE_STORY_LABEL}
        </span>
      </div>
      <h3 className="text-sm font-semibold text-foreground leading-snug">{story.title}</h3>
      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{story.story}</p>
    </article>
  );
}

export default function TrustSection({ className }: TrustSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  // 노출 계측: 최초 1회만 social_proof_view 전송(trackFunnelOnce 가 세션 중복도 방지).
  useEffect(() => {
    const node = sectionRef.current;
    // jsdom·구형 브라우저 등 IO 미존재 환경 가드 — 계측은 절대 렌더를 막지 않는다(no-op).
    if (!node || typeof window === 'undefined' || typeof window.IntersectionObserver !== 'function') {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          trackFunnelOnce('social_proof_view');
          observer.disconnect(); // 최초 노출 이후 관찰 종료
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="trust-section-heading"
      className={cn('w-full', className)}
    >
      <h2 id="trust-section-heading" className="text-xl font-bold text-foreground mb-2">
        이렇게 활용해요
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        신부·신랑·양가 부모님, 세 가지 관점에서 웨딩셈을 활용하는 대표적인 방법을 예시로
        정리했어요. 실제 후기가 아닌 활용 예시입니다.
      </p>

      {/* 시나리오 카드 3장 — 모바일 스와이프, sm 이상 정적 3열(embla breakpoints 로 단일 DOM 유지) */}
      <Carousel
        aria-label="웨딩셈 활용 예시 카드"
        opts={{
          align: 'start',
          active: false, // sm 이상: 캐러셀 비활성 → 일반 flex 3열
          breakpoints: { '(max-width: 639px)': { active: true } }, // 모바일에서만 스와이프
        }}
        className="mb-5"
      >
        <CarouselContent className="sm:-ml-3">
          {USAGE_STORIES.map((story) => (
            <CarouselItem key={story.id} className="basis-[85%] sm:basis-1/3 sm:pl-3">
              <StoryCard story={story} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* 정직 지표 3종 — 공개 데이터 기반 사실만 */}
      <ul className="grid grid-cols-3 gap-2 mb-5" aria-label="웨딩셈 신뢰 지표">
        {TRUST_FACTS.map((fact) => (
          <li
            key={fact.value}
            className="rounded-xl bg-card border border-border/50 px-2 py-3 text-center"
          >
            <p className="text-sm sm:text-base font-bold text-foreground">{fact.value}</p>
            <p className="mt-1 text-[11px] sm:text-xs text-muted-foreground leading-snug">
              {fact.label}
            </p>
          </li>
        ))}
      </ul>

      {/* 신뢰 앵커 — 근거 페이지로 직접 연결(프리렌더 라우트 = trailing-slash canonical) */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Link
          to="/guide/wedding-cost-data/"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          데이터 출처·산정 기준 보기 →
        </Link>
        <Link
          to="/editorial/"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          편집 원칙 보기 →
        </Link>
      </div>
    </section>
  );
}
