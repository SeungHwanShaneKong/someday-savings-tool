// [CL-TOP20-P1-CHATPRE-20260703-010000] 무가입 챗 미리보기 캔드 Q&A — Top 20 로드맵 P1(#1 일부).
// 중대 원칙: 실제 AI(Edge Function) 호출 없이 "정직한 미리보기"만 제공한다.
//   - 모든 수치·출처는 src/lib/wedding-knowledge-base.ts 의 해당 항목과 1:1 일치해야 한다(임의 수정 금지).
//   - 답변 형식은 실제 AI 의 3-불릿(•) 규칙(src/lib/qa-system-prompt.ts)을 그대로 따라
//     "실제 AI 답변 예시" 라벨이 거짓이 되지 않도록 유지한다.
// 항목 추가/수정 시 반드시 지식 베이스 원문과 대조할 것.

export interface ChatPreviewQA {
  /** 안정 식별자 — 배열 재정렬에도 상태·계측이 흔들리지 않도록 */
  id: string;
  /** 질문 칩에 그대로 노출되는 문구 */
  question: string;
  /** AI 말풍선 본문 — 실제 AI 와 동일한 3-불릿(•) 형식, '\n' 구분 */
  answer: string;
  /** 근거 출처 라벨 — wedding-knowledge-base.ts 의 source 필드와 동일 값 */
  source: string;
}

export const CHAT_PREVIEW_QAS: ChatPreviewQA[] = [
  {
    // 근거: wedding-knowledge-base.ts '예산 > 결혼 총 비용 평균은?' + '예비비는 얼마나 잡아야 하나요?'
    id: 'total-cost',
    question: '결혼 총 비용, 평균 얼마나 들까요?',
    answer: [
      '• 2025년 한국 평균 결혼 총 비용은 약 2.3억원이고, 신혼집을 제외하면 약 7,000만원입니다.',
      '• 지역과 규모에 따라 크게 달라지므로 평균은 출발점으로만 참고하세요.',
      '• 숨겨진 비용에 대비해 전체 예산의 5~10%는 예비비로 반드시 별도 책정하세요.',
    ].join('\n'),
    source: '2025년 전국 결혼비용 조사',
  },
  {
    // 근거: wedding-knowledge-base.ts '스드메 > 스드메 평균 비용은?'
    id: 'sdm-cost',
    question: '스드메 비용은 얼마나 잡아야 하나요?',
    answer: [
      '• 스튜디오 150만원 + 드레스 150만원 + 메이크업 70만원, 기본 370만원입니다.',
      '• 헬퍼비 20만원, 촬영 부케 5만원, 원본 사진 추가 30~50만원이 별도로 붙을 수 있습니다.',
      '• 숨은 비용까지 더하면 실제로는 450~500만원을 예상하는 것이 안전합니다.',
    ].join('\n'),
    source: '2025년 전국 결혼비용 조사',
  },
  {
    // 근거: wedding-knowledge-base.ts '신혼여행 > 항공권 최적 예약 시기는?'
    id: 'flight-timing',
    question: '신혼여행 항공권, 언제 예약해야 저렴한가요?',
    answer: [
      '• 항공권은 출국 21주(약 5개월) 전에 예약하면 평균 15% 저렴합니다.',
      '• 성수기(7~8월, 12~1월)에 떠난다면 6개월 전 예약을 추천합니다.',
      '• 화~목 출발이 주말 출발보다 평균 20% 저렴하니 출발 요일도 함께 조정해 보세요.',
    ].join('\n'),
    source: '항공사 가격 데이터 분석',
  },
];
