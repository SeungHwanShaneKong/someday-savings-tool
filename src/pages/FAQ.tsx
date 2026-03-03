import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useSEO } from '@/hooks/useSEO';
import Breadcrumb, { getBreadcrumbJsonLd } from '@/components/Breadcrumb';
import Footer from '@/components/Footer';
import { Sparkles } from 'lucide-react';

/* ─── FAQ Data ─── */
interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: '결혼 준비 비용은 평균 얼마인가요?',
    answer:
      '2025년 기준 한국 평균 결혼 비용은 약 2억~3억 원 수준입니다. 여기에는 예식장, 스드메(스튜디오·드레스·메이크업), 식대, 혼수, 예물, 신혼여행 등이 포함됩니다. 지역, 규모, 개인 취향에 따라 큰 차이가 있으며, 웨딩셈에서 항목별로 정확히 시뮬레이션해볼 수 있습니다.',
  },
  {
    question: '스드메(스튜디오·드레스·메이크업) 비용은 얼마나 드나요?',
    answer:
      '스드메 패키지 기준으로 약 200만~500만 원이 일반적입니다. 스튜디오 촬영 100만~250만 원, 드레스 대여 80만~200만 원, 메이크업 50만~100만 원 정도입니다. 업체별로 패키지 구성과 가격 편차가 크므로, 여러 곳을 비교하는 것이 중요합니다.',
  },
  {
    question: '결혼식 식대는 어떻게 계산하나요?',
    answer:
      '식대는 보통 1인당 5만~8만 원 수준이며, 하객 수에 따라 총 비용이 결정됩니다. 예를 들어 200명 기준 약 1,000만~1,600만 원이 소요됩니다. 웨딩셈의 예산 시뮬레이터에서 하객 수를 입력하면 자동으로 식대가 계산됩니다.',
  },
  {
    question: '신혼여행 예산은 얼마가 적당한가요?',
    answer:
      '목적지에 따라 200만~700만 원까지 다양합니다. 동남아(발리, 다낭 등)는 200만~400만 원, 유럽·하와이 등은 500만~700만 원 이상이 일반적입니다. 웨딩셈의 AI 허니문 큐레이션 기능을 활용하면 예산에 맞는 여행지를 추천받을 수 있습니다.',
  },
  {
    question: '신랑/신부 비용 분담 비율은 어떻게 하나요?',
    answer:
      '전통적으로 신랑 측이 집(전세/매매), 신부 측이 혼수(가전·가구)를 준비하는 경우가 많지만, 최근에는 커플이 함께 논의하여 공평하게 분담하는 추세입니다. 웨딩셈에서 항목별로 분담 비율을 설정하고 각자의 예산을 관리할 수 있습니다.',
  },
  {
    question: '결혼 예산을 줄이는 방법은?',
    answer:
      '비수기(1~2월, 7~8월) 예식, 주중 예식 선택 시 예식장 비용을 20~30% 절감할 수 있습니다. 또한 스드메 패키지 비교, 중고 혼수 활용, 셀프 웨딩 요소 도입 등이 효과적입니다. 웨딩셈의 AI 비용 인사이트 기능이 맞춤형 절약 팁을 실시간으로 추천해드립니다.',
  },
  {
    question: '예물(반지) 예산은 얼마가 적당한가요?',
    answer:
      '웨딩 밴드는 커플 기준 200만~500만 원, 프러포즈 반지(다이아몬드)를 포함하면 300만~1,000만 원 이상까지 다양합니다. 금 시세와 다이아몬드 등급(4C)에 따라 가격 차이가 큽니다. 예산 내에서 현명한 선택이 중요합니다.',
  },
  {
    question: '결혼 준비는 언제부터 시작해야 하나요?',
    answer:
      '보통 결혼식 1년~6개월 전부터 준비를 시작하는 것이 좋습니다. 예식장은 6개월~1년 전, 스드메는 3~6개월 전, 청첩장은 2개월 전에 준비하는 것이 일반적입니다. 웨딩셈의 D-day 체크리스트 기능이 시기별 할일을 자동으로 알려드립니다.',
  },
  {
    question: '웨딩셈은 어떤 서비스인가요?',
    answer:
      '웨딩셈은 AI 기반 결혼 준비 플랫폼입니다. 예산 시뮬레이터로 항목별 비용을 관리하고, AI가 숨겨진 비용 경고와 절약 팁을 실시간으로 제공합니다. D-day 체크리스트, AI 허니문 큐레이션, AI Q&A 챗봇 등 결혼 준비에 필요한 모든 기능을 무료로 이용할 수 있습니다.',
  },
  {
    question: '웨딩셈은 무료인가요?',
    answer:
      '네, 웨딩셈의 모든 핵심 기능은 무료로 이용 가능합니다. 예산 시뮬레이터, D-day 체크리스트, AI 비용 인사이트, AI 허니문 큐레이션, AI Q&A 챗봇 등 모든 기능을 카드 등록 없이 무료로 시작할 수 있습니다.',
  },
  {
    question: '예산 데이터는 안전한가요?',
    answer:
      '웨딩셈은 Supabase 클라우드 인프라를 사용하며, 모든 데이터는 암호화되어 안전하게 저장됩니다. 사용자 본인만 자신의 예산 데이터에 접근할 수 있으며, 제3자에게 데이터를 판매하거나 공유하지 않습니다.',
  },
  {
    question: '모바일에서도 사용할 수 있나요?',
    answer:
      '네, 웨딩셈은 모바일 최적화된 반응형 웹앱입니다. 스마트폰, 태블릿, PC 어디서든 웹 브라우저에서 바로 접속하여 사용할 수 있습니다. 별도 앱 설치가 필요 없습니다.',
  },
  {
    question: '축의금은 보통 얼마나 걷히나요?',
    answer:
      '축의금은 하객 수, 관계 깊이에 따라 다르지만, 평균적으로 1인당 5만~10만 원 수준입니다. 200명 기준 약 1,500만~2,000만 원 정도가 일반적입니다. 축의금으로 식대와 일부 비용을 충당하는 것이 보통이며, 웨딩셈에서 예상 축의금 대비 실제 비용을 비교해볼 수 있습니다.',
  },
];

