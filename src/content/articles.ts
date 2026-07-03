/**
 * [CL-SSG-PRERENDER-20260531] 데이터 주도 결혼 가이드 아티클 레지스트리 (W6)
 *
 * 신규 SEO 콘텐츠를 코드 1곳(이 파일)에 데이터로 추가하면
 * - /guide/:slug 라우트가 자동 렌더 (src/pages/Article.tsx)
 * - 프리렌더 매니페스트(scripts/prerender.mjs)에 slug 추가 시 정적 HTML 생성
 * - 사이트맵에 자동 포함
 * 되도록 설계. 본문 수치는 Guide.tsx / FAQ.tsx 와 정합을 유지한다.
 */

import { SITE_ORIGIN } from '@/config/site';
import { ARTICLE_FAQS, NEW_ARTICLES } from './articles-t3'; // [CL-SEO-ARTICLE-FAQ-20260626] T3 FAQ 맵 + 신규 아티클
import { ARTICLE_SOURCES, ARTICLE_METHODOLOGY } from './articles-sources'; // [CL-ADSENSE-CONTENT-20260630] 출처/방법론 맵(원본성)
import { NEW_T4, ARTICLE_FAQS_T4 } from './articles-t4'; // [CL-ADSENSE-CONTENT-20260630] 데이터 허브 + 신규 pillar

const BASE_DOMAIN = SITE_ORIGIN; // [CL-DOMAIN-PROMOTE-20260621] 단일 소스(src/config/site.ts)

/* ─── 콘텐츠 블록 모델 ─── */
// [CL-ADSENSE-CONTENT-20260630] heading3(소제목) 추가 — 길어진 pillar 본문의 구조·가독성·키워드 커버리지 강화(가산형).
export type ArticleBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading3'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'callout'; text: string };

export interface ArticleSection {
  heading: string;
  blocks: ArticleBlock[];
}

export interface Article {
  slug: string;
  /** 검색 결과 <title> */
  seoTitle: string;
  /** 페이지 H1 */
  title: string;
  /** meta description + og:description */
  description: string;
  /** H1 상단 작은 배지 */
  badge?: string;
  /** H1 하단 리드 문단 */
  intro: string;
  datePublished: string;
  dateModified: string;
  sections: ArticleSection[];
  /** 관련 글 slug */
  related: string[];
  /** [CL-SEO-ARTICLE-META-20260626] (이하 전부 optional·additive — 미설정 시 기존 동작 보존) */
  /** Article.articleSection — 미설정 시 '결혼 준비 가이드' */
  category?: string;
  /** Article.keywords(SEO) */
  keywords?: string[];
  /** 아티클별 og/Article image 절대 또는 상대경로 — 미설정 시 /og-image.png 폴백 */
  image?: string;
  /** [CL-SEO-ARTICLE-FAQ-20260626] 본문 하단 FAQ + FAQPage 리치결과(아티클별). 미설정 시 미렌더 */
  faqs?: { q: string; a: string }[];
  /** [CL-ADSENSE-CONTENT-20260630] E-E-A-T·원본성 강화 필드 (전부 optional·additive — 미설정 시 기존 동작 보존) */
  /** 저자(바이라인·JSON-LD author). 미설정 시 '웨딩셈 편집팀' */
  author?: string;
  /** 검수자 표기(바이라인). 미설정 시 '웨딩셈 편집팀 감수' */
  reviewedBy?: string;
  /** 참고 자료(검증 가능한 실제 공개 출처). 본문 '참고 자료' 섹션 + JSON-LD citation. */
  sources?: { title: string; url?: string; publisher?: string; note?: string }[];
  /** 자체 추정 방법론(외부 출처 없을 때 투명 공개 — 기준·표본·면책). 본문 callout. */
  methodology?: string;
  /**
   * [CL-TOP20-P2-ARTICLE-20260703-020000] 콘텐츠→앱 브리지 맞춤 CTA (optional·additive).
   * 슬러그 의미에 맞는 목적지(/budget·/checklist·/demo)로 연결. 미설정 시 기존 공통 CTA 그대로 유지(회귀 0).
   * label = 버튼 텍스트(액션형) · description = CTA 박스 안내 문구 · to = 내부 라우트 경로.
   */
  contextualCta?: { label: string; description: string; to: string };
}

