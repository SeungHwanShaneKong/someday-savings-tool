import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSEO } from '@/hooks/useSEO';
import Breadcrumb, { getBreadcrumbJsonLd } from '@/components/Breadcrumb';
import Footer from '@/components/Footer';
import {
  Calculator,
  CalendarCheck,
  Lightbulb,
  TrendingDown,
  Sparkles,
  CheckCircle2,
  ArrowLeft, // [CL-HOME-BTN-20260315-140000]
} from 'lucide-react';

/* ─── Budget Category Data ─── */
interface CostRange {
  category: string;
  items: string;
  low: string;
  high: string;
}

const COST_RANGES: CostRange[] = [
  {
    category: '예식장 + 식대',
    items: '예식장 대관료, 1인당 식대, 답례품',
    low: '800만 원',
    high: '2,500만 원',
  },
  {
    category: '스드메 (스튜디오·드레스·메이크업)',
    items: '스튜디오 촬영, 드레스 대여, 본식 메이크업',
    low: '200만 원',
    high: '500만 원',
  },
  {
    category: '예물 및 예단',
    items: '웨딩밴드, 프러포즈 반지, 예단',
    low: '300만 원',
    high: '1,500만 원',
  },
  {
    category: '혼수 (가전·가구)',
    items: 'TV, 냉장고, 세탁기, 침대, 소파 등',
    low: '500만 원',
    high: '2,000만 원',
  },
  {
    category: '신혼여행',
    items: '항공권, 숙소, 현지 비용',
    low: '200만 원',
    high: '700만 원',
  },
  {
    category: '기타',
    items: '청첩장, 웨딩 플래너, 상견례, 함',
    low: '100만 원',
    high: '500만 원',
  },
];

/* ─── Saving Tips ─── */
interface SavingTip {
  icon: typeof TrendingDown;
  title: string;
  description: string;
}

const SAVING_TIPS: SavingTip[] = [
  {
    icon: CalendarCheck,
    title: '비수기·주중 예식 활용',
    description:
      '1~2월, 7~8월 비수기나 주중 예식을 선택하면 예식장 비용을 20~30% 절감할 수 있습니다.',
  },
  {
    icon: TrendingDown,
    title: '스드메 패키지 비교',
    description:
      '최소 3곳 이상 비교 견적을 받으세요. 패키지 구성에 따라 동일 품질에서 100만 원 이상 차이가 날 수 있습니다.',
  },
  {
    icon: Calculator,
    title: '하객 리스트 현실적으로 작성',
    description:
      '식대가 결혼 비용의 큰 비중을 차지합니다. 하객 수를 현실적으로 예측하면 불필요한 식대 지출을 막을 수 있습니다.',
  },
  {
    icon: Lightbulb,
    title: '셀프 웨딩 요소 도입',
    description:
      '부케, 답례품, 식순표 등 일부 항목을 직접 준비하면 소소하지만 확실한 절약이 가능합니다.',
  },
  {
    icon: CheckCircle2,
    title: '공유 문서로 비용 추적',
    description:
      '웨딩셈의 예산 공유 기능을 활용하면 파트너와 실시간으로 지출 현황을 파악하고 예산 초과를 방지할 수 있습니다.',
  },
];

/* ─── Guide Steps for HowTo Schema ─── */
const HOW_TO_STEPS = [
  {
    name: '총 예산 설정하기',
    text: '결혼에 사용할 수 있는 전체 예산을 먼저 설정하세요. 양가 지원금, 본인 저축, 예상 축의금을 합산하여 현실적인 총 예산을 정합니다.',
  },
  {
    name: '카테고리별 비용 배분하기',
    text: '예식장, 스드메, 혼수, 예물, 신혼여행 등 주요 카테고리별로 예산을 배분합니다. 웨딩셈의 평균 비용 데이터를 참고하면 현실적인 배분이 가능합니다.',
  },
  {
    name: '항목별 세부 견적 입력하기',
    text: '각 카테고리 내 세부 항목(예: 드레스 대여료, 1인당 식대 등)의 견적을 입력합니다. 여러 업체 견적을 비교하여 최적의 선택을 합니다.',
  },
  {
    name: 'AI 인사이트로 숨겨진 비용 확인',
    text: '웨딩셈의 AI가 놓치기 쉬운 추가 비용(주차비, 엔딩 영상, 부모님 한복 등)을 경고하고 맞춤형 절약 팁을 추천합니다.',
  },
  {
    name: '파트너와 공유하며 실시간 관리',
    text: '예산표를 이미지로 저장하거나 링크로 공유하여 파트너와 함께 비용을 추적하세요. 결제 완료된 항목은 체크하여 진행 상황을 관리합니다.',
  },
];

