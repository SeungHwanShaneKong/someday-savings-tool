// [CL-ADSENSE-CONTENT-20260630] 아티클 출처/방법론 맵 — 원본성(E-E-A-T) 강화.
//
// 목적: AdSense "원본성/출처 없는 수치" 거절 극복. 기존 14편 각 객체를 수정하지 않고,
//   ARTICLE_FAQS 와 동일하게 slug 기준으로 '검증된 실제 공개 출처'와 '자체 추정 방법론'을 부착한다.
//   articles.ts 병합 루프가 a.sources / a.methodology 미설정 시 이 맵을 적용.
//
// ⚠️ 출처 원칙(엄수): 여기 등재된 URL 은 모두 실재하는 공개 자료로, 리서치 단계에서 접근 확인됨(WebFetch OK).
//   존재하지 않는 출처·임의 수치 날조 금지. 수치는 발행 시점 기준이며 본문은 '범위'로 안내한다.
import type { Article } from './articles';

type Source = NonNullable<Article['sources']>[number];

/** 자주 인용되는 공개 출처(중복 정의 방지용 상수).
 *  [CL-ADSENSE-MAX-20260709-234500] t5/t6 신규 아티클이 재사용하도록 export 승격(중복 정의 금지). */
export const S = {
  // [CL-COST-2026Q2-20260713-231500] 듀오 2026년판으로 갱신(2026-03-11 발표, 조사 2025.11 신혼부부 1,000명) — 원문 실접근 확인.
  duo: {
    title: '2026 결혼비용 실태 보고서 — 신혼부부 1,000명 조사',
    url: 'https://www.businesskorea.co.kr/news/articleView.html?idxno=264825',
    publisher: '결혼정보회사 듀오(언론 보도)',
  } as Source,
  // [CL-COST-2026Q2-20260713-231500] 참가격 2026년 2월 기준 가격동향(2026-03-30 보도) — 결혼서비스 평균 2,139만·대관료 중간 350만·스드메 294만.
  kcaTrend2026: {
    title: '결혼서비스 가격동향(2026년 2월 기준) — 평균·대관료·스드메 중간가',
    url: 'https://www.newsin.co.kr/news/articleView.html?idxno=130836',
    publisher: '한국소비자원 참가격(언론 보도)',
  } as Source,
  kcaWedding: {
    title: '결혼서비스(예식장·스드메) 지역별 가격 통계',
    url: 'https://www.price.go.kr/tprice/portal/wedding/areaStatistic.do',
    publisher: '한국소비자원 참가격',
  } as Source,
  kcaPrice: {
    title: '전국 결혼서비스 가격 첫 공개 — 평균·항목별 비용',
    url: 'https://www.khan.co.kr/article/202505281525001',
    publisher: '한국소비자원(언론 보도)',
  } as Source,
  sdm: {
    title: '스드메 패키지 전국 중간가격(스튜디오·드레스·메이크업)',
    url: 'https://www.news1.kr/economy/trend/5862141',
    publisher: '한국소비자원 참가격(언론 보도)',
  } as Source,
  statMarriage: {
    title: '2024년 혼인·이혼 통계 — 혼인 건수·초혼 연령',
    url: 'https://www.korea.kr/briefing/policyBriefingView.do?newsId=156679907',
    publisher: '통계청 / 정책브리핑',
  } as Source,
  statNewlywed: {
    title: '신혼부부 통계 — 대출 보유·잔액',
    url: 'https://www.korea.kr/briefing/pressReleaseView.do?newsId=156734827',
    publisher: '통계청 / 정책브리핑',
  } as Source,
  gift: {
    title: '평균 축의금 분석(2025) — 이체 데이터 기반',
    url: 'https://www.hankookilbo.com/news/article/A2026051408150000581',
    publisher: 'NH농협은행(언론 보도)',
  } as Source,
  guests: {
    title: '결혼식 평균 하객 수 조사(약 279명)',
    url: 'https://www.thefairnews.co.kr/news/articleView.html?idxno=23555',
    publisher: '결혼정보회사 듀오(언론 보도)',
  } as Source,
  kcaDisclosure: {
    title: '결혼서비스 가격 공개 확대 — 미공개 업체 현황',
    url: 'https://www.kca.go.kr/webzine/board/view?menuId=MENU00307&linkId=868&div=kca_2507',
    publisher: '한국소비자원 웹진',
  } as Source,
  // [CL-ADSENSE-MAX-20260709-234500] 신규 공식 출처 2건 — 2026-07-09 WebFetch 실접근 확인(혼인신고·신혼부부 대출 메뉴 실재).
  efamilyCourt: {
    title: '전자가족관계등록시스템 — 혼인신고 등 가족관계 신고 안내',
    url: 'https://efamily.scourt.go.kr/index.jsp',
    publisher: '대한민국 법원',
    note: '2026-07 접속 확인',
  } as Source,
  nhuf: {
    title: '주택도시기금 — 신혼부부전용 전세·구입자금 대출 안내',
    url: 'https://nhuf.molit.go.kr/',
    publisher: '국토교통부 주택도시기금',
    note: '2026-07 접속 확인 · 금리·조건은 수시 변동(공식 페이지 기준)',
  } as Source,
} as const;