/* ─── 아티클 데이터 ─── */
export const ARTICLES: Article[] = [
  /* ═══════════════ 1) 2026 결혼 평균 비용 분석 ═══════════════ */
  {
    slug: '2026-wedding-cost',
    seoTitle: '2026 결혼 평균 비용 분석 - 항목별 총정리 | 웨딩셈',
    title: '2026 결혼 평균 비용 분석',
    description:
      '2026년 결혼 평균 비용을 주거 포함·제외로 나눠 정확히 분석합니다. 예식장, 스드메, 혼수, 예물, 신혼여행 항목별 평균 가격과 지역·규모별 차이를 한눈에 정리했습니다.',
    badge: '2026년 최신 데이터',
    intro:
      '"결혼 비용이 2~3억"이라는 기사와 "몇천만 원이면 된다"는 후기가 동시에 보여 혼란스러우신가요? 두 숫자 모두 맞습니다. 무엇을 포함했느냐의 차이일 뿐입니다. 이 글에서 2026년 결혼 비용을 항목별로 정확히 분석합니다.',
    datePublished: '2026-05-31',
    dateModified: '2026-05-31',
    sections: [
      {
        heading: "왜 '2~3억'과 '몇천만 원'이 동시에 나올까?",
        blocks: [
          {
            type: 'paragraph',
            text: '결혼 비용 통계가 크게 갈리는 이유는 단 하나, 신혼집(주거) 비용을 포함했는지 여부입니다. 신혼집 전세·매매 비용은 수도권 기준 수억 원에 달해 전체 평균을 끌어올립니다.',
          },
          {
            type: 'list',
            items: [
              '주거 포함 시: 평균 약 2억~3억 원 — 이 금액의 대부분(70~80%)은 신혼집 마련 비용입니다.',
              '주거 제외 시: 결혼식·혼수 관련 비용은 약 2,100만 원~7,700만 원 수준입니다.',
            ],
          },
          {
            type: 'callout',
            text: '웨딩셈은 지역 편차가 큰 신혼집 비용을 별도로 분류하고, 양가가 실제로 함께 준비하는 결혼식·혼수 비용에 집중합니다.',
          },
        ],
      },
      {
        heading: '항목별 평균 비용 범위 (주거 제외)',
        blocks: [
          {
            type: 'table',
            headers: ['항목', '평균 비용 범위', '주요 세부 항목'],
            rows: [
              ['예식장 + 식대', '800만 ~ 2,500만 원', '대관료, 1인당 식대, 답례품'],
              ['스드메', '200만 ~ 500만 원', '스튜디오·드레스·메이크업'],
              ['예물 및 예단', '300만 ~ 1,500만 원', '웨딩밴드, 프러포즈 반지, 예단'],
              ['혼수 (가전·가구)', '500만 ~ 2,000만 원', 'TV, 냉장고, 세탁기, 침대 등'],
              ['신혼여행', '200만 ~ 700만 원', '항공권, 숙소, 현지 비용'],
              ['기타', '100만 ~ 500만 원', '청첩장, 플래너, 상견례, 함'],
            ],
          },
          {
            type: 'paragraph',
            text: '여섯 항목을 합산하면 약 2,100만 원~7,700만 원입니다. 어느 항목에 비중을 둘지는 커플의 우선순위에 따라 크게 달라집니다.',
          },
        ],
      },
      {
        heading: '지역·규모별 차이',
        blocks: [
          {
            type: 'list',
            items: [
              '수도권은 예식장 대관료와 식대가 지방보다 20~40% 높은 편입니다.',
              '하객 200명 기준 식대만 약 1,000만~1,600만 원으로, 하객 규모가 총비용을 좌우합니다.',
              '스몰웨딩(50명 이하)·하우스웨딩을 택하면 식대와 대관료를 크게 줄일 수 있습니다.',
            ],
          },
        ],
      },
      {
        heading: '2026년 결혼 비용 트렌드',
        blocks: [
          {
            type: 'list',
            items: [
              '실속·합리 소비 확산: 보여주기식 항목을 줄이고 신혼집·신혼여행에 투자하는 경향.',
              '비수기·주중 예식 선호: 1~2월·7~8월, 평일 예식으로 예식장 비용 20~30% 절감.',
              '셀프 요소 도입: 셀프 스냅, 부케·답례품 직접 준비로 소소한 절약.',
            ],
          },
        ],
      },
      {
        heading: '내 예산은 얼마가 적당할까?',
        blocks: [
          {
            type: 'paragraph',
            text: '평균은 평균일 뿐입니다. 양가 지원금, 저축, 예상 축의금을 합산해 현실적인 총 예산을 먼저 정하고, 항목별로 배분하는 것이 정확합니다. 웨딩셈의 예산 시뮬레이터에 입력하면 평균과 비교 분석한 결과를 즉시 확인할 수 있습니다.',
          },
        ],
      },
    ],
    related: ['sdm-checklist', 'budget-10million', 'wedding-prep-order'],
  },

  /* ═══════════════ 2) 스드메 견적 항목별 체크리스트 ═══════════════ */
  {
    slug: 'sdm-checklist',
    seoTitle: '스드메 견적 항목별 체크리스트 - 숨은 비용까지 | 웨딩셈',
    title: '스드메 견적 항목별 체크리스트',
    description:
      '스튜디오·드레스·메이크업(스드메) 견적을 받을 때 꼭 확인해야 할 항목을 체크리스트로 정리했습니다. 헬퍼비·교통비 등 숨은 비용까지 빠짐없이 비교하세요.',
    badge: '견적 비교 필수',
    intro:
      '스드메는 패키지 기준 약 200만~500만 원이지만, 구성에 따라 동일 품질에서 100만 원 이상 차이가 납니다. 견적서를 받을 때 아래 항목을 그대로 대조하면 과지출과 숨은 비용을 막을 수 있습니다.',
    datePublished: '2026-05-31',
    dateModified: '2026-05-31',
    sections: [
      {
        heading: '스드메란?',
        blocks: [
          {
            type: 'paragraph',
            text: '스드메는 스튜디오(촬영)·드레스(대여)·메이크업을 묶어 부르는 말입니다. 보통 한 업체가 세 가지를 패키지로 제공하며, 패키지 구성과 추가 비용 항목을 꼼꼼히 비교하는 것이 핵심입니다.',
          },
        ],
      },
      {
        heading: '① 스튜디오 촬영 체크리스트',
        blocks: [
          {
            type: 'list',
            items: [
              '촬영 콘셉트(실내/야외/한복) 수와 의상 변경 횟수',
              '원본 파일 제공 여부와 보정본 장수',
              '액자·앨범 포함 여부 및 추가 제작 단가',
              '촬영용 헤어·메이크업 포함 여부',
              '추가 보정·셀렉 비용 발생 시점',
            ],
          },
        ],
      },
      {
        heading: '② 드레스 체크리스트',
        blocks: [
          {
            type: 'list',
            items: [
              '대여 가능 벌 수(리허설/본식)와 등급별 추가금',
              '피팅 횟수와 피팅 비용 포함 여부',
              '헬퍼(도우미) 비용 — 견적에 미포함인 경우가 많음',
              '드레스 투어(가봉) 가능 여부',
              '본식 추가 드레스(2부) 비용',
            ],
          },
        ],
      },
      {
        heading: '③ 메이크업 체크리스트',
        blocks: [
          {
            type: 'list',
            items: [
              '리허설·본식 메이크업 포함 여부',
              '혼주(양가 어머니) 메이크업 추가 단가',
              '얼리스타트(이른 시간) 출장비',
              '식장 출장 비용 및 교통비',
              '담당 디자이너 지정 가능 여부',
            ],
          },
        ],
      },
      {
        heading: '숨은 비용 주의',
        blocks: [
          {
            type: 'callout',
            text: '헬퍼비, 교통비, 원본 추가 구매, 보정 추가비는 패키지 가격에 빠져 있는 경우가 많습니다. 견적서에 "추가 비용 없음"을 명시로 확인하세요.',
          },
        ],
      },
      {
        heading: '견적 비교 표',
        blocks: [
          {
            type: 'table',
            headers: ['항목', '평균가', '확인 포인트'],
            rows: [
              ['스튜디오 촬영', '100만 ~ 250만 원', '원본·앨범 포함 여부'],
              ['드레스 대여', '80만 ~ 200만 원', '헬퍼비·피팅비 별도 여부'],
              ['메이크업', '50만 ~ 100만 원', '혼주·출장비 별도 여부'],
            ],
          },
          {
            type: 'paragraph',
            text: '최소 3곳 이상 비교 견적을 받고, 위 표를 기준으로 항목별 포함 여부를 대조하면 합리적인 선택이 가능합니다. 확정된 견적은 웨딩셈 예산 시뮬레이터에 입력해 전체 예산과 함께 관리하세요.',
          },
        ],
      },
    ],
    related: ['2026-wedding-cost', 'wedding-prep-order', 'budget-10million'],
    // [CL-TOP20-P2-ARTICLE-20260703-020000] 스드메 견적 확인 직후 → 예산 시뮬레이터 브리지
    contextualCta: {
      label: '스드메 견적, 예산에 넣어 계산하기',
      description:
        '방금 확인한 스드메 견적을 웨딩셈 시뮬레이터에 입력하면 평균 대비 과지출 여부를 바로 확인할 수 있어요.',
      to: '/budget',
    },
  },

  /* ═══════════════ 3) 예산 1,000만원 결혼 준비 ═══════════════ */
  {
    slug: 'budget-10million',
    seoTitle: '예산 1,000만원 결혼 준비 - 스몰웨딩 배분 예시 | 웨딩셈',
    title: '예산 1,000만원으로 결혼 준비하기',
    description:
      '예산 1,000만 원으로 가능한 합리적 결혼 준비 방법. 스몰웨딩·실속 패키지를 활용한 항목별 예산 배분 예시와 절약 전략을 구체적으로 안내합니다.',
    badge: '실속 결혼 가이드',
    intro:
      '신혼집과 대형 혼수를 제외하면, 결혼식 관련 비용을 1,000만 원 안에서 준비하는 것도 충분히 가능합니다. 핵심은 우선순위를 정하고 항목별로 과감히 선택과 집중을 하는 것입니다.',
    datePublished: '2026-05-31',
    dateModified: '2026-05-31',
    sections: [
      {
        heading: '1,000만 원으로 결혼이 가능할까?',
        blocks: [
          {
            type: 'paragraph',
            text: '가능합니다. 단, 전제가 있습니다. 신혼집 마련 비용과 대형 가전·가구(혼수)는 별도로 두고, 결혼식·스드메·예물·신혼여행 등 "예식 관련 비용"에 한정한 예산입니다. 스몰웨딩과 실속 패키지를 활용하면 1,000만 원 안에서 충분히 의미 있는 결혼식을 치를 수 있습니다.',
          },
        ],
      },
      {
        heading: '예산 배분 예시 (총 1,000만 원)',
        blocks: [
          {
            type: 'table',
            headers: ['항목', '배분 예산', '전략'],
            rows: [
              ['예식 (소규모·하우스웨딩)', '400만 원', '스몰웨딩홀·공공예식장 활용'],
              ['스드메 (실속 패키지)', '150만 원', '셀프 스냅 + 대여 최소화'],
              ['예물 (심플 밴드)', '100만 원', '프러포즈 반지 생략·간소화'],
              ['신혼여행 (국내·동남아)', '200만 원', '비수기 항공·패키지 활용'],
              ['기타 (청첩장·소품)', '150만 원', '모바일 청첩장·셀프 제작'],
            ],
          },
          {
            type: 'paragraph',
            text: '위 배분은 예시이며, 신혼여행을 줄이고 예식에 더 쓰는 등 우선순위에 따라 자유롭게 조정할 수 있습니다.',
          },
        ],
      },
      {
        heading: '항목별 절약 전략',
        blocks: [
          {
            type: 'list',
            items: [
              '평일·비수기 예식으로 대관료·식대를 20~30% 절감',
              '스몰웨딩홀·하우스웨딩·공공예식장(구청·복지관) 적극 활용',
              '셀프 스냅·셀프 부케로 스드메 비용 축소',
              '모바일 청첩장으로 인쇄·발송비 절약',
              '국내 또는 가까운 동남아로 신혼여행지 선택',
            ],
          },
        ],
      },
      {
        heading: '이것만은 챙기세요',
        blocks: [
          {
            type: 'callout',
            text: '절약하더라도 본식 사진(스냅)과 식사 품질은 만족도에 직결됩니다. 줄일 항목과 지킬 항목을 미리 구분해 두면 후회 없는 선택이 가능합니다.',
          },
        ],
      },
    ],
    related: ['2026-wedding-cost', 'sdm-checklist', 'wedding-prep-order'],
    // [CL-TOP20-P2-ARTICLE-20260703-020000] 1,000만원 배분 예시 → 가입 없는 데모 체험 브리지
    contextualCta: {
      label: '가입 없이 예산 배분 체험하기',
      description:
        '이 글의 1,000만 원 배분 예시를 데모 예산에서 직접 조절해보세요. 회원가입 없이 바로 체험할 수 있어요.',
      to: '/demo',
    },
  },

  /* ═══════════════ 4) 결혼 준비 순서 ═══════════════ */
  {
    slug: 'wedding-prep-order',
    seoTitle: '결혼 준비 순서 완벽 가이드 - 시기별 체크리스트 | 웨딩셈',
    title: '결혼 준비 순서 완벽 가이드',
    description:
      '결혼 준비, 언제 무엇부터 해야 할까요? D-12개월부터 D-day까지 시기별로 해야 할 일을 순서대로 정리한 결혼 준비 타임라인 가이드입니다.',
    badge: '시기별 타임라인',
    intro:
      '결혼 준비는 보통 결혼식 6개월~1년 전부터 시작합니다. 예식장처럼 인기 일정이 빨리 마감되는 항목을 먼저 잡고, 시기별로 차근차근 진행하면 됩니다. 아래 타임라인을 그대로 따라가 보세요.',
    datePublished: '2026-05-31',
    dateModified: '2026-05-31',
    sections: [
      {
        heading: '결혼 준비, 언제부터 시작할까?',
        blocks: [
          {
            type: 'paragraph',
            text: '인기 예식장과 스드메 업체는 6개월~1년 전에 예약이 마감되는 경우가 많습니다. 늦어도 결혼식 6개월 전에는 큰 틀(날짜·예산·예식장)을 확정하는 것이 안전합니다.',
          },
        ],
      },
      {
        heading: 'D-12개월 ~ D-9개월: 큰 틀 잡기',
        blocks: [
          {
            type: 'list',
            items: [
              '양가 상견례 및 결혼 합의',
              '결혼식 날짜·총예산 결정',
              '예식장 후보 투어 및 예약',
              '스드메 업체 상담·예약',
            ],
          },
        ],
      },
      {
        heading: 'D-8개월 ~ D-6개월: 핵심 예약',
        blocks: [
          {
            type: 'list',
            items: [
              '스튜디오 웨딩 촬영',
              '신혼여행지 결정 및 항공·숙소 예약',
              '예물·예단 상담',
              '신혼집 알아보기 시작',
            ],
          },
        ],
      },
      {
        heading: 'D-5개월 ~ D-3개월: 디테일 채우기',
        blocks: [
          {
            type: 'list',
            items: [
              '청첩장 디자인·제작',
              '본식 드레스 피팅·가봉',
              '혼수(가전·가구) 구매',
              '신혼집 계약 및 입주 준비',
            ],
          },
        ],
      },
      {
        heading: 'D-2개월 ~ D-day: 마무리',
        blocks: [
          {
            type: 'list',
            items: [
              '청첩장 발송(모바일·종이)',
              '본식 메이크업 리허설',
              '사회자·축가·식순 확정',
              '예단·이바지 준비',
              '최종 리허설 및 비용 정산 점검',
            ],
          },
        ],
      },
      {
        heading: '준비 순서 한눈에 보기',
        blocks: [
          {
            type: 'table',
            headers: ['시기', '핵심 할일'],
            rows: [
              ['D-12 ~ 9개월', '상견례 · 날짜/예산 · 예식장 · 스드메 예약'],
              ['D-8 ~ 6개월', '웨딩 촬영 · 신혼여행 · 예물 · 신혼집 탐색'],
              ['D-5 ~ 3개월', '청첩장 · 드레스 피팅 · 혼수 · 신혼집 계약'],
              ['D-2개월 ~ D-day', '청첩장 발송 · 리허설 · 예단 · 최종 점검'],
            ],
          },
          {
            type: 'paragraph',
            text: '시기별 할일은 결혼식 날짜와 상황에 따라 달라집니다. 웨딩셈의 D-day 체크리스트 AI를 사용하면 결혼일 기준으로 시기별 준비 항목을 자동 생성해 빠짐없이 챙길 수 있습니다.',
          },
        ],
      },
    ],
    related: ['2026-wedding-cost', 'sdm-checklist', 'budget-10million'],
    // [CL-TOP20-P2-ARTICLE-20260703-020000] 시기별 타임라인 → 체크리스트 브리지
    contextualCta: {
      label: '시기별 체크리스트 시작하기',
      description:
        'D-12개월부터 D-day까지, 이 글의 타임라인을 웨딩셈 체크리스트로 하나씩 챙겨보세요.',
      to: '/checklist',
    },
  },

  /* ═══════════════ 5) 예식장 유형별 비용 ═══════════════ */
  {
    slug: 'wedding-venue-types',
    seoTitle: '예식장 유형별 비용 비교 - 호텔·일반홀·하우스·스몰 | 웨딩셈',
    title: '예식장 유형별 비용 완벽 비교',
    description:
      '호텔웨딩, 일반 예식장, 하우스웨딩, 스몰웨딩, 공공예식장의 비용과 장단점을 비교합니다. 대관료·식대·보증인원까지 꼼꼼히 따져 우리 예산에 맞는 예식장을 고르세요.',
    badge: '예식장 선택 가이드',
    intro:
      '예식장은 결혼 비용의 가장 큰 비중을 차지하며, 유형에 따라 분위기와 총비용이 크게 달라집니다. 호텔부터 공공예식장까지 다섯 가지 유형의 비용 구조와 장단점을 비교해 후회 없는 선택을 도와드립니다.',
    datePublished: '2026-06-19',
    dateModified: '2026-06-19',
    sections: [
      {
        heading: '예식장 비용은 무엇으로 결정될까?',
        blocks: [
          {
            type: 'paragraph',
            text: '예식장 비용은 대관료, 1인당 식대, 보증인원(최소 보장 인원), 추가 옵션(꽃·영상·주차)으로 구성됩니다. 특히 보증인원은 실제 하객이 적어도 그만큼의 식대를 내야 하므로, 우리 하객 규모와 맞는 곳을 고르는 것이 핵심입니다.',
          },
          {
            type: 'callout',
            text: '같은 "예식장 비용"이라도 대관료가 0원인 대신 식대가 비싸거나, 보증인원이 높은 곳이 있습니다. 단순 대관료가 아니라 "총비용 = 대관료 + (보증인원 × 식대) + 옵션"으로 비교하세요.',
          },
        ],
      },
      {
        heading: '유형별 비용·특징 비교',
        blocks: [
          {
            type: 'table',
            headers: ['유형', '1인 식대', '특징'],
            rows: [
              ['호텔웨딩', '12만 ~ 20만 원', '품격·서비스 최고, 보증인원·총비용 높음'],
              ['일반 예식장', '5만 ~ 8만 원', '대중적·합리적, 시간대별 예식 진행'],
              ['하우스/컨벤션', '7만 ~ 13만 원', '단독 공간·분위기, 옵션비 주의'],
              ['스몰웨딩홀', '4만 ~ 7만 원', '소규모(50~100명), 보증인원 낮음'],
              ['공공예식장', '0 ~ 3만 원', '구청·복지관 등, 대관료 매우 저렴'],
            ],
          },
          {
            type: 'paragraph',
            text: '호텔웨딩은 200명 기준 총 3,000만 원 이상도 가능한 반면, 공공예식장·스몰웨딩은 1,000만 원 이하로도 충분합니다.',
          },
        ],
      },
      {
        heading: '유형별 장단점',
        blocks: [
          {
            type: 'list',
            items: [
              '호텔웨딩: (장) 원스톱 서비스·고급스러움 (단) 높은 비용·보증인원 부담',
              '일반 예식장: (장) 합리적 가격·접근성 (단) 시간 제약·획일적 분위기',
              '하우스웨딩: (장) 독립적 공간·자유로운 연출 (단) 꽃·음향 등 옵션비 증가',
              '스몰웨딩: (장) 친밀한 분위기·비용 절감 (단) 하객 규모 제한',
              '공공예식장: (장) 압도적 저렴함 (단) 예약 경쟁·기본 시설',
            ],
          },
        ],
      },
      {
        heading: '예식장 계약 전 체크리스트',
        blocks: [
          {
            type: 'list',
            items: [
              '보증인원과 1인 식대, 초과 시 추가 단가 확인',
              '대관료에 포함된 항목(꽃·음향·주차·폐백실) 범위',
              '식사 메뉴 등급별 가격과 주류·음료 비용',
              '예식 시간(타임)과 리허설·세팅 가능 시간',
              '계약금·잔금 일정과 취소·연기 위약금 규정',
            ],
          },
          {
            type: 'paragraph',
            text: '마음에 드는 예식장을 골랐다면, 보증인원과 식대를 웨딩셈 예산 시뮬레이터에 입력해 전체 예산과 함께 비교해 보세요.',
          },
        ],
      },
    ],
    related: ['2026-wedding-cost', 'small-wedding', 'wedding-gift-money'],
    // [CL-TOP20-P2-ARTICLE-20260703-020000] 예식장 총비용 비교 → 예산 시뮬레이터 브리지
    contextualCta: {
      label: '예식장 비용, 내 예산과 비교하기',
      description:
        '후보 예식장의 대관료·식대·보증인원을 웨딩셈에 입력하면 유형별 총비용을 평균과 비교할 수 있어요.',
      to: '/budget',
    },
  },

  /* ═══════════════ 6) 스몰웨딩 완벽 가이드 ═══════════════ */
  {
    slug: 'small-wedding',
    seoTitle: '스몰웨딩 비용과 장단점 - 50~100명 결혼식 | 웨딩셈',
    title: '스몰웨딩 완벽 가이드',
    description:
      '스몰웨딩의 평균 비용, 장단점, 진행 방식을 정리했습니다. 하우스웨딩·레스토랑웨딩 등 형태별 특징과 양가 설득 팁까지, 작지만 의미 있는 결혼식을 준비하세요.',
    badge: '실속·감성 결혼',
    intro:
      '스몰웨딩은 50~100명 내외의 가까운 사람만 초대해 친밀하게 치르는 결혼식입니다. 비용 절감뿐 아니라 두 사람다운 결혼식을 원하는 커플에게 인기가 높습니다. 비용과 현실적인 준비법을 안내합니다.',
    datePublished: '2026-06-19',
    dateModified: '2026-06-19',
    sections: [
      {
        heading: '스몰웨딩이란?',
        blocks: [
          {
            type: 'paragraph',
            text: '스몰웨딩은 정해진 정의는 없지만 보통 하객 100명 이하, 가족·친한 친구 중심의 소규모 결혼식을 뜻합니다. 하우스웨딩, 레스토랑웨딩, 야외웨딩, 스몰웨딩홀 등 형태가 다양합니다.',
          },
        ],
      },
      {
        heading: '스몰웨딩 평균 비용',
        blocks: [
          {
            type: 'table',
            headers: ['항목', '비용 범위', '비고'],
            rows: [
              ['공간 대관·식대(60명)', '400만 ~ 900만 원', '레스토랑·하우스 기준'],
              ['스드메(실속)', '150만 ~ 350만 원', '셀프 스냅 활용 시 절감'],
              ['플라워·데코', '100만 ~ 300만 원', '공간 직접 연출 가능'],
              ['사회·연주·기타', '50만 ~ 150만 원', '지인 도움 시 절감'],
            ],
          },
          {
            type: 'paragraph',
            text: '총 700만~1,700만 원 선에서 준비 가능하며, 일반 예식장 대비 식대·대관료를 크게 줄일 수 있습니다.',
          },
        ],
      },
      {
        heading: '장점과 단점',
        blocks: [
          {
            type: 'list',
            items: [
              '장점: 친밀한 분위기, 비용 절감, 자유로운 연출, 하객 한 명 한 명에 집중',
              '단점: 하객 초대 범위 고민, 양가 어른 설득 필요, 축의금 규모 축소',
              '주의: 공간에 따라 음향·주차·날씨(야외) 변수를 미리 점검',
            ],
          },
        ],
      },
      {
        heading: '양가 어른 설득 팁',
        blocks: [
          {
            type: 'callout',
            text: '"비용을 아끼려는 것"이 아니라 "소중한 분들과 깊이 있는 시간을 보내고 싶다"는 가치를 전하면 설득이 쉬워집니다. 양가 하객 수를 미리 합의하고, 어른들이 초대하고 싶은 분을 존중하는 것이 핵심입니다.',
          },
        ],
      },
      {
        heading: '스몰웨딩, 이렇게 준비하세요',
        blocks: [
          {
            type: 'list',
            items: [
              '하객 명단을 먼저 확정해 공간 규모 결정',
              '레스토랑·하우스는 식음료 최소 보장 금액 확인',
              '셀프 청첩장·셀프 스냅으로 합리적 절감',
              '예상 하객·축의금을 예산에 반영해 자기부담금 계산',
            ],
          },
          {
            type: 'paragraph',
            text: '스몰웨딩은 항목이 단순한 만큼 예산 관리가 쉽습니다. 웨딩셈으로 공간·스드메·데코 비용을 입력해 총비용을 미리 가늠해 보세요.',
          },
        ],
      },
    ],
    related: ['wedding-venue-types', 'budget-10million', '2026-wedding-cost'],
  },

  /* ═══════════════ 7) 본식 스냅·영상 가이드 ═══════════════ */
  {
    slug: 'main-snap-dvd',
    seoTitle: '본식 스냅·영상(DVD) 비용과 선택법 | 웨딩셈',
    title: '본식 스냅·영상 완벽 가이드',
    description:
      '본식 당일 사진(본식 스냅)과 영상(DVD)의 비용, 단독/원본/2부 등 옵션, 업체 선택 팁을 정리했습니다. 평생 남는 기록, 후회 없이 준비하세요.',
    badge: '평생 남는 기록',
    intro:
      '예식은 한순간이지만 사진과 영상은 평생 남습니다. 스튜디오 촬영(웨딩 화보)과 별개로 본식 당일을 기록하는 본식 스냅·영상은 만족도가 가장 높은 투자 중 하나입니다. 비용과 선택 기준을 안내합니다.',
    datePublished: '2026-06-19',
    dateModified: '2026-06-19',
    sections: [
      {
        heading: '본식 스냅과 스튜디오 촬영의 차이',
        blocks: [
          {
            type: 'paragraph',
            text: '스튜디오 촬영은 예식 전 화보 형식의 웨딩 사진이고, 본식 스냅은 결혼식 당일의 실제 순간(입장·서약·하객)을 담는 다큐멘터리형 사진입니다. 두 가지는 목적이 다르므로 보통 별도로 준비합니다.',
          },
        ],
      },
      {
        heading: '비용 범위',
        blocks: [
          {
            type: 'table',
            headers: ['구분', '비용 범위', '비고'],
            rows: [
              ['본식 스냅(작가 1인)', '30만 ~ 70만 원', '원본 + 보정본 제공'],
              ['본식 스냅(2인·풀데이)', '60만 ~ 120만 원', '메인+서브 작가'],
              ['본식 영상(DVD)', '40만 ~ 100만 원', '하이라이트 + 풀영상'],
              ['수정·추가 옵션', '10만 ~ 30만 원', '추가 보정·원본 구매'],
            ],
          },
        ],
      },
      {
        heading: '꼭 확인할 체크포인트',
        blocks: [
          {
            type: 'list',
            items: [
              '원본 제공 여부와 보정본 장수',
              '작가 1인/2인 여부와 촬영 범위(준비 ~ 폐백)',
              '결과물 수령까지 소요 기간',
              '영상은 하이라이트만인지 풀영상 포함인지',
              '예식장 자체 스냅과 외부 작가 반입 가능 여부(반입료 확인)',
            ],
          },
          {
            type: 'callout',
            text: '예식장에서 제공하는 기본 스냅은 품질·구도가 제한적인 경우가 많습니다. 외부 작가를 부를 경우 "반입료(외부업체 비용)"가 별도로 붙는지 반드시 확인하세요.',
          },
        ],
      },
      {
        heading: '업체 선택 팁',
        blocks: [
          {
            type: 'list',
            items: [
              '작가 포트폴리오에서 "본식" 사진 위주로 확인(화보 말고 당일 사진)',
              '같은 예식장에서 촬영한 샘플이 있으면 조명·동선 파악에 유리',
              '계약 시 담당 작가 지정 여부 확인',
              '후기에서 결과물 수령 기간·소통 만족도 점검',
            ],
          },
          {
            type: 'paragraph',
            text: '본식 스냅·영상 비용은 스드메와 별도 항목으로 잡아두는 것이 좋습니다. 웨딩셈에서 사용자 지정 항목으로 추가해 누락 없이 관리하세요.',
          },
        ],
      },
    ],
    related: ['sdm-checklist', 'wedding-prep-order', '2026-wedding-cost'],
  },

  /* ═══════════════ 8) 청첩장 가이드 ═══════════════ */
  {
    slug: 'invitation-guide',
    seoTitle: '청첩장 가이드 - 모바일·종이 비용과 매너 | 웨딩셈',
    title: '청첩장 준비 완벽 가이드',
    description:
      '종이 청첩장과 모바일 청첩장의 비용, 제작 시기, 발송 매너를 정리했습니다. 문구 작성법과 하객 명단 관리까지, 첫인사를 우아하게 준비하세요.',
    badge: '첫인사 매너',
    intro:
      '청첩장은 결혼 소식을 전하는 첫인사입니다. 최근에는 모바일 청첩장이 기본이 되었지만, 어른들께는 종이 청첩장을 함께 준비하는 경우가 많습니다. 비용·시기·매너를 한 번에 정리했습니다.',
    datePublished: '2026-06-19',
    dateModified: '2026-06-19',
    sections: [
      {
        heading: '모바일 vs 종이 청첩장',
        blocks: [
          {
            type: 'table',
            headers: ['구분', '비용', '특징'],
            rows: [
              ['모바일 청첩장', '0 ~ 5만 원', '지도·계좌·갤러리·참석 의사 기능'],
              ['종이 청첩장', '장당 500 ~ 1,500원', '어른·직장 격식, 최소 수량 주의'],
              ['셀프 제작', '디자인비 절감', '템플릿 활용·직접 편집'],
            ],
          },
          {
            type: 'paragraph',
            text: '모바일은 비용이 거의 들지 않고 정보 전달이 편리하며, 종이는 어른들과 격식이 필요한 자리에 적합합니다. 보통 둘을 병행합니다.',
          },
        ],
      },
      {
        heading: '제작·발송 시기',
        blocks: [
          {
            type: 'list',
            items: [
              '제작: 결혼식 약 2개월 전 디자인·문구 확정',
              '종이 발송: 결혼식 4~6주 전(어른·직장)',
              '모바일 발송: 결혼식 3~4주 전(친구·지인)',
              '리마인드: 결혼식 1주 전 참석 인원 최종 확인',
            ],
          },
        ],
      },
      {
        heading: '청첩장 문구 작성 팁',
        blocks: [
          {
            type: 'list',
            items: [
              '양가 부모님 성함과 신랑·신부 이름, 관계(아들/딸) 표기',
              '일시·장소·교통·주차 정보 정확히',
              '식사 여부·폐백·주차 안내 등 실용 정보 포함',
              '계좌번호는 모바일에 별도 버튼으로(직접 노출 부담 줄이기)',
            ],
          },
          {
            type: 'callout',
            text: '하객 명단은 양가·신랑·신부별로 나눠 관리하면 식대 예측과 답례품 수량 계산이 쉬워집니다. 모바일 청첩장의 "참석 의사" 기능을 켜두면 인원 파악에 큰 도움이 됩니다.',
          },
        ],
      },
      {
        heading: '발송 매너',
        blocks: [
          {
            type: 'list',
            items: [
              '단체방 일괄 발송보다 개별 메시지가 정중합니다.',
              '오랜만에 연락하는 지인에게는 안부 인사를 먼저.',
              '참석이 어려운 분께도 소식을 전하는 것이 예의입니다.',
            ],
          },
          {
            type: 'paragraph',
            text: '청첩장 비용은 작지만 누락하기 쉬운 항목입니다. 웨딩셈의 기타 카테고리에 청첩장·답례품을 추가해 함께 관리하세요.',
          },
        ],
      },
    ],
    related: ['wedding-prep-order', 'wedding-gift-money', '2026-wedding-cost'],
  },

  /* ═══════════════ 9) 예단·예물·함 가이드 ═══════════════ */
  {
    slug: 'yedan-yemul',
    seoTitle: '예단·예물·함 비용과 간소화 방법 | 웨딩셈',
    title: '예단·예물·함 완벽 가이드',
    description:
      '예단, 예물, 함의 의미와 평균 비용, 최근 간소화 트렌드를 정리했습니다. 양가 갈등 없이 합리적으로 전통 절차를 준비하는 방법을 안내합니다.',
    badge: '전통 절차',
    intro:
      '예단·예물·함은 양가가 정성을 주고받는 전통 절차입니다. 금액과 형식이 정해져 있지 않아 갈등의 소지가 되기도 합니다. 의미와 평균 비용, 그리고 최근의 간소화 흐름을 정리했습니다.',
    datePublished: '2026-06-19',
    dateModified: '2026-06-19',
    sections: [
      {
        heading: '예단·예물·함이란?',
        blocks: [
          {
            type: 'list',
            items: [
              '예단: 신부 측이 시댁에 보내는 정성(현물 예단 또는 현금 예단)',
              '예물: 신랑·신부가 주고받는 반지·시계 등 귀금속',
              '함: 신랑 측이 신부 측에 보내는 혼서지·채단 등을 담은 상자',
            ],
          },
        ],
      },
      {
        heading: '평균 비용 범위',
        blocks: [
          {
            type: 'table',
            headers: ['항목', '비용 범위', '비고'],
            rows: [
              ['예단(현금/현물)', '300만 ~ 1,000만 원', '양가 협의로 큰 편차'],
              ['예물(반지·시계)', '200만 ~ 800만 원', '귀금속 시세 영향'],
              ['함·혼수품', '50만 ~ 200만 원', '간소화 추세'],
            ],
          },
          {
            type: 'paragraph',
            text: '예단·예물은 양가 합의에 따라 크게 달라지며, 최근에는 서로 부담을 줄이는 방향으로 간소화하는 커플이 많습니다.',
          },
        ],
      },
      {
        heading: '간소화 트렌드',
        blocks: [
          {
            type: 'list',
            items: [
              '예단: 현물 대신 "현금 예단"으로 간소화하거나 생략',
              '예물: 화려한 세트 대신 심플한 웨딩밴드 중심',
              '함: 함진아비 없이 가족끼리 간소하게 전달',
              '"서로 안 하기"로 양가가 합의하는 경우도 증가',
            ],
          },
          {
            type: 'callout',
            text: '가장 중요한 것은 양가의 "사전 합의"입니다. 금액보다 서로의 마음과 형편을 존중하는 대화가 갈등을 막습니다. 결정 전 양가 부모님과 충분히 상의하세요.',
          },
        ],
      },
      {
        heading: '준비 시 유의점',
        blocks: [
          {
            type: 'list',
            items: [
              '예단·예물 규모를 양가가 먼저 합의한 뒤 진행',
              '귀금속은 시세 변동이 크므로 여유 시점에 구매',
              '현물 예단은 보관·전달 일정까지 고려',
              '영수증·내역을 정리해 양가 오해 방지',
            ],
          },
          {
            type: 'paragraph',
            text: '예단·예물은 금액이 큰 만큼 예산에서 빠지면 안 되는 항목입니다. 웨딩셈에서 예물·예단 항목을 분담(신랑/신부/같이)과 함께 기록해 투명하게 관리하세요.',
          },
        ],
      },
    ],
    related: ['2026-wedding-cost', 'honsu-appliances', 'budget-10million'],
  },

  /* ═══════════════ 10) 신혼집 비용·대출 ═══════════════ */
  {
    slug: 'newlywed-home',
    seoTitle: '신혼집 비용과 전세·대출 가이드 | 웨딩셈',
    title: '신혼집 비용·대출 완벽 가이드',
    description:
      '신혼집 마련 비용(전세·매매·월세)과 신혼부부 전세자금대출, 디딤돌·버팀목 등 정책 대출을 정리했습니다. 결혼 비용의 가장 큰 항목을 현명하게 준비하세요.',
    badge: '가장 큰 비용',
    intro:
      '신혼집은 결혼 비용에서 가장 큰 비중(전체의 70~80%)을 차지합니다. 지역과 형태에 따라 편차가 매우 커서 별도로 계획해야 합니다. 비용 유형과 신혼부부가 활용할 수 있는 정책 대출을 안내합니다.',
    datePublished: '2026-06-19',
    dateModified: '2026-06-19',
    sections: [
      {
        heading: '신혼집 마련 방식',
        blocks: [
          {
            type: 'list',
            items: [
              '전세: 목돈이 필요하지만 월 주거비 부담이 적음',
              '매매: 자산 형성 가능하나 초기 자금·대출 부담 큼',
              '월세/반전세: 초기 비용이 적어 자금이 부족할 때 선택',
              '공공임대·행복주택: 신혼부부 특별공급 등 정책 활용',
            ],
          },
        ],
      },
      {
        heading: '신혼부부 정책 대출(참고)',
        blocks: [
          {
            type: 'table',
            headers: ['구분', '대상', '특징'],
            rows: [
              ['버팀목 전세대출', '무주택 신혼부부', '전세보증금 저리 대출'],
              ['디딤돌 대출', '무주택 실수요자', '주택 구입 자금 저리 대출'],
              ['신생아 특례', '출산 가구', '우대 금리(자격 요건 확인)'],
            ],
          },
          {
            type: 'callout',
            text: '정책 대출의 금리·한도·자격 요건은 정부 정책과 소득·자산 기준에 따라 수시로 바뀝니다. 반드시 주택도시기금·은행 등 공식 채널에서 최신 조건을 확인하세요. 본 내용은 참고용입니다.',
          },
        ],
      },
      {
        heading: '신혼집 준비 순서',
        blocks: [
          {
            type: 'list',
            items: [
              '가용 자금(저축·양가 지원) 파악',
              '직장·생활권 기준 지역·예산 범위 결정',
              '대출 한도·금리 사전 상담(가심사)',
              '매물 탐색 → 계약 → 잔금·입주 일정 조율',
            ],
          },
        ],
      },
      {
        heading: '예산 계획 시 유의점',
        blocks: [
          {
            type: 'paragraph',
            text: '신혼집은 결혼식 비용과 성격이 완전히 다르므로 분리해서 계획하는 것이 좋습니다. 보증금·중개수수료·이사비·도배 등 부대비용도 빠뜨리지 마세요. 웨딩셈에서는 결혼식 관련 비용에 집중하되, 신혼집 부대비용을 별도 항목으로 메모해 전체 자금 흐름을 함께 점검할 수 있습니다.',
          },
        ],
      },
    ],
    related: ['honsu-appliances', '2026-wedding-cost', 'budget-10million'],
  },

  /* ═══════════════ 11) 혼수 가전·가구 ═══════════════ */
  {
    slug: 'honsu-appliances',
    seoTitle: '혼수 가전·가구 구매 가이드와 예산 | 웨딩셈',
    title: '혼수 가전·가구 완벽 가이드',
    description:
      '혼수 가전·가구의 필수 품목, 평균 예산, 절약 구매 전략을 정리했습니다. 혼수 박람회·렌탈·중고 활용까지, 신혼 살림을 알뜰하게 채우는 법을 안내합니다.',
    badge: '신혼 살림',
    intro:
      '혼수는 신혼집을 채우는 가전·가구로, 보통 500만~2,000만 원이 듭니다. 무엇을 먼저 사고 어디서 사느냐에 따라 비용 차이가 큽니다. 필수 품목과 절약 구매 전략을 정리했습니다.',
    datePublished: '2026-06-19',
    dateModified: '2026-06-19',
    sections: [
      {
        heading: '혼수 필수 품목 체크리스트',
        blocks: [
          {
            type: 'list',
            items: [
              '대형 가전: 냉장고, 세탁기(건조기), 에어컨, TV',
              '주방: 인덕션/가스레인지, 전자레인지, 식기세척기(선택)',
              '가구: 침대, 옷장, 소파, 식탁, 책상',
              '소형: 청소기, 공기청정기, 밥솥, 커피머신 등',
            ],
          },
        ],
      },
      {
        heading: '예산 배분 예시',
        blocks: [
          {
            type: 'table',
            headers: ['구분', '예산 범위', '비고'],
            rows: [
              ['대형 가전', '300만 ~ 1,000만 원', '냉장고·세탁기·TV 중심'],
              ['가구', '150만 ~ 700만 원', '침대·옷장·소파'],
              ['소형 가전·주방', '100만 ~ 400만 원', '생활 편의 품목'],
            ],
          },
          {
            type: 'paragraph',
            text: '신혼집 크기와 빌트인 포함 여부에 따라 달라집니다. 빌트인 가전이 있는 집이라면 혼수 비용을 크게 줄일 수 있습니다.',
          },
        ],
      },
      {
        heading: '절약 구매 전략',
        blocks: [
          {
            type: 'list',
            items: [
              '혼수 박람회·가전 패키지로 묶음 할인',
              '신혼 가전은 "이전 연식 모델"이 가성비 우수',
              '건조기·식기세척기 등은 렌탈로 초기 부담 분산',
              '가구는 전시상품·이사 시즌 할인 활용',
              '필수부터 구매하고, 소형 가전은 천천히 채우기',
            ],
          },
          {
            type: 'callout',
            text: '혼수는 한 번에 다 살 필요가 없습니다. 입주 시 꼭 필요한 대형 가전·침대부터 마련하고, 나머지는 살면서 채우면 초기 부담과 충동구매를 줄일 수 있습니다.',
          },
        ],
      },
      {
        heading: '구매 시 유의점',
        blocks: [
          {
            type: 'list',
            items: [
              '신혼집 평면도·콘센트 위치를 확인하고 가전 크기 결정',
              '배송·설치 일정을 입주일에 맞춰 조율',
              '에너지효율 등급으로 장기 전기료까지 고려',
              '구매 내역을 기록해 예산 초과 방지',
            ],
          },
          {
            type: 'paragraph',
            text: '혼수는 품목이 많아 예산을 넘기기 쉽습니다. 웨딩셈의 혼수 카테고리에 품목별 금액을 입력하면 총액과 결제 현황을 한눈에 관리할 수 있습니다.',
          },
        ],
      },
    ],
    related: ['newlywed-home', 'yedan-yemul', '2026-wedding-cost'],
  },

  /* ═══════════════ 12) 축의금·하객수 예측 ═══════════════ */
  {
    slug: 'wedding-gift-money',
    seoTitle: '축의금 적정 금액과 하객수 예측법 | 웨딩셈',
    title: '축의금·하객수 완벽 가이드',
    description:
      '축의금 적정 금액 기준, 하객 수 예측 방법, 예상 축의금으로 자기부담금을 계산하는 법을 정리했습니다. 식대와 축의금의 균형을 맞춰 예산을 현명하게 짜세요.',
    badge: '예산의 균형추',
    intro:
      '축의금과 하객 수는 결혼 예산의 "수입"에 해당합니다. 식대(지출)와 축의금(수입)의 균형을 미리 가늠하면 실제 자기부담금을 정확히 계산할 수 있습니다. 적정 금액과 예측법을 안내합니다.',
    datePublished: '2026-06-19',
    dateModified: '2026-06-19',
    sections: [
      {
        heading: '축의금 적정 금액 기준',
        blocks: [
          {
            type: 'table',
            headers: ['관계', '일반적 금액', '비고'],
            rows: [
              ['직장 동료·지인', '5만 원', '식사 참석 기준 보편적'],
              ['친구·가까운 사이', '7만 ~ 10만 원', '친밀도에 따라'],
              ['오랜 친구·가족 지인', '10만 ~ 20만 원', '관계 깊이 반영'],
              ['친척', '10만 ~ 30만 원 이상', '집안 관례에 따라'],
            ],
          },
          {
            type: 'paragraph',
            text: '금액은 지역·관계·식사 참석 여부에 따라 달라지며, 위 금액은 일반적인 참고치입니다.',
          },
        ],
      },
      {
        heading: '하객 수 예측 방법',
        blocks: [
          {
            type: 'list',
            items: [
              '양가·신랑·신부별로 초대 명단을 나눠 작성',
              '"초대 인원" 중 실제 참석률(보통 60~80%)을 적용',
              '직장·지인은 참석률이 낮고, 가족·친척은 높은 편',
              '모바일 청첩장의 참석 의사 기능으로 실측 보정',
            ],
          },
        ],
      },
      {
        heading: '자기부담금 계산법',
        blocks: [
          {
            type: 'paragraph',
            text: '자기부담금 = 총 결혼 비용 − 예상 축의금 − 양가 지원금. 예를 들어 총비용 4,000만 원, 예상 축의금 1,800만 원, 양가 지원 1,000만 원이면 실제 자기부담금은 약 1,200만 원입니다. 축의금을 과대평가하면 예산이 틀어지므로 보수적으로 잡는 것이 안전합니다.',
          },
          {
            type: 'callout',
            text: '축의금은 변수가 크므로 "받을 것"을 낙관적으로 잡지 마세요. 참석률과 금액을 보수적으로 추정해야 실제 부담을 정확히 예측할 수 있습니다.',
          },
        ],
      },
      {
        heading: '예산에 반영하기',
        blocks: [
          {
            type: 'list',
            items: [
              '하객 수 × 평균 축의금으로 예상 수입 추정',
              '하객 수 × 1인 식대로 식대 지출 계산',
              '식대와 축의금의 차액으로 순지출 파악',
              '양가 지원금까지 합산해 최종 자기부담금 산출',
            ],
          },
          {
            type: 'paragraph',
            text: '웨딩셈에 하객 수와 식대를 입력하면 식대 지출이 자동 계산됩니다. 예상 축의금과 비교해 실제 부담을 한눈에 확인하세요.',
          },
        ],
      },
    ],
    related: ['wedding-venue-types', '2026-wedding-cost', 'wedding-prep-order'],
    // [CL-TOP20-P2-ARTICLE-20260703-020000] 축의금(수입)·식대(지출) 균형 → 가입 없는 데모 체험 브리지
    contextualCta: {
      label: '축의금·식대 밸런스 계산해보기',
      description:
        '하객 수와 식대를 넣으면 예상 축의금 대비 실제 자기부담금을 가입 없이 바로 확인할 수 있어요.',
      to: '/demo',
    },
  },
];

