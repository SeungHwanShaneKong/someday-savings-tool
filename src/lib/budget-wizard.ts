// [CL-TOP20-P3-WIZARD-20260703-030000]
// 첫 예산 생성 위저드 — 계산 로직 (Top 20 P3 #11).
// (하객수, 예식 스타일, 템플릿) → 카테고리별 제안 금액 플랜. 계산부는 순수·결정론(동일 입력 → 동일 출력).
//
// 설계:
// - 수치는 AVERAGE_COSTS(2025 전국 평균, src/lib/average-costs.ts) 단일소스 파생 — 하드코딩 금지.
// - 식대는 하객수 비례: 평균 14,000,000원의 note '200명 기준' → 1인 식대 70,000원 × 하객수.
// - 스타일 배수 0.75 / 1.0 / 1.4 — 구 랜딩 시뮬레이터(P1 #3, [CL-LOGIN-GATE-20260709] 폐지)에서 승계한 계수.
// - 평균 0원 항목(웨딩 플래너·가방순이)은 제안에서 제외(0원 프리필은 무의미).
// - 금액은 만원 단위 반올림(프리필 제안치는 원 단위 정밀도가 무의미 — 랜딩과 동일 정책).
// - 템플릿은 기존 BUDGET_CATEGORIES 만으로 구성(카테고리 파일 무수정):
//   예식만 = 혼수·예물 카테고리 제외 전부 / +혼수 = 예물·예단 추가 / +신혼집 = 가전·가구까지 전부.

import { AVERAGE_COSTS, getAverageCost } from '@/lib/average-costs';
import { BUDGET_CATEGORIES } from '@/lib/budget-categories';

// ── 하객수 슬라이더 상수 (랜딩 시뮬레이터와 동일 범위) ─────────────────────────
export const WIZARD_GUESTS_MIN = 50;
export const WIZARD_GUESTS_MAX = 500;
export const WIZARD_GUESTS_STEP = 10;
export const WIZARD_DEFAULT_GUESTS = 250;

/** 평균 식대 14,000,000원의 note '200명 기준' → 1인 식대 70,000원. */
const MEAL_REFERENCE_GUESTS = 200;
export const MEAL_COST_PER_GUEST =
  AVERAGE_COSTS['main-ceremony']['meal-cost'].amount / MEAL_REFERENCE_GUESTS;

/** 만원 단위 반올림 — 제안치는 원 단위 정밀도가 무의미(랜딩과 동일 정책). */
const roundToManwon = (value: number): number => Math.round(value / 10_000) * 10_000;

// ── 예식 스타일 (구 랜딩 시뮬레이터에서 승계한 계수 — 파일 헤더 주석 참조) ────────
export type WizardStyleId = 'saving' | 'standard' | 'premium';

export interface WizardStyleOption {
  id: WizardStyleId;
  label: string;
  hint: string;
  multiplier: number;
}

export const WIZARD_STYLE_OPTIONS: WizardStyleOption[] = [
  { id: 'saving', label: '알뜰형', hint: '실속 위주', multiplier: 0.75 },
  { id: 'standard', label: '표준형', hint: '전국 평균', multiplier: 1.0 },
  { id: 'premium', label: '프리미엄', hint: '호텔·하이엔드', multiplier: 1.4 },
];

export const getStyleMultiplier = (styleId: WizardStyleId): number =>
  WIZARD_STYLE_OPTIONS.find((option) => option.id === styleId)?.multiplier ?? 1.0;

// ── 템플릿 (포함 범위) ──────────────────────────────────────────────────────────
export type WizardTemplateId = 'ceremony' | 'honsu' | 'home';

export interface WizardTemplateOption {
  id: WizardTemplateId;
  label: string;
  description: string;
}

export const WIZARD_TEMPLATE_OPTIONS: WizardTemplateOption[] = [
  {
    id: 'ceremony',
    label: '예식만',
    description: '본식·스드메·청첩장·신혼여행 등 예식 준비 비용만 채워요.',
  },
  {
    id: 'honsu',
    label: '예식 + 혼수',
    description: '예식 준비에 예물·예단까지 함께 채워요.',
  },
  {
    id: 'home',
    label: '예식 + 신혼집',
    description: '예물·예단은 물론 신혼집 가전·가구까지 전부 채워요.',
  },
];

/** 혼수(예물·예단) — '예식 + 혼수'부터 포함. */
const HONSU_SUB_IDS = new Set(['rings', 'yedan']);
/** 신혼집 살림(가전·가구) — '예식 + 신혼집'에서만 포함. */
const HOME_SUB_IDS = new Set(['electronics', 'furniture']);

