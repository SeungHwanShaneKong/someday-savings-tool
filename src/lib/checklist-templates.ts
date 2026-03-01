/**
 * D-day 기반 한국 결혼 체크리스트 템플릿 (60+ 항목)
 * BRD §2.2: 5개 마일스톤 기간별 필수 준비 항목
 *
 * category_link / sub_category_link → budget-categories.ts의 id 참조
 * depends_on_index → 같은 배열 내 인덱스 (DB에선 uuid로 변환)
 */

export interface ChecklistTemplate {
  period: ChecklistPeriod;
  sortOrder: number;
  title: string;
  description?: string;
  categoryLink?: string;
  subCategoryLink?: string;
  nudgeMessage?: string;
  dependsOnIndex?: number; // index of dependency in flat array
}

export type ChecklistPeriod =
  | 'D-12~10m'
  | 'D-9~7m'
  | 'D-6~4m'
  | 'D-3~2m'
  | 'D-1m~D';

export const PERIOD_LABELS: Record<ChecklistPeriod, string> = {
  'D-12~10m': '12~10개월 전',
  'D-9~7m': '9~7개월 전',
  'D-6~4m': '6~4개월 전',
  'D-3~2m': '3~2개월 전',
  'D-1m~D': '1개월 전~당일',
};

export const PERIOD_ORDER: ChecklistPeriod[] = [
  'D-12~10m',
  'D-9~7m',
  'D-6~4m',
  'D-3~2m',
  'D-1m~D',
];

export const PERIOD_EMOJI: Record<ChecklistPeriod, string> = {
  'D-12~10m': '🗓️',
  'D-9~7m': '📋',
  'D-6~4m': '💍',
  'D-3~2m': '📸',
  'D-1m~D': '💒',
};

/**
 * 기간별 D-day 오프셋 (개월 수) — due_date 계산용
 * 예: weddingDate - 12개월 = D-12~10m 시작
 */
export const PERIOD_MONTH_OFFSETS: Record<ChecklistPeriod, { start: number; end: number }> = {
  'D-12~10m': { start: 12, end: 10 },
  'D-9~7m': { start: 9, end: 7 },
  'D-6~4m': { start: 6, end: 4 },
  'D-3~2m': { start: 3, end: 2 },
  'D-1m~D': { start: 1, end: 0 },
};