// [CL-SEO-ARTICLE-FAQ-20260626] T3 병합: 신규 아티클 추가 + 기존 아티클에 FAQ 부착(slug 기준, 인라인 faqs 우선).
ARTICLES.push(...NEW_ARTICLES);
ARTICLES.push(...NEW_T4); // [CL-ADSENSE-CONTENT-20260630] 데이터 허브 + 신규 pillar
for (const a of ARTICLES) {
  if (!a.faqs && ARTICLE_FAQS[a.slug]) a.faqs = ARTICLE_FAQS[a.slug];
  if (!a.faqs && ARTICLE_FAQS_T4[a.slug]) a.faqs = ARTICLE_FAQS_T4[a.slug]; // [CL-ADSENSE-CONTENT-20260630]
  // [CL-ADSENSE-CONTENT-20260630] 원본성: 인라인 미설정 시 검증된 출처/방법론 맵을 부착(전 아티클 출처 보유).
  if (!a.sources && ARTICLE_SOURCES[a.slug]) a.sources = ARTICLE_SOURCES[a.slug];
  if (!a.methodology && ARTICLE_METHODOLOGY[a.slug]) a.methodology = ARTICLE_METHODOLOGY[a.slug];
}

/* ─── 조회 헬퍼 ─── */
export function getArticle(slug: string | undefined): Article | undefined {
  if (!slug) return undefined;
  return ARTICLES.find((a) => a.slug === slug);
}

