// [CL-TOP20-P4-AICHAT-20260703-040000] AI 챗 스타터 프롬프트 칩 (Top20 P4-#17)
// 큐레이션 기준: src/lib/wedding-knowledge-base.ts 의 지식 항목으로 즉시 답변 가능한 질문만 선정.
// (searchKnowledge 키워드 매칭에 걸리는 표현을 유지 — 골든 테스트 src/lib/__tests__/chat-prompts.test.ts 가 강제)

export interface StarterPrompt {
  /** 고유 id (React key·추적용) */
  id: string;
  /** 칩에 표시되는 짧은 라벨 */
  label: string;
  /** 클릭 시 실제 전송되는 질문 전문 */
  question: string;
}

export const STARTER_PROMPTS: StarterPrompt[] = [
  {
    id: 'sdm-cost',
    label: '💄 스드메 평균 비용',
    question: '스드메 평균 비용은 얼마인가요?',
  },
  {
    id: 'venue-contract',
    label: '💒 예식장 계약 주의사항',
    question: '예식장 계약할 때 주의할 점을 알려주세요.',
  },
  {
    id: 'reserve-fund',
    label: '💰 예비비 책정 기준',
    question: '결혼 예비비는 얼마나 잡아야 하나요?',
  },
  {
    id: 'flight-timing',
    label: '✈️ 항공권 예약 시기',
    question: '신혼여행 항공권은 언제 예약하는 게 가장 저렴한가요?',
  },
];