/** 템플릿별 포함 규칙 — gifts-houseware(혼수 및 예물)만 템플릿에 따라 갈라진다. */
export const isSubCategoryInTemplate = (
  templateId: WizardTemplateId,
  categoryId: string,
  subCategoryId: string,
): boolean => {
  if (categoryId !== 'gifts-houseware') return true;
  if (templateId === 'ceremony') return false;
  if (templateId === 'honsu') return HONSU_SUB_IDS.has(subCategoryId);
  return HONSU_SUB_IDS.has(subCategoryId) || HOME_SUB_IDS.has(subCategoryId);
};

// ── 플랜 계산 ──────────────────────────────────────────────────────────────────
/** onApply 콜백으로 부모(BudgetFlow)에 전달되는 프리필 1건. */
export interface WizardPrefill {
  category: string;
  subCategory: string;
  amount: number;
}

/** 리뷰 화면 표시용 — 프리필 + 항목 이름. */
export interface WizardSuggestion extends WizardPrefill {
  name: string;
}

export interface WizardCategoryGroup {
  categoryId: string;
  categoryName: string;
  icon: string;
  suggestions: WizardSuggestion[];
  subtotal: number;
}

export interface WizardInput {
  guests: number;
  styleId: WizardStyleId;
  templateId: WizardTemplateId;
}

/** 하객수 방어 — 비정상 입력은 기본값, 범위 밖은 경계로 클램프(결정론 유지). */
export const clampGuests = (raw: number): number => {
  if (!Number.isFinite(raw)) return WIZARD_DEFAULT_GUESTS;
  return Math.min(WIZARD_GUESTS_MAX, Math.max(WIZARD_GUESTS_MIN, Math.round(raw)));
};

/**
 * (하객수, 스타일, 템플릿) → 카테고리별 제안 플랜.
 * - 식대 = 하객수 × 1인 식대, 그 외 = AVERAGE_COSTS 기준값. 모두 × 스타일 배수 후 만원 반올림.
 * - 평균 0원 항목 제외, 제안이 하나도 없는 카테고리는 그룹 자체를 생략.
 * - 순서는 BUDGET_CATEGORIES 정의 순서를 그대로 따른다(표와 동일한 시각 순서).
 */
export const computeWizardPlan = (input: WizardInput): WizardCategoryGroup[] => {
  const guests = clampGuests(input.guests);
  const multiplier = getStyleMultiplier(input.styleId);

  const groups: WizardCategoryGroup[] = [];
  for (const category of BUDGET_CATEGORIES) {
    const suggestions: WizardSuggestion[] = [];
    for (const sub of category.subCategories) {
      if (!isSubCategoryInTemplate(input.templateId, category.id, sub.id)) continue;
      const average = getAverageCost(category.id, sub.id);
      if (!average || average.amount <= 0) continue;

      const base =
        category.id === 'main-ceremony' && sub.id === 'meal-cost'
          ? guests * MEAL_COST_PER_GUEST
          : average.amount;
      const amount = roundToManwon(base * multiplier);
      if (amount <= 0) continue;

      suggestions.push({ category: category.id, subCategory: sub.id, name: sub.name, amount });
    }
    if (suggestions.length > 0) {
      groups.push({
        categoryId: category.id,
        categoryName: category.name,
        icon: category.icon,
        suggestions,
        subtotal: suggestions.reduce((acc, s) => acc + s.amount, 0),
      });
    }
  }
  return groups;
};

/** 켜진 카테고리의 제안만 평탄화 — onApply 페이로드({category, subCategory, amount}). */
export const flattenWizardPlan = (
  groups: readonly WizardCategoryGroup[],
  enabledCategoryIds: ReadonlySet<string>,
): WizardPrefill[] =>
  groups
    .filter((group) => enabledCategoryIds.has(group.categoryId))
    .flatMap((group) =>
      group.suggestions.map(({ category, subCategory, amount }) => ({ category, subCategory, amount })),
    );

/** 켜진 카테고리 소계 합(리뷰 화면 총액). */
export const sumWizardPlan = (
  groups: readonly WizardCategoryGroup[],
  enabledCategoryIds: ReadonlySet<string>,
): number =>
  groups
    .filter((group) => enabledCategoryIds.has(group.categoryId))
    .reduce((acc, group) => acc + group.subtotal, 0);

// ── 완료 플래그 (재노출 금지) — 계산부와 달리 storage 접근, try/catch 로 견딤 ──
export const WIZARD_DONE_KEY = 'wedsem_wizard_done_v1';

export const isWizardDone = (): boolean => {
  try {
    return localStorage.getItem(WIZARD_DONE_KEY) !== null;
  } catch {
    // storage 불가 환경(프라이빗 모드 등) — 노출 판단만 보수적으로 통과, 실제 표시는 세션당 1회 평가 가드가 막는다.
    return false;
  }
};

export const markWizardDone = (): void => {
  try {
    localStorage.setItem(WIZARD_DONE_KEY, new Date().toISOString());
  } catch {
    /* noop — 플래그 실패해도 앱 동작 무영향 */
  }
};
