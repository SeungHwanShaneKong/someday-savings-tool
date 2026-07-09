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
  const onAddTasks = vi.fn().mockResolvedValue({ added: 1, failed: 0 });
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
      onAddTasks={onAddTasks}
      {...over}
    />,
  );
  return { onApplyDueDate, onAddTask, onAddTasks };
}

/** 같은 period 에 무매치 add 가 여러 개인 fixture — 배치 sort_order 중복(D-1) 재현 표면 */
function buildMultiAddFixture() {
  const t1: TimelineTask = { task: '새 항목 하나', priority: 'low', tip: '', deadline: '2026-09-01' };
  const t2: TimelineTask = { task: '새 항목 둘', priority: 'low', tip: '', deadline: '2026-09-05' };
  const t3: TimelineTask = { task: '새 항목 셋', priority: 'low', tip: '', deadline: '2026-09-09' };
  const result: TimelineResult = { timeline: [{ month: '2026-09', tasks: [t1, t2, t3] }], dday_count: 90 };
  const mk = (task: TimelineTask) => ({ kind: 'add' as const, title: task.task, deadline: task.deadline, period: 'D-4~3m' as const });
  const plan: TimelineApplyPlan<TimelineTask> = {
    matches: [],
    additions: [mk(t1), mk(t2), mk(t3)],
    decisions: new Map([[t1, mk(t1)], [t2, mk(t2)], [t3, mk(t3)]]),
  };
  return { result, plan };
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

  it('TP3 모두 적용(n건) → 확인 다이얼로그 → apply 순차 + add 배치 + 버튼 소멸(펜딩 0)', async () => {
    // [CL-AUDIT6-D1-20260710] add 는 배치(onAddTasks)로 원자 처리 — 단건 onAddTask 는 호출되지 않음
    const { onApplyDueDate, onAddTask, onAddTasks } = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: '모두 적용 (2건)' }));
    // AlertDialog 확인 게이트
    expect(screen.getByText('AI 일정을 한 번에 반영할까요?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '모두 적용' }));

    await waitFor(() => {
      expect(onApplyDueDate).toHaveBeenCalledWith('i1', '2026-08-10');
      expect(onAddTasks).toHaveBeenCalledWith([
        { title: '완전히 새로운 항목', period: 'D-4~3m', dueDate: '2026-09-01' },
      ]);
    });
    expect(onAddTask).not.toHaveBeenCalled(); // 배치 경로 — 단건 미사용
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

  // [CL-AUDIT6-D1-20260710] 확정결함 D-1 근본수정 검증: "모두 적용"의 다건 add 는 단건 연속이 아니라
  //   배치(onAddTasks) 1회로 원자 처리돼야 sort_order 중복이 구조적으로 불가능하다.
  it('TP5 같은 period 다건 add → onAddTasks 배치 1회 호출(단건 onAddTask 연속 호출 금지)', async () => {
    const { result, plan } = buildMultiAddFixture();
    const onAddTask = vi.fn().mockResolvedValue(true);
    const onAddTasks = vi.fn().mockResolvedValue({ added: 3, failed: 0 });
    render(
      <TimelinePanel
        open
        onOpenChange={vi.fn()}
        result={result}
        loading={false}
        error={null}
        applyPlan={plan}
        onApplyDueDate={vi.fn().mockResolvedValue(true)}
        onAddTask={onAddTask}
        onAddTasks={onAddTasks}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '모두 적용 (3건)' }));
    fireEvent.click(screen.getByRole('button', { name: '모두 적용' }));

    await waitFor(() => expect(onAddTasks).toHaveBeenCalledTimes(1));
    // 배치 1회에 3건 전부 — 단건 순차 호출 경로는 사용되지 않음(중복 sort_order 원천 차단)
    const batchArg = onAddTasks.mock.calls[0][0];
    expect(batchArg).toHaveLength(3);
    expect(batchArg.map((a: { period: string }) => a.period)).toEqual(['D-4~3m', 'D-4~3m', 'D-4~3m']);
    expect(onAddTask).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getAllByText('추가됨 ✓')).toHaveLength(3));
  });

  it('TP6 onAddTasks 미제공(하위호환) → 단건 onAddTask 폴백으로 순차 처리', async () => {
    const { result, plan } = buildMultiAddFixture();
    const onAddTask = vi.fn().mockResolvedValue(true);
    render(
      <TimelinePanel
        open
        onOpenChange={vi.fn()}
        result={result}
        loading={false}
        error={null}
        applyPlan={plan}
        onApplyDueDate={vi.fn().mockResolvedValue(true)}
        onAddTask={onAddTask}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '모두 적용 (3건)' }));
    fireEvent.click(screen.getByRole('button', { name: '모두 적용' }));

    await waitFor(() => expect(onAddTask).toHaveBeenCalledTimes(3));
  });
});
