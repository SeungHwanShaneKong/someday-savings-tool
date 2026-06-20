import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { Sparkles, ArrowLeft } from 'lucide-react';

/* ─── FAQ Data ─── */
interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: '결혼 준비 비용은 평균 얼마인가요?',
    answer:
      '2026년 기준 평균 결혼 비용은 신혼집(주거)을 포함하면 약 2억~3억 원이며, 이 금액의 대부분은 신혼집 마련 비용입니다. 주거를 제외한 예식장·스드메·식대·혼수·예물·신혼여행 등 결혼식 관련 비용은 약 2,100만~7,700만 원 수준입니다. 지역·규모·취향에 따라 차이가 크며, 웨딩셈에서 항목별로 정확히 시뮬레이션해볼 수 있습니다.',
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
      '보통 결혼식 1년~6개월 전부터 준비를 시작하는 것이 좋습니다. 예식장은 6개월~1년 전, 스드메는 3~6개월 전, 청첩장은 2개월 전에 준비하는 것이 일반적입니다. 웨딩셈의 D-day 체크리스트 AI 기능이 시기별 할일을 자동으로 알려드립니다.',
  },
  {
    question: '웨딩셈은 어떤 서비스인가요?',
    answer:
      '웨딩셈은 AI 기반 결혼 준비 플랫폼입니다. 예산 시뮬레이터로 항목별 비용을 관리하고, AI가 숨겨진 비용 경고와 절약 팁을 실시간으로 제공합니다. D-day 체크리스트 AI, AI 허니문 큐레이션, AI Q&A 챗봇 등 결혼 준비에 필요한 모든 기능을 무료로 이용할 수 있습니다.',
  },
  {
    question: '웨딩셈은 무료인가요?',
    answer:
      '네, 웨딩셈의 모든 핵심 기능은 무료로 이용 가능합니다. 예산 시뮬레이터, D-day 체크리스트 AI, AI 비용 인사이트, AI 허니문 큐레이션, AI Q&A 챗봇 등 모든 기능을 카드 등록 없이 무료로 시작할 수 있습니다.',
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
  {
    question: '예식장 유형별로 비용 차이가 큰가요?',
    answer:
      '네, 유형에 따라 차이가 큽니다. 호텔웨딩은 1인 식대가 12만~20만 원으로 200명 기준 총 3,000만 원 이상도 가능한 반면, 일반 예식장은 1인 5만~8만 원, 스몰웨딩홀·공공예식장은 4만 원 이하 또는 대관료가 거의 없어 1,000만 원 이하로도 준비할 수 있습니다. 보증인원과 1인 식대를 함께 비교하는 것이 중요합니다.',
  },
  {
    question: '예식장 보증인원이 무엇인가요?',
    answer:
      '보증인원(최소 보장 인원)은 실제 하객이 적더라도 예식장에 지불해야 하는 최소 식대 인원입니다. 예를 들어 보증인원이 200명이면 하객이 150명만 와도 200명분 식대를 내야 합니다. 우리 하객 규모에 맞는 보증인원의 예식장을 선택해야 불필요한 식대 지출을 막을 수 있습니다.',
  },
  {
    question: '스몰웨딩은 비용이 얼마나 드나요?',
    answer:
      '스몰웨딩(50~100명)은 형태에 따라 총 700만~1,700만 원 선에서 준비할 수 있습니다. 레스토랑·하우스웨딩의 공간 대관·식대, 실속 스드메, 플라워·데코가 주요 항목입니다. 일반 예식장 대비 식대와 대관료를 크게 줄일 수 있지만, 공간별 최소 보장 금액과 음향·주차 등을 미리 확인해야 합니다.',
  },
  {
    question: '본식 스냅과 스튜디오 촬영은 다른 건가요?',
    answer:
      '네, 다릅니다. 스튜디오 촬영은 예식 전 화보 형식의 웨딩 사진이고, 본식 스냅은 결혼식 당일의 실제 순간(입장·서약·하객)을 담는 다큐멘터리형 사진입니다. 보통 별도로 준비하며, 본식 스냅은 작가 1인 30만~70만 원, 영상(DVD)은 40만~100만 원 수준입니다.',
  },
  {
    question: '외부 스냅 작가를 부르면 추가 비용이 있나요?',
    answer:
      '예식장에 따라 외부 업체 반입료(반입비)가 별도로 부과될 수 있습니다. 외부 작가를 고려한다면 계약 전 반드시 반입료 유무와 금액을 확인하세요. 예식장 자체 제공 스냅은 품질·구도가 제한적인 경우가 많아 외부 작가를 선호하는 커플이 많습니다.',
  },
  {
    question: '청첩장은 언제 준비하고 발송하나요?',
    answer:
      '청첩장 디자인·문구는 결혼식 약 2개월 전에 확정합니다. 종이 청첩장은 어른·직장에 4~6주 전, 모바일 청첩장은 친구·지인에게 3~4주 전 발송하는 것이 일반적입니다. 결혼식 1주 전에는 참석 인원을 최종 확인해 식대와 답례품 수량을 조정합니다.',
  },
  {
    question: '모바일 청첩장과 종이 청첩장, 둘 다 필요한가요?',
    answer:
      '필수는 아니지만 보통 병행합니다. 모바일 청첩장은 비용이 거의 들지 않고 지도·계좌·참석 의사 기능이 편리해 친구·지인에게 적합하고, 종이 청첩장은 어른들과 격식이 필요한 자리에 적합합니다. 종이 청첩장은 장당 500~1,500원으로 최소 수량을 확인해 주문하세요.',
  },
  {
    question: '예단과 예물은 꼭 해야 하나요?',
    answer:
      '의무는 아닙니다. 예단·예물·함은 양가가 정성을 주고받는 전통 절차이지만, 최근에는 현금 예단으로 간소화하거나 서로 생략하는 커플도 많습니다. 가장 중요한 것은 양가의 사전 합의입니다. 금액보다 서로의 마음과 형편을 존중하는 대화가 갈등을 막습니다.',
  },
  {
    question: '신혼집 마련에는 비용이 얼마나 드나요?',
    answer:
      '신혼집은 결혼 비용에서 가장 큰 비중(전체의 70~80%)을 차지하며 지역·형태에 따라 편차가 매우 큽니다. 전세는 목돈이 필요하지만 월 부담이 적고, 매매는 초기 자금과 대출 부담이 큽니다. 무주택 신혼부부는 버팀목 전세대출, 디딤돌 대출 등 정책 대출을 활용할 수 있으니 공식 채널에서 최신 조건을 확인하세요.',
  },
  {
    question: '신혼부부 전세자금대출은 어떻게 알아보나요?',
    answer:
      '대표적으로 무주택 신혼부부 대상 버팀목 전세대출, 주택 구입용 디딤돌 대출 등이 있습니다. 금리·한도·자격 요건은 소득·자산 기준과 정부 정책에 따라 수시로 바뀌므로, 주택도시기금 및 은행 등 공식 채널에서 가심사를 받아 최신 조건을 확인하는 것이 가장 정확합니다. 본 답변은 참고용입니다.',
  },
  {
    question: '혼수는 무엇부터 사야 하나요?',
    answer:
      '입주 시 꼭 필요한 대형 가전(냉장고·세탁기·TV)과 침대부터 마련하고, 소형 가전은 살면서 천천히 채우는 것이 좋습니다. 한 번에 다 살 필요가 없으며, 혼수 박람회·가전 패키지 할인, 이전 연식 모델, 렌탈 등을 활용하면 초기 부담을 줄일 수 있습니다. 혼수 총예산은 보통 500만~2,000만 원입니다.',
  },
  {
    question: '빌트인 가전이 있으면 혼수 비용이 줄어드나요?',
    answer:
      '네, 신혼집에 냉장고·세탁기·인덕션 등 빌트인 가전이 포함되어 있으면 혼수 비용을 크게 줄일 수 있습니다. 집을 구할 때 빌트인 포함 여부를 확인하고, 중복 구매를 피하도록 신혼집 평면도와 콘센트 위치를 보고 가전 크기를 결정하세요.',
  },
  {
    question: '하객 수는 어떻게 예측하나요?',
    answer:
      '양가·신랑·신부별로 초대 명단을 나눠 작성한 뒤, 실제 참석률(보통 60~80%)을 적용해 추정합니다. 직장·지인은 참석률이 낮고 가족·친척은 높은 편입니다. 모바일 청첩장의 참석 의사 기능을 활용하면 실측에 가깝게 보정할 수 있어 식대 예측에 도움이 됩니다.',
  },
  {
    question: '실제 내가 부담하는 결혼 비용은 어떻게 계산하나요?',
    answer:
      '자기부담금 = 총 결혼 비용 − 예상 축의금 − 양가 지원금으로 계산합니다. 예를 들어 총비용 4,000만 원, 예상 축의금 1,800만 원, 양가 지원 1,000만 원이면 실제 부담은 약 1,200만 원입니다. 축의금은 변수가 크므로 보수적으로 추정해야 예산이 틀어지지 않습니다. 웨딩셈에서 하객 수와 식대를 입력해 비교해 보세요.',
  },
  {
    question: '상견례는 언제, 어떻게 하나요?',
    answer:
      '상견례는 보통 결혼 준비 초기(결혼식 약 1년~6개월 전)에 양가 부모님이 처음 만나 인사하는 자리입니다. 조용하고 격식 있는 식당을 예약하고, 결혼 날짜·예산·예단 등 큰 방향을 자연스럽게 논의합니다. 상견례 비용도 기타 항목으로 예산에 포함해 두면 좋습니다.',
  },
  {
    question: '파트너와 결혼 예산을 함께 관리할 수 있나요?',
    answer:
      '웨딩셈은 예산표를 이미지로 저장하거나 링크로 공유해 파트너와 함께 비용을 추적할 수 있습니다. 항목별로 신랑·신부·공동 분담을 설정하고, 결제 완료된 항목을 체크하며 진행 상황을 함께 관리할 수 있어 예산 초과를 방지하는 데 효과적입니다.',
  },
  {
    question: '결혼식 시간대(타임)는 어떻게 고르나요?',
    answer:
      '예식장은 보통 오전·점심·오후·저녁 타임으로 나뉩니다. 점심·저녁 타임은 식사가 풍성해 만족도가 높지만 비용이 올라가고, 오전 타임은 상대적으로 저렴하며 하객이 여유롭게 이동할 수 있습니다. 하객 연령대와 이동 거리, 식사 메뉴, 비용을 함께 고려해 결정하세요. 인기 타임(주말 점심·저녁)은 예약이 빨리 마감되니 서두르는 것이 좋습니다.',
  },
];

/* ─── FAQ Page ─── */
export default function FAQ() {
  const navigate = useNavigate();
  const breadcrumbItems = [{ label: '자주 묻는 질문', href: '/faq/' }];

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
    path: '/faq/',
    jsonLd,
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* [CL-HOME-BTN-ALL-20260403-223000] sticky header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="홈으로"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center text-sm font-semibold text-foreground">
            자주 묻는 질문
          </h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="flex-1 px-6 pt-6 pb-12">
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