/** slug → 참고 자료(검증된 실제 공개 출처). */
export const ARTICLE_SOURCES: Record<string, Source[]> = {
  '2026-wedding-cost': [S.duo, S.kcaPrice, S.kcaTrend2026, S.statMarriage],
  'sdm-checklist': [S.sdm, S.kcaWedding],
  'budget-10million': [S.kcaPrice, S.duo],
  'wedding-prep-order': [S.statMarriage, S.duo],
  'wedding-venue-types': [S.kcaPrice, S.kcaWedding],
  'small-wedding': [S.kcaWedding, S.guests],
  'main-snap-dvd': [S.kcaWedding],
  'yedan-yemul': [S.duo],
  'newlywed-home': [S.duo, S.statNewlywed],
  'honsu-appliances': [S.kcaWedding],
  'wedding-gift-money': [S.gift, S.guests],
  // [CL-ADSENSE-MAX-20260710-010500] 감수 필수수정 B/C — invitation-guide 출처 0건 보강 + timeline 출처 규격(≥2) 충족
  'invitation-guide': [S.duo, S.kcaPrice],
  'wedding-prep-timeline': [S.statMarriage, S.duo],
  'wedding-contract-checklist': [S.kcaDisclosure, S.kcaWedding],
};

/** slug → 자체 추정 방법론(공개 통계로 직접 커버되지 않는 항목의 투명 공시). */
export const ARTICLE_METHODOLOGY: Record<string, string> = {
  'main-snap-dvd': `본식 스냅·영상은 공개 통계가 제한적이어서, 공개된 작가·업체 견적과 후기에서 반복 확인되는 가격대를 바탕으로 웨딩셈이 보수적 범위로 정리했습니다. 실제 비용은 작가·지역·구성에 따라 달라지므로 견적으로 직접 확인하세요.`,
  'invitation-guide': `청첩장(모바일·종이) 비용은 업체·수량·디자인에 따라 편차가 커서, 공개된 제작 업체 가격표와 사례를 바탕으로 웨딩셈이 일반적 범위로 정리했습니다. 최소 주문 수량·추가 단가는 업체마다 다릅니다.`,
  'honsu-appliances': `혼수 가전·가구 비용은 품목·브랜드·구매 시기에 따라 차이가 커서, 공개 가격과 혼수 박람회 사례를 참고해 웨딩셈이 품목별 범위로 정리했습니다. 빌트인 포함 여부에 따라 크게 달라집니다.`,
  // [CL-COST-2026Q2-20260713-231500] 듀오 2026 보고서(2025.11 조사) 기준으로 갱신
  'yedan-yemul': `예단·예물 금액은 공공 통계가 거의 없어 결혼정보회사 듀오의 자체 조사(2026년 보고서, 2025년 11월 조사) 수치를 인용하되, 집안 관례에 따른 편차가 매우 크다는 점을 함께 안내합니다.`,
  'wedding-contract-checklist': `계약서 점검 항목은 한국소비자원의 결혼서비스 가격 공개 자료와 분쟁 사례에서 반복되는 위험 요소를 바탕으로 웨딩셈이 정리한 체크리스트입니다.`,
};
