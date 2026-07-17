// [CL-SHARE-P1-20260717-170000] share-grade 순수 함수 — 5등급 경계·빈 입력·평균 초과·하이라이트.
//   설계 DoD #3(docs/growth-share-card-design.md §6). 기준 데이터는 average-costs(2026 상반기 공표) 단일소스.
import { describe, it, expect } from 'vitest';
import {
  computeShareGrade,
  completenessBand,
  savingCopy,
  computeCategoryHighlights,
  type ShareGradeItem,
} from '@/lib/share-grade';
import { AVERAGE_COSTS } from '@/lib/average-costs';
import { BUDGET_CATEGORIES } from '@/lib/budget-categories';

/** 평균과 정확히 같은 금액의 항목(절약률 0%) — 카테고리별 첫 '평균>0' 서브카테고리 사용. */
const avgItem = (categoryId: string, ratio = 1): ShareGradeItem => {
  const subs = AVERAGE_COSTS[categoryId];
  const [subId, data] = Object.entries(subs).find(([, d]) => d.amount > 0)!;
  return { category: categoryId, sub_category: subId, amount: Math.round(data.amount * ratio) };
};

/** N개 카테고리를 평균×ratio 로 채운 항목 배열 → 완성도 = N/전체 카테고리 수. */
const fillCategories = (n: number, ratio = 1): ShareGradeItem[] =>
  BUDGET_CATEGORIES.slice(0, n).map((c) => avgItem(c.id, ratio));

const TOTAL = BUDGET_CATEGORIES.length; // 6

describe('SG: computeShareGrade — 완성도', () => {
  it('SG.1 빈 입력 → 1등급·완성도 0·절약률 null(0% 로 단정 금지)', () => {
    const g = computeShareGrade([]);
    expect(g.grade).toBe(1);
    expect(g.completeness).toBe(0);
    expect(g.savingPercent).toBeNull();
    expect(g.label).toBe('예비 새싹');
  });

  it('SG.2 금액 0 항목만 → 완성도 0(입력≠완성)', () => {
    const g = computeShareGrade([{ category: 'main-ceremony', sub_category: 'venue-fee', amount: 0 }]);
    expect(g.completeness).toBe(0);
    expect(g.grade).toBe(1);
  });

  it('SG.3 완성도 = 채운 카테고리/전체 카테고리(6) — 3개 채우면 50%', () => {
    expect(computeShareGrade(fillCategories(3)).completeness).toBe(Math.round((3 / TOTAL) * 100));
    expect(computeShareGrade(fillCategories(6)).completeness).toBe(100);
  });

  it('SG.4 알 수 없는 카테고리 키는 완성도 분자에서 제외(오염 방지)', () => {
    const g = computeShareGrade([{ category: 'nonexistent-cat', sub_category: 'x', amount: 999 }]);
    expect(g.completeness).toBe(0);
  });

  it('SG.5 같은 카테고리 여러 항목은 완성도에 1회만 계산(중복 카운트 금지)', () => {
    const subs = Object.entries(AVERAGE_COSTS['main-ceremony']).filter(([, d]) => d.amount > 0);
    const items = subs.map(([id, d]) => ({ category: 'main-ceremony', sub_category: id, amount: d.amount }));
    expect(items.length).toBeGreaterThan(1);
    expect(computeShareGrade(items).completeness).toBe(Math.round((1 / TOTAL) * 100));
  });
});

describe('SG: computeShareGrade — 절약률', () => {
  it('SG.6 평균과 동일 금액 → 절약률 0%', () => {
    expect(computeShareGrade(fillCategories(6, 1)).savingPercent).toBe(0);
  });

  it('SG.7 평균의 80% → 절약률 20%(알뜰), 평균의 120% → -20%(프리미엄)', () => {
    expect(computeShareGrade(fillCategories(6, 0.8)).savingPercent).toBe(20);
    expect(computeShareGrade(fillCategories(6, 1.2)).savingPercent).toBe(-20);
  });

  it('SG.8 평균 미보유/평균 0원 항목만 → 절약률 null(비교 불가)', () => {
    // wedding-planner 는 평균 0원(존재하지만 비용 0) → 비교 대상에서 제외
    const g = computeShareGrade([{ category: 'miscellaneous', sub_category: 'wedding-planner', amount: 500000 }]);
    expect(g.savingPercent).toBeNull();
    // 단 완성도에는 잡힌다(금액>0 인 카테고리)
    expect(g.completeness).toBe(Math.round((1 / TOTAL) * 100));
  });
});

