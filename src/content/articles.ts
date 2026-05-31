/**
 * [CL-SSG-PRERENDER-20260531] 데이터 주도 결혼 가이드 아티클 레지스트리 (W6)
 *
 * 신규 SEO 콘텐츠를 코드 1곳(이 파일)에 데이터로 추가하면
 * - /guide/:slug 라우트가 자동 렌더 (src/pages/Article.tsx)
 * - 프리렌더 매니페스트(scripts/prerender.mjs)에 slug 추가 시 정적 HTML 생성
 * - 사이트맵에 자동 포함
 * 되도록 설계. 본문 수치는 Guide.tsx / FAQ.tsx 와 정합을 유지한다.
 */

const BASE_DOMAIN = 'https://wedsem.moderninsightspot.com';

/* ─── 콘텐츠 블록 모델 ─── */
export type ArticleBlock =
  | { type: 'paragraph'; text: string }
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
  },
];

/* ─── 조회 헬퍼 ─── */
export function getArticle(slug: string | undefined): Article | undefined {
  if (!slug) return undefined;
  return ARTICLES.find((a) => a.slug === slug);
}

export function getAllArticleSlugs(): string[] {
  return ARTICLES.map((a) => a.slug);
}

/** Article + 의 mainEntityOfPage 구조화 데이터 */
export function getArticleJsonLd(article: Article) {
  const pageUrl = `${BASE_DOMAIN}/guide/${article.slug}/`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.datePublished,
    dateModified: article.dateModified,
    inLanguage: 'ko',
    author: { '@type': 'Organization', name: '웨딩셈' },
    publisher: {
      '@type': 'Organization',
      name: '웨딩셈',
      logo: { '@type': 'ImageObject', url: `${BASE_DOMAIN}/favicon.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
    image: `${BASE_DOMAIN}/og-image.png`,
  };
}