export function getAllArticleSlugs(): string[] {
  return ARTICLES.map((a) => a.slug);
}

/** [CL-SEO-ARTICLE-META-20260626] 본문 글자수 합산(intro + 모든 블록 텍스트). 한국어 글자수 기준 근사. */
export function countArticleWords(article: Article): number {
  let n = (article.intro ?? '').length;
  for (const sec of article.sections) {
    n += (sec.heading ?? '').length;
    for (const b of sec.blocks) {
      if (b.type === 'paragraph' || b.type === 'callout' || b.type === 'heading3') n += b.text.length;
      else if (b.type === 'list') n += b.items.reduce((s, it) => s + it.length, 0);
      else if (b.type === 'table') n += b.rows.reduce((s, r) => s + r.reduce((s2, c) => s2 + c.length, 0), 0);
    }
  }
  if (article.faqs) n += article.faqs.reduce((s, f) => s + f.q.length + f.a.length, 0);
  return n;
}

/**
 * [CL-TOP20-P2-ARTICLE-20260703-020000] 읽기 시간 추정(분) — 순수 함수.
 * countArticleWords(한국어 글자수 근사)를 재사용, 한국어 평균 독해 속도 250자/분 기준 올림. 최소 1분 보장.
 */
export function estimateReadingMinutes(article: Article): number {
  return Math.max(1, Math.ceil(countArticleWords(article) / 250));
}

