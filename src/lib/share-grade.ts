// [CL-SHARE-P1-20260717-170000] 공유 카드 등급 산출 — 순수 함수(UI·네트워크 비의존, CI 검증 가능).
//   설계: docs/growth-share-card-design.md §2.1.
//
// 설계 원칙(그대로 구현):
//  - 등급 축 = "금액 크기"가 아니라 **계획력(완성도) × 알뜰함(평균 대비)**. 금액 과시는 위화감·프라이버시
//    리스크라 자랑 포인트를 '똑똑함'으로 치환한다.
//  - 평균보다 많이 쓰는 사용자도 소외 금지 → 절약도 미달이면 완성도 축으로만 등급(2등급 상한),
//    카피는 비난 없는 톤("프리미엄 준비 중 ✨").
//  - 평균 비교는 신규 산식 발명 금지 — 기존 단일소스 AVERAGE_COSTS(2026 상반기 공표 기준)만 사용.
//    budget-optimizer 의 "평균 대비 %" 개념과 동일한 (사용자합 − 평균합)/평균합 정의.
import { getAverageCost } from '@/lib/average-costs';
import { BUDGET_CATEGORIES } from '@/lib/budget-categories';

/** 등급 산출 입력 — 카테고리/서브카테고리 키와 금액만(이름·메모 등 PII 비수용). */
export interface ShareGradeItem {
  category: string;
  sub_category: string;
  amount: number;
}

export interface ShareGrade {
  /** 1~5 */
  grade: number;
  label: string;
  emoji: string;
  /**
   * 평균 대비 절약률(%) — 양수 = 평균보다 알뜰, 음수 = 평균 초과(프리미엄).
   * 비교 가능한 항목(평균 데이터 보유 + 금액>0)이 하나도 없으면 null(모름 ≠ 0).
   */
  savingPercent: number | null;
  /** 완성도(%) — 금액>0 이 하나라도 있는 카테고리 수 / 전체 카테고리 수 */
  completeness: number;
}

/** 완성도 밴드 — GA4 파라미터용(절대 금액 대신 밴드: PII·금액 0 원칙). */
export type CompletenessBand = '0-30' | '30-50' | '50-70' | '70-85' | '85-100';

const GRADE_META: Record<number, { label: string; emoji: string }> = {
  1: { label: '예비 새싹', emoji: '🌱' },
  2: { label: '야무진 플래너', emoji: '✍️' },
  3: { label: '알뜰 요정', emoji: '🧚' },
  4: { label: '갓성비 마스터', emoji: '⚡' },
  5: { label: '웨딩 재테크 만렙', emoji: '👑' },
};

/** 전체 카테고리 수(완성도 분모) — BUDGET_CATEGORIES 단일소스 파생. */
const TOTAL_CATEGORIES = BUDGET_CATEGORIES.length;

/**
 * 완성도(%) = 금액>0 항목을 하나라도 가진 카테고리 수 / 전체 카테고리 수.
 * 알 수 없는 카테고리 키는 분자에서 제외(오염 방지) — 분모는 항상 정의된 카테고리 수.
 */
function computeCompleteness(items: ShareGradeItem[]): number {
  const known = new Set(BUDGET_CATEGORIES.map((c) => c.id));
  const filled = new Set<string>();
  for (const it of items) {
    if (it.amount > 0 && known.has(it.category)) filled.add(it.category);
  }
  if (TOTAL_CATEGORIES === 0) return 0;
  return Math.round((filled.size / TOTAL_CATEGORIES) * 100);
}

/**
 * 평균 대비 절약률(%) — 사용자가 입력한 항목에 대응하는 평균만 합산해 비교(공정 비교).
 *  savingPercent = (평균합 − 사용자합) / 평균합 × 100 (양수 = 알뜰)
 *  평균 0원 항목(웨딩 플래너 등)·평균 미보유 항목은 양쪽에서 제외 → 분모 0 이면 null.
 */
function computeSavingPercent(items: ShareGradeItem[]): number | null {
  let userSum = 0;
  let avgSum = 0;
  for (const it of items) {
    if (!(it.amount > 0)) continue;
    const avg = getAverageCost(it.category, it.sub_category);
    if (!avg || avg.amount <= 0) continue; // 비교 불가 항목은 양쪽 모두 제외
    userSum += it.amount;
    avgSum += avg.amount;
  }
  if (avgSum <= 0) return null; // 비교 가능 항목 0 → '모름'(0% 로 단정 금지)
  return Math.round(((avgSum - userSum) / avgSum) * 100);
}

/**
 * 등급 판정(설계 §2.1 표 그대로):
 *   5: 완성도 ≥ 85 & 절약 ≥ 20
 *   4: 완성도 ≥ 70 & 절약 ≥ 10
 *   3: 완성도 ≥ 50 & 절약 ≥ 0 (총액이 평균 이하)
 *   2: 완성도 ≥ 30
 *   1: 그 외
 * 절약률이 null(비교 불가)이면 알뜰 축 미충족으로 보아 완성도 축(2등급 상한)만 적용.
 */
function decideGrade(completeness: number, savingPercent: number | null): number {
  const saving = savingPercent ?? Number.NEGATIVE_INFINITY;
  if (completeness >= 85 && saving >= 20) return 5;
  if (completeness >= 70 && saving >= 10) return 4;
  if (completeness >= 50 && saving >= 0) return 3;
  if (completeness >= 30) return 2;
  return 1;
}

