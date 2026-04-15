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
  // [CL-CHECKLIST-9PERIOD-20260412-130000]
  // D-12~10m: 전체 방향 잡기 (예산·스타일·날짜·웨딩홀)
  // =============================================
  {
    period: 'D-12~10m',
    sortOrder: 1,
    title: '결혼 예산 총액 설정',
    description: '양가 지원 포함 전체 예산 규모를 정하세요',
    nudgeMessage: '예산을 먼저 정한 커플이 평균 15% 더 절약해요',
  },
  {
    period: 'D-12~10m',
    sortOrder: 2,
    title: '결혼 스타일 결정',
    description: '호텔 / 웨딩홀 / 스몰웨딩 등 전체 방향을 정하세요',
    categoryLink: 'main-ceremony',
    nudgeMessage: '스타일이 정해지면 예산과 업체 선택이 훨씬 쉬워져요',
  },
  {
    period: 'D-12~10m',
    sortOrder: 3,
    title: '예식일 & 시즌 확정',
    description: '희망 날짜와 시간대(주말/주중, 오전/오후)를 확정하세요',
    nudgeMessage: '인기 날짜는 1년 전에 마감되는 경우가 많아요',
  },
  {
    period: 'D-12~10m',
    sortOrder: 4,
    title: '예식장 투어 및 계약',
    description: '최소 3곳 이상 비교 후 계약을 진행하세요',
    categoryLink: 'main-ceremony',
    subCategoryLink: 'venue-fee',
    nudgeMessage: '1,200명의 신부님이 이미 예약 중이에요',
    dependsOnIndex: 2,
  },
  {
    period: 'D-12~10m',
    sortOrder: 5,
    title: '대략적인 하객 수 정하기',
    description: '양가 초대 인원을 대략적으로 파악하세요',
    categoryLink: 'main-ceremony',
    subCategoryLink: 'meal-cost',
    nudgeMessage: '하객 수는 식대·답례품 예산에 직결돼요',
  },
  {
    period: 'D-12~10m',
    sortOrder: 6,
    title: '식대 인원 예상',
    description: '하객 리스트를 기반으로 식대 규모를 산정하세요',
    categoryLink: 'main-ceremony',
    subCategoryLink: 'meal-cost',
    nudgeMessage: '식대는 전체 예산의 20~30%를 차지해요',
    dependsOnIndex: 4,
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
    title: '웨딩셈에 예산 항목 입력',
    description: '지금까지 결정된 항목들의 예상 비용을 입력하세요',
    nudgeMessage: '예산을 기록하면 초과 지출을 40% 줄일 수 있어요',
  },

  // =============================================
  // D-10~8m: 큰 업체 라인업 확정 (스드메·플래너·본식 영상/스냅)
  // =============================================
  {
    period: 'D-10~8m',
    sortOrder: 1,
    title: '웨딩 플래너 상담 / 워킹 여부 확정',
    description: '플래너 필요 여부와 워킹 진행 방식을 결정하세요',
    categoryLink: 'miscellaneous',
    subCategoryLink: 'wedding-planner',
    nudgeMessage: '플래너는 평균 200만원 예산 절감 효과가 있어요',
  },
  {
    period: 'D-10~8m',
    sortOrder: 2,
    title: '드레스 투어 시작',
    description: '최소 5곳 이상 드레스샵 투어를 해보세요',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'dress-tour',
    nudgeMessage: '인기 드레스는 3개월 전에 마감돼요',
  },
  {
    period: 'D-10~8m',
    sortOrder: 3,
    title: '드레스 계약',
    description: '본식용 + 촬영용 드레스를 확정하세요',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'dress-main',
    dependsOnIndex: 10,
  },
  {
    period: 'D-10~8m',
    sortOrder: 4,
    title: '스튜디오 상담 및 계약',
    description: '포트폴리오 비교 후 계약하세요. 컨셉 협의도 함께!',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'studio',
    nudgeMessage: '스튜디오 피팅비(약 20만원)가 별도 발생할 수 있어요',
  },
  {
    period: 'D-10~8m',
    sortOrder: 5,
    title: '메이크업 상담 및 계약',
    description: '스튜디오 촬영 + 본식 메이크업을 함께 알아보세요',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'makeup',
  },
  {
    period: 'D-10~8m',
    sortOrder: 6,
    title: '본식 스냅 업체 예약',
    description: '포트폴리오 비교 후 예약하세요',
    categoryLink: 'main-ceremony',
    subCategoryLink: 'main-snap',
  },
  {
    period: 'D-10~8m',
    sortOrder: 7,
    title: '본식 영상 업체 예약',
    description: '본식 영상 촬영 업체를 예약하세요',
    categoryLink: 'main-ceremony',
    subCategoryLink: 'main-video',
    nudgeMessage: '영상은 평생 추억이에요. 포트폴리오를 꼼꼼히 보세요',
  },
  {
    period: 'D-10~8m',
    sortOrder: 8,
    title: '혼주 메이크업 예약',
    description: '양가 어머니 본식 메이크업을 예약하세요',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'parents-makeup',
  },
  {
    period: 'D-10~8m',
    sortOrder: 9,
    title: '신랑 예복 알아보기',
    description: '대여/구매를 결정하고, 스튜디오 촬영 일정과 맞춰보세요',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'groom-suit',
  },

  // =============================================
  // D-8~6m: 촬영 준비 + 외형 관리 시작
  // =============================================
  {
    period: 'D-8~6m',
    sortOrder: 1,
    title: '웨딩 촬영 날짜 확정',
    description: '스튜디오와 상의하여 촬영 날짜를 확정하세요',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'studio',
    nudgeMessage: '70% 신부님이 D-8m에 촬영 날짜를 확정해요',
  },
  {
    period: 'D-8~6m',
    sortOrder: 2,
    title: '다이어트 시작',
    description: '목표 체중을 정하고 본식 전 감량 계획을 세우세요',
    nudgeMessage: '6개월 전부터 시작하면 무리 없이 목표 달성 가능해요',
  },
  {
    period: 'D-8~6m',
    sortOrder: 3,
    title: '피부관리 시작',
    description: '피부과/에스테틱 정기 관리를 시작하세요',
    nudgeMessage: '피부는 꾸준함이 핵심이에요',
  },
  {
    period: 'D-8~6m',
    sortOrder: 4,
    title: '시술 시작 (보톡스/필러/치아 등)',
    description: '필요한 시술은 본식 최소 3개월 전에 끝내야 해요',
  },
  {
    period: 'D-8~6m',
    sortOrder: 5,
    title: '신혼여행 후보 리스트업',
    description: '여행지, 기간, 예산을 먼저 정하세요 (항공권은 출국 21주 전 예약이 평균 15% 저렴)',
    categoryLink: 'honeymoon',
    nudgeMessage: '후보지 3~5곳을 추려두면 D-5~4m 예약이 수월해요',
  },

  // =============================================
  // D-6~5m: 웨딩 촬영 실행 + 신혼집
  // =============================================
  {
    period: 'D-6~5m',
    sortOrder: 1,
    title: '드레스 셀렉 (촬영용)',
    description: '스튜디오 촬영용 드레스를 최종 선택하세요',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'dress-tour',
    dependsOnIndex: 11,
  },
  {
    period: 'D-6~5m',
    sortOrder: 2,
    title: '스튜디오 촬영 진행',
    description: '촬영 컨셉, 헬퍼, 부케 등을 최종 확인하세요',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'studio-helper',
    nudgeMessage: '헬퍼비(약 20만원)와 촬영 부케(약 5만원)가 추가돼요',
  },
  {
    period: 'D-6~5m',
    sortOrder: 3,
    title: '촬영 부케 주문',
    description: '스튜디오 촬영용 부케를 별도로 준비하세요',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'photo-bouquet',
    dependsOnIndex: 24,
  },
  {
    period: 'D-6~5m',
    sortOrder: 4,
    title: '신혼집 구하기',
    description: '입주일을 역산하여 이사 일정을 잡으세요',
  },

  // =============================================
  // D-5~4m: 중간 점검 + 신혼여행 확정
  // =============================================
  {
    period: 'D-5~4m',
    sortOrder: 1,
    title: '신혼여행 항공권 예약',
    description: '출국 21주 전이 최적 예약 시기예요',
    categoryLink: 'honeymoon',
    subCategoryLink: 'flight',
    dependsOnIndex: 22,
  },
  {
    period: 'D-5~4m',
    sortOrder: 2,
    title: '신혼여행 숙소 예약',
    description: '인기 리조트는 빨리 마감되니 미리 예약하세요',
    categoryLink: 'honeymoon',
    subCategoryLink: 'accommodation-1',
    dependsOnIndex: 27,
  },
  {
    period: 'D-5~4m',
    sortOrder: 3,
    title: '예물 방향 협의',
    description: '양가 예물 범위와 품목을 조율하세요',
    categoryLink: 'gifts-houseware',
    subCategoryLink: 'rings',
  },
  {
    period: 'D-5~4m',
    sortOrder: 4,
    title: '예단 방향 협의',
    description: '양가 예단 범위와 금액을 조율하세요',
    categoryLink: 'gifts-houseware',
    subCategoryLink: 'yedan',
  },
  {
    period: 'D-5~4m',
    sortOrder: 5,
    title: '청첩장 스타일 탐색',
    description: '인쇄 vs 모바일, 디자인 트렌드를 리서치하세요',
    categoryLink: 'preparation-promotion',
    subCategoryLink: 'invitation',
  },
  {
    period: 'D-5~4m',
    sortOrder: 6,
    title: '혼수 목록 작성 (가전/가구 리스트업)',
    description: '필요한 가전·가구 품목과 예산을 리스트업하세요',
    categoryLink: 'gifts-houseware',
    nudgeMessage: '혼수는 미리 정리하면 세일 기간에 구매할 수 있어요',
  },
  {
    period: 'D-5~4m',
    sortOrder: 7,
    title: '예산 중간 점검',
    description: '웨딩셈에서 현재까지 확정된 금액을 업데이트하세요',
    nudgeMessage: '중간 점검을 하면 최종 예산 초과를 70% 줄일 수 있어요',
  },

  // =============================================
  // D-4~3m: 예물·예단 진행 + 청첩장 제작
  // =============================================
  {
    period: 'D-4~3m',
    sortOrder: 1,
    title: '예물 진행 (구매/주문)',
    description: '반지·시계 등 예물을 최종 주문하세요',
    categoryLink: 'gifts-houseware',
    subCategoryLink: 'rings',
    dependsOnIndex: 29,
  },
  {
    period: 'D-4~3m',
    sortOrder: 2,
    title: '예단 진행',
    description: '예단 품목을 최종 주문하세요',
    categoryLink: 'gifts-houseware',
    subCategoryLink: 'yedan',
    dependsOnIndex: 30,
  },
  {
    period: 'D-4~3m',
    sortOrder: 3,
    title: '혼수 리스트 최종 정리 (가전/가구)',
    description: '로드맵 D-5~4m에서 작성한 리스트를 최종 확정하세요',
    categoryLink: 'gifts-houseware',
  },
  {
    period: 'D-4~3m',
    sortOrder: 4,
    title: '가전 주문',
    description: '세일 기간을 노려 미리 주문하세요 (배송 1~3주)',
    categoryLink: 'gifts-houseware',
    subCategoryLink: 'electronics',
  },
  {
    period: 'D-4~3m',
    sortOrder: 5,
    title: '가구 주문',
    description: '배송 기간을 고려해 여유롭게 주문하세요 (배송 2~4주)',
    categoryLink: 'gifts-houseware',
    subCategoryLink: 'furniture',
  },
  {
    period: 'D-4~3m',
    sortOrder: 6,
    title: '청첩장 디자인 선택',
    description: '인쇄 청첩장과 모바일 청첩장을 함께 준비하세요',
    categoryLink: 'preparation-promotion',
    subCategoryLink: 'invitation',
    dependsOnIndex: 31,
  },
  {
    period: 'D-4~3m',
    sortOrder: 7,
    title: '청첩장 제작 시작',
    description: '인쇄소에 제작을 의뢰하세요 (최소 3주 소요)',
    categoryLink: 'preparation-promotion',
    subCategoryLink: 'invitation',
    dependsOnIndex: 39,
  },
  {
    period: 'D-4~3m',
    sortOrder: 8,
    title: '모바일 청첩장 제작',
    description: '사진 선택 및 문구를 작성하세요',
    categoryLink: 'preparation-promotion',
    subCategoryLink: 'mobile-invitation',
    dependsOnIndex: 39,
  },
  {
    period: 'D-4~3m',
    sortOrder: 9,
    title: '본식 드레스 셀렉',
    description: '본식에서 입을 드레스를 최종 선택하세요',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'dress-main',
  },
  {
    period: 'D-4~3m',
    sortOrder: 10,
    title: '혼주 한복 셀렉 (양가 어머니)',
    description: '한복 맞춤은 최소 2개월이 소요돼요',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'parents-hanbok',
    nudgeMessage: '한복 맞춤은 2개월 이상 소요되니 지금 시작하세요',
  },
  {
    period: 'D-4~3m',
    sortOrder: 11,
    title: '양가 아버지 예복 준비',
    description: '양복 대여 또는 구매를 진행하세요',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'parents-suit',
  },
  {
    period: 'D-4~3m',
    sortOrder: 12,
    title: '식전 영상 제작',
    description: '사진/영상 소스를 준비하고 제작을 맡기세요',
    categoryLink: 'preparation-promotion',
    subCategoryLink: 'pre-video',
  },
  {
    period: 'D-4~3m',
    sortOrder: 13,
    title: '답례품 알아보기',
    description: '인원 수에 맞춰 답례품을 선택하세요',
    categoryLink: 'main-ceremony',
    subCategoryLink: 'thank-you-gifts',
    nudgeMessage: '답례품은 수량 할인이 크니 일찍 주문하세요',
  },

  // =============================================
  // D-3~2m: 하객 준비 (청첩장 발송·식순 섭외)
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
    categoryLink: 'preparation-promotion',
    dependsOnIndex: 39,
    nudgeMessage: '청첩장 발송이 늦어지면 하객 참석률이 떨어질 수 있어요',
  },
  {
    period: 'D-3~2m',
    sortOrder: 3,
    title: '식순 확정 및 섭외',
    description: '예식 진행 순서를 정하고 필요 인력을 섭외하세요',
    categoryLink: 'main-ceremony',
  },
  {
    period: 'D-3~2m',
    sortOrder: 4,
    title: '사회자 섭외',
    description: '사회자를 미리 부탁하고 대본을 공유하세요',
    categoryLink: 'main-ceremony',
    subCategoryLink: 'ceremony-staff',
  },
  {
    period: 'D-3~2m',
    sortOrder: 5,
    title: '축가 섭외',
    description: '축가 가수와 곡 선정을 완료하세요',
    categoryLink: 'main-ceremony',
    subCategoryLink: 'ceremony-staff',
  },
  {
    period: 'D-3~2m',
    sortOrder: 6,
    title: '청첩장 모임 진행',
    description: '친구/동료 모임에서 청첩장을 전달하세요',
    categoryLink: 'miscellaneous',
    subCategoryLink: 'invitation-gathering',
  },
  {
    period: 'D-3~2m',
    sortOrder: 7,
    title: '가방순이 섭외',
    description: '식장에서 축의금을 관리할 분을 부탁하세요',
    categoryLink: 'miscellaneous',
    subCategoryLink: 'bag-helper',
  },

  // =============================================
  // D-2~1m: 최종 피팅 & 신혼집 정리
  // =============================================
  {
    period: 'D-2~1m',
    sortOrder: 1,
    title: '본식 드레스 최종 피팅',
    description: '본식 2~3주 전 최종 피팅을 진행하세요',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'dress-main',
    nudgeMessage: '피팅 수선비(약 10~20만원)가 추가 발생할 수 있어요',
  },
  {
    period: 'D-2~1m',
    sortOrder: 2,
    title: '혼주 의상 피팅',
    description: '양가 어머니 한복, 아버지 예복 최종 피팅',
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
    title: '예식장 최종 미팅',
    description: '식순, 테이블 배치, 음향, 조명 등을 확인하세요',
    categoryLink: 'main-ceremony',
    subCategoryLink: 'venue-fee',
  },
  {
    period: 'D-2~1m',
    sortOrder: 5,
    title: '본식 스냅 사전 미팅',
    description: '촬영 컨셉과 동선을 확인하세요',
    categoryLink: 'main-ceremony',
    subCategoryLink: 'main-snap',
  },
  {
    period: 'D-2~1m',
    sortOrder: 6,
    title: '답례품 주문',
    description: '확정 인원에 맞게 최종 주문하세요',
    categoryLink: 'main-ceremony',
    subCategoryLink: 'thank-you-gifts',
    dependsOnIndex: 46,
  },
  {
    period: 'D-2~1m',
    sortOrder: 7,
    title: '신혼집 입주 및 혼수 정리',
    description: '가전·가구 배송을 확인하고 정리하세요',
    categoryLink: 'gifts-houseware',
  },
  {
    period: 'D-2~1m',
    sortOrder: 8,
    title: '신혼여행 최종 일정 확인',
    description: '숙소, 액티비티, 환전 등을 최종 점검하세요',
    categoryLink: 'honeymoon',
  },

  // =============================================
  // D-1~0: 마무리 & 멘탈 관리 (전날 절대 무리 금지)
  // =============================================
  {
    period: 'D-1~0',
    sortOrder: 1,
    title: '식순 최종 확정',
    description: '예식 진행 순서를 최종 확정하세요',
    categoryLink: 'main-ceremony',
  },
  {
    period: 'D-1~0',
    sortOrder: 2,
    title: '좌석 배치도 작성',
    description: '양가 하객 좌석 배치를 확정하세요',
    categoryLink: 'main-ceremony',
  },
  {
    period: 'D-1~0',
    sortOrder: 3,
    title: '하객 체크 & 참석 확인',
    description: 'RSVP 회신을 최종 정리하고 참석 인원을 점검하세요',
    categoryLink: 'main-ceremony',
    nudgeMessage: '실 참석률은 초대 인원의 70~80%예요',
  },
  {
    period: 'D-1~0',
    sortOrder: 4,
    title: '예식장 최종 인원 통보',
    description: '식대 최종 인원을 예식장에 알려주세요',
    categoryLink: 'main-ceremony',
    subCategoryLink: 'meal-cost',
  },
  {
    period: 'D-1~0',
    sortOrder: 5,
    title: '신혼여행 짐 싸기',
    description: '여권, 비자, 환전, 필수 약품 등을 준비하세요',
    categoryLink: 'honeymoon',
  },
  {
    period: 'D-1~0',
    sortOrder: 6,
    title: '답례품 수령 및 확인',
    description: '수량과 품질을 최종 확인하세요',
    categoryLink: 'main-ceremony',
    subCategoryLink: 'thank-you-gifts',
  },
  {
    period: 'D-1~0',
    sortOrder: 7,
    title: '축가 리허설',
    description: '축가 가수와 곡 선정을 최종 확인하세요',
    categoryLink: 'main-ceremony',
    subCategoryLink: 'ceremony-staff',
  },
  {
    period: 'D-1~0',
    sortOrder: 8,
    title: '본식 드레스 최종 확인',
    description: '드레스 상태와 액세서리를 점검하세요',
    categoryLink: 'sudeme-styling',
    subCategoryLink: 'dress-main',
  },
  {
    period: 'D-1~0',
    sortOrder: 9,
    title: '당일 타임라인 작성',
    description: '기상~예식~피로연~출발 시간표를 만드세요',
  },
  {
    period: 'D-1~0',
    sortOrder: 10,
    title: '컨디션 관리 (제일 중요!)',
    description: '충분한 수면·수분 섭취·가벼운 식사. 전날 절대 무리 금지 🙏',
    nudgeMessage: '전날 무리하면 피부 트러블·부기로 후회해요',
  },
  {
    period: 'D-1~0',
    sortOrder: 11,
    title: '결혼식 당일 체크',
    description: '모든 준비물과 일정을 최종 확인하세요',
    nudgeMessage: '드디어 그날이에요! 축하드려요 🎉',
  },
  {
    period: 'D-1~0',
    sortOrder: 12,
    title: '잔금 정산',
    description: '예식장, 스드메 등 잔금을 정산하세요',
    nudgeMessage: '정산 내역을 웨딩셈에 기록해두면 나중에 편해요',
  },
  {
    period: 'D-1~0',
    sortOrder: 13,
    title: '원본 사진 수령',
    description: '스튜디오/스냅 원본 사진 수령 일정을 확인하세요',
    nudgeMessage: '원본 사진 추가 비용(약 30~50만원)이 발생할 수 있어요',
  },
  {
    period: 'D-1~0',
    sortOrder: 14,
    title: '예산 최종 점검',
    description: '모든 결제 내역을 웨딩셈에 반영하세요',
    nudgeMessage: '마지막 점검이에요! 놓친 항목이 없는지 확인하세요',
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
