// [CL-SAMPLE-SHEET-20260718-100000] 엑셀형 예산 예시표 — 데이터 정합·읽기전용·CTA 계측 가드.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/test/test-utils';
import { SampleBudgetSheet } from '../SampleBudgetSheet';
import { buildSampleBudget, sampleBudgetTotal } from '@/lib/sample-budget';
import { AVERAGE_COSTS } from '@/lib/average-costs';
import { BUDGET_CATEGORIES, formatKoreanWon } from '@/lib/budget-categories';

const h = vi.hoisted(() => ({ navigate: vi.fn(), gtag: vi.fn() }));
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => h.navigate };
});

beforeEach(() => {
  h.navigate.mockReset();
  h.gtag.mockReset();
  (window as unknown as { gtag: unknown }).gtag = h.gtag;
});

describe('sample-budget (순수 파생 — 하드코딩 표류 가드)', () => {
  it('SBS.1 각 카테고리 항목 금액이 AVERAGE_COSTS 단일소스와 1:1 정합', () => {
    for (const cat of buildSampleBudget()) {
      for (const item of cat.items) {
        expect(item.amount).toBe(AVERAGE_COSTS[cat.id][item.id].amount);
        expect(item.amount).toBeGreaterThan(0); // 평균 0원 항목은 제외됨
      }
    }
  });

  it('SBS.2 카테고리 소계 = 항목 금액 합, 총액 = 소계 합(산술 무결)', () => {
    const cats = buildSampleBudget();
    for (const cat of cats) {
      expect(cat.subtotal).toBe(cat.items.reduce((s, i) => s + i.amount, 0));
    }
    expect(sampleBudgetTotal(cats)).toBe(cats.reduce((s, c) => s + c.subtotal, 0));
  });

  it('SBS.3 정의된 6개 카테고리를 항목 있는 순서대로 포함(빈 카테고리만 제외)', () => {
    const ids = buildSampleBudget().map((c) => c.id);
    const expected = BUDGET_CATEGORIES.filter((c) =>
      c.subCategories.some((s) => (AVERAGE_COSTS[c.id]?.[s.id]?.amount ?? 0) > 0),
    ).map((c) => c.id);
    expect(ids).toEqual(expected);
    expect(ids.length).toBe(6); // 현재 데이터상 6개 전부 항목 보유
  });
});

describe('SampleBudgetSheet (렌더·읽기전용·CTA)', () => {
  it('SBS.4 예시 표·총액·출처 고지가 렌더된다', () => {
    renderWithProviders(<SampleBudgetSheet />);
    expect(screen.getByRole('region', { name: '결혼 예산 예시표' })).toBeInTheDocument();
    const total = sampleBudgetTotal(buildSampleBudget());
    expect(screen.getByText('총 예상 비용')).toBeInTheDocument();
    // 총액 금액이 표시(formatKoreanWon 결과) — 표 안 어딘가에 존재
    expect(screen.getAllByText(formatKoreanWon(total)).length).toBeGreaterThan(0);
    expect(screen.getByText(/출처/)).toBeInTheDocument(); // SOURCE_TEXT
    expect(screen.getByText('예시')).toBeInTheDocument();  // '예시' 배지(정직 라벨)
  });

  it('SBS.5 읽기전용 — 입력/편집 요소(input·slider·textbox) 0', () => {
    const { container } = renderWithProviders(<SampleBudgetSheet />);
    expect(container.querySelectorAll('input, textarea, [role="slider"], [contenteditable]').length).toBe(0);
  });

  it('SBS.6 CTA 클릭 → /auth 네비 + landing_hero_cta_click(method:sample_sheet) 계측', () => {
    renderWithProviders(<SampleBudgetSheet />);
    fireEvent.click(screen.getByRole('button', { name: /로그인하고 내 예산 만들기/ }));
    expect(h.navigate).toHaveBeenCalledWith('/auth');
    const call = h.gtag.mock.calls.find((c) => c[1] === 'landing_hero_cta_click');
    expect(call?.[2]).toMatchObject({ method: 'sample_sheet' });
  });
});
