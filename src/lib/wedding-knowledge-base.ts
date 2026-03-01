/**
 * 정적 지식 베이스 — Phase 2 컨텍스트 스터핑용
 * Phase 3에서 pgvector RAG로 업그레이드 예정
 */

export interface KnowledgeEntry {
  category: string;
  question: string;
  answer: string;
  source?: string;
}

export const WEDDING_KNOWLEDGE_BASE: KnowledgeEntry[] = [
  // ── 예식장 ──
  {
    category: '예식장',
    question: '예식장 대관료 평균은?',
    answer:
      '2025년 기준 서울 평균 예식장 대관료는 500~800만원, 수도권은 400~600만원, 지방은 300~500만원입니다. 주말 오후 시간대가 가장 비싸고, 주중이나 주말 오전은 20~40% 저렴합니다.',
    source: '2025년 전국 결혼비용 조사',
  },
  {
    category: '예식장',
    question: '예식장 계약 시 주의할 점은?',
    answer:
      '1) 식대 단가와 보증 인원 확인, 2) 초과 시간 요금 확인, 3) 계약금 환불 조건, 4) 외부 업체 반입 가능 여부, 5) 주차장 규모와 발렛 비용을 반드시 확인하세요.',
  },
  // ── 스드메 ──
  {
    category: '스드메',
    question: '스드메 평균 비용은?',
    answer:
      '스튜디오(150만원) + 드레스(150만원) + 메이크업(70만원) = 기본 370만원입니다. 여기에 헬퍼비(20만원), 촬영 부케(5만원), 원본 사진 추가(30~50만원)가 별도로 발생할 수 있어 실제로는 450~500만원을 예상하세요.',
    source: '2025년 전국 결혼비용 조사',
  },
  {
    category: '스드메',
    question: '드레스 피팅비는 얼마인가요?',
    answer:
      '드레스 수선비(피팅비)는 10~20만원이 일반적입니다. 계약 전 피팅비 포함 여부를 반드시 확인하세요. 일부 드레스샵은 2회 피팅까지 무료, 이후 추가 요금을 받습니다.',
  },
  // ── 혼수 ──
  {
    category: '혼수',
    question: '혼수 평균 비용은?',
    answer:
      '가전(1,000만원) + 가구(800만원) + 예물(650만원) + 예단(710만원) = 약 3,160만원입니다. 가전은 세일 기간(블랙프라이데이, 설/추석)을 노리면 10~20% 절약 가능합니다.',
    source: '2025년 전국 결혼비용 조사',
  },
  // ── 신혼여행 ──
  {
    category: '신혼여행',
    question: '항공권 최적 예약 시기는?',
    answer:
      '항공권은 출국 21주(약 5개월) 전 예약이 평균 15% 저렴합니다. 성수기(7~8월, 12~1월)는 6개월 전 예약을 추천합니다. 화~목 출발이 주말 출발보다 평균 20% 저렴합니다.',
    source: '항공사 가격 데이터 분석',
  },
  {
    category: '신혼여행',
    question: '해외 신혼여행 시 필요한 것은?',
    answer:
      '1) 여권 유효기간 6개월 이상 확인, 2) 비자 필요 여부 확인 (미국/칸쿤은 ESTA/비자 필요), 3) 여행자 보험 가입 (2인 5~10만원), 4) 환전 (현지 카드 사용 가능 여부 확인), 5) 국제 운전 면허증 (렌터카 이용 시)',
  },
  // ── 예산 ──
  {
    category: '예산',
    question: '결혼 총 비용 평균은?',
    answer:
      '2025년 한국 평균 결혼 총 비용은 약 2.3억원(신혼집 제외 시 약 7,000만원)입니다. 지역, 규모에 따라 크게 다르며, 예비비(전체의 5~10%)를 반드시 별도 책정하세요.',
    source: '2025년 전국 결혼비용 조사',
  },
  {
    category: '예산',
    question: '예비비는 얼마나 잡아야 하나요?',
    answer:
      '전체 예산의 5~10%를 예비비로 잡는 것을 추천합니다. 숨겨진 비용(피팅비, 헬퍼비, 원본 사진, 리조트피 등)을 합산하면 약 200~300만원이 추가로 필요합니다.',
  },
  // ── 에티켓 ──
  {
    category: '에티켓',
    question: '상견례 순서와 에티켓은?',
    answer:
      '1) 장소 예약 (호텔 한식당 추천), 2) 복장 (정장/단정한 차림), 3) 인사 순서 (남측 → 여측 순), 4) 대화 주제 (직업, 가족, 결혼 일정), 5) 비용은 보통 남측이 부담하나 최근엔 반반도 많습니다. 선물은 5~30만원선이 적당합니다.',
  },
  {
    category: '에티켓',
    question: '청첩장 발송 시기는?',
    answer:
      '결혼식 6~8주 전에 발송하는 것이 좋습니다. 모바일 청첩장은 4~6주 전, 종이 청첩장은 6~8주 전이 적절합니다. 해외 하객이 있다면 3개월 전에 알려주세요.',
  },
];

/**
 * 질문과 관련된 지식 검색 (키워드 매칭)
 */
export function searchKnowledge(query: string, limit = 3): KnowledgeEntry[] {
  const keywords = query.toLowerCase().split(/\s+/);

  const scored = WEDDING_KNOWLEDGE_BASE.map((entry) => {
    const text = `${entry.category} ${entry.question} ${entry.answer}`.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (kw.length > 1 && text.includes(kw)) score++;
    }
    return { entry, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.entry);
}
