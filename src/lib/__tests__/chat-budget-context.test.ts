// [CL-TOP20-P4-AICHAT-20260703-040000] 예산 컨텍스트 순수 함수 단위 테스트
// 오라클: 빈 예산 → null · 큰 값 포맷 · PII 부재 · 토글 OFF(withBudgetContext) 미포함 · D-day 결정론
import { describe, it, expect } from 'vitest';
import {
  buildBudgetContext,
  withBudgetContext,
  formatKoreanMoney,
  type BudgetContextItem,
} from '@/lib/chat-budget-context';

const NOW = new Date('2026-07-03T12:00:00');

describe('buildBudgetContext — 순수 요약 생성', () => {
  it('BC-P.1: 빈 예산(items=[], 날짜 없음) → null', () => {
    expect(buildBudgetContext({ items: [], now: NOW })).toBeNull();
  });

  it('BC-P.2: 총액 0(전부 0원)이고 날짜도 없으면 → null', () => {
    const items: BudgetContextItem[] = [
      { category: 'main-ceremony', amount: 0, is_paid: false },
      { category: 'sudeme-styling', amount: 0, is_paid: true },
    ];
    expect(buildBudgetContext({ items, now: NOW })).toBeNull();
  });

  it('BC-P.3: 정상 예산 — 총액·완료율·상위 카테고리·D-day 가 모두 포함된다', () => {
    const items: BudgetContextItem[] = [
      { category: 'main-ceremony', amount: 20_000_000, is_paid: true },
      { category: 'sudeme-styling', amount: 20_000_000, is_paid: false },
      { category: 'gifts-houseware', amount: 10_000_000, is_paid: false },
    ];
    const text = buildBudgetContext({ items, weddingDate: '2026-10-31', now: NOW });
    expect(text).not.toBeNull();
    expect(text).toContain('총예산 5,000만원');
    expect(text).toContain('결제 완료율 40%'); // 2,000만/5,000만
    expect(text).toContain('본식 운영 2,000만원'); // 카테고리 id → 한국어 라벨
    expect(text).toContain('결혼식까지 D-120'); // 2026-07-03 → 2026-10-31
  });

  it('BC-P.4: 큰 값 — 억 단위 포맷', () => {
    const items: BudgetContextItem[] = [
      { category: 'housing', amount: 230_000_000, is_paid: false },
    ];
    const text = buildBudgetContext({ items, now: NOW });
    expect(text).toContain('2억 3,000만원');
  });

  it('BC-P.5: 상위 3개 카테고리만 포함(4번째 카테고리 라벨 부재)', () => {
    const items: BudgetContextItem[] = [
      { category: 'main-ceremony', amount: 40_000_000, is_paid: false },
      { category: 'sudeme-styling', amount: 30_000_000, is_paid: false },
      { category: 'gifts-houseware', amount: 20_000_000, is_paid: false },
      { category: 'honeymoon', amount: 1_000_000, is_paid: false },
    ];
    const text = buildBudgetContext({ items, now: NOW })!;
    expect(text).toContain('본식 운영');
    expect(text).toContain('혼수 및 예물');
    expect(text).not.toContain('신혼여행'); // 4위는 제외
  });

  it('BC-P.6: PII 부재 — 입력에 notes/이름/이메일이 섞여 들어와도 출력에 노출되지 않는다', () => {
    const dirty = [
      {
        category: 'main-ceremony',
        amount: 10_000_000,
        is_paid: false,
        notes: '김철수 010-1234-5678',
        custom_name: 'shane.brilliant@gmail.com',
      },
    ] as unknown as BudgetContextItem[];
    const text = buildBudgetContext({ items: dirty, weddingDate: '2026-10-31', now: NOW })!;
    expect(text).not.toContain('김철수');
    expect(text).not.toContain('010-1234-5678');
    expect(text).not.toContain('@');
  });

  it('BC-P.7: D-day 경계 — 당일/과거/잘못된 날짜', () => {
    const items: BudgetContextItem[] = [{ category: 'main-ceremony', amount: 1_000_000, is_paid: false }];
    expect(buildBudgetContext({ items, weddingDate: '2026-07-03', now: NOW })).toContain('결혼식 당일(D-Day)');
    expect(buildBudgetContext({ items, weddingDate: '2026-06-30', now: NOW })).toContain('결혼식 후 D+3');
    // 잘못된 날짜는 D-day 없이 예산 요약만
    const invalid = buildBudgetContext({ items, weddingDate: 'not-a-date', now: NOW })!;
    expect(invalid).toContain('총예산');
    expect(invalid).not.toContain('D-');
  });

  it('BC-P.8: 음수/NaN 금액 방어 — 0으로 취급되어 폭주하지 않는다', () => {
    const items = [
      { category: 'main-ceremony', amount: -5_000_000, is_paid: false },
      { category: 'sudeme-styling', amount: Number.NaN, is_paid: false },
      { category: 'gifts-houseware', amount: 10_000_000, is_paid: true },
    ] as BudgetContextItem[];
    const text = buildBudgetContext({ items, now: NOW })!;
    expect(text).toContain('총예산 1,000만원');
    expect(text).toContain('결제 완료율 100%');
  });
});

describe('withBudgetContext — qa 컨텍스트 병합(토글 게이트)', () => {
  it('BC-M.1: 요약 제공 시 budgetSummary 로 병합되고 원본은 불변', () => {
    const base = { knowledgeBase: ['[예산] Q: ...'] };
    const merged = withBudgetContext(base, '[내 예산 현황] 총예산 5,000만원');
    expect(merged.budgetSummary).toBe('[내 예산 현황] 총예산 5,000만원');
    expect(merged.knowledgeBase).toEqual(base.knowledgeBase);
    expect('budgetSummary' in base).toBe(false); // 원본 오염 없음
  });

  it('BC-M.2: 토글 OFF(null/undefined/공백) → 컨텍스트에 미포함', () => {
    const base = { a: 1 };
    for (const off of [null, undefined, '', '   ']) {
      const merged = withBudgetContext(base, off);
      expect('budgetSummary' in merged).toBe(false);
    }
  });
});

describe('formatKoreanMoney — 원화 요약 포맷', () => {
  it('BC-F.1: 만원/억 경계값', () => {
    expect(formatKoreanMoney(9_999)).toBe('9,999원');
    expect(formatKoreanMoney(10_000)).toBe('1만원');
    expect(formatKoreanMoney(50_000_000)).toBe('5,000만원');
    expect(formatKoreanMoney(200_000_000)).toBe('2억원');
    expect(formatKoreanMoney(230_000_000)).toBe('2억 3,000만원');
  });
});