/* ─── FAQ Page ─── */
export default function FAQ() {
  const breadcrumbItems = [{ label: '자주 묻는 질문' }];

  // Memoize JSON-LD to prevent unnecessary re-renders
  const jsonLd = useMemo(
    () => [
      getBreadcrumbJsonLd(breadcrumbItems),
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ_ITEMS.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      },
    ],
    []
  );

  useSEO({
    title: '결혼 준비 자주 묻는 질문 (FAQ) - 웨딩셈',
    description:
      '결혼 비용 평균, 스드메 비용, 식대 계산, 신혼여행 예산, 예물 예산 등 결혼 준비에 관한 모든 궁금증을 해결하세요. 웨딩셈 FAQ.',
    path: '/faq',
    jsonLd,
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 px-6 pt-10 pb-12">
        <div className="max-w-lg mx-auto">
          <Breadcrumb items={breadcrumbItems} />

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              자주 묻는 질문
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              결혼 준비 비용부터 웨딩셈 사용법까지, 예비 신랑·신부가 가장 많이 궁금해하는 질문을 모았습니다.
            </p>
          </div>

          {/* FAQ Accordion */}
          <Accordion type="multiple" className="mb-10">
            {FAQ_ITEMS.map((item, index) => (
              <AccordionItem key={index} value={`faq-${index}`}>
                <AccordionTrigger className="text-left text-sm sm:text-base font-medium hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* CTA */}
          <div className="text-center bg-secondary/50 rounded-2xl p-6 mb-8">
            <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-primary" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              더 궁금한 점이 있으신가요?
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              AI Q&A 챗봇에 자유롭게 질문해보세요
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link to="/chat">AI에게 질문하기</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/budget">예산 시뮬레이션 시작</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