/** Article 의 mainEntityOfPage 구조화 데이터 (강화: wordCount·articleSection·keywords·아티클별 image) */
export function getArticleJsonLd(article: Article) {
  const pageUrl = `${BASE_DOMAIN}/guide/${article.slug}/`;
  const image = article.image
    ? (article.image.startsWith('http') ? article.image : `${BASE_DOMAIN}${article.image}`)
    : `${BASE_DOMAIN}/og-image.png`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.datePublished,
    dateModified: article.dateModified,
    inLanguage: 'ko',
    articleSection: article.category ?? '결혼 준비 가이드',
    wordCount: countArticleWords(article),
    ...(article.keywords && article.keywords.length ? { keywords: article.keywords.join(', ') } : {}),
    // [CL-ADSENSE-CONTENT-20260630] E-E-A-T: 저자/편집자/검수 명시(편집팀 기본) — '자동 생성 의심' 완화.
    author: { '@type': 'Organization', name: article.author ?? '웨딩셈 편집팀' },
    editor: { '@type': 'Organization', name: article.reviewedBy ?? '웨딩셈 편집팀' },
    publisher: {
      '@type': 'Organization',
      name: '웨딩셈',
      logo: { '@type': 'ImageObject', url: `${BASE_DOMAIN}/favicon.png` },
    },
    // [CL-ADSENSE-CONTENT-20260630] 원본성: 참고 자료를 citation 으로 노출(있을 때만).
    ...(article.sources && article.sources.length
      ? {
          citation: article.sources.map((s) => ({
            '@type': 'CreativeWork',
            name: s.title,
            ...(s.url ? { url: s.url } : {}),
            ...(s.publisher ? { publisher: { '@type': 'Organization', name: s.publisher } } : {}),
          })),
        }
      : {}),
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
    image,
  };
}

/** [CL-SEO-ARTICLE-FAQ-20260626] 아티클 FAQ → FAQPage 구조화데이터(있을 때만). 리치결과(아티클별 FAQ) 노출용. */
export function getArticleFaqJsonLd(article: Article) {
  if (!article.faqs || article.faqs.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: article.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}
