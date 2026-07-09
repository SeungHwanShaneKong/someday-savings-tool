// [CL-CHECKUX-20260709-232512] TimelinePanel — AI 결과 '기한 적용/리스트에 추가/모두 적용' 배선 검증
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TimelinePanel from '../TimelinePanel';
import type { TimelineResult, TimelineTask } from '@/hooks/useTimelineOptimizer';
import type { TimelineApplyPlan } from '@/lib/timeline-apply';

function buildFixture() {
  const taskApply: TimelineTask = {
    task: '드레스 투어',
    priority: 'high',
    tip: '주말 예약은 서두르세요',
    deadline: '2026-08-10',
  };
  const taskAdd: TimelineTask = {
    task: '완전히 새로운 항목',
    priority: 'low',
    tip: '미리 알아보면 좋아요',
    deadline: '2026-09-01',
  };
  const result: TimelineResult = {
    timeline: [{ month: '2026-08', tasks: [taskApply, taskAdd] }],
    dday_count: 120,
  };
  const plan: TimelineApplyPlan<TimelineTask> = {
    matches: [
      { itemId: 'i1', title: '드레스 투어 예약', oldDue: '2026-09-01', newDue: '2026-08-10' },
    ],
    additions: [{ title: '완전히 새로운 항목', deadline: '2026-09-01', period: 'D-4~3m' }],
    decisions: new Map([
      [
        taskApply,
        {
          kind: 'apply' as const,
          itemId: 'i1',
          title: '드레스 투어 예약',
          oldDue: '2026-09-01',
          newDue: '2026-08-10',
        },
      ],
      [
        taskAdd,
        {
          kind: 'add' as const,
          title: '완전히 새로운 항목',
          deadline: '2026-09-01',
          period: 'D-4~3m' as const,
        },
      ],
    ]),
  };
  return { result, plan };
}

function renderPanel(over: Partial<Parameters<typeof TimelinePanel>[0]> = {}) {
  const { result, plan } = buildFixture();
  const onApplyDueDate = vi.fn().mockResolvedValue(true);
  const onAddTask = vi.fn().mockResolvedValue(true);
  render(
    <TimelinePanel
      open
      onOpenChange={vi.fn()}
      result={result}
      loading={false}
      error={null}
      applyPlan={plan}
      onApplyDueDate={onApplyDueDate}
      onAddTask={onAddTask}
      {...over}
    />,
  );
  return { onApplyDueDate, onAddTask };
}

describe('TimelinePanel — 체크리스트 적용 배선', () => {
  it('TP1 매치 task → 기한 diff 표기 + "기한 적용" 클릭 → onApplyDueDate(itemId, newDue) + 적용됨 ✓', async () => {
    const { onApplyDueDate } = renderPanel();

    // 기존기한 → 새기한 diff 표기(9/1 → 8/10)
    expect(screen.getByText(/9\/1 → 8\/10/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /기한 적용/ }));
    await waitFor(() => expect(screen.getByText('적용됨 ✓')).toBeInTheDocument());
    expect(onApplyDueDate).toHaveBeenCalledTimes(1);
    expect(onApplyDueDate).toHaveBeenCalledWith('i1', '2026-08-10');
  });

  it('TP2 무매치 task → "내 리스트에 추가" 클릭 → onAddTask(title, period, deadline) + 추가됨 ✓', async () => {
    const { onAddTask } = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: /내 리스트에 추가/ }));
    await waitFor(() => expect(screen.getByText('추가됨 ✓')).toBeInTheDocument());
    expect(onAddTask).toHaveBeenCalledTimes(1);
    expect(onAddTask).toHaveBeenCalledWith('완전히 새로운 항목', 'D-4~3m', '2026-09-01');
  });

  it('TP3 모두 적용(n건) → 확인 다이얼로그 → 순차 일괄 적용 + 버튼 소멸(펜딩 0)', async () => {
    const { onApplyDueDate, onAddTask } = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: '모두 적용 (2건)' }));
    // AlertDialog 확인 게이트
    expect(screen.getByText('AI 일정을 한 번에 반영할까요?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '모두 적용' }));

    await waitFor(() => {
      expect(onApplyDueDate).toHaveBeenCalledWith('i1', '2026-08-10');
      expect(onAddTask).toHaveBeenCalledWith('완전히 새로운 항목', 'D-4~3m', '2026-09-01');
    });
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /모두 적용 \(/ })).toBeNull(),
    );
    expect(screen.getByText('적용됨 ✓')).toBeInTheDocument();
    expect(screen.getByText('추가됨 ✓')).toBeInTheDocument();
  });

  it('TP4 applyPlan 미전달(레거시 조회 전용) → 적용 UI 미노출(회귀 0)', () => {
    renderPanel({ applyPlan: null });
    expect(screen.queryByRole('button', { name: /기한 적용/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /모두 적용/ })).toBeNull();
  });
});