describe('SG: 등급 경계(설계 §2.1 표)', () => {
  it('SG.9 5등급: 완성도 100 & 절약 20% 이상', () => {
    const g = computeShareGrade(fillCategories(6, 0.8)); // 완성도 100·절약 20
    expect(g.grade).toBe(5);
    expect(g.label).toBe('웨딩 재테크 만렙');
    expect(g.emoji).toBe('👑');
  });

  it('SG.10 4등급: 완성도 100 & 절약 10~19%(5등급 경계 미달)', () => {
    const g = computeShareGrade(fillCategories(6, 0.88)); // 절약 12%
    expect(g.savingPercent).toBe(12);
    expect(g.grade).toBe(4);
    expect(g.label).toBe('갓성비 마스터');
  });

  it('SG.11 3등급: 완성도 100 & 절약 0~9%', () => {
    const g = computeShareGrade(fillCategories(6, 1)); // 절약 0
    expect(g.grade).toBe(3);
    expect(g.label).toBe('알뜰 요정');
  });

  it('SG.12 2등급: 평균 초과(절약 음수)여도 완성도 30% 이상이면 소외 없이 2등급(설계: 상한 2)', () => {
    const g = computeShareGrade(fillCategories(6, 1.5)); // 완성도 100·절약 -50
    expect(g.savingPercent).toBe(-50);
    expect(g.grade).toBe(2);
    expect(g.label).toBe('야무진 플래너');
  });

  it('SG.13 1등급: 완성도 30% 미만(1개 카테고리=17%)', () => {
    const g = computeShareGrade(fillCategories(1, 0.5));
    expect(g.completeness).toBeLessThan(30);
    expect(g.grade).toBe(1);
  });

  it('SG.14 완성도 미달이면 절약률이 높아도 상위 등급 불가(두 축 AND 계약)', () => {
    const g = computeShareGrade(fillCategories(2, 0.5)); // 완성도 33·절약 50
    expect(g.savingPercent).toBe(50);
    expect(g.grade).toBe(2); // 완성도 50 미만 → 3등급 불가
  });

  it('SG.15 절약률 null(비교 불가)은 알뜰 축 미충족 — 완성도만으로 최대 2등급', () => {
    // 평균 0원 항목으로만 6개 카테고리를 채울 수 없으므로 완성도 100 + null 조합을 직접 구성
    const items: ShareGradeItem[] = BUDGET_CATEGORIES.map((c) => ({
      category: c.id,
      sub_category: '__unknown__', // 평균 미보유 → 비교 불가
      amount: 1_000_000,
    }));
    const g = computeShareGrade(items);
    expect(g.completeness).toBe(100);
    expect(g.savingPercent).toBeNull();
    expect(g.grade).toBe(2);
  });
});

describe('SG: completenessBand — 등급 경계와 동일(지표 해석 일관)', () => {
  it('SG.16 밴드 경계 5구간', () => {
    expect(completenessBand(0)).toBe('0-30');
    expect(completenessBand(29)).toBe('0-30');
    expect(completenessBand(30)).toBe('30-50');
    expect(completenessBand(49)).toBe('30-50');
    expect(completenessBand(50)).toBe('50-70');
    expect(completenessBand(69)).toBe('50-70');
    expect(completenessBand(70)).toBe('70-85');
    expect(completenessBand(84)).toBe('70-85');
    expect(completenessBand(85)).toBe('85-100');
    expect(completenessBand(100)).toBe('85-100');
  });
});

describe('SG: savingCopy — 비난 없는 톤(설계 §2.1 소외 금지)', () => {
  it('SG.17 절약/동일/초과/불가 4분기', () => {
    expect(savingCopy(12)).toBe('전국 평균보다 12% 알뜰하게 준비 중이에요');
    expect(savingCopy(0)).toBe('전국 평균과 비슷하게 준비 중이에요');
    expect(savingCopy(-20)).toContain('프리미엄으로 준비 중이에요');
    expect(savingCopy(-20)).not.toContain('초과');   // 비난 어휘 금지
    expect(savingCopy(-20)).not.toContain('과소비');
    expect(savingCopy(null)).toBeNull();             // 비교 불가 → 문구 생략
  });
});

describe('SG: computeCategoryHighlights — 절약 1·투자 1', () => {
  it('SG.18 절약 카테고리와 투자 카테고리를 각각 1개씩 선정', () => {
    const items = [avgItem(BUDGET_CATEGORIES[0].id, 0.5), avgItem(BUDGET_CATEGORIES[1].id, 2)];
    const { saved, invested } = computeCategoryHighlights(items);
    expect(saved?.categoryId).toBe(BUDGET_CATEGORIES[0].id);
    expect(saved?.savingPercent).toBe(50);
    expect(invested?.categoryId).toBe(BUDGET_CATEGORIES[1].id);
    expect(invested?.savingPercent).toBe(-100);
  });

  it('SG.19 빈 입력·비교 불가 → 둘 다 null(없는 하이라이트 발명 금지)', () => {
    expect(computeCategoryHighlights([])).toEqual({ saved: null, invested: null });
    expect(
      computeCategoryHighlights([{ category: 'miscellaneous', sub_category: 'wedding-planner', amount: 100 }]),
    ).toEqual({ saved: null, invested: null });
  });

  it('SG.20 평균과 정확히 같으면(0%) 절약도 투자도 아님(경계 배제)', () => {
    expect(computeCategoryHighlights([avgItem(BUDGET_CATEGORIES[0].id, 1)])).toEqual({
      saved: null,
      invested: null,
    });
  });
});