/* ─── Guide Page ─── */
export default function Guide() {
  const breadcrumbItems = [{ label: '결혼 예산 가이드', href: '/guide' }];

  const jsonLd = useMemo(
    () => [
      getBreadcrumbJsonLd(breadcrumbItems),
      {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: '결혼 예산 계획하는 방법 - 2026년 완벽 가이드',
        description:
          '결혼 준비 비용을 체계적으로 계획하고 관리하는 5단계 가이드. 항목별 평균 비용과 절약 팁을 확인하세요.',
        step: HOW_TO_STEPS.map((step, index) => ({
          '@type': 'HowToStep',
          position: index + 1,
          name: step.name,
          text: step.text,
        })),
      },
    ],
    []
  );

  useSEO({
    title: '2026 결혼 예산 가이드 - 항목별 비용 총정리 | 웨딩셈',
    description:
      '2026년 결혼 비용 항목별 평균 가격, 비용 절약 팁, 예산 계획 5단계 가이드. 예식장, 스드메, 혼수, 신혼여행까지 총정리.',
    path: '/guide',
    jsonLd,
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 px-6 pt-10 pb-12">
        <div className="max-w-lg mx-auto">
          {/* [CL-HOME-BTN-20260315-140000] Home button */}
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4" aria-label="홈으로">
            <ArrowLeft className="w-4 h-4" />
            <span>홈</span>
          </Link>

          <Breadcrumb items={breadcrumbItems} />

          {/* Header */}
          <div className="mb-10">
            <span className="inline-block text-xs font-medium text-primary bg-primary/10 rounded-full px-3 py-1 mb-3">
              2026년 최신 기준
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              결혼 예산 완벽 가이드
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              항목별 평균 비용부터 절약 팁까지, 결혼 예산을 체계적으로 계획하는 방법을 안내합니다.
            </p>
          </div>

          {/* Section 1: 항목별 평균 비용 */}
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" aria-hidden="true" />
              항목별 평균 비용 범위
            </h2>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              2026년 AI 설문 데이터 기반 한국 평균 결혼 비용입니다. 지역과 규모에 따라 차이가 있으며, 아래 범위를 참고하여 본인에게 맞는 예산을 설정하세요.
            </p>

            <div className="space-y-3">
              {COST_RANGES.map((range) => (
                <Card key={range.category} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground mb-1">
                        {range.category}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {range.items}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-primary">
                        {range.low} ~ {range.high}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="mt-4 bg-secondary/50 rounded-xl p-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">합계 범위: </span>
                약 2,100만 원 ~ 7,700만 원 (주거 비용 제외)
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                * 신혼집 전세/매매 비용은 지역에 따라 크게 달라 별도 분류합니다.
              </p>
            </div>
          </section>

          {/* Section 2: 예산 계획 5단계 */}
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-primary" aria-hidden="true" />
              예산 계획 5단계
            </h2>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              체계적인 결혼 예산 계획을 위한 5단계 프로세스입니다. 웨딩셈과 함께라면 각 단계를 쉽고 빠르게 진행할 수 있습니다.
            </p>

            <div className="space-y-4">
              {HOW_TO_STEPS.map((step, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 pb-4 border-b border-border/50 last:border-b-0">
                    <h3 className="text-sm font-semibold text-foreground mb-1">
                      {step.name}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {step.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 3: 절약 팁 */}
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" aria-hidden="true" />
              비용 절약 팁 5가지
            </h2>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              스마트한 결혼 준비를 위한 실전 절약 팁을 모았습니다.
            </p>

            <div className="space-y-3">
              {SAVING_TIPS.map((tip) => {
                const Icon = tip.icon;
                return (
                  <Card key={tip.title} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4.5 h-4.5 text-amber-600" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground mb-1">
                          {tip.title}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {tip.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* CTA Section */}
          <section className="text-center bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-6 mb-8">
            <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-primary" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              지금 바로 예산을 계획해보세요
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              웨딩셈의 AI 예산 시뮬레이터로 나만의 결혼 예산표를 만들어보세요
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link to="/budget">무료로 시작하기</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/faq">자주 묻는 질문</Link>
              </Button>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