export const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  // =============================================
  // D-12~10m: 기초 계획 수립
  // =============================================
  {
    period: 'D-12~10m',
    sortOrder: 1,
    title: '결혼 예산 총액 설정',
    description: '양가 합의 하에 전체 예산 규모를 정해요',
    nudgeMessage: '예산을 먼저 정한 커플이 평균 15% 더 절약해요',
  },
  {
    period: 'D-12~10m',
    sortOrder: 2,
    title: '예식일 확정',
    description: '날짜와 시간대를 확정하세요 (주말/주중, 오전/오후)',
    nudgeMessage: '인기 날짜는 1년 전에 마감되는 경우가 많아요',
  },
  {
    period: 'D-12~10m',
    sortOrder: 3,
    title: '예식장 투어 및 계약',
    description: '최소 3곳 이상 비교 후 계약을 진행하세요',
    categoryLink: 'main-ceremony',
    subCategoryLink: 'venue-fee',
    nudgeMessage: '1,200명의 신부님이 이미 예약 중이에요',
    dependsOnIndex: 1,
  },
  {
    period: 'D-12~10m',
    sortOrder: 4,
    title: '웨딩 플래너 상담',
    description: '플래너 필요 여부를 결정하고, 필요 시 계약하세요',
    categoryLink: 'miscellaneous',
    subCategoryLink: 'wedding-planner',
  },
  {
    period: 'D-12~10m',
    sortOrder: 5,
    title: '식대 인원 예상',
    description: '양가 하객 리스트를 먼저 대략적으로 작성해 보세요',
    categoryLink: 'main-ceremony',
    subCategoryLink: 'meal-cost',
    nudgeMessage: '식대는 전체 예산의 20~30%를 차지해요',
  },
  {
    period: 'D-12~10m',
    sortOrder: 6,
    title: '신혼집 알아보기',
    description: '전세/매매/월세 형태와 위치를 결정하세요',
  },
  {
    period: 'D-12~10m',
    sortOrder: 7,
    title: '상견례 일정 잡기',
    description: '양가 부모님 상견례 날짜를 정하세요',
    categoryLink: 'preparation-promotion',
    subCategoryLink: 'meeting-meal',
  },
  {
    period: 'D-12~10m',
    sortOrder: 8,
    title: '상견례 진행',
    description: '장소 예약, 선물 준비, 인사 에티켓을 확인하세요',
    categoryLink: 'preparation-promotion',
    subCategoryLink: 'meeting-gift',
    dependsOnIndex: 6,
  },
  {
    period: 'D-12~10m',
    sortOrder: 9,
    title: '혼수 목록 작성',
    description: '가전/가구 필요 항목을 정리하세요',
    categoryLink: 'gifts-houseware',
    nudgeMessage: '혼수는 미리 정리하면 세일 기간에 구매할 수 있어요',
  },
  {
    period: 'D-12~10m',
    sortOrder: 10,
    title: '웨딩셈에 예산 항목 입력',
    description: '지금까지 결정된 항목들의 예상 비용을 입력하세요',
    nudgeMessage: '예산을 기록하면 초과 지출을 40% 줄일 수 있어요',
  },

  // =============================================
  // D-9~7m: 핵심 업체 선정
  // =============================================
  {
    period: 'D-9~7m',
    sortOrder: 1,
    title: '드레스 투어 시작',
    description: '최소 5곳 이상 드레스샵 투어를 해보세요',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'dress-tour',
    nudgeMessage: '인기 드레스는 3개월 전에 마감돼요',
  },
  {
    period: 'D-9~7m',
    sortOrder: 2,
    title: '드레스 계약',
    description: '본식용 + 촬영용 드레스를 확정하세요',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'dress-main',
    dependsOnIndex: 10,
  },
  {
    period: 'D-9~7m',
    sortOrder: 3,
    title: '스튜디오 상담 및 계약',
    description: '포트폴리오 비교 후 계약하세요. 컨셉 협의도 함께!',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'studio',
    nudgeMessage: '스튜디오 피팅비(약 20만원)가 별도 발생할 수 있어요',
  },
  {
    period: 'D-9~7m',
    sortOrder: 4,
    title: '메이크업 상담 및 계약',
    description: '스튜디오 촬영 + 본식 메이크업을 함께 알아보세요',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'makeup',
  },
  {
    period: 'D-9~7m',
    sortOrder: 5,
    title: '신랑 예복 알아보기',
    description: '대여/구매를 결정하고, 스튜디오 촬영 일정과 맞춰보세요',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'groom-suit',
  },
  {
    period: 'D-9~7m',
    sortOrder: 6,
    title: '예물 알아보기',
    description: '반지, 시계 등 예물 구매를 시작하세요',
    categoryLink: 'gifts-houseware',
    subCategoryLink: 'rings',
    nudgeMessage: '예물은 제작 기간이 필요해 미리 주문하세요',
  },
  {
    period: 'D-9~7m',
    sortOrder: 7,
    title: '예단 협의',
    description: '양가 예단 범위와 금액을 조율하세요',
    categoryLink: 'gifts-houseware',
    subCategoryLink: 'yedan',
  },
  {
    period: 'D-9~7m',
    sortOrder: 8,
    title: '신혼여행지 리서치',
    description: '여행지, 기간, 예산을 먼저 정하세요',
    categoryLink: 'honeymoon',
    nudgeMessage: '항공권은 출국 21주 전 예약이 평균 15% 저렴해요',
  },
  {
    period: 'D-9~7m',
    sortOrder: 9,
    title: '본식 스냅 업체 알아보기',
    description: '포트폴리오 비교 후 예약하세요',
    categoryLink: 'main-ceremony',
    subCategoryLink: 'main-snap',
  },
  {
    period: 'D-9~7m',
    sortOrder: 10,
    title: '가전 구매 시작',
    description: '세일 기간을 노려 미리 구매하세요',
    categoryLink: 'gifts-houseware',
    subCategoryLink: 'electronics',
  },
  {
    period: 'D-9~7m',
    sortOrder: 11,
    title: '가구 구매 시작',
    description: '배송 기간을 고려해 여유롭게 주문하세요',
    categoryLink: 'gifts-houseware',
    subCategoryLink: 'furniture',
  },
  {
    period: 'D-9~7m',
    sortOrder: 12,
    title: '예산 중간 점검',
    description: '웨딩셈에서 현재까지 확정된 금액을 업데이트하세요',
    nudgeMessage: '중간 점검을 하면 최종 예산 초과를 70% 줄일 수 있어요',
  },

  // =============================================
  // D-6~4m: 세부 확정
  // =============================================
  {
    period: 'D-6~4m',
    sortOrder: 1,
    title: '스튜디오 촬영 진행',
    description: '촬영 컨셉, 헬퍼, 부케 등을 최종 확인하세요',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'studio-helper',
    nudgeMessage: '헬퍼비(약 20만원)와 촬영 부케(약 5만원)가 추가돼요',
  },
  {
    period: 'D-6~4m',
    sortOrder: 2,
    title: '촬영 부케 주문',
    description: '스튜디오 촬영용 부케를 별도로 준비하세요',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'photo-bouquet',
    dependsOnIndex: 22,
  },
  {
    period: 'D-6~4m',
    sortOrder: 3,
    title: '신혼여행 항공권 예약',
    description: '출국 21주 전이 최적 예약 시기예요',
    categoryLink: 'honeymoon',
    subCategoryLink: 'flight',
    dependsOnIndex: 17,
  },
  {
    period: 'D-6~4m',
    sortOrder: 4,
    title: '신혼여행 숙소 예약',
    description: '인기 리조트는 빨리 마감되니 미리 예약하세요',
    categoryLink: 'honeymoon',
    subCategoryLink: 'accommodation-1',
    dependsOnIndex: 24,
  },
  {
    period: 'D-6~4m',
    sortOrder: 5,
    title: '청첩장 디자인 선택',
    description: '인쇄 청첩장과 모바일 청첩장을 함께 준비하세요',
    categoryLink: 'preparation-promotion',
    subCategoryLink: 'invitation',
  },
  {
    period: 'D-6~4m',
    sortOrder: 6,
    title: '모바일 청첩장 제작',
    description: '사진 선택 및 문구를 작성하세요',
    categoryLink: 'preparation-promotion',
    subCategoryLink: 'mobile-invitation',
    dependsOnIndex: 26,
  },
  {
    period: 'D-6~4m',
    sortOrder: 7,
    title: '양가 어머니 한복 맞춤',
    description: '한복 맞춤은 최소 2개월이 소요돼요',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'parents-hanbok',
    nudgeMessage: '한복 맞춤은 2개월 이상 소요되니 지금 시작하세요',
  },
  {
    period: 'D-6~4m',
    sortOrder: 8,
    title: '양가 아버지 예복 준비',
    description: '양복 대여 또는 구매를 진행하세요',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'parents-suit',
  },
  {
    period: 'D-6~4m',
    sortOrder: 9,
    title: '식전 영상 제작',
    description: '사진/영상 소스를 준비하고 제작을 맡기세요',
    categoryLink: 'preparation-promotion',
    subCategoryLink: 'pre-video',
  },
  {
    period: 'D-6~4m',
    sortOrder: 10,
    title: '답례품 알아보기',
    description: '인원 수에 맞춰 답례품을 선택하세요',
    categoryLink: 'main-ceremony',
    subCategoryLink: 'thank-you-gifts',
    nudgeMessage: '답례품은 수량 할인이 크니 일찍 주문하세요',
  },
  {
    period: 'D-6~4m',
    sortOrder: 11,
    title: '축가/사회자 섭외',
    description: '축가와 사회자를 미리 부탁하세요',
    categoryLink: 'main-ceremony',
    subCategoryLink: 'ceremony-staff',
  },
  {
    period: 'D-6~4m',
    sortOrder: 12,
    title: '신혼집 계약 및 이사 준비',
    description: '입주일을 역산하여 이사 일정을 잡으세요',
  },
  {
    period: 'D-6~4m',
    sortOrder: 13,
    title: '예산 상세 점검',
    description: '모든 계약 금액을 웨딩셈에 반영하세요',
    nudgeMessage: '여기까지 오면 80%가 끝난 거예요! 거의 다 왔어요 💪',
  },

  // =============================================
  // D-3~2m: 최종 확인
  // =============================================
  {
    period: 'D-3~2m',
    sortOrder: 1,
    title: '하객 리스트 최종 확정',
    description: '양가 인원을 확정하고 식대를 최종 산정하세요',
    categoryLink: 'main-ceremony',
    subCategoryLink: 'meal-cost',
  },
  {
    period: 'D-3~2m',
    sortOrder: 2,
    title: '청첩장 발송',
    description: '최소 6주 전에 발송을 완료하세요',
    dependsOnIndex: 26,
    nudgeMessage: '청첩장 발송이 늦어지면 하객 참석률이 떨어질 수 있어요',
  },
  {
    period: 'D-3~2m',
    sortOrder: 3,
    title: '드레스 최종 피팅',
    description: '본식 2~3주 전 최종 피팅을 진행하세요',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'dress-main',
    nudgeMessage: '피팅 수선비(약 10~20만원)가 추가 발생할 수 있어요',
  },
  {
    period: 'D-3~2m',
    sortOrder: 4,
    title: '메이크업 리허설',
    description: '본식 메이크업 리허설을 진행하세요',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'makeup',
  },
  {
    period: 'D-3~2m',
    sortOrder: 5,
    title: '예식장 최종 미팅',
    description: '식순, 테이블 배치, 음향, 조명 등을 확인하세요',
    categoryLink: 'main-ceremony',
    subCategoryLink: 'venue-fee',
  },
  {
    period: 'D-3~2m',
    sortOrder: 6,
    title: '본식 스냅 사전 미팅',
    description: '촬영 컨셉과 동선을 확인하세요',
    categoryLink: 'main-ceremony',
    subCategoryLink: 'main-snap',
  },
  {
    period: 'D-3~2m',
    sortOrder: 7,
    title: '답례품 주문',
    description: '확정 인원에 맞게 최종 주문하세요',
    categoryLink: 'main-ceremony',
    subCategoryLink: 'thank-you-gifts',
    dependsOnIndex: 34,
  },
  {
    period: 'D-3~2m',
    sortOrder: 8,
    title: '신혼여행 최종 일정 확인',
    description: '숙소, 액티비티, 환전 등을 최종 점검하세요',
    categoryLink: 'honeymoon',
  },
  {
    period: 'D-3~2m',
    sortOrder: 9,
    title: '가방순이 섭외',
    description: '식장에서 축의금을 관리할 분을 부탁하세요',
    categoryLink: 'miscellaneous',
    subCategoryLink: 'bag-helper',
  },
  {
    period: 'D-3~2m',
    sortOrder: 10,
    title: '청첩장 모임 진행',
    description: '친구/동료 모임에서 청첩장을 전달하세요',
    categoryLink: 'miscellaneous',
    subCategoryLink: 'invitation-gathering',
  },
  {
    period: 'D-3~2m',
    sortOrder: 11,
    title: '혼수 입주 및 정리',
    description: '가전, 가구 배송을 확인하고 정리하세요',
    categoryLink: 'gifts-houseware',
  },
  {
    period: 'D-3~2m',
    sortOrder: 12,
    title: '예산 최종 점검',
    description: '모든 결제 내역을 웨딩셈에 반영하세요',
    nudgeMessage: '마지막 점검이에요! 놓친 항목이 없는지 확인하세요',
  },

  // =============================================
  // D-1m~D: 직전 준비 & 당일
  // =============================================
  {
    period: 'D-1m~D',
    sortOrder: 1,
    title: '식순 최종 확인',
    description: '예식 진행 순서를 확정하세요',
  },
  {
    period: 'D-1m~D',
    sortOrder: 2,
    title: '자리 배치도 작성',
    description: '양가 하객 좌석 배치를 확정하세요',
  },
  {
    period: 'D-1m~D',
    sortOrder: 3,
    title: '예식장 최종 인원 통보',
    description: '식대 최종 인원을 예식장에 알려주세요',
    categoryLink: 'main-ceremony',
    subCategoryLink: 'meal-cost',
    nudgeMessage: '보통 실 참석률은 초대 인원의 70~80%예요',
  },
  {
    period: 'D-1m~D',
    sortOrder: 4,
    title: '신혼여행 짐 싸기',
    description: '여권, 비자, 환전, 필수 약품 등을 준비하세요',
    categoryLink: 'honeymoon',
  },
  {
    period: 'D-1m~D',
    sortOrder: 5,
    title: '답례품 수령 및 확인',
    description: '수량과 품질을 최종 확인하세요',
    categoryLink: 'main-ceremony',
    subCategoryLink: 'thank-you-gifts',
  },
  {
    period: 'D-1m~D',
    sortOrder: 6,
    title: '축가 리허설',
    description: '축가 가수와 곡 선정을 최종 확인하세요',
    categoryLink: 'main-ceremony',
    subCategoryLink: 'ceremony-staff',
  },
  {
    period: 'D-1m~D',
    sortOrder: 7,
    title: '본식 드레스 최종 확인',
    description: '드레스 상태와 액세서리를 점검하세요',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'dress-main',
  },
  {
    period: 'D-1m~D',
    sortOrder: 8,
    title: '당일 타임라인 작성',
    description: '기상~예식~피로연~출발 시간표를 만드세요',
  },
  {
    period: 'D-1m~D',
    sortOrder: 9,
    title: '결혼식 당일 체크',
    description: '모든 준비물과 일정을 최종 확인하세요',
    nudgeMessage: '드디어 그날이에요! 축하드려요 🎉',
  },
  {
    period: 'D-1m~D',
    sortOrder: 10,
    title: '잔금 정산',
    description: '예식장, 스드메 등 잔금을 정산하세요',
    nudgeMessage: '정산 내역을 웨딩셈에 기록해두면 나중에 편해요',
  },
  {
    period: 'D-1m~D',
    sortOrder: 11,
    title: '원본 사진 수령',
    description: '스튜디오/스냅 원본 사진 수령 일정을 확인하세요',
    nudgeMessage: '원본 사진 추가 비용(약 30~50만원)이 발생할 수 있어요',
  },
];

