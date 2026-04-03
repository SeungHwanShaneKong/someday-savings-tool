/**
 * [CL-TIMELINE-FALLBACK-20260403] AI 일정 최적화 로컬 폴백
 * Edge Function 실패 시 CHECKLIST_TEMPLATES 기반 클라이언트 타임라인 생성
 */

import {
  CHECKLIST_TEMPLATES,
  PERIOD_ORDER,
  PERIOD_MONTH_OFFSETS,
  getActivePeriod,
} from './checklist-templates';
import type { TimelineResult, TimelineMonth, TimelineTask } from '@/hooks/useTimelineOptimizer';

/**
 * 로컬 폴백 타임라인 생성
 * - CHECKLIST_TEMPLATES에서 미완료 항목 추출
 * - PERIOD_MONTH_OFFSETS로 월별 배치
 * - 현재 기간 → high, 다음 → medium, 나머지 → low
 */
export function buildTimelineFallback(
  weddingDate: string,
  completedItems: string[],
  _budgetTotal?: number
): TimelineResult {
  const wedding = new Date(weddingDate);
  const today = new Date();
  const ddayCount = Math.max(0, Math.ceil((wedding.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  const activePeriod = getActivePeriod(weddingDate);
  const activePeriodIdx = activePeriod ? PERIOD_ORDER.indexOf(activePeriod) : 0;

  // 완료된 항목 제외
  const completedSet = new Set(completedItems.map(s => s.trim().toLowerCase()));
  const remaining = CHECKLIST_TEMPLATES.filter(
    t => !completedSet.has(t.title.trim().toLowerCase())
  );

  // 기간별 그룹핑 → 월별 배치
  const monthMap = new Map<string, TimelineTask[]>();

  for (const template of remaining) {
    const offset = PERIOD_MONTH_OFFSETS[template.period];
    const midMonthOffset = Math.round((offset.start + offset.end) / 2);
    const targetDate = new Date(wedding);
    targetDate.setMonth(targetDate.getMonth() - midMonthOffset);

    // 과거 달이면 현재 달로 올림
    if (targetDate < today) {
      targetDate.setFullYear(today.getFullYear());
      targetDate.setMonth(today.getMonth());
    }

    const monthKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;

    // priority 결정
    const periodIdx = PERIOD_ORDER.indexOf(template.period);
    let priority: TimelineTask['priority'] = 'low';
    if (periodIdx === activePeriodIdx) priority = 'high';
    else if (periodIdx === activePeriodIdx + 1) priority = 'medium';

    // deadline 계산
    const deadlineDate = new Date(wedding);
    deadlineDate.setMonth(deadlineDate.getMonth() - offset.end);
    const deadline = deadlineDate.toISOString().split('T')[0];

    const task: TimelineTask = {
      task: template.title,
      priority,
      tip: template.nudgeMessage || template.description || '',
      deadline,
    };

    if (!monthMap.has(monthKey)) monthMap.set(monthKey, []);
    monthMap.get(monthKey)!.push(task);
  }

  // 월별 정렬 + priority 순 정렬
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const timeline: TimelineMonth[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, tasks]) => ({
      month,
      tasks: tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]),
    }));

  return { timeline, dday_count: ddayCount };
}
