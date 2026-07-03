// [CL-TOP20-P4-AICHAT-20260703-040000] AI 챗용 예산 요약 훅 (Top20 P4-#17)
// 왜 신규 훅인가: 기존 useBudget/useMultipleBudgets 는 예산이 없으면 '자동 생성'(DB 쓰기 부작용)
// + 실시간 공동편집 구독 등 무거운 기계를 끌고 온다 → 챗 표면에서는 읽기 전용·경량이 필수.
// 이 훅은 SELECT 2회(예산 목록 → 활성 예산 항목)만 수행하며, 어떤 경우에도 쓰기를 하지 않는다.
// useAIChat 은 DB 를 모른다 — 이 훅의 결과(문자열)를 Chat.tsx 가 파라미터로 주입한다.

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { buildBudgetContext, type BudgetContextItem } from '@/lib/chat-budget-context';

/** useMultipleBudgets 와 동일한 sessionStorage 키(읽기 전용 참조) — 활성 예산 우선 선택 */
const ACTIVE_BUDGET_KEY = 'wedding_active_budget_id';

interface UseChatBudgetSummaryOptions {
  /** false 면 조회 자체를 건너뛴다(옵트인 OFF) */
  enabled?: boolean;
}

export function useChatBudgetSummary({ enabled = true }: UseChatBudgetSummaryOptions = {}) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !enabled) {
      setSummary(null);
      return;
    }

    let cancelled = false;

    const fetchSummary = async () => {
      setLoading(true);
      try {
        // 1) 내 예산 목록(최근 수정 순) — 읽기 전용, 없으면 그대로 종료(자동 생성 금지)
        const { data: budgets, error } = await supabase
          .from('budgets')
          .select('id, wedding_date, updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (error || !budgets || budgets.length === 0) {
          if (!cancelled) setSummary(null);
          return;
        }

        // 2) 활성 예산 우선(BudgetFlow 와 동일 키), 없으면 최근 수정 예산
        let active = budgets[0];
        try {
          const activeId = sessionStorage.getItem(ACTIVE_BUDGET_KEY);
          const found = activeId ? budgets.find((b) => b.id === activeId) : undefined;
          if (found) active = found;
        } catch {
          /* sessionStorage 불가 환경 — 최근 예산으로 진행 */
        }

        // 3) 항목은 집계에 필요한 최소 컬럼만(PII 컬럼 notes/custom_name 미조회)
        const { data: items, error: itemsError } = await supabase
          .from('budget_items')
          .select('category, amount, is_paid')
          .eq('budget_id', active.id);

        if (itemsError) {
          if (!cancelled) setSummary(null);
          return;
        }

        const text = buildBudgetContext({
          items: (items ?? []) as BudgetContextItem[],
          weddingDate: active.wedding_date ?? null,
        });
        if (!cancelled) setSummary(text);
      } catch {
        // degrade-safe: 요약 실패는 챗 기능에 영향 없음(컨텍스트 미포함으로 진행)
        if (!cancelled) setSummary(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSummary();
    return () => {
      cancelled = true;
    };
  }, [user, enabled]);

  return { summary, loading };
}
