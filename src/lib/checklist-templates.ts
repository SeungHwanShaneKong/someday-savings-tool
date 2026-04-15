/**
 * D-day 기반 한국 결혼 체크리스트 템플릿 (70+ 항목)
 * [CL-CHECKLIST-9PERIOD-20260412-130000] 5단계 → 9단계 로드맵 구조로 재구성
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

// [CL-CHECKLIST-9PERIOD-20260412-130000] 9단계 기간 구조
export type ChecklistPeriod =
  | 'D-12~10m'  // 전체 방향
  | 'D-10~8m'   // 큰 업체 라인업
  | 'D-8~6m'    // 촬영 준비 + 외형 관리
  | 'D-6~5m'    // 웨딩 촬영 실행
  | 'D-5~4m'    // 중간 점검 + 여행 확정
  | 'D-4~3m'    // 예물/예단/혼수
  | 'D-3~2m'    // 하객 준비
  | 'D-2~1m'    // 최종 준비
  | 'D-1~0';    // 마무리 & 멘탈

export const PERIOD_LABELS: Record<ChecklistPeriod, string> = {
  'D-12~10m': '12~10개월 전',
  'D-10~8m': '10~8개월 전',
  'D-8~6m': '8~6개월 전',
  'D-6~5m': '6~5개월 전',
  'D-5~4m': '5~4개월 전',
  'D-4~3m': '4~3개월 전',
  'D-3~2m': '3~2개월 전',
  'D-2~1m': '2~1개월 전',
  'D-1~0': '1개월 전~당일',
};

export const PERIOD_ORDER: ChecklistPeriod[] = [
  'D-12~10m',
  'D-10~8m',
  'D-8~6m',
  'D-6~5m',
  'D-5~4m',
  'D-4~3m',
  'D-3~2m',
  'D-2~1m',
  'D-1~0',
];

export const PERIOD_EMOJI: Record<ChecklistPeriod, string> = {
  'D-12~10m': '🗓️',
  'D-10~8m': '🏛️',
  'D-8~6m': '📸',
  'D-6~5m': '👰',
  'D-5~4m': '✈️',
  'D-4~3m': '💍',
  'D-3~2m': '📮',
  'D-2~1m': '👗',
  'D-1~0': '💒',
};

/**
 * 기간별 D-day 오프셋 (개월 수) — due_date 계산용
 * 예: weddingDate - 12개월 = D-12~10m 시작
 */
export const PERIOD_MONTH_OFFSETS: Record<ChecklistPeriod, { start: number; end: number }> = {
  'D-12~10m': { start: 12, end: 10 },
  'D-10~8m': { start: 10, end: 8 },
  'D-8~6m': { start: 8, end: 6 },
  'D-6~5m': { start: 6, end: 5 },
  'D-5~4m': { start: 5, end: 4 },
  'D-4~3m': { start: 4, end: 3 },
  'D-3~2m': { start: 3, end: 2 },
  'D-2~1m': { start: 2, end: 1 },
  'D-1~0': { start: 1, end: 0 },
};

// [CL-CHECKLIST-9PERIOD-20260412-130000] 각 기간 핵심 테마 (AI 프롬프트/배너용)
export const PERIOD_THEMES: Record<ChecklistPeriod, string> = {
  'D-12~10m': '전체 방향 잡기 (예산·스타일·날짜·웨딩홀)',
  'D-10~8m': '큰 업체 라인업 확정 (스드메·플래너·본식 영상/스냅)',
  'D-8~6m': '촬영 준비 & 외형 관리 시작',
  'D-6~5m': '웨딩 촬영 실행 + 신혼집',
  'D-5~4m': '중간 점검 + 신혼여행 확정',
  'D-4~3m': '예물·예단 진행 + 청첩장 제작',
  'D-3~2m': '하객 준비 (청첩장 발송·식순 섭외)',
  'D-2~1m': '최종 피팅 & 신혼집 정리',
  'D-1~0': '마무리 & 멘탈 관리',
};