// [CL-SHARE-AUDIT-D7-20260717-190000] 입력 정규화 단일 진입점 — computeShareGrade 와
//  computeCategoryHighlights 가 **동일한** 정규화를 공유한다. 이전에는 등급만 (비배열·null 원소·
//  비유한 amount)를 정규화하고 하이라이트는 그러지 않아, 같은 카드의 등급과 배지가 서로 다른 항목
//  집합을 볼 수 있는 구조였다(가드 비대칭). 정규화를 한 곳으로 모아 구조적으로 불일치를 제거한다.
function normalizeItems(items: unknown): ShareGradeItem[] {
  if (!Array.isArray(items)) return [];
  return (items as ShareGradeItem[]).filter(
    (i) => i && typeof i.category === 'string' && Number.isFinite(i.amount),
  );
}

/** 항목 배열 → 등급/라벨/이모지/절약률/완성도. 빈 입력도 안전(1등급·완성도 0·절약 null). */
export function computeShareGrade(items: ReadonlyArray<ShareGradeItem>): ShareGrade {
  const list = normalizeItems(items);
  const completeness = computeCompleteness(list);
  const savingPercent = computeSavingPercent(list);
  const grade = decideGrade(completeness, savingPercent);
  const meta = GRADE_META[grade];
  return { grade, label: meta.label, emoji: meta.emoji, savingPercent, completeness };
}

/** 완성도(%) → GA4 밴드. 경계는 등급 기준(30/50/70/85)과 동일해 지표 해석이 일관된다. */
export function completenessBand(completeness: number): CompletenessBand {
  if (completeness >= 85) return '85-100';
  if (completeness >= 70) return '70-85';
  if (completeness >= 50) return '50-70';
  if (completeness >= 30) return '30-50';
  return '0-30';
}

/**
 * 평균 대비 한 줄 카피 — 비난 없는 톤(설계 §2.1(b)).
 *  절약(양수) → "전국 평균보다 N% 알뜰하게 준비 중이에요"
 *  초과(음수) → "전국 평균보다 N% 프리미엄으로 준비 중이에요 ✨"
 *  0        → "전국 평균과 비슷하게 준비 중이에요"
 *  null     → 비교 문구 없음(금액 입력 전) — 호출측이 생략
 */
// [CL-SHARE-AUDIT-D5-20260717-190000] **표시 전용** 상한 — 판정 경로(등급)는 불변.
//  배경: savingPercent 의 분모는 '입력 항목의 평균 합'이라 항목이 적을수록 발산한다(1개 항목만 입력 +
//  큰 금액 → -1,900% 같은 4자리 %). 카드는 스크린샷·단톡방 공유가 존재 이유라 그 숫자가 그대로
//  박제되며 §2.1 '비난 없는 톤'이 훼손된다. computeSavingPercent 반환값을 클램프하면 등급 임계·GA4
//  지표까지 왜곡되므로, **표시 문자열 생성 시점에만** 상한을 적용해 자릿수 노출 자체를 없앤다.
const SAVING_COPY_MAX = 200; // 이 밖은 숫자 대신 정성 문구로 전환

export function savingCopy(savingPercent: number | null): string | null {
  if (savingPercent === null) return null;
  if (savingPercent > SAVING_COPY_MAX) return '전국 평균보다 아주 알뜰하게 준비 중이에요';
  if (savingPercent < -SAVING_COPY_MAX) return '평균보다 넉넉하게 준비 중이에요 ✨';
  if (savingPercent > 0) return `전국 평균보다 ${savingPercent}% 알뜰하게 준비 중이에요`;
  if (savingPercent < 0) return `전국 평균보다 ${Math.abs(savingPercent)}% 프리미엄으로 준비 중이에요 ✨`;
  return '전국 평균과 비슷하게 준비 중이에요';
}

/**
 * 카테고리 하이라이트(설계 §2.1(c)) — 평균 대비 가장 아낀 카테고리 1개 + 가장 투자한 카테고리 1개.
 * 비교 가능 항목이 없는 카테고리는 제외. 동률이면 BUDGET_CATEGORIES 정의 순서가 우선(결정론).
 * 절약/투자 어느 쪽도 없으면 해당 필드 null.
 */
export interface CategoryHighlight {
  categoryId: string;
  name: string;
  icon: string;
  /** 평균 대비 절약률(%) — 양수 = 아낌, 음수 = 투자 */
  savingPercent: number;
}

export function computeCategoryHighlights(items: ReadonlyArray<ShareGradeItem>): {
  saved: CategoryHighlight | null;
  invested: CategoryHighlight | null;
} {
  // [CL-SHARE-AUDIT-D7-20260717-190000] 등급과 동일 정규화 공유(가드 비대칭 제거)
  const perCategory = new Map<string, { user: number; avg: number }>();
  for (const it of normalizeItems(items)) {
    if (!(it.amount > 0)) continue;
    const avg = getAverageCost(it.category, it.sub_category);
    if (!avg || avg.amount <= 0) continue;
    const acc = perCategory.get(it.category) ?? { user: 0, avg: 0 };
    acc.user += it.amount;
    acc.avg += avg.amount;
    perCategory.set(it.category, acc);
  }

  let saved: CategoryHighlight | null = null;
  let invested: CategoryHighlight | null = null;
  // BUDGET_CATEGORIES 순회 = 동률 시 정의 순서 우선(결정론 보장)
  for (const cat of BUDGET_CATEGORIES) {
    const acc = perCategory.get(cat.id);
    if (!acc || acc.avg <= 0) continue;
    const pct = Math.round(((acc.avg - acc.user) / acc.avg) * 100);
    const entry: CategoryHighlight = { categoryId: cat.id, name: cat.name, icon: cat.icon, savingPercent: pct };
    if (pct > 0 && (!saved || pct > saved.savingPercent)) saved = entry;
    if (pct < 0 && (!invested || pct < invested.savingPercent)) invested = entry;
  }
  return { saved, invested };
}
