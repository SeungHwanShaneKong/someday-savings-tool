// [CL-SAMPLE-SHEET-20260718-100000] 비로그인 랜딩 "엑셀형 예산 예시표" 데이터 — 순수 파생.
//  하드코딩 0: BUDGET_CATEGORIES × AVERAGE_COSTS(2026 상반기 공표치) 에서 전 항목을 산출.
//  UI 비의존이라 vitest 로 "표시 데이터가 단일소스와 정합"함을 기계 검증(하드코딩 표류 가드).
import { BUDGET_CATEGORIES } from '@/lib/budget-categories';
import { getAverageCost } from '@/lib/average-costs';

export interface SampleSubItem {
  id: string;
  name: string;
  amount: number;
  /** 출처/기준 메모(있으면) — 근거 열 표시용 */
  note?: string;
}

export interface SampleCategory {
  id: string;
  name: string;
  icon: string;
  items: SampleSubItem[];
  /** 카테고리 소계 = items 금액 합 */
  subtotal: number;
}

/**
 * 예시표 카테고리 목록. 각 카테고리의 서브항목 중 **평균가 데이터가 있고 금액>0** 인 것만 포함
 * (평균 0원인 웨딩 플래너·가방순이 등은 제외 — "채워지는 표" 인상 유지). 소계·총액은 파생.
 */
export function buildSampleBudget(): SampleCategory[] {
  return BUDGET_CATEGORIES.map((cat) => {
    const items: SampleSubItem[] = cat.subCategories
      .map((sub): SampleSubItem | null => {
        const avg = getAverageCost(cat.id, sub.id);
        if (!avg || avg.amount <= 0) return null;
        return { id: sub.id, name: sub.name, amount: avg.amount, note: avg.note };
      })
      .filter((x): x is SampleSubItem => x !== null);
    const subtotal = items.reduce((sum, it) => sum + it.amount, 0);
    return { id: cat.id, name: cat.name, icon: cat.icon, items, subtotal };
  }).filter((c) => c.items.length > 0);
}

/** 총액 = 모든 카테고리 소계 합(= 표시 총액). */
export function sampleBudgetTotal(categories: SampleCategory[]): number {
  return categories.reduce((sum, c) => sum + c.subtotal, 0);
}