export const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  // =============================================
  // [CL-CHECKLIST-ROADMAP-STRICT-20260412-170000]
  // 💍 결혼 1년 준비 로드맵 — 엄격 적용 (33개 항목)
  // =============================================

  // ─── D-12~10m · 전체 방향 잡는 시기 (제일 중요) ───
  {
    period: 'D-12~10m',
    sortOrder: 1,
    title: '예산 총액 정하기 (양가 지원 포함)',
    description: '양가 지원 포함 전체 예산 규모를 정하세요',
    nudgeMessage: '예산을 먼저 정한 커플이 평균 15% 더 절약해요',
  },
  {
    period: 'D-12~10m',
    sortOrder: 2,
    title: '결혼 스타일 결정 (호텔/웨딩홀/스몰웨딩 등)',
    description: '호텔/웨딩홀/스몰웨딩 등 전체 방향을 정하세요',
    categoryLink: 'main-ceremony',
  },
  {
    period: 'D-12~10m',
    sortOrder: 3,
    title: '결혼식 희망 날짜 & 시즌 정하기',
    description: '희망 날짜와 시간대(주말/주중, 오전/오후)를 정하세요',
    nudgeMessage: '인기 날짜는 1년 전에 마감되는 경우가 많아요',
  },
  {
    period: 'D-12~10m',
    sortOrder: 4,
    title: '웨딩홀 투어 시작 + 계약 완료',
    description: '최소 3곳 이상 비교 후 계약을 진행하세요',
    categoryLink: 'main-ceremony',
    subCategoryLink: 'venue-fee',
    dependsOnIndex: 2,
  },
  {
    period: 'D-12~10m',
    sortOrder: 5,
    title: '대략적인 하객 수 정하기',
    description: '양가 초대 인원을 대략적으로 파악하세요',
    categoryLink: 'main-ceremony',
    subCategoryLink: 'meal-cost',
  },

  // ─── D-10~8m · 큰 업체 라인업 잡기 ───
  {
    period: 'D-10~8m',
    sortOrder: 1,
    title: '스드메(스튜디오/드레스/메이크업) 계약',
    description: '스튜디오·드레스·메이크업 업체를 비교 후 계약하세요',
    categoryLink: 'sudeme-styling',
    nudgeMessage: '인기 드레스는 3개월 전에 마감돼요',
  },
  {
    period: 'D-10~8m',
    sortOrder: 2,
    title: '플래너 or 워킹 여부 확정',
    description: '플래너 필요 여부와 워킹 진행 방식을 결정하세요',
    categoryLink: 'miscellaneous',
    subCategoryLink: 'wedding-planner',
  },
  {
    period: 'D-10~8m',
    sortOrder: 3,
    title: '본식 스냅 / 본식 영상 / 혼주 메이크업 예약',
    description: '본식 스냅·영상 업체 + 혼주 메이크업을 함께 예약하세요',
    categoryLink: 'main-ceremony',
    subCategoryLink: 'main-snap',
  },

  // ─── D-8~6m · 촬영 준비 + 외형 관리 시작 ───
  {
    period: 'D-8~6m',
    sortOrder: 1,
    title: '웨딩 촬영 날짜 확정',
    description: '스튜디오와 상의하여 촬영 날짜를 확정하세요',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'studio',
  },
  {
    period: 'D-8~6m',
    sortOrder: 2,
    title: '다이어트 / 피부관리 / 시술 시작',
    description: '필요한 시술은 본식 최소 3개월 전에 끝내세요',
    nudgeMessage: '6개월 전부터 시작하면 무리 없이 목표 달성 가능해요',
  },
  {
    period: 'D-8~6m',
    sortOrder: 3,
    title: '신혼여행 후보 리스트업',
    description: '여행지, 기간, 예산을 먼저 정하세요',
    categoryLink: 'honeymoon',
  },

  // ─── D-6~5m · 웨딩 촬영 진행 ───
  {
    period: 'D-6~5m',
    sortOrder: 1,
    title: '드레스 셀렉',
    description: '스튜디오 촬영용 드레스를 최종 선택하세요',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'dress-tour',
  },
  {
    period: 'D-6~5m',
    sortOrder: 2,
    title: '촬영 진행 (스튜디오)',
    description: '촬영 컨셉, 헬퍼, 부케 등을 최종 확인하세요',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'studio-helper',
  },
  {
    period: 'D-6~5m',
    sortOrder: 3,
    title: '신혼집 구하기',
    description: '전세/매매/월세 형태와 입주일을 확정하세요',
  },

  // ─── D-5~4m · 중간 점검 + 여행 확정 ───
  {
    period: 'D-5~4m',
    sortOrder: 1,
    title: '신혼여행 예약 (항공 + 숙소)',
    description: '출국 21주 전이 최적 예약 시기예요',
    categoryLink: 'honeymoon',
    subCategoryLink: 'flight',
    dependsOnIndex: 10,
  },
  {
    period: 'D-5~4m',
    sortOrder: 2,
    title: '예물/예단 방향 협의 시작',
    description: '양가 예물·예단 범위와 품목을 조율하세요',
    categoryLink: 'gifts-houseware',
  },
  {
    period: 'D-5~4m',
    sortOrder: 3,
    title: '청첩장 스타일 탐색',
    description: '인쇄 vs 모바일, 디자인 트렌드를 리서치하세요',
    categoryLink: 'preparation-promotion',
    subCategoryLink: 'invitation',
  },

  // ─── D-4~3m · 예물 / 예단 진행 ───
  {
    period: 'D-4~3m',
    sortOrder: 1,
    title: '예물 / 예단 진행',
    description: '예물·예단을 최종 주문하세요',
    categoryLink: 'gifts-houseware',
    subCategoryLink: 'rings',
    dependsOnIndex: 15,
  },
  {
    period: 'D-4~3m',
    sortOrder: 2,
    title: '혼수 리스트 정리 (가전/가구)',
    description: '가전·가구 필요 항목을 정리하고 구매를 시작하세요',
    categoryLink: 'gifts-houseware',
  },
  {
    period: 'D-4~3m',
    sortOrder: 3,
    title: '청첩장 제작 시작',
    description: '인쇄소에 제작을 의뢰하세요 (최소 3주 소요)',
    categoryLink: 'preparation-promotion',
    subCategoryLink: 'invitation',
    dependsOnIndex: 16,
  },
  {
    period: 'D-4~3m',
    sortOrder: 4,
    title: '본식 드레스 셀렉',
    description: '본식에서 입을 드레스를 최종 선택하세요',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'dress-main',
  },
  {
    period: 'D-4~3m',
    sortOrder: 5,
    title: '혼주 한복 셀렉',
    description: '한복 맞춤은 최소 2개월이 소요돼요',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'parents-hanbok',
  },

  // ─── D-3~2m · 하객 준비 시작 ───
  {
    period: 'D-3~2m',
    sortOrder: 1,
    title: '청첩장 발송 시작',
    description: '최소 6주 전에 발송을 완료하세요',
    categoryLink: 'preparation-promotion',
    dependsOnIndex: 19,
    nudgeMessage: '청첩장 발송이 늦어지면 하객 참석률이 떨어질 수 있어요',
  },
  {
    period: 'D-3~2m',
    sortOrder: 2,
    title: '하객 명단 정리',
    description: '양가 인원을 확정하고 식대를 최종 산정하세요',
    categoryLink: 'main-ceremony',
    subCategoryLink: 'meal-cost',
  },
  {
    period: 'D-3~2m',
    sortOrder: 3,
    title: '식순 / 사회자 / 축가 섭외',
    description: '예식 식순을 정하고 사회자·축가를 섭외하세요',
    categoryLink: 'main-ceremony',
    subCategoryLink: 'ceremony-staff',
  },

  // ─── D-2~1m · 최종 준비 단계 ───
  {
    period: 'D-2~1m',
    sortOrder: 1,
    title: '본식 드레스 최종 피팅',
    description: '본식 2~3주 전 최종 피팅을 진행하세요',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'dress-main',
    dependsOnIndex: 20,
  },
  {
    period: 'D-2~1m',
    sortOrder: 2,
    title: '혼주 의상 피팅',
    description: '양가 어머니 한복·아버지 예복 최종 피팅',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'parents-hanbok',
  },
  {
    period: 'D-2~1m',
    sortOrder: 3,
    title: '헤어/메이크업 리허설',
    description: '본식 메이크업 리허설을 진행하세요',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'makeup',
  },
  {
    period: 'D-2~1m',
    sortOrder: 4,
    title: '신혼집 준비 (입주 or 정리)',
    description: '가전·가구 배송을 확인하고 입주·정리를 마치세요',
    dependsOnIndex: 13,
  },

  // ─── D-1~0 · 결혼 직전 — 마무리 & 멘탈 관리 ───
  {
    period: 'D-1~0',
    sortOrder: 1,
    title: '식순 최종 확정',
    description: '예식 진행 순서를 최종 확정하세요',
    categoryLink: 'main-ceremony',
    dependsOnIndex: 24,
  },
  {
    period: 'D-1~0',
    sortOrder: 2,
    title: '좌석 배치 / 하객 체크',
    description: '양가 하객 좌석 배치를 확정하고 RSVP를 최종 점검하세요',
    categoryLink: 'main-ceremony',
    dependsOnIndex: 23,
  },
  {
    period: 'D-1~0',
    sortOrder: 3,
    title: '짐 정리 (신혼여행 포함)',
    description: '여권·비자·환전·필수 약품 등을 준비하세요',
    categoryLink: 'honeymoon',
  },
  {
    period: 'D-1~0',
    sortOrder: 4,
    title: '컨디션 관리 (제일 중요)',
    description: '충분한 수면·수분 섭취·가벼운 식사. 전날 절대 무리 금지 🙏',
    nudgeMessage: '팁: 전날 무리하면 피부 트러블·부기로 후회해요',
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

  // [CL-CHECKLIST-9PERIOD-20260412-130000] 9단계 분기
  if (diffMonths > 10) return 'D-12~10m';
  if (diffMonths > 8) return 'D-10~8m';
  if (diffMonths > 6) return 'D-8~6m';
  if (diffMonths > 5) return 'D-6~5m';
  if (diffMonths > 4) return 'D-5~4m';
  if (diffMonths > 3) return 'D-4~3m';
  if (diffMonths > 2) return 'D-3~2m';
  if (diffMonths > 1) return 'D-2~1m';
  if (diffMonths > -1) return 'D-1~0';
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
