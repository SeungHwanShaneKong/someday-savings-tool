// [CL-TOP20-P4-AICHAT-20260703-040000] AI 챗 예산 컨텍스트 (Top20 P4-#17)
// 현재 예산 요약(총액·상위 3카테고리·결제 완료율·D-day)을 PII 없이 문자열화하는 순수 함수 모음.
// - DB 접근 없음(순수 함수) — 데이터는 호출측(useChatBudgetSummary → Chat.tsx)이 주입.
// - 이름·이메일·메모(notes) 등 자유 텍스트는 입력 타입에서 원천 배제(PII-free by design).

import { BUDGET_CATEGORIES } from '@/lib/budget-categories';

export interface BudgetContextItem {
  /** 카테고리 id (budget_items.category) */
  category: string;
  amount: number;
  is_paid: boolean;
}

export interface BudgetContextInput {
  items: BudgetContextItem[];
  /** 결혼 예정일 (YYYY-MM-DD, budgets.wedding_date) */
  weddingDate?: string | null;
  /** 시간 주입(결정론 테스트용). 미지정 시 현재 시각 */
  now?: Date;
}

/** 숫자 방어 — 음수/NaN/Infinity 는 0으로 취급 */
function safeAmount(n: unknown): number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0;
}

/** 원화 요약 포맷: 만원/억 단위 (예: 5,000만원 · 2억 3,000만원) */
export function formatKoreanMoney(amount: number): string {
  const v = safeAmount(amount);
  if (v < 10000) return `${Math.round(v).toLocaleString('ko-KR')}원`;
  const man = Math.round(v / 10000);
  const eok = Math.floor(man / 10000);
  const rest = man % 10000;
  if (eok > 0) {
    return rest > 0
      ? `${eok.toLocaleString('ko-KR')}억 ${rest.toLocaleString('ko-KR')}만원`
      : `${eok.toLocaleString('ko-KR')}억원`;
  }
  return `${man.toLocaleString('ko-KR')}만원`;
}

/** 카테고리 id → 한국어 라벨 (미등록 id 는 '기타') */
function categoryLabel(id: string): string {
  return BUDGET_CATEGORIES.find((c) => c.id === id)?.name ?? '기타';
}

/** D-day 문구 (유효하지 않은 날짜 → null) */
function formatDday(weddingDate: string, now: Date): string | null {
  const dateOnly = weddingDate.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return null;
  const target = new Date(`${dateOnly}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diffDays > 0) return `결혼식까지 D-${diffDays}`;
  if (diffDays === 0) return '결혼식 당일(D-Day)';
  return `결혼식 후 D+${Math.abs(diffDays)}`;
}

/**
 * 예산 요약 문자열 생성.
 * 의미 있는 데이터(총액 > 0 또는 유효한 결혼일)가 없으면 null — 호출측은 컨텍스트를 아예 보내지 않는다.
 */
export function buildBudgetContext(input: BudgetContextInput): string | null {
  const now = input.now ?? new Date();
  const items = Array.isArray(input.items) ? input.items : [];

  let total = 0;
  let paidTotal = 0;
  const byCategory = new Map<string, number>();
  for (const item of items) {
    const amount = safeAmount(item?.amount);
    if (amount <= 0) continue;
    total += amount;
    if (item.is_paid) paidTotal += amount;
    const key = typeof item.category === 'string' ? item.category : '기타';
    byCategory.set(key, (byCategory.get(key) ?? 0) + amount);
  }

  const dday = input.weddingDate ? formatDday(input.weddingDate, now) : null;
  if (total <= 0 && !dday) return null;

  const lines: string[] = [];
  const headParts: string[] = [];
  if (total > 0) {
    headParts.push(`총예산 ${formatKoreanMoney(total)}`);
    headParts.push(`결제 완료율 ${Math.round((paidTotal / total) * 100)}%`);
  }
  if (dday) headParts.push(dday);
  lines.push(`[내 예산 현황] ${headParts.join(' · ')}`);

  const top3 = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  if (top3.length > 0) {
    lines.push(
      `상위 지출: ${top3
        .map(([id, amount]) => `${categoryLabel(id)} ${formatKoreanMoney(amount)}`)
        .join(', ')}`
    );
  }

  return lines.join('\n');
}

/**
 * qa 컨텍스트에 예산 요약 병합(순수). 빈/공백 요약이면 원본을 그대로 반환(미포함).
 * useAIChat 이 사용 — 토글 OFF 시 호출측이 null 을 넘겨 자연히 미포함된다.
 */
export function withBudgetContext(
  context: Record<string, unknown>,
  budgetContext?: string | null
): Record<string, unknown> {
  const trimmed = budgetContext?.trim();
  if (!trimmed) return context;
  return { ...context, budgetSummary: trimmed };
}

// ── 옵트인 토글 (localStorage 기억, 기본 ON) ─────────────────────────────────
export const BUDGET_CONTEXT_OPTIN_KEY = 'wedding_chat_budget_context_optin';

export function getBudgetContextOptIn(): boolean {
  try {
    return localStorage.getItem(BUDGET_CONTEXT_OPTIN_KEY) !== '0';
  } catch {
    return true;
  }
}

export function setBudgetContextOptIn(enabled: boolean): void {
  try {
    localStorage.setItem(BUDGET_CONTEXT_OPTIN_KEY, enabled ? '1' : '0');
  } catch {
    /* private browsing 등 — 무시(세션 내 상태로만 동작) */
  }
}