/**
 * 기간별로 그룹핑된 템플릿 반환
 */
export function getTemplatesByPeriod(): Record<ChecklistPeriod, ChecklistTemplate[]> {
  const grouped = {} as Record<ChecklistPeriod, ChecklistTemplate[]>;
  for (const period of PERIOD_ORDER) {
    grouped[period] = CHECKLIST_TEMPLATES.filter((t) => t.period === period);
  }
  return grouped;
}

/**
 * D-day 기준으로 현재 활성 기간 계산
 */
export function getActivePeriod(weddingDate: string): ChecklistPeriod | null {
  const wedding = new Date(weddingDate);
  const today = new Date();
  const diffMs = wedding.getTime() - today.getTime();
  const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44);

  if (diffMonths > 10) return 'D-12~10m';
  if (diffMonths > 7) return 'D-9~7m';
  if (diffMonths > 4) return 'D-6~4m';
  if (diffMonths > 2) return 'D-3~2m';
  if (diffMonths > -1) return 'D-1m~D';
  return null; // 결혼식 이후
}

/**
 * D-day 기반 due_date 계산
 * 각 기간의 중간 시점을 due_date로 설정
 */
export function calculateDueDate(
  weddingDate: string,
  period: ChecklistPeriod,
  sortOrder: number,
  totalInPeriod: number
): string {
  const wedding = new Date(weddingDate);
  const offset = PERIOD_MONTH_OFFSETS[period];

  // 기간 내 균등 분배: start → end 사이를 항목 수로 나눔
  const ratio = totalInPeriod > 1 ? (sortOrder - 1) / (totalInPeriod - 1) : 0.5;
  const monthOffset = offset.start - ratio * (offset.start - offset.end);

  const dueDate = new Date(wedding);
  dueDate.setMonth(dueDate.getMonth() - Math.round(monthOffset));

  return dueDate.toISOString().split('T')[0];
}
